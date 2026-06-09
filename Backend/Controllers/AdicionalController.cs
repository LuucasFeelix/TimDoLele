using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimDolele.Core.Entities;
using TimDoLele.Infrastructure.Data;

namespace TimDoLeLe.Controllers
{
    [ApiController]
    [Route("api/adicionais")]
    public class AdicionalController : ControllerBase
    {
        private readonly TimDoLeleDbContext _context;

        public AdicionalController(TimDoLeleDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var adicionais = await _context.Adicionais
                .OrderBy(a => a.Nome)
                .Select(a => new
                {
                    a.Id,
                    a.Nome,
                    a.Preco
                })
                .ToListAsync();

            return Ok(adicionais);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CriarAdicionalDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nome))
                return BadRequest("Nome do adicional é obrigatório.");

            if (dto.Preco < 0)
                return BadRequest("Preço não pode ser negativo.");

            var existe = await _context.Adicionais
                .AnyAsync(a => a.Nome == dto.Nome);

            if (existe)
                return BadRequest("Adicional já cadastrado.");

            var adicional = new Adicional(dto.Nome, dto.Preco);

            _context.Adicionais.Add(adicional);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                adicional.Id,
                adicional.Nome,
                adicional.Preco
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] CriarAdicionalDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nome))
                return BadRequest("Nome do adicional é obrigatório.");

            if (dto.Preco < 0)
                return BadRequest("Preço não pode ser negativo.");

            var adicional = await _context.Adicionais
                .FirstOrDefaultAsync(a => a.Id == id);

            if (adicional == null)
                return NotFound("Adicional não encontrado.");

            adicional.AlterarDados(dto.Nome, dto.Preco);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                adicional.Id,
                adicional.Nome,
                adicional.Preco
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var adicional = await _context.Adicionais
                .Include(a => a.ProdutosAdicionais)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (adicional == null)
                return NotFound("Adicional não encontrado.");

            if (adicional.ProdutosAdicionais.Any())
                return BadRequest("Não é possível excluir adicional vinculado a produtos.");

            _context.Adicionais.Remove(adicional);

            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    public class CriarAdicionalDto
    {
        public string Nome { get; set; } = string.Empty;
        public decimal Preco { get; set; }
    }
}