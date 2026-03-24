using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDolele.Core.Entities
{
    public class Produto : BaseEntity
    {
        public string Nome { get; private set; }
        public string? Descricao { get; private set; }
        public decimal Preco { get; private set; }
        public Guid CategoriaId { get; private set; }
        public Categoria? Categoria { get; private set; }
        public bool Ativo { get; private set; }
        public List<ProdutoAdicional> Adicionais { get; private set; } = new();

        private Produto() { }

        public Produto(string nome, decimal preco, Guid categoriaId, string? descricao = null)
        {
            Nome = nome;
            Preco = preco;
            CategoriaId = categoriaId;
            Descricao = descricao;
            Ativo = true;
        }

        public void AlterarPreco(decimal preco)
        {
            Preco = preco;
        }

        public void Desativar()
        {
            Ativo = false;
        }

        public void Ativar()
        {
            Ativo = true;
        }

        public void AdicionarAdicional(Guid adicionalId)
        {
            if (Adicionais.Any(a => a.AdicionalId == adicionalId))
                return;

            Adicionais.Add(new ProdutoAdicional(this.Id, adicionalId));
        }
    }
}
