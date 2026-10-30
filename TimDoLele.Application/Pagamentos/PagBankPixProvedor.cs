using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace TimDoLele.Application.Pagamentos
{
    // PIX de verdade pelo PagBank (API de Pedidos).
    // Documentação: https://developer.pagbank.com.br/reference/criar-pedido-com-qr-code-pix-v2
    public class PagBankPixProvedor : IProvedorPix
    {
        public string Nome => "PagBank";

        private readonly HttpClient _http;
        private readonly PagBankOpcoes _opcoes;

        public PagBankPixProvedor(HttpClient http, IOptions<PagBankOpcoes> opcoes)
        {
            _opcoes = opcoes.Value;

            if (string.IsNullOrWhiteSpace(_opcoes.Token))
                throw new InvalidOperationException(
                    "Token do PagBank não configurado (PagBank:Token no appsettings.Development.json)."
                );

            _http = http;
            _http.BaseAddress = new Uri(_opcoes.UrlBase);
            _http.Timeout = TimeSpan.FromSeconds(20);
            _http.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _opcoes.Token.Trim());
            _http.DefaultRequestHeaders.Accept.Add(
                new MediaTypeWithQualityHeaderValue("application/json"));
        }

        public async Task<CobrancaPixGerada> CriarCobrancaAsync(NovaCobrancaPix dados)
        {
            // PagBank trabalha em centavos: R$ 25,90 -> 2590
            var centavos = (int)Math.Round(dados.Valor * 100, MidpointRounding.AwayFromZero);

            var telefone = new string((dados.TelefoneCliente ?? "").Where(char.IsDigit).ToArray());

            var corpo = new Dictionary<string, object?>
            {
                ["reference_id"] = dados.CodigoPedido,
                ["customer"] = new Dictionary<string, object?>
                {
                    ["name"] = string.IsNullOrWhiteSpace(dados.NomeCliente) ? "Cliente" : dados.NomeCliente.Trim(),
                    ["tax_id"] = dados.CpfCliente,
                    ["phones"] = telefone.Length is 10 or 11
                        ? new[]
                        {
                            new
                            {
                                country = "55",
                                area = telefone[..2],
                                number = telefone[2..],
                                type = "MOBILE"
                            }
                        }
                        : null
                },
                ["items"] = new[]
                {
                    new
                    {
                        reference_id = dados.CodigoPedido,
                        name = $"Pedido #{dados.CodigoPedido}",
                        quantity = 1,
                        unit_amount = centavos
                    }
                },
                ["charges"] = new[]
                {
                    new
                    {
                        reference_id = dados.CodigoPedido,
                        description = $"Pedido #{dados.CodigoPedido}",
                        amount = new { value = centavos, currency = "BRL" },
                        payment_method = new
                        {
                            type = "PIX",
                            pix = new
                            {
                                // Hora em UTC: "2026-08-06T20:14:00Z"
                                expiration_date = dados.ExpiraEm.ToUniversalTime()
                                    .ToString("yyyy-MM-dd'T'HH:mm:ss'Z'")
                            }
                        }
                    }
                }
            };

            if (!string.IsNullOrWhiteSpace(_opcoes.UrlNotificacao))
            {
                corpo["notification_urls"] = new[]
                {
                    _opcoes.UrlNotificacao.TrimEnd('/') + "/api/pagamentos/pix/aviso-pagbank"
                };
            }

            // Tira os campos vazios (ex.: telefone inválido)
            if (corpo["customer"] is Dictionary<string, object?> cliente && cliente["phones"] == null)
                cliente.Remove("phones");

            var resposta = await _http.PostAsJsonAsync("/orders", corpo);

            var json = await LerRespostaAsync(resposta);

            var idPedido = json.GetProperty("id").GetString() ?? "";

            var copiaECola = LerCopiaECola(json);

            if (string.IsNullOrEmpty(idPedido) || string.IsNullOrEmpty(copiaECola))
                throw new InvalidOperationException("PagBank não devolveu o QR Code do PIX.");

            return new CobrancaPixGerada
            {
                IdExterno = idPedido,
                CopiaECola = copiaECola
            };
        }

        // Consulta o pedido no PagBank: alguma cobrança "PAID"?
        public async Task<bool> EstaPagaAsync(string idExterno)
        {
            var resposta = await _http.GetAsync($"/orders/{Uri.EscapeDataString(idExterno)}");

            var json = await LerRespostaAsync(resposta);

            if (!json.TryGetProperty("charges", out var cobrancas) ||
                cobrancas.ValueKind != JsonValueKind.Array)
                return false;

            return cobrancas.EnumerateArray().Any(c =>
                c.TryGetProperty("status", out var status) &&
                status.GetString() == "PAID");
        }

        // Em erro, mostra a mensagem do PagBank (ajuda a descobrir o problema)
        private static async Task<JsonElement> LerRespostaAsync(HttpResponseMessage resposta)
        {
            var texto = await resposta.Content.ReadAsStringAsync();

            if (!resposta.IsSuccessStatusCode)
                throw new InvalidOperationException(
                    $"PagBank respondeu {(int)resposta.StatusCode}: {texto}"
                );

            return JsonDocument.Parse(texto).RootElement.Clone();
        }

        // Copia e cola fica em charges[0].qr_code.text
        // (formato antigo: qr_codes[0].text)
        private static string? LerCopiaECola(JsonElement json)
        {
            if (json.TryGetProperty("charges", out var cobrancas) &&
                cobrancas.ValueKind == JsonValueKind.Array)
            {
                foreach (var cobranca in cobrancas.EnumerateArray())
                {
                    if (cobranca.TryGetProperty("qr_code", out var qr) &&
                        qr.TryGetProperty("text", out var texto))
                        return texto.GetString();
                }
            }

            if (json.TryGetProperty("qr_codes", out var qrs) &&
                qrs.ValueKind == JsonValueKind.Array)
            {
                foreach (var qr in qrs.EnumerateArray())
                {
                    if (qr.TryGetProperty("text", out var texto))
                        return texto.GetString();
                }
            }

            return null;
        }
    }
}
