using System.Globalization;
using System.Text;

namespace TimDolele.Core.Entities
{
    // Bairro atendido pelo delivery, com a taxa de entrega dele
    public class Bairro : BaseEntity
    {
        // Como aparece para o cliente. Ex.: "Jardim Bela Vista"
        public string Nome { get; private set; } = string.Empty;

        // Usado para não cadastrar o mesmo bairro duas vezes
        // e para a busca. Ex.: "jardim bela vista"
        public string NomeNormalizado { get; private set; } = string.Empty;

        public decimal TaxaEntrega { get; private set; }

        public bool Ativo { get; private set; }

        private Bairro() { }

        public Bairro(string nome, decimal taxaEntrega)
        {
            Ativo = true;
            Atualizar(nome, taxaEntrega);
        }

        public void Atualizar(string nome, decimal taxaEntrega)
        {
            Nome = nome.Trim();
            NomeNormalizado = Normalizar(nome);
            TaxaEntrega = taxaEntrega;
        }

        public void Ativar() => Ativo = true;

        public void Desativar() => Ativo = false;

        // "  Jardim  Bela Vísta " -> "jardim bela vista"
        // (minúsculas, sem acento, sem espaços repetidos)
        public static string Normalizar(string? nome)
        {
            if (string.IsNullOrWhiteSpace(nome))
                return string.Empty;

            var semAcento = new StringBuilder();

            foreach (var c in nome.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD))
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                    semAcento.Append(c);
            }

            return string.Join(
                ' ',
                semAcento.ToString()
                    .Normalize(NormalizationForm.FormC)
                    .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            );
        }
    }
}
