using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using TimDoLele.Application.Services;
using TimDoLeLe.Hubs;

namespace TimDoLeLe.Controllers
{
    [ApiController]
    [Route("api/pagamentos/pix")]
    public class PagamentoPixController : ControllerBase
    {
        private readonly PixService _pixService;
        private readonly IHubContext<NotificacaoHub> _hub;
        private readonly IWebHostEnvironment _env;

        public PagamentoPixController(
            PixService pixService,
            IHubContext<NotificacaoHub> hub,
            IWebHostEnvironment env)
        {
            _pixService = pixService;
            _hub = hub;
            _env = env;
        }

        // Tela do cliente pergunta a cada poucos segundos:
        // QR Code, tempo restante e se já foi pago.
        // (o id do pedido é um Guid longo, impossível de adivinhar)
        [AllowAnonymous]
        [HttpGet("{pedidoId}")]
        public async Task<IActionResult> ObterSituacao(Guid pedidoId)
        {
            var (situacao, confirmadoAgora) =
                await _pixService.ObterSituacaoAsync(pedidoId);

            if (confirmadoAgora)
            {
                await NotificacoesPedido.PedidoLiberadoParaLojaAsync(_hub, pedidoId);
            }

            return Ok(situacao);
        }

        // Aviso da empresa de pagamento (webhook).
        // Cada empresa manda o aviso num formato; o conector de cada
        // uma vai ler o id daqui. O sistema não confia no aviso:
        // sempre pergunta de volta à empresa se está pago.
        [AllowAnonymous]
        [HttpPost("aviso/{idExterno}")]
        public async Task<IActionResult> ReceberAviso(string idExterno)
        {
            var confirmados = await _pixService.ProcessarAvisoAsync(idExterno);

            foreach (var pedidoId in confirmados)
            {
                await NotificacoesPedido.PedidoLiberadoParaLojaAsync(_hub, pedidoId);
            }

            return Ok();
        }

        // SÓ PARA TESTES: faz o papel do cliente pagando o PIX.
        // Funciona apenas em desenvolvimento e com o simulador.
        [AllowAnonymous]
        [HttpPost("{pedidoId}/simular-pagamento")]
        public async Task<IActionResult> SimularPagamento(Guid pedidoId)
        {
            if (!_env.IsDevelopment())
                return NotFound();

            await _pixService.SimularPagamentoAsync(pedidoId);

            return NoContent();
        }
    }
}
