namespace TimDoLele.Application.DTOs
{
    public class PedidoResponseDto
    {
        public Guid Id { get; set; }

        public string Codigo { get; set; } = string.Empty;

        public DateTime DataHora { get; set; }

        public string NomeCliente { get; set; } = string.Empty;

        public string Telefone { get; set; } = string.Empty;

        // Endereço de entrega (rua, número, bairro e referência).
        // Vazio quando é retirada na loja.
        public string? Endereco { get; set; }

        // Bairro escolhido na lista (vazio nos pedidos antigos)
        public string? Bairro { get; set; }

        public decimal SubTotal { get; set; }

        public decimal Delivery { get; set; }

        public decimal Total { get; set; }

        public decimal Desconto { get; set; }

        public string? CupomCodigo { get; set; }

        public string Status { get; set; } = string.Empty;

        public Guid UsuarioId { get; set; }

        public string TipoEntrega { get; set; } = string.Empty;

        public string FormaPagamento { get; set; } = string.Empty;

        public decimal? TrocoPara { get; set; }

        // true = PIX pago e confirmado pelo sistema: NÃO cobrar o cliente
        public bool PixPago { get; set; }

        public string StatusImpressao { get; set; } = string.Empty;

        public int TentativasImpressao { get; set; }

        public DateTime? DataImpressao { get; set; }

        public List<ItemPedidoResponseDto> Itens { get; set; } = new();
    }
}