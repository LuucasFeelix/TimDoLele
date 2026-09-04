using Microsoft.AspNetCore.Mvc;
using TimDolele.Core.Entities;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.Helpers;
using TimDoLele.Application.Services;
using TimDoLele.Infrastructure.Data;

namespace TimDoLeLe.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;
        private readonly TimDoLeleDbContext _context;

        public AuthController(
            AuthService authService,
            TimDoLeleDbContext context)
        {
            _authService = authService;
            _context = context;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(
            LoginDto dto)
        {
            var resultado =
                await _authService.LoginAsync(
                    dto.Email,
                    dto.Senha
                );

            return Ok(resultado);
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh(
            RefreshTokenDto dto)
        {
            var resultado =
                await _authService.RenovarTokenAsync(
                    dto.RefreshToken
                );

            return Ok(resultado);
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout(
            RefreshTokenDto dto)
        {
            await _authService.LogoutAsync(
                dto.RefreshToken
            );

            return Ok(new
            {
                mensagem =
                    "Logout realizado com sucesso"
            });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(
            LoginDto dto)
        {
            var existe =
                _context.Usuarios
                    .Any(
                        u =>
                            u.Email ==
                            dto.Email
                    );

            if (existe)
            {
                return BadRequest(
                    "Usuário já existe"
                );
            }

            var usuario =
                new Usuarios(
                    dto.Email,
                    PasswordHelper.Hash(
                        dto.Senha
                    ),
                    "Admin"
                );

            _context.Usuarios.Add(
                usuario
            );

            await _context.SaveChangesAsync();

            return Ok(
                "Administrador criado com sucesso"
            );
        }
    }
}