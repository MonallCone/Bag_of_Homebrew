namespace Bag_Of_Homebrew_API.Dtos;

public record CreateCampaignRequest(string Name);
public record JoinCampaignRequest(string InviteCode, Guid CharacterId);
public record ReturnToCampaignVaultRequest(Guid ItemId);
public record GiftItemRequest(Guid ItemId, Guid ToUserId);
public record SendVaultItemRequest(Guid ToUserId);
