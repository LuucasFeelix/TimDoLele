using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FluentValidation;
using TimDoLele.Application.DTOs;

namespace TimDoLele.Application.Validators
{
    public class CriarPedidoValidator : AbstractValidator<CriarPedidoDto>
    {
        public CriarPedidoValidator()
        {
            RuleFor(x => x.ClienteId)
                .NotEmpty().WithMessage("Cliente é obrigatório");

            RuleFor(x => x.Itens)
                .NotEmpty().WithMessage("Pedido deve ter pelo menos um item");

            RuleForEach(x => x.Itens)
                .SetValidator(new ItemPedidoValidator());
        }

    }
}
