using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDoLele.Application.DTOs
{
    public class CardapioDto
    {
        public string Categoria { get; set; }
        public List<ProdutoCardapioDto> Produtos { get; set; }
    }

    public class ProdutoCardapioDto
    {
        public Guid Id { get; set; }
        public string Nome { get; set; }
        public string Preco { get; set; }

        public List<AdicionalCardapioDto> Adicionais { get; set; }
    }
}
