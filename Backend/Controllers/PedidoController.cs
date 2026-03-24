using Microsoft.AspNetCore.Mvc;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.Services;

namespace TimDoLele.Controllers
{
    [ApiController]
    [Route("api/pedidos")]
    public class PedidoController : ControllerBase
    {
        private readonly PedidoService _service;

        public PedidoController(PedidoService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<IActionResult> Criar([FromBody] CriarPedidoDto dto)
        {
            try
            {
                var pedidoId = await _service.CriarPedidoAsync(dto);
                return Ok(new { pedidoId });
            }
            catch(Exception ex) 
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var pedidos = await _service.ObterPedidosAsync();
            return Ok(pedidos);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var pedido = await _service.ObterPedidoPorIdAsync(id);

            if (pedido == null)
                return NotFound("Pedido não encontrado");

            return Ok(pedido);
        }
    }

}
