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
        private readonly IWebHostEnvironment _env;

        // Fotos aceitas e tamanho máximo (5 MB)
        private static readonly string[] ExtensoesImagem =
            { ".jpg", ".jpeg", ".png", ".webp" };

        private const long TamanhoMaximoImagem = 5 * 1024 * 1024;

        private const string PastaImagens = "uploads/produtos";

        public ProdutoController(
            TimDoLeleDbContext context,
            IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
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
                    p.Ativo,
                    p.ImagemUrl
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

        // Soma (ou subtrai, se negativo) o mesmo valor no preço
        // de todos os produtos de uma categoria.
        [Authorize(Roles = "Admin")]
        [HttpPost("reajuste-categoria")]
        public async Task<IActionResult> ReajustarPrecoCategoria(
            [FromBody] ReajustePrecoCategoriaDto dto)
        {
            if (dto.Valor == 0)
                return BadRequest("Informe um valor diferente de zero.");

            var categoriaExiste = await _context.Categorias
                .AnyAsync(c => c.Id == dto.CategoriaId);

            if (!categoriaExiste)
                return BadRequest("Categoria não encontrada.");

            var produtos = await _context.Produtos
                .Where(p => p.CategoriaId == dto.CategoriaId)
                .ToListAsync();

            if (produtos.Count == 0)
                return BadRequest("Esta categoria não possui produtos.");

            var produtoInvalido = produtos
                .FirstOrDefault(p => p.Preco + dto.Valor <= 0);

            if (produtoInvalido != null)
                return BadRequest(
                    $"O produto \"{produtoInvalido.Nome}\" ficaria com preço zero ou negativo."
                );

            foreach (var produto in produtos)
            {
                produto.AlterarPreco(
                    Math.Round(produto.Preco + dto.Valor, 2)
                );
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                ProdutosAlterados = produtos.Count
            });
        }

        // Envia (ou troca) a foto do produto
        [Authorize(Roles = "Admin")]
        [HttpPost("{id}/imagem")]
        [RequestSizeLimit(TamanhoMaximoImagem + 1024 * 1024)]
        public async Task<IActionResult> EnviarImagem(Guid id, IFormFile? arquivo)
        {
            if (arquivo == null || arquivo.Length == 0)
                return BadRequest("Selecione uma imagem.");

            if (arquivo.Length > TamanhoMaximoImagem)
                return BadRequest("A imagem deve ter no máximo 5 MB.");

            var extensao = Path.GetExtension(arquivo.FileName).ToLowerInvariant();

            if (!ExtensoesImagem.Contains(extensao))
                return BadRequest("Formato inválido. Use JPG, PNG ou WEBP.");

            var produto = await _context.Produtos
                .FirstOrDefaultAsync(p => p.Id == id);

            if (produto == null)
                return NotFound("Produto não encontrado.");

            var pasta = Path.Combine(ObterPastaWwwroot(), PastaImagens);

            Directory.CreateDirectory(pasta);

            // Nome aleatório: evita conflito e nomes estranhos de arquivo
            var nomeArquivo = $"{Guid.NewGuid()}{extensao}";

            using (var stream = new FileStream(
                Path.Combine(pasta, nomeArquivo),
                FileMode.Create))
            {
                await arquivo.CopyToAsync(stream);
            }

            // Apaga a foto antiga, se tinha
            ApagarArquivoImagem(produto.ImagemUrl);

            produto.DefinirImagem($"/{PastaImagens}/{nomeArquivo}");

            await _context.SaveChangesAsync();

            return Ok(new { produto.ImagemUrl });
        }

        // Remove a foto do produto
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}/imagem")]
        public async Task<IActionResult> RemoverImagem(Guid id)
        {
            var produto = await _context.Produtos
                .FirstOrDefaultAsync(p => p.Id == id);

            if (produto == null)
                return NotFound("Produto não encontrado.");

            ApagarArquivoImagem(produto.ImagemUrl);

            produto.DefinirImagem(null);

            await _context.SaveChangesAsync();

            return NoContent();
        }

        private string ObterPastaWwwroot()
        {
            return _env.WebRootPath
                ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        }

        private void ApagarArquivoImagem(string? imagemUrl)
        {
            if (string.IsNullOrWhiteSpace(imagemUrl))
                return;

            var caminho = Path.Combine(
                ObterPastaWwwroot(),
                imagemUrl.TrimStart('/')
            );

            if (System.IO.File.Exists(caminho))
                System.IO.File.Delete(caminho);
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

        [Authorize(Roles = "Admin")]
        [HttpGet("{id}/adicionais")]
        public async Task<IActionResult> GetAdicionais(Guid id)
        {
            var produto = await _context.Produtos
                .Include(p => p.Adicionais)
                    .ThenInclude(pa => pa.Adicional)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (produto == null)
                return NotFound("Produto não encontrado.");

            var adicionais = produto.Adicionais
                .Select(pa => new
                {
                    pa.Adicional.Id,
                    pa.Adicional.Nome,
                    pa.Adicional.Preco
                })
                .OrderBy(a => a.Nome)
                .ToList();

            return Ok(adicionais);
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("{id}/adicionais/{adicionalId}")]
        public async Task<IActionResult> VincularAdicional(Guid id, Guid adicionalId)
        {
            var produtoExiste = await _context.Produtos
                .AnyAsync(p => p.Id == id);

            if (!produtoExiste)
                return NotFound("Produto não encontrado.");

            var adicionalExiste = await _context.Adicionais
                .AnyAsync(a => a.Id == adicionalId);

            if (!adicionalExiste)
                return NotFound("Adicional não encontrado.");

            var jaExiste = await _context.ProdutosAdicionais
                .AnyAsync(pa =>
                    pa.ProdutoId == id &&
                    pa.AdicionalId == adicionalId
                );

            if (jaExiste)
                return BadRequest("Adicional já vinculado a este produto.");

            var produtoAdicional = new ProdutoAdicional(id, adicionalId);

            _context.ProdutosAdicionais.Add(produtoAdicional);

            await _context.SaveChangesAsync();

            return Ok();
        }

        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}/adicionais/{adicionalId}")]
        public async Task<IActionResult> RemoverAdicional(Guid id, Guid adicionalId)
        {
            var produtoAdicional = await _context.ProdutosAdicionais
                .FirstOrDefaultAsync(pa =>
                    pa.ProdutoId == id &&
                    pa.AdicionalId == adicionalId
                );

            if (produtoAdicional == null)
                return NotFound("Vínculo não encontrado.");

            _context.ProdutosAdicionais.Remove(produtoAdicional);

            await _context.SaveChangesAsync();

            return NoContent();
        }
    }

    public class CriarProdutoDto
    {
        public string Nome { get; set; } = string.Empty;

        public string? Descricao { get; set; }

        public decimal Preco { get; set; }

        public Guid CategoriaId { get; set; }
    }

    public class ReajustePrecoCategoriaDto
    {
        public Guid CategoriaId { get; set; }

        // Ex.: 0.50 aumenta R$ 0,50 | -1.00 diminui R$ 1,00
        public decimal Valor { get; set; }
    }
}