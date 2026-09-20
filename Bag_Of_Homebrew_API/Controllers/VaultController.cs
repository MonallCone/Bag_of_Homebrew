using Bag_Of_Homebrew_API.Data;
using Bag_Of_Homebrew_API.Dtos;
using Bag_Of_Homebrew_API.Model;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static Bag_Of_Homebrew_API.Helpers.EndpointHelpers;

namespace Bag_Of_Homebrew_API.Controllers;

[ApiController]
[Route("api/vaults")]
public class VaultController : ControllerBase
{
    private readonly AppDbContext _db;

    public VaultController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("{vaultId:guid}/items")]
    public async Task<IActionResult> GetItems(Guid vaultId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();
        if (!await OwnsVault(vaultId, user, _db)) return NotFound();

        var items = (await _db.Items
            .Where(i => i.VaultId == vaultId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync())
            .Select(ItemDto.From);

        return Ok(items);
    }

    [HttpPost("{vaultId:guid}/items")]
    public async Task<IActionResult> CreateItem(Guid vaultId, CreateItemRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();
        if (!await OwnsVault(vaultId, user, _db)) return NotFound();

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
            VaultId = vaultId,
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
        return Ok(ItemDto.From(item));
    }

    [HttpDelete("{vaultId:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> DeleteItem(Guid vaultId, Guid itemId)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();
        if (!await OwnsVault(vaultId, user, _db)) return NotFound();

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == vaultId);
        if (item is null) return NotFound();

        _db.Items.Remove(item);
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("{vaultId:guid}/items/{itemId:guid}")]
    public async Task<IActionResult> UpdateItem(Guid vaultId, Guid itemId, CreateItemRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();
        if (!await OwnsVault(vaultId, user, _db)) return NotFound();

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == vaultId);
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

    [HttpPatch("{vaultId:guid}/items/{itemId:guid}/quantity")]
    public async Task<IActionResult> AdjustQuantity(Guid vaultId, Guid itemId, AdjustQuantityRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();
        if (!await OwnsVault(vaultId, user, _db)) return NotFound();

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == vaultId);
        if (item is null) return NotFound();
        if (item.Category != ItemCategory.Consumable) return BadRequest("Not a consumable.");

        var current = item.Quantity ?? 0;
        item.Quantity = Math.Max(0, current + request.Delta);
        await _db.SaveChangesAsync();
        return Ok(new { item.Quantity });
    }

    [HttpPatch("{vaultId:guid}/items/{itemId:guid}/properties")]
    public async Task<IActionResult> UpdateProperties(Guid vaultId, Guid itemId, UpdatePropertiesRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();
        if (!await OwnsVault(vaultId, user, _db)) return NotFound();

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == vaultId);
        if (item is null) return NotFound();

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

    [HttpPost("{vaultId:guid}/items/{itemId:guid}/send-to-character")]
    public async Task<IActionResult> SendToCharacter(Guid vaultId, Guid itemId, SendToCharacterRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        if (!await OwnsVault(vaultId, user, _db))
            return NotFound("Vault not found.");

        var ownsCharacter = await _db.Characters.AnyAsync(c => c.Id == request.CharacterId && c.UserId == user.Id);
        if (!ownsCharacter) return NotFound("Character not found.");

        var item = await _db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == vaultId);
        if (item is null) return NotFound("Item not found in this vault.");

        item.VaultId = null;
        item.CharacterId = request.CharacterId;

        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPut("{vaultId:guid}/name")]
    public async Task<IActionResult> Rename(Guid vaultId, RenameRequest request)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        var vault = await _db.Vaults.FirstOrDefaultAsync(v => v.Id == vaultId && v.UserId == user.Id);
        if (vault is null) return NotFound();

        vault.Name = request.Name.Trim();
        await _db.SaveChangesAsync();
        return Ok(new { vault.Id, vault.Name });
    }
}
