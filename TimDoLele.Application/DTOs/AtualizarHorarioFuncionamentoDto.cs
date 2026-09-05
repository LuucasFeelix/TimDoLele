namespace TimDoLeLe.Application.DTOs
{
    public class AtualizarHorarioFuncionamentoDto
    {
        public int DiaSemana { get; set; }

        public bool Aberto { get; set; }

        public string? HoraAbertura { get; set; }

        public string? HoraFechamento { get; set; }
    }
}