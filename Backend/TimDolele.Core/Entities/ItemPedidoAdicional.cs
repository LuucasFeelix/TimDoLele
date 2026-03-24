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

        public decimal Preco { get; private set; }

        private ItemPedidoAdicional() { }

        public ItemPedidoAdicional(Guid adicionalId, decimal preco)
        {
            AdicionalId = adicionalId;
            Preco = preco;
        }
    }
}
