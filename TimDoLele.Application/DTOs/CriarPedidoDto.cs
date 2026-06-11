using TimDolele.Core.Enums;
using TimDoLele.Application.DTOs;

namespace TimDoLeLe.Application.DTOs
{
    public class CriarPedidoDto
    {
        public string Nome { get; set; } = string.Empty;

        public string Telefone { get; set; } = string.Empty;

        public string Endereco { get; set; } = string.Empty;

        public TipoEntrega TipoEntrega { get; set; }

        public List<ItemPedidoDto> Itens { get; set; } = new();
    }
}