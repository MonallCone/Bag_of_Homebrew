namespace Bag_Of_Homebrew_API.Model
{
    public class Character
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        public string Name { get; set; } = null!;
        public string? PortraitUrl { get; set; }
        public string? PdfSheetUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public List<Item> Items { get; set; } = new();
        public List<EquipmentSlot> EquipmentSlots { get; set; } = new();
    }
}
