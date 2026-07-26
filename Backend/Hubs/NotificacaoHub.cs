using Microsoft.AspNetCore.SignalR;

namespace TimDoLeLe.Hubs
{
    public class NotificacaoHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            Console.WriteLine(
                $"Cliente conectado ao SignalR: {Context.ConnectionId}");

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            Console.WriteLine(
                $"Cliente desconectado do SignalR: {Context.ConnectionId}");

            await base.OnDisconnectedAsync(exception);
        }
    }
}