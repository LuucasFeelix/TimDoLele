using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimDoLele.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCupons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CupomCodigo",
                table: "Pedidos",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "CupomId",
                table: "Pedidos",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Desconto",
                table: "Pedidos",
                type: "decimal(10,2)",
                precision: 10,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "Cupons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Codigo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Tipo = table.Column<int>(type: "int", nullable: false),
                    Valor = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    PedidoMinimo = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: true),
                    ValidoAte = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LimiteUsos = table.Column<int>(type: "int", nullable: true),
                    Usos = table.Column<int>(type: "int", nullable: false),
                    Ativo = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cupons", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Cupons_Codigo",
                table: "Cupons",
                column: "Codigo",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Cupons");

            migrationBuilder.DropColumn(
                name: "CupomCodigo",
                table: "Pedidos");

            migrationBuilder.DropColumn(
                name: "CupomId",
                table: "Pedidos");

            migrationBuilder.DropColumn(
                name: "Desconto",
                table: "Pedidos");
        }
    }
}
