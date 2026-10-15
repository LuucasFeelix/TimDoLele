using System.Text.RegularExpressions;

namespace TimDoLele.Application.Helpers
{
    // Texto que vai para a impressora térmica
    public static class TextoHelper
    {
        // Mantém só letras (com acento), números, espaço, quebra de linha
        // e pontuação comum. Remove emojis e símbolos que a impressora
        // térmica não imprime. Mesma regra do frontend (texto.utils.ts).
        private static readonly Regex CaracteresNaoPermitidos = new(
            @"[^A-Za-z0-9À-ÿ \n.,;:!?()\-/'""%+*&@#$ºª°]",
            RegexOptions.Compiled
        );

        private static readonly System.Globalization.CultureInfo PtBr =
            new("pt-BR");

        // 1234.5 -> "R$ 1.234,50" (mesmo formato das telas,
        // não importa o idioma do Windows do servidor)
        public static string FormatarDinheiro(decimal valor)
        {
            return valor.ToString("C", PtBr);
        }

        public static string? LimparParaImpressao(string? texto)
        {
            if (string.IsNullOrWhiteSpace(texto))
                return null;

            var limpo = CaracteresNaoPermitidos
                .Replace(texto.Replace("\r\n", "\n"), "");

            // "sem cebola  por favor" -> "sem cebola por favor"
            limpo = Regex.Replace(limpo, " {2,}", " ").Trim();

            return limpo.Length == 0 ? null : limpo;
        }
    }
}
