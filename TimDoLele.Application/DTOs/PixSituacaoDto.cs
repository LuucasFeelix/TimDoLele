namespace TimDoLele.Application.DTOs
{
    // O que a tela de pagamento PIX do cliente precisa saber
    public class PixSituacaoDto
    {
        public Guid PedidoId { get; set; }

        public string Codigo { get; set; } = string.Empty;

        // "Aguardando" | "Pago" | "Expirado"
        public string Status { get; set; } = string.Empty;

        public string CopiaECola { get; set; } = string.Empty;

        public decimal Valor { get; set; }

        // Calculado no servidor: não depende do relógio do celular
        public int SegundosRestantes { get; set; }

        // true = PIX de teste (mostra o botão "Simular pagamento")
        public bool Simulador { get; set; }
    }
}
