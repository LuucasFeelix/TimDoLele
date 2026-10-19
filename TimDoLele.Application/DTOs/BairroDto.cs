namespace TimDoLele.Application.DTOs
{
    // Bairro como aparece no admin e no checkout
    public class BairroDto
    {
        public Guid Id { get; set; }

        public string Nome { get; set; } = string.Empty;

        public decimal TaxaEntrega { get; set; }

        public bool Ativo { get; set; }
    }

    // Cadastrar / editar um bairro (admin)
    public class SalvarBairroDto
    {
        public string Nome { get; set; } = string.Empty;

        public decimal TaxaEntrega { get; set; }
    }

    // "Adicionar vários": lista já conferida na prévia do admin
    public class ImportarBairrosDto
    {
        public List<SalvarBairroDto> Bairros { get; set; } = new();
    }

    public class ResultadoImportacaoBairrosDto
    {
        public int Criados { get; set; }

        public int Atualizados { get; set; }
    }
}
