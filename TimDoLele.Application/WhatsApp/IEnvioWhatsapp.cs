namespace TimDoLele.Application.WhatsApp
{
    // "Tomada" para o envio de WhatsApp.
    //
    // Hoje:   "Manual" -> não envia sozinho; o admin abre o WhatsApp
    //         com a mensagem pronta e aperta enviar.
    // Futuro: "MetaCloudApi" (API oficial do WhatsApp) -> envia sozinho.
    //
    // Para ligar o oficial: criar a classe que implementa isto
    // e trocar "WhatsApp:Modo" no appsettings. As telas não mudam.
    public interface IEnvioWhatsapp
    {
        // false = modo manual (alguém precisa clicar para enviar)
        bool EnviaAutomaticamente { get; }

        // Envia de verdade. Só é chamado quando EnviaAutomaticamente = true.
        Task EnviarAsync(string telefone, string texto);
    }

    // Seção "WhatsApp" do appsettings.json
    public class WhatsappOpcoes
    {
        // "Manual" (hoje) | futuramente "MetaCloudApi"
        public string Modo { get; set; } = "Manual";
    }

    // Modo de hoje: o sistema prepara a mensagem e o admin envia
    public class EnvioWhatsappManual : IEnvioWhatsapp
    {
        public bool EnviaAutomaticamente => false;

        public Task EnviarAsync(string telefone, string texto)
        {
            throw new InvalidOperationException(
                "No modo manual as mensagens são enviadas pelo admin."
            );
        }
    }
}
