using TimDolele.Core.Entities;
using TimDolele.Core.Enums;

public class Pedido : BaseEntity
{
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

    public TipoEntrega TipoEntrega { get; private set; }

    public FormaPagamento FormaPagamento { get; private set; }

    public decimal? TrocoPara { get; private set; }

    public decimal Total { get; private set; }

    public StatusImpressao StatusImpressao { get; private set; }

    public DateTime? DataImpressao { get; private set; }

    public int TentativasImpressao { get; private set; }

    private Pedido()
    {
    }

    public Pedido(
        Guid clienteId,
        TipoEntrega tipoEntrega,
        FormaPagamento formaPagamento,
        decimal delivery = 0,
        decimal? trocoPara = null)
    {
        ClienteId = clienteId;

        TipoEntrega = tipoEntrega;

        FormaPagamento = formaPagamento;

        TrocoPara = formaPagamento == FormaPagamento.Dinheiro
            ? trocoPara
            : null;

        DataHora = DateTime.Now;

        Delivery = tipoEntrega == TipoEntrega.Retirada
            ? 0
            : delivery;

        Status = StatusPedido.Pendente;

        StatusImpressao = StatusImpressao.NaoImpresso;

        DataImpressao = null;

        TentativasImpressao = 0;

        Codigo = Guid.NewGuid()
            .ToString()
            .Substring(0, 8)
            .ToUpper();
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
        {
            throw new Exception(
                "Pedido já foi entregue e não pode ser alterado.");
        }

        if (Status == StatusPedido.Cancelado)
        {
            throw new Exception(
                "Pedido já foi cancelado.");
        }

        if (novoStatus == StatusPedido.Cancelado)
        {
            Status = novoStatus;

            return;
        }

        if ((int)novoStatus != (int)Status + 1)
        {
            throw new Exception(
                $"Transição inválida: {Status} → {novoStatus}");
        }

        Status = novoStatus;
    }


    public void ColocarNaFilaImpressao()
    {

        if (StatusImpressao == StatusImpressao.Impresso)
        {
            throw new Exception(
                "Este pedido já foi impresso.");
        }

        StatusImpressao =
            StatusImpressao.NaFila;
    }

    public void IniciarImpressao()
    {
        
        if (
            StatusImpressao != StatusImpressao.NaFila &&
            StatusImpressao != StatusImpressao.Erro)
        {
            throw new Exception(
                $"Não é possível iniciar a impressão com status {StatusImpressao}.");
        }

        StatusImpressao =
            StatusImpressao.Imprimindo;

        TentativasImpressao++;
    }

    public void MarcarComoImpresso()
    {
        if (
            StatusImpressao !=
            StatusImpressao.Imprimindo)
        {
            throw new Exception(
                "O pedido precisa estar sendo impresso antes de ser finalizado.");
        }

        StatusImpressao =
            StatusImpressao.Impresso;

        DataImpressao =
            DateTime.Now;
    }

    public void MarcarErroImpressao()
    {
        StatusImpressao =
            StatusImpressao.Erro;
    }

    public void PrepararReimpressao()
    {

        StatusImpressao =
            StatusImpressao.NaFila;

        DataImpressao = null;
    }
}