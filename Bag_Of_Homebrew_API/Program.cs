using Bag_Of_Homebrew_API.Data;
using Bag_Of_Homebrew_API.Dtos;
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

// DEV ONLY — remove before any real deployment
if (app.Environment.IsDevelopment())
{
    app.MapGet("/api/dev/login-as/{name}", async (string name, HttpContext ctx, AppDbContext db) =>
    {
        // Find or create a fake user keyed by a fake "GoogleId"
        var fakeGoogleId = $"dev-{name}";
        var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleId == fakeGoogleId);
        if (user is null)
        {
            user = new User { GoogleId = fakeGoogleId, Email = $"{name}@dev.local", DisplayName = name };
            db.Users.Add(user);
            await db.SaveChangesAsync();
        }

        // Sign them in with the same cookie scheme Google uses
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, fakeGoogleId),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.DisplayName)
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await ctx.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(identity));

        return Results.Redirect("http://localhost:5173");
    });
}

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

    // Ensure the user has a vault (one per user)
    var vault = await db.Vaults.FirstOrDefaultAsync(v => v.UserId == user.Id);
    if (vault is null)
    {
        vault = new Vault { UserId = user.Id, Name = "Vault" };
        db.Vaults.Add(vault);
        await db.SaveChangesAsync();
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
        VaultId = vault.Id,
        user.IsPaid
    });
});

// GET vault items
app.MapGet("/api/vaults/{vaultId:guid}/items", async (Guid vaultId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();
    if (!await OwnsVault(vaultId, user, db)) return Results.NotFound();

    var items = (await db.Items
        .Where(i => i.VaultId == vaultId)
        .OrderByDescending(i => i.CreatedAt)
        .ToListAsync())
        .Select(ItemDto.From);

    return Results.Ok(items);
});

// CREATE vault item
app.MapPost("/api/vaults/{vaultId:guid}/items", async (
    Guid vaultId, CreateItemRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();
    if (!await OwnsVault(vaultId, user, db)) return Results.NotFound();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest("Item name is required.");
    if (!Enum.TryParse<ItemCategory>(request.Category, out var category))
        return Results.BadRequest("Invalid category.");
    if (!Enum.TryParse<ItemRarity>(request.Rarity, out var rarity))
        return Results.BadRequest("Invalid rarity.");

    var item = new Item
    {
        VaultId = vaultId,
        Name = request.Name.Trim(),
        Category = category,
        Rarity = rarity,
        IsPlotFlagged = request.IsPlotFlagged,
        HomebrewDescription = request.HomebrewDescription,
        PropertiesJson = request.PropertiesJson ?? "{}",
        ImageUrl = request.ImageUrl,
        Quantity = category == ItemCategory.Consumable ? (request.Quantity ?? 1) : null
    };

    db.Items.Add(item);
    await db.SaveChangesAsync();
    return Results.Ok(ItemDto.From(item));
});

// DELETE vault item
app.MapDelete("/api/vaults/{vaultId:guid}/items/{itemId:guid}", async (
    Guid vaultId, Guid itemId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();
    if (!await OwnsVault(vaultId, user, db)) return Results.NotFound();

    var item = await db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == vaultId);
    if (item is null) return Results.NotFound();

    db.Items.Remove(item);
    await db.SaveChangesAsync();
    return Results.Ok();
});

// ADJUST quantity (vault)
app.MapPatch("/api/vaults/{vaultId:guid}/items/{itemId:guid}/quantity", async (
    Guid vaultId, Guid itemId, AdjustQuantityRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();
    if (!await OwnsVault(vaultId, user, db)) return Results.NotFound();

    var item = await db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == vaultId);
    if (item is null) return Results.NotFound();
    if (item.Category != ItemCategory.Consumable) return Results.BadRequest("Not a consumable.");

    var current = item.Quantity ?? 0;
    item.Quantity = Math.Max(0, current + request.Delta);
    await db.SaveChangesAsync();
    return Results.Ok(new { item.Quantity });
});

