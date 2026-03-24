using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDolele.Core.Entities
{
    public class ItemPedido : BaseEntity
    {
        public Guid PedidoId { get; private set; }

        public Guid ProdutoId { get; private set; }
        public Produto? Produto { get; private set; }

        public int Quantidade { get; private set; }
        public decimal ValorUnitario { get; private set; }
        public decimal Valor { get; private set; }
        public string? Observacao { get; private set; }

        public List<ItemPedidoAdicional> Adicionais { get; private set; } = new();

        private ItemPedido() { }

        public ItemPedido(Produto produto, int quantidade, string? observacao = null)
        {
            Produto = produto;
            ProdutoId = produto.Id;

            Quantidade = quantidade;
            ValorUnitario = produto.Preco;

            Observacao = observacao;

            RecalcularValor();
        }

        public void AdicionarAdicional(Guid adicionalId, decimal preco)
        {
            if (Adicionais.Any(a => a.AdicionalId == adicionalId))
                return;

            Adicionais.Add(new ItemPedidoAdicional(adicionalId, preco));

            RecalcularValor();
        }

        private void RecalcularValor()
        {
            var totalAdicionais = Adicionais.Sum(a => a.Preco);
            Valor = (ValorUnitario + totalAdicionais) * Quantidade;
        }
    }
}
