using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimDolele.Core.Entities;
using TimDoLele.Infrastructure.Data;

namespace TimDoLeLe.Controllers
{
    [ApiController]
    [Route("api/categorias")]
    public class CategoriaController : ControllerBase
    {
        private readonly TimDoLeleDbContext _context;

        public CategoriaController(TimDoLeleDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var categorias = await _context.Categorias
                .OrderBy(c => c.Nome)
                .Select(c => new
                {
                    c.Id,
                    c.Nome
                })
                .ToListAsync();

            return Ok(categorias);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CriarCategoriaDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nome))
                return BadRequest("Nome da categoria é obrigatório.");

            var existe = await _context.Categorias
                .AnyAsync(c => c.Nome == dto.Nome);

            if (existe)
                return BadRequest("Categoria já cadastrada.");

            var categoria = new Categoria(dto.Nome);

            _context.Categorias.Add(categoria);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                categoria.Id,
                categoria.Nome
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] CriarCategoriaDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nome))
                return BadRequest("Nome da categoria é obrigatório.");

            var categoria = await _context.Categorias
                .FirstOrDefaultAsync(c => c.Id == id);

            if (categoria == null)
                return NotFound("Categoria não encontrada.");

            categoria.AlterarNome(dto.Nome);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                categoria.Id,
                categoria.Nome
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var categoria = await _context.Categorias
                .Include(c => c.Produtos)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (categoria == null)
                return NotFound("Categoria não encontrada.");

            if (categoria.Produtos.Any())
                return BadRequest("Não é possível excluir categoria com produtos vinculados.");

            _context.Categorias.Remove(categoria);

            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    public class CriarCategoriaDto
    {
        public string Nome { get; set; } = string.Empty;
    }
}