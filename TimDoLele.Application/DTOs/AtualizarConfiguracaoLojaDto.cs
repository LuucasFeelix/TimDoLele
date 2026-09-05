namespace TimDoLeLe.Application.DTOs
{
    public class AtualizarConfiguracaoLojaDto
    {
        public int PrazoEntregaMin { get; set; }

        public int PrazoEntregaMax { get; set; }

        public int PrazoRetiradaMin { get; set; }

        public int PrazoRetiradaMax { get; set; }

        public decimal TaxaEntregaPadrao { get; set; }
    }
}