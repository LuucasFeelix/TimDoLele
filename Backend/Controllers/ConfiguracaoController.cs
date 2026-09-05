using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.Services;
using TimDoLeLe.Application.DTOs;

namespace TimDoLeLe.Controllers
{
    [ApiController]
    [Route("api/configuracoes")]
    public class ConfiguracaoController : ControllerBase
    {
        private readonly ConfiguracaoLojaService _service;

        public ConfiguracaoController(
            ConfiguracaoLojaService service)
        {
            _service = service;
        }

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult>
            ObterConfiguracao()
        {
            var configuracao =
                await _service
                    .ObterConfiguracaoAsync();

            return Ok(configuracao);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut]
        public async Task<IActionResult>
            AtualizarConfiguracao(
                [FromBody]
                AtualizarConfiguracaoLojaDto dto)
        {
            var configuracao =
                await _service
                    .AtualizarConfiguracaoAsync(
                        dto
                    );

            return Ok(configuracao);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("fechar-manualmente")]
        public async Task<IActionResult>
            FecharLojaManualmente(
                [FromQuery] string? motivo = null)
        {
            var configuracao =
                await _service
                    .FecharLojaManualAsync(
                        motivo
                    );

            return Ok(configuracao);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("abrir-manualmente")]
        public async Task<IActionResult>
            AbrirLojaManualmente()
        {
            var configuracao =
                await _service
                    .AbrirLojaManualAsync();

            return Ok(configuracao);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("horarios")]
        public async Task<IActionResult>
            ObterHorarios()
        {
            var horarios =
                await _service
                    .ObterHorariosAsync();

            return Ok(horarios);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("horarios")]
        public async Task<IActionResult>
            AtualizarHorarios(
                [FromBody]
                List<AtualizarHorarioFuncionamentoDto>
                    horarios)
        {
            var resultado =
                await _service
                    .AtualizarHorariosAsync(
                        horarios
                    );

            return Ok(resultado);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("datas-especiais")]
        public async Task<IActionResult>
            ObterDatasEspeciais()
        {
            var datas =
                await _service
                    .ObterDatasEspeciaisAsync();

            return Ok(datas);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("datas-especiais")]
        public async Task<IActionResult>
            CriarDataEspecial(
                [FromBody]
                CriarDataEspecialDto dto)
        {
            var data =
                await _service
                    .CriarDataEspecialAsync(
                        dto
                    );

            return Ok(data);
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("datas-especiais/{id}")]
        public async Task<IActionResult>
            ExcluirDataEspecial(
                Guid id)
        {
            await _service
                .ExcluirDataEspecialAsync(
                    id
                );

            return NoContent();
        }
    }
}