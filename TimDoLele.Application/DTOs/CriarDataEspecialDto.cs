namespace TimDoLeLe.Application.DTOs
{
    public class CriarDataEspecialDto
    {
        public DateTime Data { get; set; }

        public int Tipo { get; set; }

        public string Descricao { get; set; } =
            string.Empty;

        public string? HoraAbertura { get; set; }

        public string? HoraFechamento { get; set; }
    }
}