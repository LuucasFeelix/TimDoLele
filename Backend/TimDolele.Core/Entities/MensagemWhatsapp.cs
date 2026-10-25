namespace TimDolele.Core.Entities
{
    public enum TipoMensagemWhatsapp
    {
        PedidoRecebido = 1,
        EmPreparo = 2,
        SaiuParaEntrega = 3,
        ProntoParaRetirada = 4
    }

    public enum StatusMensagemWhatsapp
    {
        // Esperando ser enviada (no modo manual: alguém clicar)
        Pendente = 0,

        Enviada = 1,

        // Ficou velha: o pedido já avançou para outra etapa
        // (ex.: "em preparo" não enviado e o pedido já saiu para entrega)
        Ignorada = 2,

        // Modo automático (API oficial): a empresa recusou o envio
        Falhou = 3
    }

    // Mensagem de WhatsApp para o cliente sobre o pedido.
    // Igual nos dois modos: no manual alguém clica para enviar;
    // no automático (API oficial) o sistema envia sozinho.
    public class MensagemWhatsapp : BaseEntity
    {
        public Guid PedidoId { get; private set; }

        public TipoMensagemWhatsapp Tipo { get; private set; }

        // Só números, com o 55 do Brasil. Ex.: 5516993837839
        public string Telefone { get; private set; } = string.Empty;

        public string Texto { get; private set; } = string.Empty;

        public StatusMensagemWhatsapp Status { get; private set; }

        public DateTime CriadaEm { get; private set; }

        public DateTime? EnviadaEm { get; private set; }

        public int Tentativas { get; private set; }

        public string? Erro { get; private set; }

        private MensagemWhatsapp() { }

        public MensagemWhatsapp(
            Guid pedidoId,
            TipoMensagemWhatsapp tipo,
            string telefone,
            string texto)
        {
            PedidoId = pedidoId;
            Tipo = tipo;
            Telefone = telefone;
            Texto = texto;
            Status = StatusMensagemWhatsapp.Pendente;
            CriadaEm = DateTime.Now;
        }

        public void MarcarEnviada()
        {
            Status = StatusMensagemWhatsapp.Enviada;
            EnviadaEm = DateTime.Now;
            Erro = null;
        }

        public void Ignorar()
        {
            if (Status == StatusMensagemWhatsapp.Pendente)
                Status = StatusMensagemWhatsapp.Ignorada;
        }

        public void RegistrarFalha(string erro)
        {
            Tentativas++;
            Erro = erro;

            // Depois de 3 tentativas, desiste (fica para envio manual)
            if (Tentativas >= 3)
                Status = StatusMensagemWhatsapp.Falhou;
        }
    }
}
