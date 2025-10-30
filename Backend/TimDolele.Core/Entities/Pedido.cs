using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDolele.Core.Entities
{
    class Pedido : BaseEntity
    {
        public string Codigo { get; private set; }
        public DateTime DataHora { get; private set; }
        public Guid ClienteId { get; private set; }
        public Cliente Cliente { get; private set; } = null!;
        public List<ItemPedido> Itens { get; private set; } = new();
        public Pagamento Pagamento { get; private set; } = null!;
        public decimal Subtotal { get; private set; }
        public decimal Delivery { get; private set; }
        public decimal Total { get; private set; }

        private Pedido() { }

        public Pedido(string codigo, DateTime dataHora, Cliente cliente, decimal delivery)
        {
            Codigo = codigo;
            DataHora = dataHora;
            Cliente = cliente;
            ClienteId = cliente.Id;
            Delivery = delivery;
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
            pagamento = pagamento;
        }
    }
}
