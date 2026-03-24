using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDoLele.Application.DTOs
{
    public class ItemPedidoResponseDto
    {
        public string ProdutoNome { get; set; } = string.Empty;
        public int Quantidade { get; set; }

        public decimal ValorUnitario { get; set; }
        public decimal Valor {  get; set; }

        public List<AdicionalResponseDto> Adicionais { get; set; } = new();
    }
}
