namespace Bag_Of_Homebrew_API.Model;

public enum CampaignRole { Gm, Player }

public class CampaignMembership
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CampaignId { get; set; }
    public Campaign Campaign { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    // The character this user brings into the campaign.
    // Null for the GM (the GM brings the vault, not a character).
    public Guid? CharacterId { get; set; }
    public Character? Character { get; set; }

    public CampaignRole Role { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
}