using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimDoLele.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class addItemPedidoAdicional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Adicionais_ItensPedido_ItemPedidoId",
                table: "Adicionais");

            migrationBuilder.DropIndex(
                name: "IX_Adicionais_ItemPedidoId",
                table: "Adicionais");

            migrationBuilder.DropColumn(
                name: "ItemPedidoId",
                table: "Adicionais");

            migrationBuilder.CreateTable(
                name: "ItensPedidoAdicionais",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ItemPedidoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdicionalId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Preco = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ItensPedidoAdicionais", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ItensPedidoAdicionais_Adicionais_AdicionalId",
                        column: x => x.AdicionalId,
                        principalTable: "Adicionais",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ItensPedidoAdicionais_ItensPedido_ItemPedidoId",
                        column: x => x.ItemPedidoId,
                        principalTable: "ItensPedido",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ItensPedidoAdicionais_AdicionalId",
                table: "ItensPedidoAdicionais",
                column: "AdicionalId");

            migrationBuilder.CreateIndex(
                name: "IX_ItensPedidoAdicionais_ItemPedidoId",
                table: "ItensPedidoAdicionais",
                column: "ItemPedidoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ItensPedidoAdicionais");

            migrationBuilder.AddColumn<Guid>(
                name: "ItemPedidoId",
                table: "Adicionais",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Adicionais_ItemPedidoId",
                table: "Adicionais",
                column: "ItemPedidoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Adicionais_ItensPedido_ItemPedidoId",
                table: "Adicionais",
                column: "ItemPedidoId",
                principalTable: "ItensPedido",
                principalColumn: "Id");
        }
    }
}
