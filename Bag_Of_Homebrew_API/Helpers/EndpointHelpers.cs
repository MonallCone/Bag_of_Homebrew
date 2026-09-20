using Bag_Of_Homebrew_API.Data;
using Bag_Of_Homebrew_API.Model;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Bag_Of_Homebrew_API.Helpers;

public static class EndpointHelpers
{
    public const int FreeItemLimit = 50;

    public static async Task<User?> GetCurrentUser(HttpContext ctx, AppDbContext db)
    {
        if (ctx.User.Identity?.IsAuthenticated != true) return null;
        var googleId = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (googleId is null) return null;
        return await db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);
    }

    public static string GenerateInviteCode()
    {
        // Avoids ambiguous chars (0/O, 1/I/L) for readability
        const string chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        var rng = Random.Shared;
        return new string(Enumerable.Range(0, 6).Select(_ => chars[rng.Next(chars.Length)]).ToArray());
    }

    public static bool IsValidSlotForItem(Item item, SlotType slot)
    {
        var weaponSlots = new[] { SlotType.WeaponSet1Main, SlotType.WeaponSet1Off, SlotType.WeaponSet2Main, SlotType.WeaponSet2Off };
        var accessorySlots = new[] { SlotType.Accessory1, SlotType.Accessory2, SlotType.Accessory3, SlotType.Accessory4, SlotType.Accessory5, SlotType.Accessory6 };
        var pouchSlots = new[] { SlotType.Pouch1, SlotType.Pouch2, SlotType.Pouch3, SlotType.Pouch4 };

        switch (item.Category)
        {
            case ItemCategory.Weapon:
                return weaponSlots.Contains(slot);

            case ItemCategory.Accessory:
                return accessorySlots.Contains(slot);

            case ItemCategory.Armour:
                {
                    string? armourSlot = null;
                    try
                    {
                        using var doc = System.Text.Json.JsonDocument.Parse(item.PropertiesJson);
                        if (doc.RootElement.TryGetProperty("slot", out var slotProp))
                            armourSlot = slotProp.GetString();
                    }
                    catch { /* malformed json = not equippable */ }

                    return armourSlot switch
                    {
                        "Chest" => slot == SlotType.Chest,
                        "Helm" => slot == SlotType.Head,
                        "Boots" => slot == SlotType.Boots,
                        "Gloves" => slot == SlotType.Gloves,
                        "Shield" => weaponSlots.Contains(slot),
                        _ => false
                    };
                }

            case ItemCategory.Consumable:
            case ItemCategory.Misc:
                {
                    return pouchSlots.Contains(slot);
                };

            default:
                return false;
        }
    }

    public static string? GetHandedness(Item item)
    {
        if (item.Category != ItemCategory.Weapon) return null;
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(item.PropertiesJson);
            if (doc.RootElement.TryGetProperty("handedness", out var h))
                return h.GetString();
        }
        catch { }
        return null;
    }

    public static SlotType? PairedOffHand(SlotType main) => main switch
    {
        SlotType.WeaponSet1Main => SlotType.WeaponSet1Off,
        SlotType.WeaponSet2Main => SlotType.WeaponSet2Off,
        _ => null
    };

    public static async Task<bool> OwnsVault(Guid vaultId, User user, AppDbContext db)
        => await db.Vaults.AnyAsync(v => v.Id == vaultId && v.UserId == user.Id);

    public static async Task<CampaignMembership?> GetMembership(Guid campaignId, User user, AppDbContext db)
        => await db.CampaignMemberships
            .FirstOrDefaultAsync(m => m.CampaignId == campaignId && m.UserId == user.Id);

    // Total item slots a user occupies across their characters and personal vault.
    public static async Task<int> CountUserItems(User user, AppDbContext db)
    {
        // Their personal vault id
        var personalVaultId = await db.Vaults
            .Where(v => v.UserId == user.Id)
            .Select(v => (Guid?)v.Id)
            .FirstOrDefaultAsync();

        // Their character ids
        var characterIds = await db.Characters
            .Where(c => c.UserId == user.Id)
            .Select(c => c.Id)
            .ToListAsync();

        return await db.Items.CountAsync(i =>
            (i.CharacterId != null && characterIds.Contains(i.CharacterId.Value)) ||
            (personalVaultId != null && i.VaultId == personalVaultId));
    }

    // True if this user is allowed to gain one more item.
    public static async Task<bool> CanAddItem(User user, AppDbContext db)
    {
        if (user.IsPaid) return true;
        return await CountUserItems(user, db) < FreeItemLimit;
    }
}
