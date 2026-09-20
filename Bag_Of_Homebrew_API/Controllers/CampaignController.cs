using Bag_Of_Homebrew_API.Data;
using Bag_Of_Homebrew_API.Dtos;
using Bag_Of_Homebrew_API.Hubs;
using Bag_Of_Homebrew_API.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using static Bag_Of_Homebrew_API.Helpers.EndpointHelpers;

namespace Bag_Of_Homebrew_API.Controllers;

[ApiController]
[Route("api/campaigns")]
public class CampaignController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<CampaignHub> _hub;

    public CampaignController(AppDbContext db, IHubContext<CampaignHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateCampaignRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        if (!user.IsPaid)
        {
            var hostedCount = await _db.CampaignMemberships
                .CountAsync(m => m.UserId == user.Id && m.Role == CampaignRole.Gm);
            if (hostedCount >= 1)
                return BadRequest("Free accounts can host one campaign. Upgrade to host more.");
        }

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Campaign name is required.");

        // The campaign's own vault (separate from the GM's personal vault)
        var vault = new Vault { Name = $"{request.Name.Trim()} Vault" };
        _db.Vaults.Add(vault);

        // Generate a unique invite code (retry on the rare collision)
        string code;
        do { code = GenerateInviteCode(); }
        while (await _db.Campaigns.AnyAsync(c => c.InviteCode == code));

        var campaign = new Campaign
        {
            GmUserId = user.Id,
            Name = request.Name.Trim(),
            InviteCode = code,
            VaultId = vault.Id
        };
        _db.Campaigns.Add(campaign);

        // Link the vault back to the campaign
        vault.CampaignId = campaign.Id;

        // The GM's own membership (no character — GM plays via the vault)
        var membership = new CampaignMembership
        {
            CampaignId = campaign.Id,
            UserId = user.Id,
            CharacterId = null,
            Role = CampaignRole.Gm
        };
        _db.CampaignMemberships.Add(membership);

        await _db.SaveChangesAsync();

        return Ok(new
        {
            campaign.Id,
            campaign.Name,
            campaign.InviteCode,
            campaign.VaultId
        });
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var campaigns = await _db.CampaignMemberships
            .Where(m => m.UserId == user.Id)
            .Include(m => m.Campaign)
            .Select(m => new
            {
                m.Campaign.Id,
                m.Campaign.Name,
                m.Campaign.InviteCode,
                m.Campaign.VaultId,
                Role = m.Role.ToString(),
                IsGm = m.Role == CampaignRole.Gm
            })
            .ToListAsync();

        return Ok(campaigns);
    }

    [HttpPost("join")]
    public async Task<IActionResult> Join(JoinCampaignRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.InviteCode))
            return BadRequest("Invite code is required.");

        var code = request.InviteCode.Trim().ToUpperInvariant();
        var campaign = await _db.Campaigns.FirstOrDefaultAsync(c => c.InviteCode == code);
        if (campaign is null)
            return NotFound("No campaign found with that code.");

        // Already a member?
        var existing = await _db.CampaignMemberships
            .FirstOrDefaultAsync(m => m.CampaignId == campaign.Id && m.UserId == user.Id);
        if (existing is not null)
            return BadRequest("You're already in this campaign.");

        // Verify the character they're bringing belongs to them
        var character = await _db.Characters
            .FirstOrDefaultAsync(c => c.Id == request.CharacterId && c.UserId == user.Id);
        if (character is null)
            return NotFound("Character not found.");

        var membership = new CampaignMembership
        {
            CampaignId = campaign.Id,
            UserId = user.Id,
            CharacterId = character.Id,
            Role = CampaignRole.Player
        };
        _db.CampaignMemberships.Add(membership);
        await _db.SaveChangesAsync();

        return Ok(new
        {
            campaign.Id,
            campaign.Name,
            campaign.VaultId
        });
    }

    [HttpPost("{campaignId:guid}/leave")]
    public async Task<IActionResult> Leave(Guid campaignId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var membership = await _db.CampaignMemberships
            .FirstOrDefaultAsync(m => m.CampaignId == campaignId && m.UserId == user.Id);
        if (membership is null) return NotFound();

        // A GM can't "leave" their own campaign — they'd delete it instead (later feature)
        if (membership.Role == CampaignRole.Gm)
            return BadRequest("The GM can't leave; delete the campaign instead.");

        var orphanedTransfers = await _db.ItemTransfers
            .Where(t => t.CampaignId == campaignId
                     && t.Status == TransferStatus.Pending
                     && (t.FromUserId == user.Id || t.ToUserId == user.Id))
            .ToListAsync();
        _db.ItemTransfers.RemoveRange(orphanedTransfers);

        _db.CampaignMemberships.Remove(membership);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("{campaignId:guid}/members")]
    public async Task<IActionResult> GetMembers(Guid campaignId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        // Caller must be a member to see the roster
        var isMember = await _db.CampaignMemberships
            .AnyAsync(m => m.CampaignId == campaignId && m.UserId == user.Id);
        if (!isMember) return NotFound();

        var members = await _db.CampaignMemberships
            .Where(m => m.CampaignId == campaignId)
            .Include(m => m.User)
            .Include(m => m.Character)
            .OrderBy(m => m.Role)   // GM first (enum 0), then players
            .Select(m => new
            {
                m.UserId,
                UserName = m.User.DisplayName,
                m.CharacterId,
                CharacterName = m.Character != null ? m.Character.Name : null,
                PortraitUrl = m.Character != null ? m.Character.PortraitUrl : null,
                Role = m.Role.ToString(),
                IsGm = m.Role == CampaignRole.Gm
            })
            .ToListAsync();

        return Ok(members);
    }

    [HttpGet("{campaignId:guid}/members/{memberUserId:guid}/character")]
    public async Task<IActionResult> GetMemberCharacter(Guid campaignId, Guid memberUserId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        // Caller must be in the campaign
        var callerMembership = await GetMembership(campaignId, user, _db);
        if (callerMembership is null) return NotFound();

        // The target member must be in the campaign and have a character
        var targetMembership = await _db.CampaignMemberships
            .FirstOrDefaultAsync(m => m.CampaignId == campaignId && m.UserId == memberUserId);
        if (targetMembership?.CharacterId is null) return NotFound();

        var characterId = targetMembership.CharacterId.Value;
        var character = await _db.Characters.FirstAsync(c => c.Id == characterId);
        var campaign = await _db.Campaigns.FirstAsync(c => c.Id == campaignId);

        // Is this the caller's own character? (determines editability on the frontend)
        var isOwn = targetMembership.UserId == user.Id;
        var isGm = campaign.GmUserId == user.Id;
        var canSeeAll = isOwn || isGm;   // owner and GM always see full detail on a hidden item; everyone else gets the redacted view

        var itemEntities = await _db.Items
            .Where(i => i.CharacterId == characterId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var items = itemEntities.Select(i => BuildItemView(i, canSeeAll)).ToList();

        var slotEntities = await _db.EquipmentSlots
            .Where(s => s.CharacterId == characterId)
            .Include(s => s.Item)
            .ToListAsync();

        var slots = slotEntities.Select(s => new
        {
            SlotType = s.SlotType.ToString(),
            Item = s.Item == null ? null : BuildItemView(s.Item, canSeeAll)
        }).ToList();

        return Ok(new
        {
            character.Id,
            character.Name,
            character.PortraitUrl,
            character.PdfSheetUrl,
            character.ManualAc,
            character.CurrentHp,
            character.MaxHp,
            character.TempHp,
            character.Platinum,
            character.Gold,
            character.Electrum,
            character.Silver,
            character.Copper,
            items,
            slots,
            isOwn
        });
    }

    // Shapes one item for this response. When the item is hidden and this viewer isn't
    // the owner or the GM, every identifying field is stripped — the frontend only
    // learns that *something* occupies this slot, never what it is.
    private static object BuildItemView(Item i, bool canSeeAll)
    {
        var isHidden = i.IsHiddenFromPlayers || i.IsHiddenByGm;

        if (isHidden && !canSeeAll)
        {
            return new
            {
                i.Id,
                Name = "",
                Category = i.Category.ToString(),
                Rarity = "Common",
                IsPlotFlagged = false,
                IsAttunement = false,
                IsHiddenFromPlayers = i.IsHiddenFromPlayers,
                IsHiddenByGm = i.IsHiddenByGm,
                IsRedacted = true,
                HomebrewDescription = (string?)null,
                PropertiesJson = "{}",
                ImageUrl = (string?)null,
                Quantity = (int?)null,
                i.CreatedAt
            };
        }

        return new
        {
            i.Id,
            i.Name,
            Category = i.Category.ToString(),
            Rarity = i.Rarity.ToString(),
            i.IsPlotFlagged,
            i.IsAttunement,
            i.IsHiddenFromPlayers,
            i.IsHiddenByGm,
            IsRedacted = false,
            i.HomebrewDescription,
            i.PropertiesJson,
            i.ImageUrl,
            i.Quantity,
            i.CreatedAt
        };
    }

    [HttpGet("{campaignId:guid}/vault/items")]
    public async Task<IActionResult> GetVaultItems(Guid campaignId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();
        var membership = await GetMembership(campaignId, user, _db);
        if (membership is null) return NotFound();
        var campaign = await _db.Campaigns.FirstAsync(c => c.Id == campaignId);

        var isGm = membership.Role == CampaignRole.Gm;

        var itemEntities = await _db.Items
            .Where(i => i.VaultId == campaign.VaultId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        var items = itemEntities.Select(i => BuildItemView(i, isGm)).ToList();

        return Ok(new { items, isGm, vaultId = campaign.VaultId });
    }

    [HttpPost("{campaignId:guid}/vault/items")]
    public async Task<IActionResult> CreateVaultItem(Guid campaignId, CreateItemRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var membership = await GetMembership(campaignId, user, _db);
        if (membership is null) return NotFound();
        if (membership.Role != CampaignRole.Gm)
            return Forbid();   // only the GM edits the campaign vault

        var campaign = await _db.Campaigns.FirstAsync(c => c.Id == campaignId);

        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest("Name required.");
        if (!Enum.TryParse<ItemCategory>(request.Category, out var category)) return BadRequest("Bad category.");
        if (!Enum.TryParse<ItemRarity>(request.Rarity, out var rarity)) return BadRequest("Bad rarity.");

        var item = new Item
        {
            VaultId = campaign.VaultId,
            Name = request.Name.Trim(),
            Category = category,
            Rarity = rarity,
            IsPlotFlagged = request.IsPlotFlagged,
            IsAttunement = request.IsAttunement,
            HomebrewDescription = request.HomebrewDescription,
            PropertiesJson = request.PropertiesJson ?? "{}",
            ImageUrl = request.ImageUrl,
            Quantity = category == ItemCategory.Consumable ? (request.Quantity ?? 1) : null
        };
        _db.Items.Add(item);
        await _db.SaveChangesAsync();

        return Ok(new { item.Id });   // frontend re-fetches
    }

    [HttpDelete("{campaignId:guid}/vault/items/{itemId:guid}")]
    public async Task<IActionResult> DeleteVaultItem(Guid campaignId, Guid itemId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();
        var membership = await GetMembership(campaignId, user, _db);
        if (membership is null) return NotFound();
        if (membership.Role != CampaignRole.Gm) return Forbid();

        var campaign = await _db.Campaigns.FirstAsync(c => c.Id == campaignId);
        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == campaign.VaultId);
        if (item is null) return NotFound();

        _db.Items.Remove(item);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("{campaignId:guid}/vault/items/{itemId:guid}")]
    public async Task<IActionResult> UpdateVaultItem(Guid campaignId, Guid itemId, CreateItemRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();
        var membership = await GetMembership(campaignId, user, _db);
        if (membership is null) return NotFound();
        if (membership.Role != CampaignRole.Gm) return Forbid();

        var campaign = await _db.Campaigns.FirstAsync(c => c.Id == campaignId);
        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == campaign.VaultId);
        if (item is null) return NotFound();

        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest("Item name is required.");
        if (!Enum.TryParse<ItemCategory>(request.Category, out var category)) return BadRequest("Invalid category.");
        if (!Enum.TryParse<ItemRarity>(request.Rarity, out var rarity)) return BadRequest("Invalid rarity.");

        item.Name = request.Name.Trim();
        item.Category = category;
        item.Rarity = rarity;
        item.IsPlotFlagged = request.IsPlotFlagged;
        item.IsAttunement = request.IsAttunement;
        item.HomebrewDescription = request.HomebrewDescription;
        item.PropertiesJson = request.PropertiesJson ?? "{}";
        item.ImageUrl = request.ImageUrl;
        if (category == ItemCategory.Consumable) item.Quantity = request.Quantity ?? item.Quantity ?? 1;

        await _db.SaveChangesAsync();
        return Ok(ItemDto.From(item));
    }

    [HttpPost("{campaignId:guid}/vault/items/{itemId:guid}/send-to-character")]
    public async Task<IActionResult> SendVaultItemToCharacter(Guid campaignId, Guid itemId, SendVaultItemRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var membership = await GetMembership(campaignId, user, _db);
        if (membership is null) return NotFound();
        if (membership.Role != CampaignRole.Gm)
            return Forbid();   // only the GM distributes from the campaign vault

        var campaign = await _db.Campaigns.FirstAsync(c => c.Id == campaignId);

        // Item must be in this campaign's vault
        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == campaign.VaultId);
        if (item is null) return NotFound("Item not in this campaign's vault.");

        // Target must be a player in this campaign with a character
        var targetMembership = await _db.CampaignMemberships
            .FirstOrDefaultAsync(m => m.CampaignId == campaignId && m.UserId == request.ToUserId);
        if (targetMembership?.CharacterId is null)
            return BadRequest("Target player has no character in this campaign.");

        var targetUser = await _db.Users.FirstAsync(u => u.Id == targetMembership.UserId);
        if (!await CanAddItem(targetUser, _db))
            return BadRequest("That player's inventory is full. They'll need to make room first.");

        // Move ownership: campaign vault → player's character
        item.VaultId = null;
        item.CharacterId = targetMembership.CharacterId.Value;

        await _db.SaveChangesAsync();

        await _hub.Clients.Group($"user:{targetMembership.UserId}").SendAsync("ItemReceivedFromVault", ItemDto.From(item));
        await _hub.Clients.Group($"campaign:{campaignId}").SendAsync("CampaignVaultUpdated");

        return Ok();
    }

    [HttpPost("{campaignId:guid}/return-to-vault")]
    public async Task<IActionResult> ReturnToVault(Guid campaignId, ReturnToCampaignVaultRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        // Caller must be a member of the campaign
        var membership = await GetMembership(campaignId, user, _db);
        if (membership is null) return NotFound("Not a member of this campaign.");

        var campaign = await _db.Campaigns.FirstAsync(c => c.Id == campaignId);

        // The item must be on a character the caller owns
        var item = await _db.Items
            .Include(i => i.Character)
            .FirstOrDefaultAsync(i => i.Id == request.ItemId);
        if (item is null) return NotFound("Item not found.");
        if (item.Character is null || item.Character.UserId != user.Id)
            return Forbid();   // can't return someone else's item

        var characterId = item.CharacterId!.Value;

        // Clear it from any equipment slot(s) it occupies
        var slots = await _db.EquipmentSlots
            .Where(s => s.CharacterId == characterId && s.ItemId == item.Id)
            .ToListAsync();
        foreach (var s in slots) s.ItemId = null;

        // Move ownership: character → campaign vault
        item.CharacterId = null;
        item.VaultId = campaign.VaultId;

        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("{campaignId:guid}/gift")]
    public async Task<IActionResult> Gift(Guid campaignId, GiftItemRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        // Sender must be a member of the campaign
        var senderMembership = await GetMembership(campaignId, user, _db);
        if (senderMembership is null) return NotFound("You're not in this campaign.");

        // Recipient must also be a member, and have a character in this campaign
        var recipientMembership = await _db.CampaignMemberships
            .FirstOrDefaultAsync(m => m.CampaignId == campaignId && m.UserId == request.ToUserId);
        if (recipientMembership is null)
            return BadRequest("Recipient isn't in this campaign.");
        if (recipientMembership.CharacterId is null)
            return BadRequest("Recipient has no character to receive items.");

        // Can't gift to yourself
        if (request.ToUserId == user.Id)
            return BadRequest("You can't send an item to yourself.");

        // The item must be on a character the sender owns
        var item = await _db.Items
            .Include(i => i.Character)
            .FirstOrDefaultAsync(i => i.Id == request.ItemId);
        if (item is null) return NotFound("Item not found.");
        if (item.Character is null || item.Character.UserId != user.Id)
            return Forbid();   // can't gift someone else's item, or a vault item

        // Prevent gifting an item that's already mid-transfer
        var alreadyPending = await _db.ItemTransfers
            .AnyAsync(t => t.ItemId == item.Id && t.Status == TransferStatus.Pending);
        if (alreadyPending)
            return BadRequest("This item is already being gifted.");

        var transfer = new ItemTransfer
        {
            ItemId = item.Id,
            CampaignId = campaignId,
            FromUserId = user.Id,
            ToUserId = request.ToUserId,
            ToCharacterId = recipientMembership.CharacterId.Value,
            Status = TransferStatus.Pending
        };
        _db.ItemTransfers.Add(transfer);
        await _db.SaveChangesAsync();

        await _hub.Clients.Group($"user:{request.ToUserId}").SendAsync("TransferOffered", new
        {
            transferId = transfer.Id,
            fromUserId = user.Id,
            item = ItemDto.From(item)
        });

        return Ok(new { transfer.Id });
    }

    [HttpGet("{campaignId:guid}/transfers/incoming")]
    public async Task<IActionResult> GetIncomingTransfers(Guid campaignId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var membership = await GetMembership(campaignId, user, _db);
        if (membership is null) return NotFound();

        var transfers = await _db.ItemTransfers
            .Where(t => t.CampaignId == campaignId
                     && t.ToUserId == user.Id
                     && t.Status == TransferStatus.Pending)
            .Include(t => t.Item)
            .ToListAsync();

        var result = transfers.Select(t => new
        {
            transferId = t.Id,
            fromUserId = t.FromUserId,
            item = ItemDto.From(t.Item)
        });

        return Ok(result);
    }

    [HttpGet("{campaignId:guid}/transfers/outgoing")]
    public async Task<IActionResult> GetOutgoingTransfers(Guid campaignId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var membership = await GetMembership(campaignId, user, _db);
        if (membership is null) return NotFound();

        var transfers = await _db.ItemTransfers
            .Where(t => t.CampaignId == campaignId
                     && t.FromUserId == user.Id
                     && t.Status == TransferStatus.Pending)
            .Select(t => new { transferId = t.Id, itemId = t.ItemId, toUserId = t.ToUserId })
            .ToListAsync();

        return Ok(transfers);
    }

    [HttpPost("{campaignId:guid}/transfers/{transferId:guid}/accept")]
    public async Task<IActionResult> AcceptTransfer(Guid campaignId, Guid transferId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var transfer = await _db.ItemTransfers
            .Include(t => t.Item)
            .FirstOrDefaultAsync(t => t.Id == transferId && t.CampaignId == campaignId);
        if (transfer is null) return NotFound();

        // Only the recipient can accept
        if (transfer.ToUserId != user.Id) return Forbid();
        if (transfer.Status != TransferStatus.Pending) return BadRequest("Transfer already resolved.");

        if (!await CanAddItem(user, _db))
            return BadRequest("Your inventory is full (50 items). Delete something to accept this gift, or reject it.");

        // The item might have been deleted or moved since the offer — guard it
        var item = transfer.Item;
        if (item is null) { transfer.Status = TransferStatus.Rejected; await _db.SaveChangesAsync(); return NotFound("Item no longer exists."); }

        // Move the item to the recipient's character
        // (clear any slot on the sender's side first, in case they equipped it after offering)
        var oldSlots = await _db.EquipmentSlots
            .Where(s => s.ItemId == item.Id)
            .ToListAsync();
        foreach (var s in oldSlots) s.ItemId = null;

        item.CharacterId = transfer.ToCharacterId;
        item.VaultId = null;

        transfer.Status = TransferStatus.Accepted;
        await _db.SaveChangesAsync();

        await _hub.Clients.Group($"user:{transfer.FromUserId}").SendAsync("TransferResolved", new
        {
            transferId = transfer.Id,
            status = "Accepted"
        });

        return Ok();
    }

    [HttpPost("{campaignId:guid}/transfers/{transferId:guid}/reject")]
    public async Task<IActionResult> RejectTransfer(Guid campaignId, Guid transferId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var transfer = await _db.ItemTransfers
            .FirstOrDefaultAsync(t => t.Id == transferId && t.CampaignId == campaignId);
        if (transfer is null) return NotFound();

        // Either the recipient (declining) or the sender (cancelling) can reject
        if (transfer.ToUserId != user.Id && transfer.FromUserId != user.Id)
            return Forbid();
        if (transfer.Status != TransferStatus.Pending) return BadRequest("Transfer already resolved.");

        transfer.Status = TransferStatus.Rejected;
        await _db.SaveChangesAsync();

        var notifyUserId = transfer.FromUserId == user.Id ? transfer.ToUserId : transfer.FromUserId;
        await _hub.Clients.Group($"user:{notifyUserId}").SendAsync("TransferResolved", new
        {
            transferId = transfer.Id,
            status = "Rejected"
        });

        return Ok();
    }

    [HttpDelete("{campaignId:guid}")]
    public async Task<IActionResult> Delete(Guid campaignId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var campaign = await _db.Campaigns.FirstOrDefaultAsync(c => c.Id == campaignId);
        if (campaign is null) return NotFound();

        // Only the GM (owner) can delete
        if (campaign.GmUserId != user.Id) return Forbid();

        // 1. Pending/resolved transfers in this campaign
        var transfers = await _db.ItemTransfers.Where(t => t.CampaignId == campaignId).ToListAsync();
        _db.ItemTransfers.RemoveRange(transfers);

        // 2. Items in the campaign vault
        var vaultItems = await _db.Items.Where(i => i.VaultId == campaign.VaultId).ToListAsync();
        _db.Items.RemoveRange(vaultItems);

        // 3. Memberships
        var memberships = await _db.CampaignMemberships.Where(m => m.CampaignId == campaignId).ToListAsync();
        _db.CampaignMemberships.RemoveRange(memberships);

        // 4. The campaign itself (must go before the vault due to the FK from Campaign → Vault)
        var vault = await _db.Vaults.FirstOrDefaultAsync(v => v.Id == campaign.VaultId);
        _db.Campaigns.Remove(campaign);
        await _db.SaveChangesAsync();   // save so the Campaign→Vault FK is cleared

        // 5. The vault itself
        if (vault is not null)
        {
            _db.Vaults.Remove(vault);
            await _db.SaveChangesAsync();
        }

        return Ok();
    }

    [HttpPut("{campaignId:guid}/name")]
    public async Task<IActionResult> Rename(Guid campaignId, RenameRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        var campaign = await _db.Campaigns.FirstOrDefaultAsync(c => c.Id == campaignId);
        if (campaign is null) return NotFound();
        if (campaign.GmUserId != user.Id) return Forbid();   // only the GM renames

        campaign.Name = request.Name.Trim();
        await _db.SaveChangesAsync();
        return Ok(new { campaign.Id, campaign.Name });
    }

    [HttpPatch("{campaignId:guid}/members/{memberUserId:guid}/items/{itemId:guid}/hide")]
    public async Task<IActionResult> SetItemHiddenByGm(Guid campaignId, Guid memberUserId, Guid itemId, SetHiddenRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var campaign = await _db.Campaigns.FirstOrDefaultAsync(c => c.Id == campaignId);
        if (campaign is null) return NotFound();
        if (campaign.GmUserId != user.Id) return Forbid();   // only the GM sets this flag

        var targetMembership = await _db.CampaignMemberships
            .FirstOrDefaultAsync(m => m.CampaignId == campaignId && m.UserId == memberUserId);
        if (targetMembership?.CharacterId is null) return NotFound();

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.CharacterId == targetMembership.CharacterId);
        if (item is null) return NotFound();

        item.IsHiddenByGm = request.Hidden;
        await _db.SaveChangesAsync();
        return Ok(ItemDto.From(item));
    }

    [HttpPatch("{campaignId:guid}/vault/items/{itemId:guid}/hide")]
    public async Task<IActionResult> SetVaultItemHiddenByGm(Guid campaignId, Guid itemId, SetHiddenRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();
        var membership = await GetMembership(campaignId, user, _db);
        if (membership is null) return NotFound();
        if (membership.Role != CampaignRole.Gm) return Forbid();

        var campaign = await _db.Campaigns.FirstAsync(c => c.Id == campaignId);
        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == campaign.VaultId);
        if (item is null) return NotFound();

        item.IsHiddenByGm = request.Hidden;
        await _db.SaveChangesAsync();
        return Ok(ItemDto.From(item));
    }
}
