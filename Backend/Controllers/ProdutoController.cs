using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimDolele.Core.Entities;
using TimDoLele.Infrastructure.Data;

namespace TimDoLeLe.Controllers
{
    [ApiController]
    [Route("api/produtos")]
    public class ProdutoController : ControllerBase
    {
        private readonly TimDoLeleDbContext _context;

        public ProdutoController(TimDoLeleDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var produtos = await _context.Produtos
                .Include(p => p.Categoria)
                .OrderBy(p => p.Nome)
                .Select(p => new
                {
                    p.Id,
                    p.Nome,
                    p.Descricao,
                    p.Preco,
                    p.CategoriaId,
                    Categoria = p.Categoria != null ? p.Categoria.Nome : "",
                    p.Ativo
                })
                .ToListAsync();

            return Ok(produtos);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CriarProdutoDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nome))
                return BadRequest("Nome do produto é obrigatório.");

            if (dto.Preco <= 0)
                return BadRequest("Preço precisa ser maior que zero.");

            var categoriaExiste = await _context.Categorias
                .AnyAsync(c => c.Id == dto.CategoriaId);

            if (!categoriaExiste)
                return BadRequest("Categoria não encontrada.");

            var produto = new Produto(
                dto.Nome,
                dto.Preco,
                dto.CategoriaId,
                dto.Descricao
            );

            _context.Produtos.Add(produto);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                produto.Id,
                produto.Nome,
                produto.Preco,
                produto.CategoriaId,
                produto.Ativo
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] CriarProdutoDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Nome))
                return BadRequest("Nome do produto é obrigatório.");

            if (dto.Preco <= 0)
                return BadRequest("Preço precisa ser maior que zero.");

            var produto = await _context.Produtos
                .FirstOrDefaultAsync(p => p.Id == id);

            if (produto == null)
                return NotFound("Produto não encontrado.");

            var categoriaExiste = await _context.Categorias
                .AnyAsync(c => c.Id == dto.CategoriaId);

            if (!categoriaExiste)
                return BadRequest("Categoria não encontrada.");

            produto.AlterarDados(
                dto.Nome,
                dto.Preco,
                dto.CategoriaId,
                dto.Descricao
            );

            await _context.SaveChangesAsync();

            return Ok(new
            {
                produto.Id,
                produto.Nome,
                produto.Preco,
                produto.CategoriaId,
                produto.Ativo
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpPatch("{id}/ativar")]
        public async Task<IActionResult> Ativar(Guid id)
        {
            var produto = await _context.Produtos
                .FirstOrDefaultAsync(p => p.Id == id);

            if (produto == null)
                return NotFound("Produto não encontrado.");

            produto.Ativar();

            await _context.SaveChangesAsync();

            return Ok();
        }

        [Authorize(Roles = "Admin")]
        [HttpPatch("{id}/desativar")]
        public async Task<IActionResult> Desativar(Guid id)
        {
            var produto = await _context.Produtos
                .FirstOrDefaultAsync(p => p.Id == id);

            if (produto == null)
                return NotFound("Produto não encontrado.");

            produto.Desativar();

            await _context.SaveChangesAsync();

            return Ok();
        }
    }

    public class CriarProdutoDto
    {
        public string Nome { get; set; } = string.Empty;

        public string? Descricao { get; set; }

        public decimal Preco { get; set; }

        public Guid CategoriaId { get; set; }
    }
}