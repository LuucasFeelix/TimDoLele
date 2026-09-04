using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using TimDolele.Core.Entities;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.Exceptions;
using TimDoLele.Application.Helpers;
using TimDoLele.Infrastructure.Data;

namespace TimDoLele.Application.Services
{
    public class AuthService
    {
        private readonly TimDoLeleDbContext _context;
        private readonly IConfiguration _config;

        public AuthService(
            TimDoLeleDbContext context,
            IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        public async Task<LoginResponseDto> LoginAsync(
            string email,
            string senha)
        {
            var usuario = await _context.Usuarios
                .FirstOrDefaultAsync(
                    u => u.Email == email
                );

            if (usuario == null)
            {
                throw new NotFoundException(
                    "Usuário ou senha inválidos"
                );
            }

            if (
                string.IsNullOrEmpty(usuario.SenhaHash) ||
                !PasswordHelper.Verificar(
                    senha,
                    usuario.SenhaHash
                )
            )
            {
                throw new BadRequestException(
                    "Usuário ou senha inválidos"
                );
            }

            var token = GerarAccessToken(usuario);

            var refreshToken =
                GerarRefreshToken();

            var expiracaoRefreshToken =
                DateTime.UtcNow.AddDays(
                    ObterDuracaoRefreshTokenDias()
                );

            usuario.DefinirRefreshToken(
                refreshToken,
                expiracaoRefreshToken
            );

            await _context.SaveChangesAsync();

            return new LoginResponseDto
            {
                Token = token,
                RefreshToken = refreshToken
            };
        }

        public async Task<LoginResponseDto>
            RenovarTokenAsync(
                string refreshToken)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                throw new BadRequestException(
                    "Refresh token não informado"
                );
            }

            var usuario =
                await _context.Usuarios
                    .FirstOrDefaultAsync(
                        u =>
                            u.RefreshToken ==
                            refreshToken
                    );

            if (usuario == null)
            {
                throw new BadRequestException(
                    "Refresh token inválido"
                );
            }

            if (
                !usuario.RefreshTokenValido(
                    refreshToken
                )
            )
            {
                usuario.RemoverRefreshToken();

                await _context.SaveChangesAsync();

                throw new BadRequestException(
                    "Refresh token inválido ou expirado"
                );
            }

            var novoAccessToken =
                GerarAccessToken(usuario);

            var novoRefreshToken =
                GerarRefreshToken();

            var novaExpiracao =
                DateTime.UtcNow.AddDays(
                    ObterDuracaoRefreshTokenDias()
                );

            usuario.DefinirRefreshToken(
                novoRefreshToken,
                novaExpiracao
            );

            await _context.SaveChangesAsync();

            return new LoginResponseDto
            {
                Token = novoAccessToken,
                RefreshToken = novoRefreshToken
            };
        }

        public async Task LogoutAsync(
            string refreshToken)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                return;
            }

            var usuario =
                await _context.Usuarios
                    .FirstOrDefaultAsync(
                        u =>
                            u.RefreshToken ==
                            refreshToken
                    );

            if (usuario == null)
            {
                return;
            }

            usuario.RemoverRefreshToken();

            await _context.SaveChangesAsync();
        }

        private string GerarAccessToken(
            Usuarios usuario)
        {
            var jwtKey =
                _config["Jwt:Key"];

            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                throw new InvalidOperationException(
                    "Jwt:Key não configurado."
                );
            }

            var key =
                Encoding.UTF8.GetBytes(
                    jwtKey
                );

            var claims = new[]
            {
                new Claim(
                    ClaimTypes.NameIdentifier,
                    usuario.Id.ToString()
                ),

                new Claim(
                    ClaimTypes.Name,
                    usuario.Email
                ),

                new Claim(
                    ClaimTypes.Role,
                    usuario.Role
                ),

                new Claim(
                    "userId",
                    usuario.Id.ToString()
                )
            };

            var credenciais =
                new SigningCredentials(
                    new SymmetricSecurityKey(key),
                    SecurityAlgorithms.HmacSha256
                );

            var token =
                new JwtSecurityToken(
                    issuer:
                        _config["Jwt:Issuer"],

                    audience:
                        _config["Jwt:Audience"],

                    claims:
                        claims,

                    expires:
                        DateTime.UtcNow.AddMinutes(
                            ObterDuracaoAccessTokenMinutos()
                        ),

                    signingCredentials:
                        credenciais
                );

            return new JwtSecurityTokenHandler()
                .WriteToken(token);
        }

        private static string GerarRefreshToken()
        {
            var bytes =
                RandomNumberGenerator
                    .GetBytes(64);

            return Convert.ToBase64String(
                bytes
            );
        }

        private int ObterDuracaoAccessTokenMinutos()
        {
            var valorConfigurado =
                _config["Jwt:AccessTokenMinutes"];

            if (
                int.TryParse(
                    valorConfigurado,
                    out var minutos
                )
                &&
                minutos > 0
            )
            {
                return minutos;
            }

            return 30;
        }

        private int ObterDuracaoRefreshTokenDias()
        {
            var valorConfigurado =
                _config["Jwt:RefreshTokenDays"];

            if (
                int.TryParse(
                    valorConfigurado,
                    out var dias
                )
                &&
                dias > 0
            )
            {
                return dias;
            }

            return 7;
        }
    }
}