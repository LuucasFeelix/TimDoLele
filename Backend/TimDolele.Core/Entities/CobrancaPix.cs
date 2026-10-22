namespace TimDolele.Core.Entities
{
    public enum StatusCobrancaPix
    {
        Pendente = 0,
        Paga = 1,
        Expirada = 2
    }

    // Cobrança PIX de um pedido, gerada na empresa de pagamento
    // (PagBank, Mercado Pago... ou o simulador, em testes)
    public class CobrancaPix : BaseEntity
    {
        public Guid PedidoId { get; private set; }

        // Qual empresa gerou: "Simulador", "PagBank", "MercadoPago"
        public string Provedor { get; private set; } = string.Empty;

        // Id da cobrança lá na empresa (para consultar se foi paga)
        public string IdExterno { get; private set; } = string.Empty;

        // Código "copia e cola" (o QR Code é gerado a partir dele)
        public string CopiaECola { get; private set; } = string.Empty;

        public decimal Valor { get; private set; }

        public DateTime CriadaEm { get; private set; }

        public DateTime ExpiraEm { get; private set; }

        public StatusCobrancaPix Status { get; private set; }

        public DateTime? PagaEm { get; private set; }

        private CobrancaPix() { }

        public CobrancaPix(
            Guid pedidoId,
            string provedor,
            string idExterno,
            string copiaECola,
            decimal valor,
            DateTime expiraEm)
        {
            PedidoId = pedidoId;
            Provedor = provedor;
            IdExterno = idExterno;
            CopiaECola = copiaECola;
            Valor = valor;
            CriadaEm = DateTime.Now;
            ExpiraEm = expiraEm;
            Status = StatusCobrancaPix.Pendente;
        }

        public bool Venceu => Status == StatusCobrancaPix.Pendente && DateTime.Now >= ExpiraEm;

        public void MarcarPaga()
        {
            Status = StatusCobrancaPix.Paga;
            PagaEm = DateTime.Now;
        }

        public void MarcarExpirada()
        {
            Status = StatusCobrancaPix.Expirada;
        }
    }
}
