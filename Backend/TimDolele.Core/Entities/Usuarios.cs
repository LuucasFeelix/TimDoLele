using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TimDolele.Core.Entities
{
    public class Usuarios
    {
        public Guid Id { get; private set; }
        public string Email { get; private set; } = string.Empty;
        public string SenhaHash { get; private set; } = string.Empty;
        public string Role { get; private set; } = "User";

        public Usuarios(string email, string senhaHash, string role = "User")
        {
            Id = Guid.NewGuid();
            Email = email;
            SenhaHash = senhaHash;
            Role = role;
        }
    }
}
