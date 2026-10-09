using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDolele.Core.Entities
{
    public class ItemPedidoAdicional : BaseEntity
    {
        public Guid ItemPedidoId { get; private set; }
        public ItemPedido ItemPedido { get; private set; }
        public Guid AdicionalId { get; private set; }
        public Adicional Adicional { get; private set; }

        // Preço de UMA unidade do adicional
        public decimal Preco { get; private set; }

        // Quantas vezes o adicional vai no lanche (ex.: 2x Bacon)
        public int Quantidade { get; private set; } = 1;

        private ItemPedidoAdicional() { }

        public ItemPedidoAdicional(Guid adicionalId, decimal preco, int quantidade = 1)
        {
            AdicionalId = adicionalId;
            Preco = preco;
            Quantidade = quantidade;
        }

        public void AumentarQuantidade(int quantidade)
        {
            Quantidade += quantidade;
        }
    }
}
