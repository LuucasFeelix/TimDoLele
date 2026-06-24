namespace TimDoLele.Application.DTOs
{
    public class AdicionalResponseDto
    {
        public Guid AdicionalId { get; set; }

        public string Nome { get; set; } = string.Empty;

        public decimal Preco { get; set; }
    }
}