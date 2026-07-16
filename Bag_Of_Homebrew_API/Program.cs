using Bag_Of_Homebrew_API.Data;
using Bag_Of_Homebrew_API.Model;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = GoogleDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    options.Cookie.SameSite = SameSiteMode.None;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
})
.AddGoogle(options =>
{
    options.ClientId = builder.Configuration["Authentication:Google:ClientId"]!;
    options.ClientSecret = builder.Configuration["Authentication:Google:ClientSecret"]!;
    options.CallbackPath = "/signin-google";
});

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

var app = builder.Build();

app.UseCors("ReactApp");
app.UseAuthentication();
app.UseAuthorization();

// Kicks off the Google login flow. Hit this via a full page navigation (not fetch).
app.MapGet("/api/auth/login", () => Results.Challenge(
    new AuthenticationProperties { RedirectUri = "http://localhost:5173" },
    new[] { GoogleDefaults.AuthenticationScheme }));

app.MapPost("/api/auth/logout", async (HttpContext ctx) =>
{
    await ctx.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    return Results.Ok();
});

app.MapGet("/api/auth/me", async (HttpContext ctx, AppDbContext db) =>
{
    if (ctx.User.Identity?.IsAuthenticated != true)
        return Results.Unauthorized();

    var googleId = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
    var email = ctx.User.FindFirst(ClaimTypes.Email)?.Value!;
    var name = ctx.User.FindFirst(ClaimTypes.Name)?.Value!;

    var user = await db.Users
        .Include(u => u.Characters)
        .FirstOrDefaultAsync(u => u.GoogleId == googleId);

    if (user is null)
    {
        user = new User { GoogleId = googleId, Email = email, DisplayName = name };
        db.Users.Add(user);
        await db.SaveChangesAsync(); // save so user.Id exists for the FK below
    }

    if (user.Characters.Count == 0)
    {
        var character = new Character { UserId = user.Id, Name = "New Character" };
        db.Characters.Add(character);

        foreach (var slotType in Enum.GetValues<SlotType>())
        {
            db.EquipmentSlots.Add(new EquipmentSlot
            {
                CharacterId = character.Id,
                SlotType = slotType
            });
        }

        await db.SaveChangesAsync();
        user.Characters.Add(character);
    }

    var current = user.Characters.First();
    return Results.Ok(new
    {
        user.Id,
        user.Email,
        user.DisplayName,
        CharacterId = current.Id,
        CharacterName = current.Name
    });
});

app.MapGet("/api/characters/{characterId:guid}/items", async (Guid characterId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    // Ownership check: only the character's owner can see its items
    var ownsCharacter = await db.Characters
        .AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (!ownsCharacter) return Results.NotFound();

    var items = await db.Items
        .Where(i => i.CharacterId == characterId)
        .OrderByDescending(i => i.CreatedAt)
        .Select(i => new
        {
            i.Id,
            i.Name,
            Category = i.Category.ToString(),
            Rarity = i.Rarity.ToString(),
            i.IsPlotFlagged,
            i.HomebrewDescription,
            i.PropertiesJson,
            i.CreatedAt
        })
        .ToListAsync();

    return Results.Ok(items);
});

app.MapPost("/api/characters/{characterId:guid}/items", async (
    Guid characterId, CreateItemRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var ownsCharacter = await db.Characters
        .AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (!ownsCharacter) return Results.NotFound();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest("Item name is required.");

    if (!Enum.TryParse<ItemCategory>(request.Category, out var category))
        return Results.BadRequest("Invalid category.");

    if (!Enum.TryParse<ItemRarity>(request.Rarity, out var rarity))
        return Results.BadRequest("Invalid rarity.");

    var item = new Item
    {
        CharacterId = characterId,
        Name = request.Name.Trim(),
        Category = category,
        Rarity = rarity,
        IsPlotFlagged = request.IsPlotFlagged,
        HomebrewDescription = request.HomebrewDescription,
        PropertiesJson = request.PropertiesJson ?? "{}"
    };

    db.Items.Add(item);
    await db.SaveChangesAsync();

    return Results.Ok(new
    {
        item.Id,
        item.Name,
        Category = item.Category.ToString(),
        Rarity = item.Rarity.ToString(),
        item.IsPlotFlagged,
        item.HomebrewDescription,
        item.PropertiesJson,
        item.CreatedAt
    });
});

app.MapGet("/api/characters/{characterId:guid}/slots", async (Guid characterId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var ownsCharacter = await db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (!ownsCharacter) return Results.NotFound();

    var slots = await db.EquipmentSlots
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
                s.Item.CreatedAt
            }
        })
        .ToListAsync();

    return Results.Ok(slots);
});

app.MapPost("/api/characters/{characterId:guid}/equip", async (
    Guid characterId, EquipRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var ownsCharacter = await db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (!ownsCharacter) return Results.NotFound();

    if (!Enum.TryParse<SlotType>(request.SlotType, out var slotType))
        return Results.BadRequest("Invalid slot type.");

    var item = await db.Items.FirstOrDefaultAsync(i => i.Id == request.ItemId && i.CharacterId == characterId);
    if (item is null) return Results.NotFound("Item not found on this character.");

    if (!IsValidSlotForItem(item, slotType))
        return Results.BadRequest("That item can't go in that slot.");

    var currentSlot = await db.EquipmentSlots
        .FirstOrDefaultAsync(s => s.CharacterId == characterId && s.ItemId == item.Id);
    if (currentSlot is not null) currentSlot.ItemId = null;

    var targetSlot = await db.EquipmentSlots
        .FirstAsync(s => s.CharacterId == characterId && s.SlotType == slotType);
    targetSlot.ItemId = item.Id;

    await db.SaveChangesAsync();
    return Results.Ok();
});

app.MapPost("/api/characters/{characterId:guid}/unequip", async (
    Guid characterId, UnequipRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var ownsCharacter = await db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (!ownsCharacter) return Results.NotFound();

    if (!Enum.TryParse<SlotType>(request.SlotType, out var slotType))
        return Results.BadRequest("Invalid slot type.");

    var slot = await db.EquipmentSlots
        .FirstAsync(s => s.CharacterId == characterId && s.SlotType == slotType);
    slot.ItemId = null;

    await db.SaveChangesAsync();
    return Results.Ok();
});

app.Run();

// ---------- Helpers ----------

static async Task<User?> GetCurrentUser(HttpContext ctx, AppDbContext db)
{
    if (ctx.User.Identity?.IsAuthenticated != true) return null;
    var googleId = ctx.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    if (googleId is null) return null;
    return await db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);
}

static bool IsValidSlotForItem(Item item, SlotType slot)
{
    var weaponSlots = new[] { SlotType.WeaponSet1Main, SlotType.WeaponSet1Off, SlotType.WeaponSet2Main, SlotType.WeaponSet2Off };
    var accessorySlots = new[] { SlotType.Accessory1, SlotType.Accessory2, SlotType.Accessory3, SlotType.Accessory4, SlotType.Accessory5, SlotType.Accessory6 };

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

        default:
            return false; // Consumable and Misc aren't equippable
    }
}

// ---------- Request records ----------

record CreateItemRequest(
    string Name,
    string Category,
    string Rarity,
    bool IsPlotFlagged,
    string? HomebrewDescription,
    string? PropertiesJson);

record EquipRequest(Guid ItemId, string SlotType);
record UnequipRequest(string SlotType);