using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDoLele.Application.DTOs
{
    public class ResumoRelatorioDto
    {
        public int TotalPedidos { get; set; }

        public int PedidosEntregues { get; set; }

        public int PedidosCancelados { get; set; }

        public decimal TaxaCancelamento { get; set; }

        public int ClientesAtendidos { get; set; }
    }
}
