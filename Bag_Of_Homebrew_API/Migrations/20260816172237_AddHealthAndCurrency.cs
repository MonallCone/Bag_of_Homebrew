using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bag_Of_Homebrew_API.Migrations
{
    /// <inheritdoc />
    public partial class AddHealthAndCurrency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Copper",
                table: "Characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CurrentHp",
                table: "Characters",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Electrum",
                table: "Characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Gold",
                table: "Characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MaxHp",
                table: "Characters",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Platinum",
                table: "Characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Silver",
                table: "Characters",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TempHp",
                table: "Characters",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Copper",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "CurrentHp",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Electrum",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Gold",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "MaxHp",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Platinum",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "Silver",
                table: "Characters");

            migrationBuilder.DropColumn(
                name: "TempHp",
                table: "Characters");
        }
    }
}
