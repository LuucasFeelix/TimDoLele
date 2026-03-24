using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDolele.Core.Entities
{
    public class ProdutoAdicional: BaseEntity
    {
        public Guid ProdutoId { get; private set; }
        public Produto Produto { get; private set; }

        public Guid AdicionalId { get; private set; }
        public Adicional Adicional { get; private set; }

        private ProdutoAdicional() { }

        public ProdutoAdicional(Guid produtoId, Guid adicionalId)
        {
            ProdutoId = produtoId;
            AdicionalId = adicionalId;
        }
    }
}
