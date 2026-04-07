using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using TimDolele.Core.Enums;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.DTOs.Common;
using TimDoLele.Application.Services;

namespace TimDoLeLe.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/pedidos")]
    public class PedidoController : ControllerBase
    {
        private readonly PedidoService _pedidoService;

        public PedidoController(PedidoService service)
        {
            _pedidoService = service;
        }

        [HttpPost]
        public async Task<IActionResult> Criar([FromBody] CriarPedidoDto dto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (userId == null)
                return Unauthorized();

            var pedidoId = await _pedidoService.CriarPedidoAsync(dto, Guid.Parse(userId));

            return Ok(ApiResponse<object>.Ok(new { pedidoId }, "Pedido criado com sucesso"));
        }

        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] Guid? clienteId,
            [FromQuery] StatusPedido? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            Guid? usuarioId = null;

            if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                if (userId == null)
                    return Unauthorized();

                usuarioId = Guid.Parse(userId);
            }

            var result = await _pedidoService.ObterPedidosAsync(
                clienteId,
                status,
                page,
                pageSize,
                usuarioId
            );

            return Ok(result);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/status")]
        public async Task<IActionResult> AtualizarStatus(Guid id, [FromBody] StatusPedido status)
        {
            await _pedidoService.AtualizarStatusAsync(id, status);
            return NoContent();
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var dashboard = await _pedidoService.ObterDashboardAsync();
            return Ok(dashboard);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            var pedido = await _pedidoService.ObterPedidoPorIdAsync(id);

            if (!string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                if (userId == null || pedido.UsuarioId != Guid.Parse(userId))
                    return Forbid();
            }

            return Ok(pedido);
        }
    }
}