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

            RuleFor(x => x.Observacao)
                .MaximumLength(200)
                .WithMessage("A observação deve ter no máximo 200 caracteres.");
        }
    }
}