// UPDATE properties (vault)
app.MapPatch("/api/vaults/{vaultId:guid}/items/{itemId:guid}/properties", async (
    Guid vaultId, Guid itemId, UpdatePropertiesRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();
    if (!await OwnsVault(vaultId, user, db)) return Results.NotFound();

    var item = await db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == vaultId);
    if (item is null) return Results.NotFound();

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

app.MapPost("/api/characters/{characterId:guid}/items/{itemId:guid}/return-to-vault", async (
    Guid characterId, Guid itemId, ReturnToVaultRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    // Verify the character belongs to this user
    var ownsCharacter = await db.Characters.AnyAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (!ownsCharacter) return Results.NotFound("Character not found.");

    // Verify the target vault belongs to this user (in solo play, it's their own vault)
    if (!await OwnsVault(request.VaultId, user, db))
        return Results.NotFound("Vault not found.");

    var item = await db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.CharacterId == characterId);
    if (item is null) return Results.NotFound("Item not found on this character.");

    // If equipped, clear it from any slot(s) it occupies (two-handed = two slots)
    var slots = await db.EquipmentSlots
        .Where(s => s.CharacterId == characterId && s.ItemId == itemId)
        .ToListAsync();
    foreach (var s in slots) s.ItemId = null;

    // Move ownership: character → vault
    item.CharacterId = null;
    item.VaultId = request.VaultId;

    await db.SaveChangesAsync();
    return Results.Ok();
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
        .ToListAsync();                       // materialize entities first

    return Results.Ok(items.Select(ItemDto.From));   // map in memory
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
    return Results.Ok(ItemDto.From(item));
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

app.MapGet("/api/characters", async (HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var characters = await db.Characters
        .Where(c => c.UserId == user.Id)
        .OrderBy(c => c.CreatedAt)
        .Select(c => new { c.Id, c.Name, c.PortraitUrl })
        .ToListAsync();

    return Results.Ok(characters);
});

app.MapGet("/api/characters/{characterId:guid}", async (Guid characterId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var character = await db.Characters
        .FirstOrDefaultAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (character is null) return Results.NotFound();

    return Results.Ok(new
    {
        character.Id,
        character.Name,
        character.PortraitUrl,
        character.PdfSheetUrl,
        character.ManualAc
    });
});

app.MapPost("/api/vaults/{vaultId:guid}/items/{itemId:guid}/send-to-character", async (
    Guid vaultId, Guid itemId, SendToCharacterRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    if (!await OwnsVault(vaultId, user, db))
        return Results.NotFound("Vault not found.");

    // The target character must belong to this user (solo play)
    var ownsCharacter = await db.Characters.AnyAsync(c => c.Id == request.CharacterId && c.UserId == user.Id);
    if (!ownsCharacter) return Results.NotFound("Character not found.");

    var item = await db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == vaultId);
    if (item is null) return Results.NotFound("Item not found in this vault.");

    // Move ownership: vault → character
    item.VaultId = null;
    item.CharacterId = request.CharacterId;

    await db.SaveChangesAsync();
    return Results.Ok();
});

app.MapPost("/api/characters", async (CreateCharacterRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest("Character name is required.");

    // Free-tier limit: 1 character. Paid: unlimited.
    var characterCount = await db.Characters.CountAsync(c => c.UserId == user.Id);
    if (!user.IsPaid && characterCount >= 1)
        return Results.BadRequest("Free accounts are limited to one character. Upgrade to create more.");

    var character = new Character { UserId = user.Id, Name = request.Name.Trim() };
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

    return Results.Ok(new { character.Id, character.Name });
});

app.MapDelete("/api/characters/{characterId:guid}", async (Guid characterId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var character = await db.Characters
        .FirstOrDefaultAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (character is null) return Results.NotFound();

    // Delete the character's items outright
    var items = await db.Items.Where(i => i.CharacterId == characterId).ToListAsync();
    db.Items.RemoveRange(items);

    // Delete its equipment slots
    var slots = await db.EquipmentSlots.Where(s => s.CharacterId == characterId).ToListAsync();
    db.EquipmentSlots.RemoveRange(slots);

    db.Characters.Remove(character);
    await db.SaveChangesAsync();
    return Results.Ok();
});

// RENAME character
app.MapPut("/api/characters/{characterId:guid}/name", async (
    Guid characterId, RenameCharacterRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest("Name is required.");

    var character = await db.Characters
        .FirstOrDefaultAsync(c => c.Id == characterId && c.UserId == user.Id);
    if (character is null) return Results.NotFound();

    character.Name = request.Name.Trim();
    await db.SaveChangesAsync();
    return Results.Ok(new { character.Id, character.Name });
});

app.MapPost("/api/campaigns", async (CreateCampaignRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    // Only paid users can host campaigns
    if (!user.IsPaid)
        return Results.BadRequest("Hosting a campaign requires a paid account.");

    if (string.IsNullOrWhiteSpace(request.Name))
        return Results.BadRequest("Campaign name is required.");

    // The campaign's own vault (separate from the GM's personal vault)
    var vault = new Vault { Name = $"{request.Name.Trim()} Vault" };
    db.Vaults.Add(vault);

    // Generate a unique invite code (retry on the rare collision)
    string code;
    do { code = GenerateInviteCode(); }
    while (await db.Campaigns.AnyAsync(c => c.InviteCode == code));

    var campaign = new Campaign
    {
        GmUserId = user.Id,
        Name = request.Name.Trim(),
        InviteCode = code,
        VaultId = vault.Id
    };
    db.Campaigns.Add(campaign);

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
    db.CampaignMemberships.Add(membership);

    await db.SaveChangesAsync();

    return Results.Ok(new
    {
        campaign.Id,
        campaign.Name,
        campaign.InviteCode,
        campaign.VaultId
    });
});

app.MapGet("/api/campaigns", async (HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var campaigns = await db.CampaignMemberships
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

    return Results.Ok(campaigns);
});

app.MapPost("/api/campaigns/join", async (JoinCampaignRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    if (string.IsNullOrWhiteSpace(request.InviteCode))
        return Results.BadRequest("Invite code is required.");

    var code = request.InviteCode.Trim().ToUpperInvariant();
    var campaign = await db.Campaigns.FirstOrDefaultAsync(c => c.InviteCode == code);
    if (campaign is null)
        return Results.NotFound("No campaign found with that code.");

    // Already a member?
    var existing = await db.CampaignMemberships
        .FirstOrDefaultAsync(m => m.CampaignId == campaign.Id && m.UserId == user.Id);
    if (existing is not null)
        return Results.BadRequest("You're already in this campaign.");

    // Verify the character they're bringing belongs to them
    var character = await db.Characters
        .FirstOrDefaultAsync(c => c.Id == request.CharacterId && c.UserId == user.Id);
    if (character is null)
        return Results.NotFound("Character not found.");

    var membership = new CampaignMembership
    {
        CampaignId = campaign.Id,
        UserId = user.Id,
        CharacterId = character.Id,
        Role = CampaignRole.Player
    };
    db.CampaignMemberships.Add(membership);
    await db.SaveChangesAsync();

    return Results.Ok(new
    {
        campaign.Id,
        campaign.Name,
        campaign.VaultId
    });
});

app.MapPost("/api/campaigns/{campaignId:guid}/leave", async (Guid campaignId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var membership = await db.CampaignMemberships
        .FirstOrDefaultAsync(m => m.CampaignId == campaignId && m.UserId == user.Id);
    if (membership is null) return Results.NotFound();

    // A GM can't "leave" their own campaign — they'd delete it instead (later feature)
    if (membership.Role == CampaignRole.Gm)
        return Results.BadRequest("The GM can't leave; delete the campaign instead.");

    db.CampaignMemberships.Remove(membership);
    await db.SaveChangesAsync();
    return Results.Ok();
});

app.MapGet("/api/campaigns/{campaignId:guid}/members", async (Guid campaignId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    // Caller must be a member to see the roster
    var isMember = await db.CampaignMemberships
        .AnyAsync(m => m.CampaignId == campaignId && m.UserId == user.Id);
    if (!isMember) return Results.NotFound();

    var members = await db.CampaignMemberships
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

    return Results.Ok(members);
});

app.MapGet("/api/campaigns/{campaignId:guid}/vault/items", async (Guid campaignId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();
    var membership = await GetMembership(campaignId, user, db);
    if (membership is null) return Results.NotFound();
    var campaign = await db.Campaigns.FirstAsync(c => c.Id == campaignId);

    var items = (await db.Items
        .Where(i => i.VaultId == campaign.VaultId)
        .OrderByDescending(i => i.CreatedAt)
        .ToListAsync())
        .Select(ItemDto.From);

    return Results.Ok(new { items, isGm = membership.Role == CampaignRole.Gm, vaultId = campaign.VaultId });
});

app.MapPost("/api/campaigns/{campaignId:guid}/vault/items", async (
    Guid campaignId, CreateItemRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var membership = await GetMembership(campaignId, user, db);
    if (membership is null) return Results.NotFound();
    if (membership.Role != CampaignRole.Gm)
        return Results.Forbid();   // only the GM edits the campaign vault

    var campaign = await db.Campaigns.FirstAsync(c => c.Id == campaignId);

    if (string.IsNullOrWhiteSpace(request.Name)) return Results.BadRequest("Name required.");
    if (!Enum.TryParse<ItemCategory>(request.Category, out var category)) return Results.BadRequest("Bad category.");
    if (!Enum.TryParse<ItemRarity>(request.Rarity, out var rarity)) return Results.BadRequest("Bad rarity.");

    var item = new Item
    {
        VaultId = campaign.VaultId,
        Name = request.Name.Trim(),
        Category = category,
        Rarity = rarity,
        IsPlotFlagged = request.IsPlotFlagged,
        HomebrewDescription = request.HomebrewDescription,
        PropertiesJson = request.PropertiesJson ?? "{}",
        ImageUrl = request.ImageUrl,
        Quantity = category == ItemCategory.Consumable ? (request.Quantity ?? 1) : null
    };
    db.Items.Add(item);
    await db.SaveChangesAsync();

    return Results.Ok(new { item.Id });   // frontend re-fetches
});

app.MapDelete("/api/campaigns/{campaignId:guid}/vault/items/{itemId:guid}", async (
    Guid campaignId, Guid itemId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();
    var membership = await GetMembership(campaignId, user, db);
    if (membership is null) return Results.NotFound();
    if (membership.Role != CampaignRole.Gm) return Results.Forbid();

    var campaign = await db.Campaigns.FirstAsync(c => c.Id == campaignId);
    var item = await db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == campaign.VaultId);
    if (item is null) return Results.NotFound();

    db.Items.Remove(item);
    await db.SaveChangesAsync();
    return Results.Ok();
});

