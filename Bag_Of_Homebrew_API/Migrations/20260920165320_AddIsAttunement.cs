using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bag_Of_Homebrew_API.Migrations
{
    /// <inheritdoc />
    public partial class AddIsAttunement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsAttunement",
                table: "Items",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsAttunement",
                table: "Items");
        }
    }
}
