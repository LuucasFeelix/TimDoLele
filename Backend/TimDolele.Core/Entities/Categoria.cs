using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDolele.Core.Entities
{
    public class Categoria : BaseEntity
    {
        public string Nome { get; private set; }
        public List<Produto> Produtos { get; private set; } = new();
        private Categoria() { }
        public Categoria(string nome)
        {
            Nome = nome;
        }
        public void AlterarNome(string nome)
        {
            Nome = nome;
        }
    }
}
