using Bag_Of_Homebrew_API.Data;
using Microsoft.AspNetCore.Mvc;
using static Bag_Of_Homebrew_API.Helpers.EndpointHelpers;

namespace Bag_Of_Homebrew_API.Controllers;

[ApiController]
[Route("api/me")]
public class MeController : ControllerBase
{
    private readonly AppDbContext _db;

    public MeController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("item-usage")]
    public async Task<IActionResult> GetItemUsage()
    {
        var user = await GetCurrentUser(HttpContext, _db);
        if (user is null) return Unauthorized();

        var count = await CountUserItems(user, _db);
        return Ok(new { count, limit = user.IsPaid ? (int?)null : 50, isPaid = user.IsPaid });
    }
}
