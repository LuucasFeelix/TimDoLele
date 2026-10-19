namespace TimDoLele.Application.DTOs
{
    // Quantidade de pedidos em cada aba da tela de Pedidos,
    // para o dia escolhido (e a busca, se houver)
    public class ResumoPedidosDiaDto
    {
        public int Todos { get; set; }

        public int Pendentes { get; set; }

        public int EmPreparo { get; set; }

        // Saiu para entrega (delivery)
        public int Entrega { get; set; }

        // Pronto para retirada
        public int Retirada { get; set; }

        public int Entregues { get; set; }

        public int Cancelados { get; set; }
    }
}
