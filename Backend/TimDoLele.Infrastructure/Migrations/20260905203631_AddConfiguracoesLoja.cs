using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimDoLele.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddConfiguracoesLoja : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ConfiguracoesLoja",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PrazoEntregaMin = table.Column<int>(type: "int", nullable: false),
                    PrazoEntregaMax = table.Column<int>(type: "int", nullable: false),
                    PrazoRetiradaMin = table.Column<int>(type: "int", nullable: false),
                    PrazoRetiradaMax = table.Column<int>(type: "int", nullable: false),
                    TaxaEntregaPadrao = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    FechadaManual = table.Column<bool>(type: "bit", nullable: false),
                    MotivoFechamentoManual = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConfiguracoesLoja", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DatasEspeciais",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Data = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Tipo = table.Column<int>(type: "int", nullable: false),
                    Descricao = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HoraAbertura = table.Column<TimeSpan>(type: "time", nullable: true),
                    HoraFechamento = table.Column<TimeSpan>(type: "time", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DatasEspeciais", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HorariosFuncionamento",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DiaSemana = table.Column<int>(type: "int", nullable: false),
                    Aberto = table.Column<bool>(type: "bit", nullable: false),
                    HoraAbertura = table.Column<TimeSpan>(type: "time", nullable: true),
                    HoraFechamento = table.Column<TimeSpan>(type: "time", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HorariosFuncionamento", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DatasEspeciais_Data",
                table: "DatasEspeciais",
                column: "Data");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConfiguracoesLoja");

            migrationBuilder.DropTable(
                name: "DatasEspeciais");

            migrationBuilder.DropTable(
                name: "HorariosFuncionamento");
        }
    }
}
