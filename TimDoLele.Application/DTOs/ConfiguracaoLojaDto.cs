namespace TimDoLeLe.Application.DTOs
{
    public class ConfiguracaoLojaDto
    {
        public Guid Id { get; set; }

        public int PrazoEntregaMin { get; set; }

        public int PrazoEntregaMax { get; set; }

        public int PrazoRetiradaMin { get; set; }

        public int PrazoRetiradaMax { get; set; }

        public decimal TaxaEntregaPadrao { get; set; }

        public bool FechadaManual { get; set; }

        public string? MotivoFechamentoManual { get; set; }
    }
}