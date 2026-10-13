using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.Services;

namespace TimDoLeLe.Controllers
{
    [ApiController]
    [Route("api/cupons")]
    public class CupomController : ControllerBase
    {
        private readonly CupomService _service;

        public CupomController(CupomService service)
        {
            _service = service;
        }

        // ===== ADMIN =====

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> Listar()
        {
            return Ok(await _service.ListarAsync());
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> Criar([FromBody] SalvarCupomDto dto)
        {
            return Ok(await _service.CriarAsync(dto));
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Atualizar(Guid id, [FromBody] SalvarCupomDto dto)
        {
            return Ok(await _service.AtualizarAsync(id, dto));
        }

        [Authorize(Roles = "Admin")]
        [HttpPatch("{id}/ativar")]
        public async Task<IActionResult> Ativar(Guid id)
        {
            return Ok(await _service.AlterarAtivoAsync(id, true));
        }

        [Authorize(Roles = "Admin")]
        [HttpPatch("{id}/desativar")]
        public async Task<IActionResult> Desativar(Guid id)
        {
            return Ok(await _service.AlterarAtivoAsync(id, false));
        }

        // ===== PÚBLICO (checkout) =====

        // Confere o cupom e devolve o desconto para mostrar ao cliente.
        // O desconto de verdade é calculado de novo ao criar o pedido.
        [AllowAnonymous]
        [HttpPost("validar")]
        public async Task<IActionResult> Validar([FromBody] ValidarCupomDto dto)
        {
            return Ok(await _service.ValidarAsync(dto.Codigo, dto.Subtotal));
        }
    }
}
