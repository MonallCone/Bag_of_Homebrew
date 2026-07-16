namespace Bag_Of_Homebrew_API.Model
{
    public class User
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string GoogleId { get; set; } = null;
        public string Email { get; set; } = null;
        public string DisplayName { get; set; } = null;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public List<Character> Characters { get; set; } = new();
    }
}
