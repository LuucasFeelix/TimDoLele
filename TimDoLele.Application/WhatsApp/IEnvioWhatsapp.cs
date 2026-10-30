using TimDolele.Core.Entities;

namespace TimDoLele.Application.WhatsApp
{
    // "Tomada" para o envio de WhatsApp.
    //
    // "Manual"       -> não envia sozinho; o admin abre o WhatsApp
    //                   com a mensagem pronta e aperta enviar.
    // "MetaCloudApi" -> API oficial do WhatsApp, envia sozinho.
    //
    // A troca é feita em "WhatsApp:Modo" no appsettings. As telas não mudam.
    public interface IEnvioWhatsapp
    {
        // false = modo manual (alguém precisa clicar para enviar)
        bool EnviaAutomaticamente { get; }

        // Envia de verdade. Só é chamado quando EnviaAutomaticamente = true.
        Task EnviarAsync(MensagemParaEnviar mensagem);
    }

    // Tudo o que um envio precisa saber
    public class MensagemParaEnviar
    {
        // Só números, com o 55. Ex.: 5516993837839
        public string Telefone { get; set; } = string.Empty;

        public TipoMensagemWhatsapp Tipo { get; set; }

        // Texto pronto (usado no modo manual)
        public string Texto { get; set; } = string.Empty;

        // Valores dos marcadores: "nome" -> "Lucas", "codigo" -> "8DED75D4"...
        // (a API oficial usa estes valores no modelo aprovado pela Meta)
        public Dictionary<string, string> Valores { get; set; } = new();
    }

    // Seção "WhatsApp" do appsettings
    public class WhatsappOpcoes
    {
        // "Manual" | "MetaCloudApi"
        public string Modo { get; set; } = "Manual";

        // ===== Só para "MetaCloudApi" =====
        // O TOKEN NUNCA vai no appsettings.json (vai para o git):
        // coloque no appsettings.Development.json ou em variável de ambiente.
        public string Token { get; set; } = string.Empty;

        // "Identificação do número de telefone" (Phone number ID) na Meta
        public string IdNumeroTelefone { get; set; } = string.Empty;

        public string VersaoApi { get; set; } = "v23.0";

        // Idioma dos modelos cadastrados na Meta
        public string Idioma { get; set; } = "pt_BR";
    }

    // Modo manual: o sistema prepara a mensagem e o admin envia
    public class EnvioWhatsappManual : IEnvioWhatsapp
    {
        public bool EnviaAutomaticamente => false;

        public Task EnviarAsync(MensagemParaEnviar mensagem)
        {
            throw new InvalidOperationException(
                "No modo manual as mensagens são enviadas pelo admin."
            );
        }
    }
}
