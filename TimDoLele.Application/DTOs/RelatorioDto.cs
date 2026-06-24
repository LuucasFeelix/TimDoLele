using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDoLele.Application.DTOs
{
    public class RelatorioDto
    {
        public decimal Faturamento { get; set; }

        public int Pedidos { get; set; }

        public int Delivery { get; set; }

        public int Retirada { get; set; }

        public decimal PercentualDelivery { get; set; }

        public decimal PercentualRetirada { get; set; }

        public List<FormaPagamentoRelatorioDto> FormasPagamento { get; set; } = new();

        public ResumoRelatorioDto Resumo { get; set; } = new();
    }
}
