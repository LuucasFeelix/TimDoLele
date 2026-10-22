using Microsoft.AspNetCore.SignalR;

namespace TimDoLeLe.Hubs
{
    // Avisos em tempo real para as telas da loja (admin, dashboard)
    public static class NotificacoesPedido
    {
        // Pedido chegou para a loja: toca o som, entra na fila
        // de impressão e atualiza o dashboard.
        // Usado quando o pedido é criado (dinheiro/cartão) ou
        // quando o PIX é confirmado.
        public static async Task PedidoLiberadoParaLojaAsync(
            IHubContext<NotificacaoHub> hub,
            Guid pedidoId)
        {
            var dataEvento = DateTime.Now;

            await hub.Clients.All.SendAsync(
                "PedidoCriado",
                new
                {
                    pedidoId,
                    criadoEm = dataEvento
                }
            );

            await hub.Clients.All.SendAsync(
                "DashboardAtualizado",
                new
                {
                    motivo = "PedidoCriado",
                    pedidoId,
                    atualizadoEm = dataEvento
                }
            );
        }
    }
}
