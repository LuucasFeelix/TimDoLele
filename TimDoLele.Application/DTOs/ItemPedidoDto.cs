using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDoLele.Application.DTOs
{
    public class ItemPedidoDto
    {
        public Guid ProdutoId { get; set; }
        public int Quantidade { get; set; }
        public List<AdicionalDto> Adicionais { get; set; } = new();
    }
}
