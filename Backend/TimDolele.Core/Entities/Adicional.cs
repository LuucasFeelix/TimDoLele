using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDolele.Core.Entities
{
    public class Adicional : BaseEntity
    {
        public string Nome { get; private set; }
        public decimal Preco { get; private set; }
        public List<ProdutoAdicional> ProdutosAdicionais { get; private set; } = new();

        private Adicional() { }

        public Adicional(string nome, decimal preco)
        {
            Nome = nome;
            Preco = preco;
        }

    }
}
