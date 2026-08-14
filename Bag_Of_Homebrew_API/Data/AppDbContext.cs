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
        public DbSet<Vault> Vaults => Set<Vault>();
        public DbSet<Campaign> Campaigns => Set<Campaign>();
        public DbSet<CampaignMembership> CampaignMemberships => Set<CampaignMembership>();
        public DbSet<ItemTransfer> ItemTransfers => Set<ItemTransfer>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<User>()
                .HasIndex(u => u.GoogleId)
                .IsUnique();

            modelBuilder.Entity<Item>()
                .Property(i => i.PropertiesJson)
                .HasColumnType("jsonb");

            // A user has at most one PERSONAL vault (UserId set). Campaign vaults have UserId null,
            // so a filtered unique index only constrains personal vaults.
            modelBuilder.Entity<Vault>()
                .HasIndex(v => v.UserId)
                .IsUnique()
                .HasFilter("\"UserId\" IS NOT NULL");

            // Campaign ↔ Vault one-to-one
            modelBuilder.Entity<Campaign>()
                .HasOne(c => c.Vault)
                .WithOne()
                .HasForeignKey<Campaign>(c => c.VaultId)
                .OnDelete(DeleteBehavior.Restrict);

            // Unique invite code
            modelBuilder.Entity<Campaign>()
                .HasIndex(c => c.InviteCode)
                .IsUnique();

            // A user can only be in a campaign once
            modelBuilder.Entity<CampaignMembership>()
                .HasIndex(m => new { m.CampaignId, m.UserId })
                .IsUnique();

            // Avoid multiple cascade paths: don't cascade-delete memberships from Character
            modelBuilder.Entity<CampaignMembership>()
                .HasOne(m => m.Character)
                .WithMany()
                .HasForeignKey(m => m.CharacterId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<CampaignMembership>()
                .HasOne(m => m.User)
                .WithMany()
                .HasForeignKey(m => m.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ItemTransfer>()
                .HasOne(t => t.Item)
                .WithMany()
                .HasForeignKey(t => t.ItemId)
                .OnDelete(DeleteBehavior.Cascade);   // if the item is deleted, cancel its transfers

            modelBuilder.Entity<ItemTransfer>()
                .HasOne(t => t.Campaign)
                .WithMany()
                .HasForeignKey(t => t.CampaignId)
                .OnDelete(DeleteBehavior.Cascade);   // if the campaign is deleted, clear its transfers

            // An index for the common query: "pending transfers to me in this campaign"
            modelBuilder.Entity<ItemTransfer>()
                .HasIndex(t => new { t.ToUserId, t.CampaignId, t.Status });
        }
    }
}
