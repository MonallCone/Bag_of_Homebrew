using Bag_Of_Homebrew_API.Data;
using Bag_Of_Homebrew_API.Model;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Bag_Of_Homebrew_API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public AuthController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpGet("login")]
    public IActionResult Login()
    {
        var redirectUri = _env.IsDevelopment() ? "http://localhost:5173" : "/";
        return Challenge(
            new AuthenticationProperties { RedirectUri = redirectUri },
            new[] { GoogleDefaults.AuthenticationScheme });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Ok();
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        if (HttpContext.User.Identity?.IsAuthenticated != true)
            return Unauthorized();

        var googleId = HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value!;
        var email = HttpContext.User.FindFirst(ClaimTypes.Email)?.Value!;
        var name = HttpContext.User.FindFirst(ClaimTypes.Name)?.Value!;

        var user = await _db.Users
            .Include(u => u.Characters)
            .FirstOrDefaultAsync(u => u.GoogleId == googleId);

        if (user is null)
        {
            user = new User { GoogleId = googleId, Email = email, DisplayName = name };
            _db.Users.Add(user);
            await _db.SaveChangesAsync(); // save so user.Id exists for the FK below
        }

        if (user.Characters.Count == 0)
        {
            var character = new Character { UserId = user.Id, Name = "New Character" };
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
            user.Characters.Add(character);
        }

        // Ensure the user has a vault (one per user)
        var vault = await _db.Vaults.FirstOrDefaultAsync(v => v.UserId == user.Id);
        if (vault is null)
        {
            vault = new Vault { UserId = user.Id, Name = "Vault" };
            _db.Vaults.Add(vault);
            await _db.SaveChangesAsync();
        }

        var current = user.Characters.First();
        return Ok(new
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
            user.IsPaid,
            vaultName = vault?.Name ?? "Vault",
        });
    }
}