app.MapGet("/api/campaigns/{campaignId:guid}/members/{memberUserId:guid}/character", async (
    Guid campaignId, Guid memberUserId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    // Caller must be in the campaign
    var callerMembership = await GetMembership(campaignId, user, db);
    if (callerMembership is null) return Results.NotFound();

    // The target member must be in the campaign and have a character
    var targetMembership = await db.CampaignMemberships
        .FirstOrDefaultAsync(m => m.CampaignId == campaignId && m.UserId == memberUserId);
    if (targetMembership?.CharacterId is null) return Results.NotFound();

    var characterId = targetMembership.CharacterId.Value;
    var character = await db.Characters.FirstAsync(c => c.Id == characterId);

    var items = await db.Items
        .Where(i => i.CharacterId == characterId)
        .OrderByDescending(i => i.CreatedAt)
        .Select(i => new {
            i.Id,
            i.Name,
            Category = i.Category.ToString(),
            Rarity = i.Rarity.ToString(),
            i.IsPlotFlagged,
            i.HomebrewDescription,
            i.PropertiesJson,
            i.ImageUrl,
            i.Quantity,
            i.CreatedAt
        })
        .ToListAsync();

    var slots = await db.EquipmentSlots
        .Where(s => s.CharacterId == characterId)
        .Include(s => s.Item)
        .Select(s => new {
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
                s.Item.ImageUrl,
                s.Item.Quantity,
                s.Item.CreatedAt
            }
        })
        .ToListAsync();

    // Is this the caller's own character? (determines editability on the frontend)
    var isOwn = targetMembership.UserId == user.Id;

    return Results.Ok(new
    {
        character.Id,
        character.Name,
        character.PortraitUrl,
        character.PdfSheetUrl,
        character.ManualAc,
        items,
        slots,
        isOwn
    });
});

