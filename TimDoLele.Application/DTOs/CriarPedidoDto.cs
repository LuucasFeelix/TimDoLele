using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDoLele.Application.DTOs
{
    public class CriarPedidoDto
    {
        public Guid ClienteId { get; set; }
        public List<ItemPedidoDto> Itens { get; set; } = new();
    }
}
