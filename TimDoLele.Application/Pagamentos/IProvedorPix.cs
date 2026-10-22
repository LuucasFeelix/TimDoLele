namespace TimDoLele.Application.Pagamentos
{
    // "Tomada" padrão para empresas de PIX.
    // Cada empresa (Simulador, PagBank, Mercado Pago...) implementa
    // estes dois métodos, e o resto do sistema não muda.
    public interface IProvedorPix
    {
        // Ex.: "Simulador", "PagBank", "MercadoPago"
        string Nome { get; }

        // Gera a cobrança PIX na empresa (valor fixo, com validade)
        Task<CobrancaPixGerada> CriarCobrancaAsync(NovaCobrancaPix dados);

        // Pergunta à empresa se a cobrança já foi paga.
        // O sistema SEMPRE confere aqui antes de liberar o pedido.
        Task<bool> EstaPagaAsync(string idExterno);
    }

    public class NovaCobrancaPix
    {
        public Guid PedidoId { get; set; }

        // Código curto do pedido (aparece no extrato do cliente)
        public string CodigoPedido { get; set; } = string.Empty;

        public decimal Valor { get; set; }

        public DateTime ExpiraEm { get; set; }

        public string NomeCliente { get; set; } = string.Empty;
    }

    public class CobrancaPixGerada
    {
        // Id da cobrança na empresa
        public string IdExterno { get; set; } = string.Empty;

        // Código "copia e cola" (o QR Code é desenhado a partir dele)
        public string CopiaECola { get; set; } = string.Empty;
    }
}
