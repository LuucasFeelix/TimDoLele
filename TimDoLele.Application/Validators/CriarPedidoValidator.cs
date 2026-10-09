using FluentValidation;
using TimDoLeLe.Application.DTOs;

namespace TimDoLele.Application.Validators
{
    public class CriarPedidoValidator : AbstractValidator<CriarPedidoDto>
    {
        public CriarPedidoValidator()
        {
            // Telefone com DDD: 10 (fixo) ou 11 (celular) números
            RuleFor(x => x.Telefone)
                .NotEmpty()
                .WithMessage("Informe o telefone.")
                .Must(t =>
                {
                    var digitos = t.Count(char.IsDigit);

                    return digitos == 10 || digitos == 11;
                })
                .WithMessage("Informe um telefone válido com DDD.");

            RuleFor(x => x.Itens)
                .NotEmpty()
                .WithMessage("O pedido deve ter ao menos um item.");

            RuleForEach(x => x.Itens)
                .SetValidator(new ItemPedidoValidator());
        }
    }

}