app.MapPost("/api/campaigns/{campaignId:guid}/return-to-vault", async (
    Guid campaignId, ReturnToCampaignVaultRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    // Caller must be a member of the campaign
    var membership = await GetMembership(campaignId, user, db);
    if (membership is null) return Results.NotFound("Not a member of this campaign.");

    var campaign = await db.Campaigns.FirstAsync(c => c.Id == campaignId);

    // The item must be on a character the caller owns
    var item = await db.Items
        .Include(i => i.Character)
        .FirstOrDefaultAsync(i => i.Id == request.ItemId);
    if (item is null) return Results.NotFound("Item not found.");
    if (item.Character is null || item.Character.UserId != user.Id)
        return Results.Forbid();   // can't return someone else's item

    var characterId = item.CharacterId!.Value;

    // Clear it from any equipment slot(s) it occupies
    var slots = await db.EquipmentSlots
        .Where(s => s.CharacterId == characterId && s.ItemId == item.Id)
        .ToListAsync();
    foreach (var s in slots) s.ItemId = null;

    // Move ownership: character → campaign vault
    item.CharacterId = null;
    item.VaultId = campaign.VaultId;

    await db.SaveChangesAsync();
    return Results.Ok();
});

app.MapPost("/api/campaigns/{campaignId:guid}/gift", async (
    Guid campaignId, GiftItemRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    // Sender must be a member of the campaign
    var senderMembership = await GetMembership(campaignId, user, db);
    if (senderMembership is null) return Results.NotFound("You're not in this campaign.");

    // Recipient must also be a member, and have a character in this campaign
    var recipientMembership = await db.CampaignMemberships
        .FirstOrDefaultAsync(m => m.CampaignId == campaignId && m.UserId == request.ToUserId);
    if (recipientMembership is null)
        return Results.BadRequest("Recipient isn't in this campaign.");
    if (recipientMembership.CharacterId is null)
        return Results.BadRequest("Recipient has no character to receive items.");

    // Can't gift to yourself
    if (request.ToUserId == user.Id)
        return Results.BadRequest("You can't send an item to yourself.");

    // The item must be on a character the sender owns
    var item = await db.Items
        .Include(i => i.Character)
        .FirstOrDefaultAsync(i => i.Id == request.ItemId);
    if (item is null) return Results.NotFound("Item not found.");
    if (item.Character is null || item.Character.UserId != user.Id)
        return Results.Forbid();   // can't gift someone else's item, or a vault item

    // Prevent gifting an item that's already mid-transfer
    var alreadyPending = await db.ItemTransfers
        .AnyAsync(t => t.ItemId == item.Id && t.Status == TransferStatus.Pending);
    if (alreadyPending)
        return Results.BadRequest("This item is already being gifted.");

    var transfer = new ItemTransfer
    {
        ItemId = item.Id,
        CampaignId = campaignId,
        FromUserId = user.Id,
        ToUserId = request.ToUserId,
        ToCharacterId = recipientMembership.CharacterId.Value,
        Status = TransferStatus.Pending
    };
    db.ItemTransfers.Add(transfer);
    await db.SaveChangesAsync();

    return Results.Ok(new { transfer.Id });
});

