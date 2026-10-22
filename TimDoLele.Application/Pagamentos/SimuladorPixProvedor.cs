using System.Collections.Concurrent;

namespace TimDoLele.Application.Pagamentos
{
    // PIX DE MENTIRA, só para desenvolvimento e testes.
    // Gera um código de teste e só fica "pago" quando alguém aperta
    // o botão "Simular pagamento" (que só existe em desenvolvimento).
    // Será trocado pelo conector do PagBank quando o token chegar.
    public class SimuladorPixProvedor : IProvedorPix
    {
        public string Nome => "Simulador";

        // Cobranças "pagas" (fica na memória enquanto a API está rodando)
        private static readonly ConcurrentDictionary<string, bool> Pagas = new();

        public Task<CobrancaPixGerada> CriarCobrancaAsync(NovaCobrancaPix dados)
        {
            var idExterno = $"SIM-{Guid.NewGuid():N}";

            return Task.FromResult(new CobrancaPixGerada
            {
                IdExterno = idExterno,

                // Parece um copia-e-cola, mas NÃO funciona em banco nenhum
                CopiaECola =
                    $"PIX-DE-TESTE|PEDIDO:{dados.CodigoPedido}|VALOR:{dados.Valor:0.00}|{idExterno}"
            });
        }

        public Task<bool> EstaPagaAsync(string idExterno)
        {
            return Task.FromResult(Pagas.ContainsKey(idExterno));
        }

        // Faz o papel do cliente pagando (botão de teste)
        public static void SimularPagamento(string idExterno)
        {
            Pagas[idExterno] = true;
        }
    }
}
