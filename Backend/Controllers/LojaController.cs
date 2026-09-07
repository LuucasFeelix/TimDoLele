using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimDoLele.Application.Services;

namespace TimDoLeLe.Controllers
{
    [ApiController]
    [Route("api/loja")]
    public class LojaController : ControllerBase
    {
        private readonly StatusLojaService _service;

        public LojaController(
            StatusLojaService service)
        {
            _service = service;
        }

        [AllowAnonymous]
        [HttpGet("status")]
        public async Task<IActionResult>
            ObterStatus()
        {
            var status =
                await _service
                    .ObterStatusAsync();

            return Ok(status);
        }
    }
}