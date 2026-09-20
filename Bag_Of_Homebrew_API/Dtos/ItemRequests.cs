namespace Bag_Of_Homebrew_API.Dtos;

public record CreateItemRequest(
    string Name,
    string Category,
    string Rarity,
    bool IsPlotFlagged,
    string? HomebrewDescription,
    string? PropertiesJson,
    string? ImageUrl,
    int? Quantity);

public record AdjustQuantityRequest(int Delta);
public record UpdatePropertiesRequest(Dictionary<string, string> Properties);
public record ReturnToVaultRequest(Guid VaultId);
public record SendToCharacterRequest(Guid CharacterId);
