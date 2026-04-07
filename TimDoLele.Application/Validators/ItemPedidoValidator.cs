using FluentValidation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using TimDoLele.Application.DTOs;

namespace TimDoLele.Application.Validators
{
    public class ItemPedidoValidator : AbstractValidator<ItemPedidoDto>
    {
        public ItemPedidoValidator()
        {
            RuleFor(x => x.ProdutoId)
                .NotEmpty().WithMessage("Produto é obrigatório");

            RuleFor(x => x.Quantidade)
                .GreaterThan(0).WithMessage("Quantidade deve ser maior que zero");
        }
    }
}
