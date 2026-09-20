using Bag_Of_Homebrew_API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace Bag_Of_Homebrew_API.Hubs;

[Authorize] // only cookie-authenticated connections get in — matches every other endpoint
public class CampaignHub : Hub
{
    private readonly AppDbContext _db;

    public CampaignHub(AppDbContext db)
    {
        _db = db;
    }

    // Runs once per socket connection. Puts the connection in a "user:{id}"
    // group so the server can push straight at one person regardless of
    // which campaign/page they're looking at.
    public override async Task OnConnectedAsync()
    {
        var googleId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = googleId is null ? null : await _db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);
        if (user is not null)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{user.Id}");
        }
        await base.OnConnectedAsync();
    }

    // Client calls this after connecting, once it knows which campaign
    // it's viewing, so it can also receive campaign-wide broadcasts
    // (e.g. the vault changing).
    public async Task JoinCampaign(Guid campaignId)
    {
        var googleId = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var user = googleId is null ? null : await _db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);
        if (user is null) return;

        // Don't let someone join a campaign group they're not actually in.
        var isMember = await _db.CampaignMemberships
            .AnyAsync(m => m.CampaignId == campaignId && m.UserId == user.Id);
        if (!isMember) return;

        await Groups.AddToGroupAsync(Context.ConnectionId, $"campaign:{campaignId}");
    }

    public Task LeaveCampaign(Guid campaignId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, $"campaign:{campaignId}");
}
