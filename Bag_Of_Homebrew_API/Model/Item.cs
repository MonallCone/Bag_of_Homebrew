namespace Bag_Of_Homebrew_API.Model
{
    public enum ItemCategory { Weapon, Armour, Consumable, Misc }
    public enum ItemRarity { Common, Uncommon, Rare, VeryRare, Legendary, Artifact }

    public class Item
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        // An item belongs to either a character's inventory OR a DM's vault, not both
        public Guid? CharacterId { get; set; }
        public Character? Character { get; set; }
        public Guid? VaultId { get; set; }

        public string Name { get; set; } = null!;
        public ItemCategory Category { get; set; }
        public ItemRarity Rarity { get; set; }
        public bool IsPlotFlagged { get; set; }
        public string? HomebrewDescription { get; set; }

        // Category-specific fields (damage, AC, charges, etc.) stored as JSON
        public string PropertiesJson { get; set; } = "{}";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
