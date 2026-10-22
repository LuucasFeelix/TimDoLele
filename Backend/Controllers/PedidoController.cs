using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using TimDolele.Core.Enums;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.DTOs.Common;
using TimDoLele.Application.Services;
using TimDoLeLe.Application.DTOs;
using TimDoLeLe.Hubs;

namespace TimDoLeLe.Controllers
{
    [ApiController]
    [Route("api/pedidos")]
    public class PedidoController : ControllerBase
    {
        private readonly PedidoService _pedidoService;

        private readonly
            IHubContext<NotificacaoHub>
            _notificacaoHub;

        public PedidoController(
            PedidoService pedidoService,
            IHubContext<NotificacaoHub> notificacaoHub)
        {
            _pedidoService =
                pedidoService;

            _notificacaoHub =
                notificacaoHub;
        }


        [AllowAnonymous]
        [HttpPost]
        public async Task<IActionResult> Criar(
            [FromBody] CriarPedidoDto dto)
        {
            var (pedidoId, codigo, aguardandoPagamento) =
                await _pedidoService
                    .CriarPedidoAsync(dto);

            // PIX: a loja só é avisada quando o pagamento for confirmado
            if (!aguardandoPagamento)
            {
                await NotificacoesPedido
                    .PedidoLiberadoParaLojaAsync(
                        _notificacaoHub,
                        pedidoId
                    );
            }

            return Ok(
                ApiResponse<object>.Ok(
                    new
                    {
                        pedidoId,

                        // Código curto que o cliente vê (igual ao do admin)
                        codigo,

                        // true = mostrar a tela do QR Code PIX
                        aguardandoPagamento
                    },
                    "Pedido criado com sucesso"
                )
            );
        }


        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] Guid? clienteId,
            [FromQuery] StatusPedido? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] DateTime? data = null,
            [FromQuery] string? busca = null,
            [FromQuery] string? filtro = null)
        {
            var result =
                await _pedidoService
                    .ObterPedidosAsync(
                        clienteId,
                        status,
                        page,
                        pageSize,
                        dia: data,
                        busca: busca,
                        filtro: filtro
                    );

            return Ok(result);
        }


        // Quantidade de pedidos em cada aba, para o dia escolhido
        [Authorize(Roles = "Admin")]
        [HttpGet("resumo-dia")]
        public async Task<IActionResult> GetResumoDia(
            [FromQuery] DateTime? data = null,
            [FromQuery] string? busca = null)
        {
            var resumo =
                await _pedidoService
                    .ObterResumoDiaAsync(
                        data,
                        busca
                    );

            return Ok(resumo);
        }


        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/status")]
        public async Task<IActionResult>
            AtualizarStatus(
                Guid id,
                [FromBody] StatusPedido status)
        {
            await _pedidoService
                .AtualizarStatusAsync(
                    id,
                    status
                );

            var dataEvento =
                DateTime.Now;

            await _notificacaoHub
                .Clients
                .All
                .SendAsync(
                    "PedidoAtualizado",
                    new
                    {
                        pedidoId = id,

                        status =
                            status.ToString(),

                        atualizadoEm =
                            dataEvento
                    }
                );

            await _notificacaoHub
                .Clients
                .All
                .SendAsync(
                    "DashboardAtualizado",
                    new
                    {
                        motivo =
                            "StatusPedidoAtualizado",

                        pedidoId =
                            id,

                        status =
                            status.ToString(),

                        atualizadoEm =
                            dataEvento
                    }
                );

            return NoContent();
        }


        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/impressao/fila")]
        public async Task<IActionResult>
            ColocarNaFilaImpressao(Guid id)
        {
            await _pedidoService
                .ColocarNaFilaImpressaoAsync(id);

            return NoContent();
        }


        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/impressao/iniciar")]
        public async Task<IActionResult>
            IniciarImpressao(Guid id)
        {
            await _pedidoService
                .IniciarImpressaoAsync(id);

            return NoContent();
        }


        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/impressao/concluir")]
        public async Task<IActionResult>
            ConcluirImpressao(
                Guid id,
                [FromQuery] bool avancarStatus = false)
        {
            var statusMudou =
                await _pedidoService
                    .ConcluirImpressaoAsync(
                        id,
                        avancarStatus
                    );

            // Avisa as telas abertas, igual à mudança manual de status
            if (statusMudou)
            {
                var dataEvento =
                    DateTime.Now;

                var status =
                    StatusPedido.EmPreparo.ToString();

                await _notificacaoHub
                    .Clients
                    .All
                    .SendAsync(
                        "PedidoAtualizado",
                        new
                        {
                            pedidoId = id,

                            status,

                            atualizadoEm =
                                dataEvento
                        }
                    );

                await _notificacaoHub
                    .Clients
                    .All
                    .SendAsync(
                        "DashboardAtualizado",
                        new
                        {
                            motivo =
                                "StatusPedidoAtualizado",

                            pedidoId =
                                id,

                            status,

                            atualizadoEm =
                                dataEvento
                        }
                    );
            }

            return NoContent();
        }


        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/impressao/erro")]
        public async Task<IActionResult>
            ErroImpressao(Guid id)
        {
            await _pedidoService
                .MarcarErroImpressaoAsync(id);

            return NoContent();
        }


        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/impressao/reimprimir")]
        public async Task<IActionResult>
            Reimprimir(Guid id)
        {
            await _pedidoService
                .PrepararReimpressaoAsync(id);

            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("impressao/pendentes")]
        public async Task<IActionResult>
            GetPedidosPendentesImpressao()
        {
            var pedidos =
                await _pedidoService
                    .ObterPedidosPendentesImpressaoAsync();

            return Ok(pedidos);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("dashboard")]
        public async Task<IActionResult>
            GetDashboard()
        {
            var dashboard =
                await _pedidoService
                    .ObterDashboardAsync();

            return Ok(dashboard);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("relatorios")]
        public async Task<IActionResult>
            GetRelatorio(
                [FromQuery]
                string periodo = "hoje",

                [FromQuery]
                DateTime? dataInicio = null,

                [FromQuery]
                DateTime? dataFim = null)
        {
            var relatorio =
                await _pedidoService
                    .ObterRelatorioAsync(
                        periodo,
                        dataInicio,
                        dataFim
                    );

            return Ok(relatorio);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("{id}")]
        public async Task<IActionResult>
            GetById(Guid id)
        {
            var pedido =
                await _pedidoService
                    .ObterPedidoPorIdAsync(id);

            return Ok(pedido);
        }
    }
}