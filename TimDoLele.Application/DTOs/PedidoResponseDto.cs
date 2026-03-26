using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDoLele.Application.DTOs
{
    public class PedidoResponseDto
    {
        public Guid Id { get; set; }
        public string Codigo {  get; set; } = string.Empty;
        public DateTime DataHora { get; set; }

        public string NomeCliente { get; set; } = string.Empty;

        public decimal SubTotal { get; set; }
        public decimal Delivery { get; set; }
        public decimal Total { get; set; }
        public string Status { get; set; } = string.Empty;

        public List<ItemPedidoResponseDto> Itens { get; set; } = new();
    }
}
