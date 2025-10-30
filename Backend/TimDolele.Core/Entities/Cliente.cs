using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDolele.Core.Entities
{
    class Cliente : BaseEntity
    {
        public string Nome { get; private set; }
        public string Telefone { get; private set; }
        public Endereco Endereco { get; private set; }
        public string? Observacao { get; private set; }

        private Cliente() { Nome = Telefone = string.Empty; }

        public Cliente(string nome, string telefone, Endereco endereco, string? observacao = null)
        {
            Nome = nome;
            Telefone = telefone;
            Endereco = endereco;
            Observacao = observacao;
        }
    }
}
