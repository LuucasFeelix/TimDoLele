using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDolele.Core.Entities
{
    class Pagamento : BaseEntity
    {
        public string Forma { get; private set; }
        public decimal Subtotal { get; private set; }
        public decimal Delivery { get; private set; }
        public decimal Total { get; private set; }

        private Pagamento() { Forma = string.Empty; }

        public Pagamento(string forma, decimal subtotal, decimal delivery) 
        {
            Forma = forma;
            Subtotal = subtotal;
            Delivery = delivery;
            Total = subtotal + delivery;
        }
    }
}
