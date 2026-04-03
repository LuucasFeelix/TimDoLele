using TimDolele.Core.Entities;
using TimDolele.Core.Enums;

public class Pedido : BaseEntity
{
    public Guid UsuarioId { get; private set; }
    public Usuarios Usuarios { get; private set; }
    public string Codigo { get; private set; } = string.Empty;
    public DateTime DataHora { get; private set; }
    public Guid ClienteId { get; private set; }
    public Cliente? Cliente { get; private set; }
    public StatusPedido Status { get; private set; }

    public List<ItemPedido> Itens { get; private set; } = new();

    public Guid? PagamentoId { get; private set; }
    public Pagamento? Pagamento { get; private set; }

    public decimal Subtotal { get; private set; }
    public decimal Delivery { get; private set; }
    public decimal Total { get; private set; }

    private Pedido() { }

    public Pedido(Guid clienteId, Guid usuarioId, decimal delivery = 0)
    {
        ClienteId = clienteId;
        UsuarioId = usuarioId;
        DataHora = DateTime.Now;
        Delivery = delivery;
        Status = StatusPedido.Pendente;

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

    public void AtualizarStatus(StatusPedido novoStatus)
    {
        if (Status == StatusPedido.Entregue)
            throw new Exception("Pedido já foi entregue e não pode ser alterado.");

        if (Status == StatusPedido.Cancelado)
            throw new Exception("Pedido já foi cancelado.");

        if (novoStatus == StatusPedido.Cancelado)
        {
            Status = novoStatus;
            return;
        }

        if ((int)novoStatus != (int)Status + 1)
            throw new Exception($"Transição inválida: {Status} → {novoStatus}");

        Status = novoStatus;
    }
}