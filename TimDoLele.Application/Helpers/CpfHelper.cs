namespace TimDoLele.Application.Helpers
{
    // CPF do pagador do PIX (o PagBank exige)
    public static class CpfHelper
    {
        // "123.456.789-09" -> "12345678909"
        public static string ApenasNumeros(string? cpf)
        {
            return new string((cpf ?? "").Where(char.IsDigit).ToArray());
        }

        // Confere os 2 dígitos verificadores
        public static bool Valido(string? cpf)
        {
            var numeros = ApenasNumeros(cpf);

            if (numeros.Length != 11)
                return false;

            // 000.000.000-00, 111.111.111-11... passam na conta, mas não existem
            if (numeros.Distinct().Count() == 1)
                return false;

            return Digito(numeros, 9) == numeros[9] - '0'
                && Digito(numeros, 10) == numeros[10] - '0';
        }

        private static int Digito(string numeros, int tamanho)
        {
            var soma = 0;

            for (var i = 0; i < tamanho; i++)
                soma += (numeros[i] - '0') * (tamanho + 1 - i);

            var resto = soma % 11;

            return resto < 2 ? 0 : 11 - resto;
        }
    }
}
