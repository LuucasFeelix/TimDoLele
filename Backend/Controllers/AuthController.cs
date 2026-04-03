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

        public AuthController(AuthService authService, TimDoLeleDbContext context)
        {
            _authService = authService;
            _context = context;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var token = await _authService.LoginAsync(dto.Email, dto.Senha);

            if (token == null)
                return Unauthorized("Email ou senha inválidos");

            return Ok(new { token });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(LoginDto dto)
        {
            var existe = _context.Usuarios.Any(u => u.Email == dto.Email);
            if (existe)
                return BadRequest("Usuário já existe");

            var usuario = new Usuarios(
            
                dto.Email,
                PasswordHelper.Hash(dto.Senha),
                "Cliente"
            );

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            return Ok("Usuário criado com sucesso");
        }
    }
}