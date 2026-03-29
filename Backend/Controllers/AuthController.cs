using Microsoft.AspNetCore.Mvc;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.Services;

namespace TimDoLele.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly AuthService _authService;

        public AuthController(AuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var token = await _authService.LoginAsync(dto.Email, dto.Senha);

            if (token == null)
                return Unauthorized("Email ou senha inválidos");

            return Ok(new { token });
        }
    }
}