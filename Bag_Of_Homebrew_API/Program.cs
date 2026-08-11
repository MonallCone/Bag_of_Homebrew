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
app.UseStaticFiles();
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
        CharacterName = current.Name,
        current.PortraitUrl,
        current.PdfSheetUrl,
        current.ManualAc,
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
            i.ImageUrl,
            i.CreatedAt,
            i.Quantity
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
        PropertiesJson = request.PropertiesJson ?? "{}",
        ImageUrl = request.ImageUrl,
        Quantity = category == ItemCategory.Consumable ? (request.Quantity ?? 1) : null,
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
        item.CreatedAt,
        item.ImageUrl,
        item.Quantity
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
                s.Item.CreatedAt,
                s.Item.ImageUrl,
                s.Item.Quantity
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

    // Determine if this equip occupies two slots
    var handedness = GetHandedness(item);
    var wantsTwoHanded = handedness == "TwoHanded" || (handedness == "Versatile" && request.TwoHanded);

    SlotType? offHand = null;
    if (wantsTwoHanded)
    {
        offHand = PairedOffHand(slotType);
        if (offHand is null)
            return Results.BadRequest("Two-handed weapons must be equipped to a main hand.");
    }

    // Clear this item from any slots it currently occupies (it may already be equipped elsewhere)
    var existing = await db.EquipmentSlots
        .Where(s => s.CharacterId == characterId && s.ItemId == item.Id)
        .ToListAsync();
    foreach (var s in existing) s.ItemId = null;

    // Fill the main slot
    var targetSlot = await db.EquipmentSlots.FirstAsync(s => s.CharacterId == characterId && s.SlotType == slotType);
    targetSlot.ItemId = item.Id;

    // Fill the off-hand too, if two-handed
    if (offHand is not null)
    {
        var offSlot = await db.EquipmentSlots.FirstAsync(s => s.CharacterId == characterId && s.SlotType == offHand);
        offSlot.ItemId = item.Id;
    }

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

    var slot = await db.EquipmentSlots.FirstAsync(s => s.CharacterId == characterId && s.SlotType == slotType);
    var itemId = slot.ItemId;

    // Clear this slot AND any other slot holding the same item (two-handed pairing)
    if (itemId is not null)
    {
        var sharing = await db.EquipmentSlots
            .Where(s => s.CharacterId == characterId && s.ItemId == itemId)
            .ToListAsync();
        foreach (var s in sharing) s.ItemId = null;
    }
    else
    {
        slot.ItemId = null;
    }

    await db.SaveChangesAsync();
    return Results.Ok();
});

app.MapPost("/api/images/{kind}", async (string kind, HttpRequest request, HttpContext ctx, AppDbContext db, IWebHostEnvironment env) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    if (kind is not ("items" or "portraits" or "sheets"))
        return Results.BadRequest("Invalid upload kind.");

    if (!request.HasFormContentType)
        return Results.BadRequest("Expected multipart form data.");

    var form = await request.ReadFormAsync();
    var file = form.Files.FirstOrDefault();
    if (file is null || file.Length == 0)
        return Results.BadRequest("No file provided.");

    string extension;
    if (kind == "sheets")
    {
        if (file.ContentType != "application/pdf")
            return Results.BadRequest("Character sheets ,ust be Pdf's");
        extension = ".pdf";
    }
    else
    {
        var allowed = new Dictionary<string, string>
        {
            ["image/png"] = ".png",
            ["image/jpeg"] = ".jpg",
            ["image/webp"] = ".webp",
            ["image/gif"] = ".gif"
        };

        if (!allowed.TryGetValue(file.ContentType, out var imgExt))
            return Results.BadRequest("Only PNG, JPEG, WebP, or GIF images are allowed.");
        extension = imgExt;


        // 5MB cap
        const long maxBytes = 5 * 1024 * 1024;
        if (file.Length > maxBytes)
            return Results.BadRequest("Image must be under 5MB.");

    }

    // Server-generated filename: never trust the client's
    var fileName = $"{Guid.NewGuid()}{extension}";
    var directory = Path.Combine(env.WebRootPath, "uploads", kind);
    Directory.CreateDirectory(directory);

    var fullPath = Path.Combine(directory, fileName);
    await using (var stream = File.Create(fullPath))
    {
        await file.CopyToAsync(stream);
    }

    var url = $"/uploads/{kind}/{fileName}";
    return Results.Ok(new { url });
});

