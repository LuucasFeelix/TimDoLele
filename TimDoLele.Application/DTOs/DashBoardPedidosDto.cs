using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDoLele.Application.DTOs
{
    public class DashBoardPedidosDto
    {
        public int Pendentes { get; set; }
        public int EmPreparo { get; set; }
        public int SaiuParaEntrega { get; set; }
        public int Entregues { get; set; }
        public int Cancelados { get; set; }

        public decimal FaturamentoHoje { get; set; }
        public int QuantidadePedidosHoje { get; set; }
    }
}
