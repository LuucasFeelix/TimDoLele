namespace TimDolele.Core.Entities
{
    public class Cliente : BaseEntity
    {
        public string Nome { get; private set; }
        public string Telefone { get; private set; }
        public Endereco Endereco { get; private set; }
        public string? Observacao { get; private set; }

        private Cliente()
        {
            Nome = string.Empty;
            Telefone = string.Empty;
        }

        public Cliente(string nome, string telefone, Endereco endereco, string? observacao = null)
        {
            Nome = nome;
            Telefone = telefone;
            Endereco = endereco;
            Observacao = observacao;
        }
    }
}