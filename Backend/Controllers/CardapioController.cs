using Microsoft.AspNetCore.Mvc;
using TimDoLele.Infrastructure.Data;
using TimDoLele.Application.DTOs;
using Microsoft.EntityFrameworkCore;

namespace TimDoLeLe.Controllers
{
    [ApiController]
    [Route("api/cardapio")]
    public class CardapioController : ControllerBase
    {
        private readonly TimDoLeleDbContext _context;

        public CardapioController(TimDoLeleDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult Get()
        {
            var resultado = _context.Categorias
                .Include(c => c.Produtos)
                    .ThenInclude(p => p.Adicionais)
                        .ThenInclude(pa => pa.Adicional)
                // Só categorias que têm pelo menos um produto ativo
                .Where(c => c.Produtos.Any(p => p.Ativo))
                .Select(c => new CardapioDto
                {
                    Categoria = c.Nome,
                    // Só produtos ativos aparecem para o cliente
                    Produtos = c.Produtos
                        .Where(p => p.Ativo)
                        .Select(p => new ProdutoCardapioDto
                    {
                        Id = p.Id,
                        Nome = p.Nome,
                        Descricao = p.Descricao,
                        Preco = p.Preco.ToString("F2"),
                        ImagemUrl = p.ImagemUrl,
                        Adicionais = p.Adicionais.Select(a => new AdicionalCardapioDto
                        {
                            Id = a.Adicional.Id,
                            Nome = a.Adicional.Nome,
                            Preco = a.Adicional.Preco.ToString("F2")
                        }).ToList()
                    }).ToList()
                }).ToList();

            return Ok(resultado);
        }
    }
}