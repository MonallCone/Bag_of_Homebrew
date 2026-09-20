using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bag_Of_Homebrew_API.Migrations
{
    /// <inheritdoc />
    public partial class AddItemVisibility : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsHiddenByGm",
                table: "Items",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsHiddenFromPlayers",
                table: "Items",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsHiddenByGm",
                table: "Items");

            migrationBuilder.DropColumn(
                name: "IsHiddenFromPlayers",
                table: "Items");
        }
    }
}
