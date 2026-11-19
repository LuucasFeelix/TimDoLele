using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using TimDoLele.Application.WhatsApp;

namespace TimDoLeLe.Controllers
{
    // Avisos da Meta sobre as mensagens de WhatsApp (webhook).
    // A Meta responde "enviado" na hora, mas o resultado de verdade
    // (entregue, lida ou o ERRO) só chega depois, por aqui.
    // Por enquanto só grava no log (Backend/logs) para descobrir problemas.
    [ApiController]
    [Route("api/whatsapp/webhook")]
    [AllowAnonymous]
    public class WhatsappWebhookController : ControllerBase
    {
        private readonly WhatsappOpcoes _opcoes;
        private readonly ILogger<WhatsappWebhookController> _logger;

        public WhatsappWebhookController(
            IOptions<WhatsappOpcoes> opcoes,
            ILogger<WhatsappWebhookController> logger)
        {
            _opcoes = opcoes.Value;
            _logger = logger;
        }

        // A Meta chama uma vez para confirmar que o endereço é nosso
        [HttpGet]
        public IActionResult Verificar(
            [FromQuery(Name = "hub.mode")] string? modo,
            [FromQuery(Name = "hub.verify_token")] string? token,
            [FromQuery(Name = "hub.challenge")] string? desafio)
        {
            if (modo == "subscribe" &&
                !string.IsNullOrWhiteSpace(_opcoes.TokenVerificacaoWebhook) &&
                token == _opcoes.TokenVerificacaoWebhook)
            {
                _logger.LogInformation("WhatsApp webhook verificado pela Meta.");
                return Content(desafio ?? "");
            }

            return Forbid();
        }

        // Status das mensagens (sent, delivered, read, failed) e mensagens recebidas
        [HttpPost]
        public IActionResult Receber([FromBody] JsonElement corpo)
        {
            try
            {
                foreach (var entrada in Lista(corpo, "entry"))
                foreach (var mudanca in Lista(entrada, "changes"))
                {
                    if (!mudanca.TryGetProperty("value", out var valor))
                        continue;

                    foreach (var status in Lista(valor, "statuses"))
                    {
                        var situacao = Texto(status, "status");
                        var para = Texto(status, "recipient_id");

                        var erros = Lista(status, "errors")
                            .Select(e =>
                                $"{Texto(e, "code")} {Texto(e, "title")} - " +
                                (e.TryGetProperty("error_data", out var dados) ? Texto(dados, "details") : ""))
                            .ToList();

                        if (erros.Count > 0)
                            _logger.LogWarning(
                                "WhatsApp: mensagem para {Para} FALHOU: {Erros}",
                                para, string.Join(" | ", erros));
                        else
                            _logger.LogInformation(
                                "WhatsApp: mensagem para {Para} -> {Status}", para, situacao);
                    }

                    foreach (var mensagem in Lista(valor, "messages"))
                    {
                        _logger.LogInformation(
                            "WhatsApp: mensagem recebida de {De} (tipo {Tipo})",
                            Texto(mensagem, "from"), Texto(mensagem, "type"));
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "WhatsApp: aviso da Meta em formato inesperado: {Corpo}", corpo.ToString());
            }

            // Sempre 200, senão a Meta fica reenviando
            return Ok();
        }

        private static IEnumerable<JsonElement> Lista(JsonElement elemento, string nome)
        {
            return elemento.ValueKind == JsonValueKind.Object &&
                   elemento.TryGetProperty(nome, out var lista) &&
                   lista.ValueKind == JsonValueKind.Array
                ? lista.EnumerateArray()
                : Enumerable.Empty<JsonElement>();
        }

        private static string Texto(JsonElement elemento, string nome)
        {
            return elemento.ValueKind == JsonValueKind.Object &&
                   elemento.TryGetProperty(nome, out var valor)
                ? valor.ToString()
                : "";
        }
    }
}
