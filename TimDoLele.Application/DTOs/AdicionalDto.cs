using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDoLele.Application.DTOs
{
    public class AdicionalDto
    {
        public Guid AdicionalId { get; set; }

        // Ex.: 2 = "2x Bacon". Se não vier, vale 1.
        public int Quantidade { get; set; } = 1;

    }
}
