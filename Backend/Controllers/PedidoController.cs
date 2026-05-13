using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimDolele.Core.Enums;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.DTOs.Common;
using TimDoLele.Application.Services;

namespace TimDoLeLe.Controllers
{
    [ApiController]
    [Route("api/pedidos")]
    public class PedidoController : ControllerBase
    {
        private readonly PedidoService _pedidoService;

        public PedidoController(PedidoService service)
        {
            _pedidoService = service;
        }

        // PEDIDO PÚBLICO
        [AllowAnonymous]
        [HttpPost]
        public async Task<IActionResult> Criar([FromBody] CriarPedidoDto dto)
        {
            var pedidoId = await _pedidoService.CriarPedidoAsync(dto);

            return Ok(
                ApiResponse<object>.Ok(
                    new { pedidoId },
                    "Pedido criado com sucesso"
                )
            );
        }

        // ADMIN
        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] Guid? clienteId,
            [FromQuery] StatusPedido? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _pedidoService.ObterPedidosAsync(
                clienteId,
                status,
                page,
                pageSize
            );

            return Ok(result);
        }

        // ADMIN
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/status")]
        public async Task<IActionResult> AtualizarStatus(
            Guid id,
            [FromBody] StatusPedido status)
        {
            await _pedidoService.AtualizarStatusAsync(id, status);

            return NoContent();
        }

        // ADMIN
        [Authorize(Roles = "Admin")]
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var dashboard =
                await _pedidoService.ObterDashboardAsync();

            return Ok(dashboard);
        }

        // ADMIN
        [Authorize(Roles = "Admin")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var pedido =
                await _pedidoService.ObterPedidoPorIdAsync(id);

            return Ok(pedido);
        }
    }
}