app.MapGet("/api/campaigns/{campaignId:guid}/transfers/incoming", async (
    Guid campaignId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var membership = await GetMembership(campaignId, user, db);
    if (membership is null) return Results.NotFound();

    var transfers = await db.ItemTransfers
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

    return Results.Ok(result);
});

app.MapGet("/api/campaigns/{campaignId:guid}/transfers/outgoing", async (
    Guid campaignId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var membership = await GetMembership(campaignId, user, db);
    if (membership is null) return Results.NotFound();

    var transfers = await db.ItemTransfers
        .Where(t => t.CampaignId == campaignId
                 && t.FromUserId == user.Id
                 && t.Status == TransferStatus.Pending)
        .Select(t => new { transferId = t.Id, itemId = t.ItemId, toUserId = t.ToUserId })
        .ToListAsync();

    return Results.Ok(transfers);
});

app.MapPost("/api/campaigns/{campaignId:guid}/transfers/{transferId:guid}/accept", async (
    Guid campaignId, Guid transferId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var transfer = await db.ItemTransfers
        .Include(t => t.Item)
        .FirstOrDefaultAsync(t => t.Id == transferId && t.CampaignId == campaignId);
    if (transfer is null) return Results.NotFound();

    // Only the recipient can accept
    if (transfer.ToUserId != user.Id) return Results.Forbid();
    if (transfer.Status != TransferStatus.Pending) return Results.BadRequest("Transfer already resolved.");

    // The item might have been deleted or moved since the offer — guard it
    var item = transfer.Item;
    if (item is null) { transfer.Status = TransferStatus.Rejected; await db.SaveChangesAsync(); return Results.NotFound("Item no longer exists."); }

    // Move the item to the recipient's character
    // (clear any slot on the sender's side first, in case they equipped it after offering)
    var oldSlots = await db.EquipmentSlots
        .Where(s => s.ItemId == item.Id)
        .ToListAsync();
    foreach (var s in oldSlots) s.ItemId = null;

    item.CharacterId = transfer.ToCharacterId;
    item.VaultId = null;

    transfer.Status = TransferStatus.Accepted;
    await db.SaveChangesAsync();

    return Results.Ok();
});

