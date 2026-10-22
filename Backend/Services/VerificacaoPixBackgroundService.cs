using Microsoft.AspNetCore.SignalR;
using TimDoLele.Application.Services;
using TimDoLeLe.Hubs;

namespace TimDoLeLe.Services
{
    // Roda sozinho enquanto a API está ligada, a cada 20 segundos:
    // - confirma PIX pagos (mesmo se o aviso da empresa se perder
    //   ou se o cliente fechar a tela antes de confirmar)
    // - expira os PIX que passaram do prazo
    public class VerificacaoPixBackgroundService : BackgroundService
    {
        private static readonly TimeSpan Intervalo = TimeSpan.FromSeconds(20);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<NotificacaoHub> _hub;
        private readonly ILogger<VerificacaoPixBackgroundService> _logger;

        public VerificacaoPixBackgroundService(
            IServiceScopeFactory scopeFactory,
            IHubContext<NotificacaoHub> hub,
            ILogger<VerificacaoPixBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _hub = hub;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _scopeFactory.CreateScope();

                    var pixService = scope.ServiceProvider.GetRequiredService<PixService>();

                    var confirmados = await pixService.VerificarPendentesAsync();

                    foreach (var pedidoId in confirmados)
                    {
                        await NotificacoesPedido.PedidoLiberadoParaLojaAsync(_hub, pedidoId);
                    }
                }
                catch (Exception ex)
                {
                    // Um erro aqui não pode derrubar a API: tenta de novo na próxima volta
                    _logger.LogError(ex, "Erro ao verificar pagamentos PIX pendentes");
                }

                await Task.Delay(Intervalo, stoppingToken);
            }
        }
    }
}
