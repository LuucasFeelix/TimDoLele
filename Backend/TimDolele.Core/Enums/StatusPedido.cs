using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDolele.Core.Enums
{
    public enum StatusPedido
    {
        Pendente = 0,
        EmPreparo = 1,
        SaiuParaEntrega = 2,
        Entregue = 3,
        Cancelado = 4,

        // PIX gerado, esperando o cliente pagar.
        // A loja NÃO vê o pedido nesse status.
        AguardandoPagamento = 5,

        // Passou o prazo e o PIX não foi pago.
        // Também fica escondido da loja (não é um "cancelado" de verdade).
        PagamentoExpirado = 6
    }
}
