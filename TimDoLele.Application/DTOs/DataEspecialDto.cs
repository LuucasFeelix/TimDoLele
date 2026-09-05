namespace TimDoLeLe.Application.DTOs
{
    public class DataEspecialDto
    {
        public Guid Id { get; set; }

        public DateTime Data { get; set; }

        public string Tipo { get; set; } =
            string.Empty;

        public string Descricao { get; set; } =
            string.Empty;

        public string? HoraAbertura { get; set; }

        public string? HoraFechamento { get; set; }
    }
}