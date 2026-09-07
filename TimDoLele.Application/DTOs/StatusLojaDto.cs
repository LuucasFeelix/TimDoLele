namespace TimDoLeLe.Application.DTOs
{
    public class StatusLojaDto
    {
        public bool Aberta { get; set; }

        public string Status { get; set; } =
            string.Empty;

        public string Mensagem { get; set; } =
            string.Empty;

        public string? Motivo { get; set; }

        public string? ProximaAbertura { get; set; }

        public string? HoraAbertura { get; set; }

        public string? HoraFechamento { get; set; }

        public int PrazoEntregaMin { get; set; }

        public int PrazoEntregaMax { get; set; }

        public int PrazoRetiradaMin { get; set; }

        public int PrazoRetiradaMax { get; set; }

        public decimal TaxaEntrega { get; set; }
    }
}