app.MapGet("/api/images/defaults", (IWebHostEnvironment env) =>
{
    var directory = Path.Combine(env.WebRootPath, "defaults", "items");
    if (!Directory.Exists(directory))
        return Results.Ok(Array.Empty<object>());

    var urls = Directory.GetFiles(directory)
        .Select(f => $"/defaults/items/{Path.GetFileName(f)}")
        .ToArray();

    return Results.Ok(urls);
});

app.MapPut("/api/characters/{characterId:guid}/portrait", async (
    Guid characterId, SetPortraitRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var character = await db.Characters
        .FirstOrDefaultAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (character is null) return Results.NotFound();

    character.PortraitUrl = request.PortraitUrl;
    await db.SaveChangesAsync();
    return Results.Ok();
});

app.MapDelete("/api/characters/{characterId:guid}/items/{itemId:guid}", async (
    Guid characterId, Guid itemId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var ownsCharacter = await db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (!ownsCharacter) return Results.NotFound();

    var item = await db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.CharacterId == characterId);
    if (item is null) return Results.NotFound();

    // If equipped, clear the slot first
    var slot = await db.EquipmentSlots
        .FirstOrDefaultAsync(s => s.CharacterId == characterId && s.ItemId == itemId);
    if (slot is not null) slot.ItemId = null;

    db.Items.Remove(item);
    await db.SaveChangesAsync();
    return Results.Ok();
});

app.MapPatch("/api/characters/{characterId:guid}/items/{itemId:guid}/quantity", async (
    Guid characterId, Guid itemId, AdjustQuantityRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var ownsCharacter = await db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (!ownsCharacter) return Results.NotFound();

    var item = await db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.CharacterId == characterId);
    if (item is null) return Results.NotFound();
    if (item.Category != ItemCategory.Consumable) return Results.BadRequest("Not a consumable.");

    var current = item.Quantity ?? 0;
    item.Quantity = Math.Max(0, current + request.Delta);  // floors at 0, never deletes

    await db.SaveChangesAsync();
    return Results.Ok(new { item.Quantity });
});

app.MapPut("/api/characters/{characterId:guid}/sheet", async (
    Guid characterId, SetSheetRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var character = await db.Characters
        .FirstOrDefaultAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (character is null) return Results.NotFound();

    character.PdfSheetUrl = request.PdfSheetUrl;
    await db.SaveChangesAsync();
    return Results.Ok();
});

app.MapPatch("/api/characters/{characterId:guid}/items/{itemId:guid}/properties", async (
    Guid characterId, Guid itemId, UpdatePropertiesRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var ownsCharacter = await db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (!ownsCharacter) return Results.NotFound();

    var item = await db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.CharacterId == characterId);
    if (item is null) return Results.NotFound();

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
    await db.SaveChangesAsync();
    return Results.Ok();
});

app.MapPut("/api/characters/{characterId:guid}/ac", async (
    Guid characterId, SetAcRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var character = await db.Characters
        .FirstOrDefaultAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (character is null) return Results.NotFound();

    character.ManualAc = request.ManualAc;
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

static string? GetHandedness(Item item)
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

static SlotType? PairedOffHand(SlotType main) => main switch
{
    SlotType.WeaponSet1Main => SlotType.WeaponSet1Off,
    SlotType.WeaponSet2Main => SlotType.WeaponSet2Off,
    _ => null
};

// ---------- Request records ----------

record CreateItemRequest(
    string Name,
    string Category,
    string Rarity,
    bool IsPlotFlagged,
    string? HomebrewDescription,
    string? PropertiesJson,
    string? ImageUrl,
    int? Quantity);

record EquipRequest(Guid ItemId, string SlotType, bool TwoHanded = false);
record UnequipRequest(string SlotType);
record SetPortraitRequest(string? PortraitUrl);
record AdjustQuantityRequest(int Delta);
record SetSheetRequest(string? PdfSheetUrl);
record UpdatePropertiesRequest(Dictionary<string, string> Properties);
record SetAcRequest(string? ManualAc);