using Bag_Of_Homebrew_API.Data;
using Microsoft.AspNetCore.Mvc;
using static Bag_Of_Homebrew_API.Helpers.EndpointHelpers;

namespace Bag_Of_Homebrew_API.Controllers;

[ApiController]
[Route("api/images")]
public class ImagesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public ImagesController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    [HttpPost("{kind}")]
    public async Task<IActionResult> Upload(string kind)
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        if (kind is not ("items" or "portraits" or "sheets"))
            return BadRequest("Invalid upload kind.");

        if (!Request.HasFormContentType)
            return BadRequest("Expected multipart form data.");

        var form = await Request.ReadFormAsync();
        var file = form.Files.FirstOrDefault();
        if (file is null || file.Length == 0)
            return BadRequest("No file provided.");

        string extension;

        if (kind == "sheets")
        {
            if (!user.IsPaid)
                return BadRequest("Uploading character sheet PDFs is a paid feature.");

            if (file.ContentType != "application/pdf")
                return BadRequest("Character sheets ,ust be Pdf's");

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
                return BadRequest("Only PNG, JPEG, WebP, or GIF images are allowed.");
            extension = imgExt;

            // 5MB cap
            const long maxBytes = 5 * 1024 * 1024;
            if (file.Length > maxBytes)
                return BadRequest("Image must be under 5MB.");
        }

        // Server-generated filename: never trust the client's
        var fileName = $"{Guid.NewGuid()}{extension}";
        var directory = Path.Combine(_env.WebRootPath, "uploads", kind);
        Directory.CreateDirectory(directory);

        var fullPath = Path.Combine(directory, fileName);
        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream);
        }

        var url = $"/uploads/{kind}/{fileName}";
        return Ok(new { url });
    }

    [HttpGet("defaults")]
    public IActionResult GetDefaults()
    {
        var root = Path.Combine(_env.WebRootPath, "defaults");
        if (!Directory.Exists(root))
            return Ok(Array.Empty<object>());

        // disk folder name -> ItemCategory value the frontend expects
        var categoryFolders = new Dictionary<string, string>
        {
            ["weapon"] = "Weapon",
            ["armour"] = "Armour",
            ["accessory"] = "Accessory",
            ["consumable"] = "Consumable",
            ["misc"] = "Misc"
        };

        var results = new List<object>();

        foreach (var (folder, category) in categoryFolders)
        {
            var dir = Path.Combine(root, folder);
            if (!Directory.Exists(dir)) continue;

            foreach (var f in Directory.GetFiles(dir))
            {
                results.Add(new { url = $"/defaults/{folder}/{Path.GetFileName(f)}", category });
            }
        }

        return Ok(results);
    }
}
