namespace TimDoLele.Application.DTOs
{
    // Cupom como aparece no admin
    public class CupomDto
    {
        public Guid Id { get; set; }

        public string Codigo { get; set; } = string.Empty;

        // 1 = Percentual | 2 = ValorFixo
        public int Tipo { get; set; }

        public decimal Valor { get; set; }

        public decimal? PedidoMinimo { get; set; }

        public DateTime? ValidoAte { get; set; }

        public int? LimiteUsos { get; set; }

        public int Usos { get; set; }

        public bool Ativo { get; set; }
    }

    // Cadastrar / editar cupom (admin)
    public class SalvarCupomDto
    {
        public string Codigo { get; set; } = string.Empty;

        public int Tipo { get; set; }

        public decimal Valor { get; set; }

        public decimal? PedidoMinimo { get; set; }

        public DateTime? ValidoAte { get; set; }

        public int? LimiteUsos { get; set; }
    }

    // Cliente aplicando o cupom no checkout
    public class ValidarCupomDto
    {
        public string Codigo { get; set; } = string.Empty;

        public decimal Subtotal { get; set; }
    }

    // Resposta do cupom aplicado no checkout
    public class CupomValidadoDto
    {
        public string Codigo { get; set; } = string.Empty;

        public int Tipo { get; set; }

        public decimal Valor { get; set; }

        public decimal? PedidoMinimo { get; set; }

        public decimal Desconto { get; set; }
    }
}
