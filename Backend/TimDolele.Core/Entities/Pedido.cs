using TimDolele.Core.Entities;

public class Pedido : BaseEntity
{
    public string Codigo { get; private set; } = string.Empty;
    public DateTime DataHora { get; private set; }
    public Guid ClienteId { get; private set; }
    public Cliente? Cliente { get; private set; }

    public List<ItemPedido> Itens { get; private set; } = new();

    public Guid? PagamentoId { get; private set; }
    public Pagamento? Pagamento { get; private set; }

    public decimal Subtotal { get; private set; }
    public decimal Delivery { get; private set; }
    public decimal Total { get; private set; }

    private Pedido() { }

    public Pedido(Guid clienteId, decimal delivery = 0)
    {
        ClienteId = clienteId;
        DataHora = DateTime.Now;
        Delivery = delivery;

        Codigo = Guid.NewGuid().ToString().Substring(0, 8).ToUpper();
    }

    public void AdicionarItem(ItemPedido item)
    {
        Itens.Add(item);
        RecalcularTotais();
    }

    private void RecalcularTotais()
    {
        Subtotal = Itens.Sum(i => i.Valor);
        Total = Subtotal + Delivery;
    }

    public void DefinirPagamento(Pagamento pagamento)
    {
        Pagamento = pagamento;
    }
}