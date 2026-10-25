namespace TimDoLele.Application.DTOs
{
    // Mensagens que faltam enviar ao cliente de um pedido,
    // já juntas num texto só (modo manual: abre o WhatsApp com ele)
    public class WhatsappPendenteDto
    {
        public Guid PedidoId { get; set; }

        // Só números, com 55. Ex.: 5516993837839
        public string Telefone { get; set; } = string.Empty;

        public string Texto { get; set; } = string.Empty;

        // Link que abre o WhatsApp com a mensagem pronta
        public string Link { get; set; } = string.Empty;

        // Ids das mensagens incluídas (para marcar como enviadas)
        public List<Guid> MensagensIds { get; set; } = new();
    }
}
