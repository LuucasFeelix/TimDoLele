using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDolele.Core.Entities
{
    class ItemPedido : BaseEntity
    {
        public Guid PedidoId { get; private set; }
        public string Descricao { get; private set; }
        public int Quantidade { get; private set; }
        public decimal ValorUnitario { get; private set; }
        public decimal Valor { get; private set; }
        public string? Observacao { get; private set; }

        public List<Adicional> Adicionais { get; private set; } = new();

        public ItemPedido(string descricao, int quantidade, decimal valorUnitario, string? observacao = null)
        {
            Descricao = descricao;
            Quantidade = quantidade;
            ValorUnitario = valorUnitario;
            Valor = Quantidade * valorUnitario;
            Observacao = observacao;
        }

        public void AdicionarAdicional(Adicional adicional)
        {
            Adicionais.Add(adicional);
            Valor += adicional.Preco;
        }
    }
}
