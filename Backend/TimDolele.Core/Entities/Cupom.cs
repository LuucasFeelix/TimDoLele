using TimDolele.Core.Enums;

namespace TimDolele.Core.Entities
{
    public class Cupom : BaseEntity
    {
        // Sempre em maiúsculas. Ex.: BEMVINDO10
        public string Codigo { get; private set; } = string.Empty;

        public TipoDesconto Tipo { get; private set; }

        // Percentual (1 a 100) ou valor em R$, conforme o Tipo
        public decimal Valor { get; private set; }

        // Subtotal mínimo para usar o cupom (opcional)
        public decimal? PedidoMinimo { get; private set; }

        // Último dia em que o cupom vale (opcional)
        public DateTime? ValidoAte { get; private set; }

        // Quantas vezes pode ser usado no total (opcional)
        public int? LimiteUsos { get; private set; }

        public int Usos { get; private set; }

        public bool Ativo { get; private set; }

        private Cupom() { }

        public Cupom(
            string codigo,
            TipoDesconto tipo,
            decimal valor,
            decimal? pedidoMinimo,
            DateTime? validoAte,
            int? limiteUsos)
        {
            Ativo = true;
            Usos = 0;

            Atualizar(codigo, tipo, valor, pedidoMinimo, validoAte, limiteUsos);
        }

        public void Atualizar(
            string codigo,
            TipoDesconto tipo,
            decimal valor,
            decimal? pedidoMinimo,
            DateTime? validoAte,
            int? limiteUsos)
        {
            Codigo = codigo.Trim().ToUpperInvariant();
            Tipo = tipo;
            Valor = valor;
            PedidoMinimo = pedidoMinimo;
            ValidoAte = validoAte?.Date;
            LimiteUsos = limiteUsos;
        }

        public void Ativar() => Ativo = true;

        public void Desativar() => Ativo = false;

        public void RegistrarUso() => Usos++;

        // Desconto em R$ sobre o subtotal (nunca maior que o subtotal)
        public decimal CalcularDesconto(decimal subtotal)
        {
            var desconto = Tipo == TipoDesconto.Percentual
                ? subtotal * Valor / 100m
                : Valor;

            return Math.Round(Math.Min(desconto, subtotal), 2);
        }
    }
}
