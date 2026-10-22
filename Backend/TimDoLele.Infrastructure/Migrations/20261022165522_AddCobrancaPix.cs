using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimDoLele.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCobrancaPix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CobrancasPix",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PedidoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Provedor = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IdExterno = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CopiaECola = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Valor = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    CriadaEm = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiraEm = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PagaEm = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CobrancasPix", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CobrancasPix_IdExterno",
                table: "CobrancasPix",
                column: "IdExterno");

            migrationBuilder.CreateIndex(
                name: "IX_CobrancasPix_PedidoId",
                table: "CobrancasPix",
                column: "PedidoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CobrancasPix");
        }
    }
}
