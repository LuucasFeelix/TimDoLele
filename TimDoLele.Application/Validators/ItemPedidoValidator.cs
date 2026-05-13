using FluentValidation;
using TimDoLele.Application.DTOs;

namespace TimDoLele.Application.Validators
{
    public class ItemPedidoValidator : AbstractValidator<ItemPedidoDto>
    {
        public ItemPedidoValidator()
        {
            RuleFor(x => x.ProdutoId)
                .NotEmpty()
                .WithMessage("Produto obrigatório.");

            RuleFor(x => x.Quantidade)
                .GreaterThan(0)
                .WithMessage("Quantidade deve ser maior que zero.");
        }
    }
}