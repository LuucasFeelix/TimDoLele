namespace TimDoLeLe.Application.DTOs
{
    public class AtualizarConfiguracaoLojaDto
    {
        public int PrazoEntregaMin { get; set; }

        public int PrazoEntregaMax { get; set; }

        public int PrazoRetiradaMin { get; set; }

        public int PrazoRetiradaMax { get; set; }

        public decimal TaxaEntregaPadrao { get; set; }

        public string? NomeEstabelecimento { get; set; }

        public string? TelefoneFixo { get; set; }

        public string? Celular { get; set; }

        public string? WhatsApp { get; set; }

        public string? Endereco { get; set; }
    }
}