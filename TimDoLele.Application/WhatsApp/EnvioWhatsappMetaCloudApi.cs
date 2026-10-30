using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using TimDolele.Core.Entities;

namespace TimDoLele.Application.WhatsApp
{
    // API oficial do WhatsApp (Meta Cloud API): envia sozinho.
    //
    // A Meta só deixa a loja mandar a primeira mensagem usando
    // MODELOS APROVADOS. Cada tipo de mensagem tem um modelo
    // cadastrado no Gerenciador do WhatsApp com o MESMO NOME abaixo,
    // e os {{1}}, {{2}}... do modelo são preenchidos na ordem da lista.
    public class EnvioWhatsappMetaCloudApi : IEnvioWhatsapp
    {
        private static readonly Dictionary<TipoMensagemWhatsapp, (string Modelo, string[] Valores)> Modelos = new()
        {
            [TipoMensagemWhatsapp.PedidoRecebido] =
                ("pedido_recebido", new[] { "nome", "codigo", "loja", "total", "tipo", "prazo" }),

            [TipoMensagemWhatsapp.EmPreparo] =
                ("pedido_em_preparo", new[] { "codigo" }),

            [TipoMensagemWhatsapp.SaiuParaEntrega] =
                ("pedido_saiu_entrega", new[] { "codigo" }),

            [TipoMensagemWhatsapp.ProntoParaRetirada] =
                ("pedido_pronto_retirada", new[] { "codigo" })
        };

        private readonly HttpClient _http;
        private readonly WhatsappOpcoes _opcoes;

        public bool EnviaAutomaticamente => true;

        public EnvioWhatsappMetaCloudApi(HttpClient http, IOptions<WhatsappOpcoes> opcoes)
        {
            _opcoes = opcoes.Value;

            if (string.IsNullOrWhiteSpace(_opcoes.Token) ||
                string.IsNullOrWhiteSpace(_opcoes.IdNumeroTelefone))
                throw new InvalidOperationException(
                    "WhatsApp:Token e WhatsApp:IdNumeroTelefone precisam estar configurados " +
                    "(appsettings.Development.json) para usar o modo MetaCloudApi."
                );

            _http = http;
            _http.BaseAddress = new Uri($"https://graph.facebook.com/{_opcoes.VersaoApi}/");
            _http.Timeout = TimeSpan.FromSeconds(20);
            _http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _opcoes.Token.Trim());
        }

        public async Task EnviarAsync(MensagemParaEnviar mensagem)
        {
            if (!Modelos.TryGetValue(mensagem.Tipo, out var modelo))
                throw new InvalidOperationException($"Sem modelo para a mensagem {mensagem.Tipo}.");

            var parametros = modelo.Valores
                .Select(chave => new
                {
                    type = "text",
                    // A Meta não aceita valor vazio nem quebra de linha
                    text = Limpar(mensagem.Valores.GetValueOrDefault(chave))
                })
                .ToArray();

            var corpo = new
            {
                messaging_product = "whatsapp",
                to = mensagem.Telefone,
                type = "template",
                template = new
                {
                    name = modelo.Modelo,
                    language = new { code = _opcoes.Idioma },
                    components = new[]
                    {
                        new { type = "body", parameters = parametros }
                    }
                }
            };

            var resposta = await _http.PostAsJsonAsync($"{_opcoes.IdNumeroTelefone}/messages", corpo);

            if (!resposta.IsSuccessStatusCode)
            {
                var erro = await resposta.Content.ReadAsStringAsync();

                throw new InvalidOperationException(
                    $"WhatsApp respondeu {(int)resposta.StatusCode}: {erro}"
                );
            }
        }

        private static string Limpar(string? valor)
        {
            var texto = (valor ?? "").Replace("\r", " ").Replace("\n", " ").Trim();

            return texto.Length == 0 ? "-" : texto;
        }
    }
}
