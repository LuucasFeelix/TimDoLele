using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.Services;

namespace TimDoLeLe.Controllers
{
    [ApiController]
    [Route("api/bairros")]
    public class BairroController : ControllerBase
    {
        private readonly BairroService _service;

        public BairroController(BairroService service)
        {
            _service = service;
        }

        // ===== PÚBLICO (checkout) =====

        // Bairros que o cliente pode escolher, com a taxa de cada um
        [AllowAnonymous]
        [HttpGet("ativos")]
        public async Task<IActionResult> ListarAtivos()
        {
            return Ok(await _service.ListarAtivosAsync());
        }

        // ===== ADMIN =====

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> ListarTodos()
        {
            return Ok(await _service.ListarTodosAsync());
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> Criar([FromBody] SalvarBairroDto dto)
        {
            return Ok(await _service.CriarAsync(dto));
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Atualizar(Guid id, [FromBody] SalvarBairroDto dto)
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

        // "Adicionar vários": cria os novos e atualiza os existentes
        [Authorize(Roles = "Admin")]
        [HttpPost("importar")]
        public async Task<IActionResult> Importar([FromBody] ImportarBairrosDto dto)
        {
            return Ok(await _service.ImportarAsync(dto));
        }
    }
}
