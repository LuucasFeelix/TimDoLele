using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimDoLele.Application.Services;

namespace TimDoLeLe.Controllers
{
    // Mensagens de WhatsApp para o cliente (modo manual: o admin
    // abre o WhatsApp com a mensagem pronta e aperta enviar)
    [ApiController]
    [Route("api/whatsapp")]
    [Authorize(Roles = "Admin")]
    public class WhatsappController : ControllerBase
    {
        private readonly WhatsappService _service;

        public WhatsappController(WhatsappService service)
        {
            _service = service;
        }

        // Mensagem pronta (texto + link do WhatsApp) com tudo que falta
        // enviar ao cliente deste pedido. 204 = nada pendente.
        [HttpGet("pedidos/{pedidoId}/pendente")]
        public async Task<IActionResult> ObterPendente(Guid pedidoId)
        {
            var pendente = await _service.ObterPendenteAsync(pedidoId);

            if (pendente == null)
                return NoContent();

            return Ok(pendente);
        }

        // O admin abriu o WhatsApp com a mensagem: marca como enviada
        [HttpPost("pedidos/{pedidoId}/enviadas")]
        public async Task<IActionResult> MarcarEnviadas(
            Guid pedidoId,
            [FromBody] List<Guid> mensagensIds)
        {
            await _service.MarcarEnviadasAsync(pedidoId, mensagensIds ?? new List<Guid>());

            return NoContent();
        }

        // Para as telas saberem se o modo é manual (abre o WhatsApp)
        // ou automático (o sistema envia sozinho)
        [HttpGet("modo")]
        public IActionResult ObterModo()
        {
            return Ok(new { automatico = _service.EnviaAutomaticamente });
        }
    }
}
