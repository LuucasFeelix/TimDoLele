using FluentValidation;
using TimDolele.Core.Enums;
using TimDoLele.Application.Helpers;
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

            // PIX: o PagBank exige o CPF de quem paga
            RuleFor(x => x.CpfPagador)
                .Must(CpfHelper.Valido)
                .When(x => x.FormaPagamento == FormaPagamento.Pix)
                .WithMessage("Informe um CPF válido para pagar com PIX.");

            RuleFor(x => x.Itens)
                .NotEmpty()
                .WithMessage("O pedido deve ter ao menos um item.");

            RuleForEach(x => x.Itens)
                .SetValidator(new ItemPedidoValidator());
        }
    }

}