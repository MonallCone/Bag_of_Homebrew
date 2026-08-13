namespace Bag_Of_Homebrew_API.Model;

public class Campaign
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid GmUserId { get; set; }          // the GM (owner)
    public User GmUser { get; set; } = null!;

    public string Name { get; set; } = null!;
    public string InviteCode { get; set; } = null!;   // short code players enter to join
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Each campaign has its own vault (separate from the GM's personal vault)
    public Guid VaultId { get; set; }
    public Vault Vault { get; set; } = null!;

    public List<CampaignMembership> Memberships { get; set; } = new();
}