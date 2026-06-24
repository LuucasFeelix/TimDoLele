using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDoLele.Application.DTOs
{
    public class FormaPagamentoRelatorioDto
    {
        public string Nome { get; set; } = string.Empty;

        public int Quantidade { get; set; }

        public decimal Valor { get; set; }

        public decimal Percentual { get; set; }
    }
}
