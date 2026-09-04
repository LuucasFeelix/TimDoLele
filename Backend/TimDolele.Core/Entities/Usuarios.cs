namespace TimDolele.Core.Entities
{
    public class Usuarios
    {
        public Guid Id { get; private set; }

        public string Email { get; private set; } = string.Empty;

        public string SenhaHash { get; private set; } = string.Empty;

        public string Role { get; private set; } = "User";

        public Cliente? Cliente { get; private set; }

        public string? RefreshToken { get; private set; }

        public DateTime? RefreshTokenExpiracao { get; private set; }

        protected Usuarios()
        {
        }

        public Usuarios(
            string email,
            string senhaHash,
            string role = "User")
        {
            Id = Guid.NewGuid();
            Email = email;
            SenhaHash = senhaHash;
            Role = role;
        }

        public void DefinirRefreshToken(
            string refreshToken,
            DateTime expiracao)
        {
            RefreshToken = refreshToken;
            RefreshTokenExpiracao = expiracao;
        }

        public void RemoverRefreshToken()
        {
            RefreshToken = null;
            RefreshTokenExpiracao = null;
        }

        public bool RefreshTokenValido(string refreshToken)
        {
            return
                !string.IsNullOrWhiteSpace(RefreshToken) &&
                RefreshToken == refreshToken &&
                RefreshTokenExpiracao.HasValue &&
                RefreshTokenExpiracao.Value > DateTime.UtcNow;
        }
    }
}