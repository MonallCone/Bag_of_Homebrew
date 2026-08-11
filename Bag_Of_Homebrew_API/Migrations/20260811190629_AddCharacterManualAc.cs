using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bag_Of_Homebrew_API.Migrations
{
    /// <inheritdoc />
    public partial class AddCharacterManualAc : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ManualAc",
                table: "Characters",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ManualAc",
                table: "Characters");
        }
    }
}
