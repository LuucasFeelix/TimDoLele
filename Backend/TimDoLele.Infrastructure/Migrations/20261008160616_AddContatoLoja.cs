using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimDoLele.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddContatoLoja : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Celular",
                table: "ConfiguracoesLoja",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Endereco",
                table: "ConfiguracoesLoja",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NomeEstabelecimento",
                table: "ConfiguracoesLoja",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TelefoneFixo",
                table: "ConfiguracoesLoja",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "WhatsApp",
                table: "ConfiguracoesLoja",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Celular",
                table: "ConfiguracoesLoja");

            migrationBuilder.DropColumn(
                name: "Endereco",
                table: "ConfiguracoesLoja");

            migrationBuilder.DropColumn(
                name: "NomeEstabelecimento",
                table: "ConfiguracoesLoja");

            migrationBuilder.DropColumn(
                name: "TelefoneFixo",
                table: "ConfiguracoesLoja");

            migrationBuilder.DropColumn(
                name: "WhatsApp",
                table: "ConfiguracoesLoja");
        }
    }
}
