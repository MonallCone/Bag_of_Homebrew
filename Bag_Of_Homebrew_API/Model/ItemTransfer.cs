namespace Bag_Of_Homebrew_API.Model;

public enum TransferStatus { Pending, Accepted, Rejected }

public class ItemTransfer
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid ItemId { get; set; }
    public Item Item { get; set; } = null!;

    public Guid CampaignId { get; set; }
    public Campaign Campaign { get; set; } = null!;

    public Guid FromUserId { get; set; }        // sender
    public Guid ToUserId { get; set; }          // recipient
    public Guid ToCharacterId { get; set; }     // recipient's character in this campaign

    public TransferStatus Status { get; set; } = TransferStatus.Pending;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}