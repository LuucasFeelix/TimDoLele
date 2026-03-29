using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimDolele.Core.Enums;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.Services;

namespace TimDoLele.Controllers
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
            try
            {
                var pedidoId = await _pedidoService.CriarPedidoAsync(dto);
                return Ok(new { pedidoId });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery] Guid? clienteId,
            [FromQuery] StatusPedido? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var result = await _pedidoService.ObterPedidosAsync(clienteId, status, page, pageSize);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var pedido = await _pedidoService.ObterPedidoPorIdAsync(id);

            if (pedido == null)
                return NotFound("Pedido não encontrado");

            return Ok(pedido);
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> AtualizarStatus(Guid id, [FromBody] StatusPedido status)
        {
            try
            {
                await _pedidoService.AtualizarStatusAsync(id, status);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var dashboard = await _pedidoService.ObterDashboardAsync();
            return Ok(dashboard);
        }
    }
}