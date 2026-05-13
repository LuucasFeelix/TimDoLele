using FluentValidation;
using TimDoLele.Application.DTOs;

namespace TimDoLele.Application.Validators
{
    public class CriarPedidoValidator : AbstractValidator<CriarPedidoDto>
    {
        public CriarPedidoValidator()
        {
            RuleFor(x => x.Itens)
                .NotEmpty()
                .WithMessage("O pedido deve ter ao menos um item.");

            RuleForEach(x => x.Itens)
                .SetValidator(new ItemPedidoValidator());
        }
    }

}