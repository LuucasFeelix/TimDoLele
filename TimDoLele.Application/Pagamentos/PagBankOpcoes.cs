namespace TimDoLele.Application.Pagamentos
{
    // Seção "PagBank" do appsettings.
    // O TOKEN NUNCA vai no appsettings.json (vai para o git):
    // coloque no appsettings.Development.json (testes) ou
    // em variável de ambiente no servidor (produção).
    public class PagBankOpcoes
    {
        public string Token { get; set; } = string.Empty;

        // "Sandbox" (testes, dinheiro de mentira) | "Producao" (de verdade)
        public string Ambiente { get; set; } = "Sandbox";

        // Endereço público da API para o PagBank avisar do pagamento.
        // Ex.: https://api.seusite.com.br  (vazio = sem aviso; o sistema
        // continua conferindo sozinho a cada poucos segundos)
        public string UrlNotificacao { get; set; } = string.Empty;

        public string UrlBase => Ambiente.Equals("Producao", StringComparison.OrdinalIgnoreCase)
            ? "https://api.pagseguro.com"
            : "https://sandbox.api.pagseguro.com";
    }
}