app.MapPost("/api/campaigns/{campaignId:guid}/transfers/{transferId:guid}/reject", async (
    Guid campaignId, Guid transferId, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var transfer = await db.ItemTransfers
        .FirstOrDefaultAsync(t => t.Id == transferId && t.CampaignId == campaignId);
    if (transfer is null) return Results.NotFound();

    // Either the recipient (declining) or the sender (cancelling) can reject
    if (transfer.ToUserId != user.Id && transfer.FromUserId != user.Id)
        return Results.Forbid();
    if (transfer.Status != TransferStatus.Pending) return Results.BadRequest("Transfer already resolved.");

    transfer.Status = TransferStatus.Rejected;
    await db.SaveChangesAsync();

    return Results.Ok();
});

app.MapPost("/api/campaigns/{campaignId:guid}/vault/items/{itemId:guid}/send-to-character", async (
    Guid campaignId, Guid itemId, SendVaultItemRequest request, HttpContext ctx, AppDbContext db) =>
{
    var user = await GetCurrentUser(ctx, db);
    if (user is null) return Results.Unauthorized();

    var membership = await GetMembership(campaignId, user, db);
    if (membership is null) return Results.NotFound();
    if (membership.Role != CampaignRole.Gm)
        return Results.Forbid();   // only the GM distributes from the campaign vault

    var campaign = await db.Campaigns.FirstAsync(c => c.Id == campaignId);

    // Item must be in this campaign's vault
    var item = await db.Items.FirstOrDefaultAsync(i => i.Id == itemId && i.VaultId == campaign.VaultId);
    if (item is null) return Results.NotFound("Item not in this campaign's vault.");

    // Target must be a player in this campaign with a character
    var targetMembership = await db.CampaignMemberships
        .FirstOrDefaultAsync(m => m.CampaignId == campaignId && m.UserId == request.ToUserId);
    if (targetMembership?.CharacterId is null)
        return Results.BadRequest("Target player has no character in this campaign.");

    // Move ownership: campaign vault → player's character
    item.VaultId = null;
    item.CharacterId = targetMembership.CharacterId.Value;

    await db.SaveChangesAsync();
    return Results.Ok();
});

app.Run();

// ---------- Helpers ----------

static string GenerateInviteCode()
{
    // Avoids ambiguous chars (0/O, 1/I/L) for readability
    const string chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    var rng = Random.Shared;
    return new string(Enumerable.Range(0, 6).Select(_ => chars[rng.Next(chars.Length)]).ToArray());
}

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

static async Task<bool> OwnsVault(Guid vaultId, User user, AppDbContext db)
    => await db.Vaults.AnyAsync(v => v.Id == vaultId && v.UserId == user.Id);

static async Task<CampaignMembership?> GetMembership(Guid campaignId, User user, AppDbContext db)
    => await db.CampaignMemberships
        .FirstOrDefaultAsync(m => m.CampaignId == campaignId && m.UserId == user.Id);

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
record ReturnToVaultRequest(Guid VaultId);
record SendToCharacterRequest(Guid CharacterId);
record CreateCharacterRequest(string Name);
record RenameCharacterRequest(string Name);
record CreateCampaignRequest(string Name);
record JoinCampaignRequest(string InviteCode, Guid CharacterId);
record ReturnToCampaignVaultRequest(Guid ItemId);
record GiftItemRequest(Guid ItemId, Guid ToUserId);
record SendVaultItemRequest(Guid ToUserId);