namespace Bag_Of_Homebrew_API.Dtos;

using Bag_Of_Homebrew_API.Model;

public record ItemDto(
    Guid Id,
    string Name,
    string Category,
    string Rarity,
    bool IsPlotFlagged,
    string? HomebrewDescription,
    string PropertiesJson,
    string? ImageUrl,
    int? Quantity,
    DateTime CreatedAt)
{
    public static ItemDto From(Item i) => new(
        i.Id,
        i.Name,
        i.Category.ToString(),
        i.Rarity.ToString(),
        i.IsPlotFlagged,
        i.HomebrewDescription,
        i.PropertiesJson,
        i.ImageUrl,
        i.Quantity,
        i.CreatedAt);
}