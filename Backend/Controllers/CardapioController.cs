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
                .Select(c => new CardapioDto
                {
                    Categoria = c.Nome,
                    Produtos = c.Produtos.Select(p => new ProdutoCardapioDto
                    {
                        Id = p.Id,
                        Nome = p.Nome,
                        Preco = p.Preco.ToString("F2"),
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