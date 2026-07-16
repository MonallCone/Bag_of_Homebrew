namespace Bag_Of_Homebrew_API.Model
{
    public enum SlotType
    {
        Head, Chest, Gloves, Boots,
        Accessory1, Accessory2, Accessory3, Accessory4, Accessory5, Accessory6,
        WeaponSet1Main, WeaponSet1Off,
        WeaponSet2Main, WeaponSet2Off
    }

    public class EquipmentSlot
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid CharacterId { get; set; }
        public Character Character { get; set; } = null!;

        public SlotType SlotType { get; set; }
        public Guid? ItemId { get; set; }
        public Item? Item { get; set; }
    }
}
