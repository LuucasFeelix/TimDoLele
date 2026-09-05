namespace TimDoLeLe.Application.DTOs
{
    public class HorarioFuncionamentoDto
    {
        public Guid Id { get; set; }

        public int DiaSemana { get; set; }

        public string DiaSemanaTexto { get; set; } =
            string.Empty;

        public bool Aberto { get; set; }

        public string? HoraAbertura { get; set; }

        public string? HoraFechamento { get; set; }
    }
}