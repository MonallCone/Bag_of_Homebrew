namespace Bag_Of_Homebrew_API.Model;

public class Vault
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? UserId { get; set; }
    public User? User { get; set; }

    public Guid? CampaignId { get; set; }

    public string Name { get; set; } = "Vault";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<Item> Items { get; set; } = new();
}