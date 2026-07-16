using Bag_Of_Homebrew_API.Model;
using Microsoft.EntityFrameworkCore;

namespace Bag_Of_Homebrew_API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Character> Characters => Set<Character>();
        public DbSet<Item> Items => Set<Item>();
        public DbSet<EquipmentSlot> EquipmentSlots => Set<EquipmentSlot>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .HasIndex(u => u.GoogleId)
                .IsUnique();

            modelBuilder.Entity<Item>()
                .Property(i => i.PropertiesJson)
                .HasColumnType("jsonb");
        }
    }
}
