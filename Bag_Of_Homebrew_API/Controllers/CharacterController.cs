using Bag_Of_Homebrew_API.Data;
using Bag_Of_Homebrew_API.Dtos;
using Bag_Of_Homebrew_API.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static Bag_Of_Homebrew_API.Helpers.EndpointHelpers;

namespace Bag_Of_Homebrew_API.Controllers;

[ApiController]
[Route("api/characters")]
public class CharacterController : ControllerBase
{
    private readonly AppDbContext _db;

    public CharacterController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var characters = await _db.Characters
            .Where(c => c.UserId == user.Id)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new { c.Id, c.Name, c.PortraitUrl })
            .ToListAsync();

        return Ok(characters);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateCharacterRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Character name is required.");

        // Free-tier limit: 1 character. Paid: unlimited.
        var characterCount = await _db.Characters.CountAsync(c => c.UserId == user.Id);
        if (!user.IsPaid && characterCount >= 1)
            return BadRequest("Free accounts are limited to one character. Upgrade to create more.");

        var character = new Character { UserId = user.Id, Name = request.Name.Trim() };
        _db.Characters.Add(character);

        foreach (var slotType in Enum.GetValues<SlotType>())
        {
            _db.EquipmentSlots.Add(new EquipmentSlot
            {
                CharacterId = character.Id,
                SlotType = slotType
            });
        }

        await _db.SaveChangesAsync();

        return Ok(new { character.Id, character.Name });
    }

    [HttpGet("{characterId:guid}")]
    public async Task<IActionResult> GetOne(Guid characterId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var character = await _db.Characters
            .FirstOrDefaultAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (character is null) return NotFound();

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
            character.Copper
        });
    }

    [HttpDelete("{characterId:guid}")]
    public async Task<IActionResult> Delete(Guid characterId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var character = await _db.Characters
            .FirstOrDefaultAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (character is null) return NotFound();

        // Delete the character's items outright
        var items = await _db.Items.Where(i => i.CharacterId == characterId).ToListAsync();
        _db.Items.RemoveRange(items);

        // Delete its equipment slots
        var slots = await _db.EquipmentSlots.Where(s => s.CharacterId == characterId).ToListAsync();
        _db.EquipmentSlots.RemoveRange(slots);

        _db.Characters.Remove(character);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("{characterId:guid}/name")]
    public async Task<IActionResult> Rename(Guid characterId, RenameRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        var character = await _db.Characters
            .FirstOrDefaultAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (character is null) return NotFound();

        character.Name = request.Name.Trim();
        await _db.SaveChangesAsync();
        return Ok(new { character.Id, character.Name });
    }

    [HttpGet("{characterId:guid}/items")]
    public async Task<IActionResult> GetItems(Guid characterId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        // Ownership check: only the character's owner can see its items
        var ownsCharacter = await _db.Characters
            .AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (!ownsCharacter) return NotFound();

        var items = await _db.Items
            .Where(i => i.CharacterId == characterId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();                       // materialize entities first

        return Ok(items.Select(ItemDto.From));     // map in memory
    }

    [HttpPost("{characterId:guid}/items")]
    public async Task<IActionResult> CreateItem(Guid characterId, CreateItemRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var ownsCharacter = await _db.Characters
            .AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (!ownsCharacter) return NotFound();

        if (!await CanAddItem(user, _db))
            return BadRequest("You've reached the 50-item limit. Upgrade for unlimited storage.");

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Item name is required.");

        if (!Enum.TryParse<ItemCategory>(request.Category, out var category))
            return BadRequest("Invalid category.");

        if (!Enum.TryParse<ItemRarity>(request.Rarity, out var rarity))
            return BadRequest("Invalid rarity.");

        var item = new Item
        {
            CharacterId = characterId,
            Name = request.Name.Trim(),
            Category = category,
            Rarity = rarity,
            IsPlotFlagged = request.IsPlotFlagged,
            HomebrewDescription = request.HomebrewDescription,
            PropertiesJson = request.PropertiesJson ?? "{}",
            ImageUrl = request.ImageUrl,
            Quantity = category == ItemCategory.Consumable ? (request.Quantity ?? 1) : null,
        };

        _db.Items.Add(item);
        await _db.SaveChangesAsync();
        return Ok(ItemDto.From(item));
    }

    [HttpDelete("{characterId:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> DeleteItem(Guid characterId, Guid itemId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var ownsCharacter = await _db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (!ownsCharacter) return NotFound();

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.CharacterId == characterId);
        if (item is null) return NotFound();

        // If equipped, clear the slot first
        var slot = await _db.EquipmentSlots
            .FirstOrDefaultAsync(s => s.CharacterId == characterId && s.ItemId == itemId);
        if (slot is not null) slot.ItemId = null;

        _db.Items.Remove(item);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPatch("{characterId:guid}/items/{itemId:guid}/quantity")]
    public async Task<IActionResult> AdjustQuantity(Guid characterId, Guid itemId, AdjustQuantityRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var ownsCharacter = await _db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (!ownsCharacter) return NotFound();

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.CharacterId == characterId);
        if (item is null) return NotFound();
        if (item.Category != ItemCategory.Consumable) return BadRequest("Not a consumable.");

        var current = item.Quantity ?? 0;
        item.Quantity = Math.Max(0, current + request.Delta);  // floors at 0, never deletes

        await _db.SaveChangesAsync();
        return Ok(new { item.Quantity });
    }

    [HttpPatch("{characterId:guid}/items/{itemId:guid}/properties")]
    public async Task<IActionResult> UpdateProperties(Guid characterId, Guid itemId, UpdatePropertiesRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var ownsCharacter = await _db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (!ownsCharacter) return NotFound();

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.CharacterId == characterId);
        if (item is null) return NotFound();

        // Merge incoming keys into existing properties (don't clobber unrelated ones)
        var existing = new Dictionary<string, object?>();
        try
        {
            var parsed = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object?>>(item.PropertiesJson);
            if (parsed is not null) existing = parsed;
        }
        catch { }

        foreach (var kvp in request.Properties)
            existing[kvp.Key] = kvp.Value;

        item.PropertiesJson = System.Text.Json.JsonSerializer.Serialize(existing);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("{characterId:guid}/items/{itemId:guid}/return-to-vault")]
    public async Task<IActionResult> ReturnToVault(Guid characterId, Guid itemId, ReturnToVaultRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        // Verify the character belongs to this user
        var ownsCharacter = await _db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (!ownsCharacter) return NotFound("Character not found.");

        // Verify the target vault belongs to this user (in solo play, it's their own vault)
        if (!await OwnsVault(request.VaultId, user, _db))
            return NotFound("Vault not found.");

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.CharacterId == characterId);
        if (item is null) return NotFound("Item not found on this character.");

        // If equipped, clear it from any slot(s) it occupies (two-handed = two slots)
        var slots = await _db.EquipmentSlots
            .Where(s => s.CharacterId == characterId && s.ItemId == itemId)
            .ToListAsync();
        foreach (var s in slots) s.ItemId = null;

        // Move ownership: character → vault
        item.CharacterId = null;
        item.VaultId = request.VaultId;

        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpGet("{characterId:guid}/slots")]
    public async Task<IActionResult> GetSlots(Guid characterId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var ownsCharacter = await _db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (!ownsCharacter) return NotFound();

        var slots = await _db.EquipmentSlots
            .Where(s => s.CharacterId == characterId)
            .Include(s => s.Item)
            .Select(s => new
            {
                SlotType = s.SlotType.ToString(),
                Item = s.Item == null ? null : new
                {
                    s.Item.Id,
                    s.Item.Name,
                    Category = s.Item.Category.ToString(),
                    Rarity = s.Item.Rarity.ToString(),
                    s.Item.IsPlotFlagged,
                    s.Item.HomebrewDescription,
                    s.Item.PropertiesJson,
                    s.Item.CreatedAt,
                    s.Item.ImageUrl,
                    s.Item.Quantity
                }
            })
            .ToListAsync();

        return Ok(slots);
    }

    [HttpPost("{characterId:guid}/equip")]
    public async Task<IActionResult> Equip(Guid characterId, EquipRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var ownsCharacter = await _db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (!ownsCharacter) return NotFound();

        if (!Enum.TryParse<SlotType>(request.SlotType, out var slotType))
            return BadRequest("Invalid slot type.");

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == request.ItemId && i.CharacterId == characterId);
        if (item is null) return NotFound("Item not found on this character.");

        if (!IsValidSlotForItem(item, slotType))
            return BadRequest("That item can't go in that slot.");

        // Determine if this equip occupies two slots
        var handedness = GetHandedness(item);
        var wantsTwoHanded = handedness == "TwoHanded" || (handedness == "Versatile" && request.TwoHanded);

        SlotType? offHand = null;
        if (wantsTwoHanded)
        {
            offHand = PairedOffHand(slotType);
            if (offHand is null)
                return BadRequest("Two-handed weapons must be equipped to a main hand.");
        }

        // Clear this item from any slots it currently occupies (it may already be equipped elsewhere)
        var existing = await _db.EquipmentSlots
            .Where(s => s.CharacterId == characterId && s.ItemId == item.Id)
            .ToListAsync();
        foreach (var s in existing) s.ItemId = null;

        // for any previous characters created before pouch
        var targetSlot = await _db.EquipmentSlots.FirstOrDefaultAsync(s => s.CharacterId == characterId && s.SlotType == slotType);
        if (targetSlot is null)
        {
            targetSlot = new EquipmentSlot { CharacterId = characterId, SlotType = slotType, ItemId = null };
            _db.EquipmentSlots.Add(targetSlot);
        }
        targetSlot.ItemId = item.Id;

        // Fill the off-hand too, if two-handed
        if (offHand is not null)
        {
            var offSlot = await _db.EquipmentSlots.FirstAsync(s => s.CharacterId == characterId && s.SlotType == offHand);
            offSlot.ItemId = item.Id;
        }

        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("{characterId:guid}/unequip")]
    public async Task<IActionResult> Unequip(Guid characterId, UnequipRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var ownsCharacter = await _db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (!ownsCharacter) return NotFound();

        if (!Enum.TryParse<SlotType>(request.SlotType, out var slotType))
            return BadRequest("Invalid slot type.");

        var slot = await _db.EquipmentSlots.FirstAsync(s => s.CharacterId == characterId && s.SlotType == slotType);
        var itemId = slot.ItemId;

        // Clear this slot AND any other slot holding the same item (two-handed pairing)
        if (itemId is not null)
        {
            var sharing = await _db.EquipmentSlots
                .Where(s => s.CharacterId == characterId && s.ItemId == itemId)
                .ToListAsync();
            foreach (var s in sharing) s.ItemId = null;
        }
        else
        {
            slot.ItemId = null;
        }

        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("{characterId:guid}/portrait")]
    public async Task<IActionResult> SetPortrait(Guid characterId, SetPortraitRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var character = await _db.Characters
            .FirstOrDefaultAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (character is null) return NotFound();

        character.PortraitUrl = request.PortraitUrl;
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("{characterId:guid}/sheet")]
    public async Task<IActionResult> SetSheet(Guid characterId, SetSheetRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var character = await _db.Characters
            .FirstOrDefaultAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (character is null) return NotFound();

        character.PdfSheetUrl = request.PdfSheetUrl;
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("{characterId:guid}/ac")]
    public async Task<IActionResult> SetAc(Guid characterId, SetAcRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var character = await _db.Characters
            .FirstOrDefaultAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (character is null) return NotFound();

        character.ManualAc = request.ManualAc;
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("{characterId:guid}/health")]
    public async Task<IActionResult> UpdateHealth(Guid characterId, UpdateHealthRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var character = await _db.Characters
            .FirstOrDefaultAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (character is null) return NotFound();

        character.CurrentHp = request.CurrentHp;
        character.MaxHp = request.MaxHp;
        character.TempHp = request.TempHp;
        await _db.SaveChangesAsync();

        return Ok();
    }

    [HttpPut("{characterId:guid}/currency")]
    public async Task<IActionResult> UpdateCurrency(Guid characterId, UpdateCurrencyRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var character = await _db.Characters
            .FirstOrDefaultAsync(c => c.Id == characterId && c.UserId == user.Id);
        if (character is null) return NotFound();

        // Coins can't go negative
        character.Platinum = Math.Max(0, request.Platinum);
        character.Gold = Math.Max(0, request.Gold);
        character.Electrum = Math.Max(0, request.Electrum);
        character.Silver = Math.Max(0, request.Silver);
        character.Copper = Math.Max(0, request.Copper);
        await _db.SaveChangesAsync();

        return Ok();
    }
}
