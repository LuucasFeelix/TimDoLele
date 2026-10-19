using Microsoft.EntityFrameworkCore;
using TimDolele.Core.Entities;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.Exceptions;
using TimDoLele.Application.Helpers;
using TimDoLele.Infrastructure.Data;

namespace TimDoLele.Application.Services
{
    public class BairroService
    {
        private readonly TimDoLeleDbContext _context;

        public BairroService(TimDoLeleDbContext context)
        {
            _context = context;
        }

        // =====================================================
        // ADMIN
        // =====================================================

        public async Task<List<BairroDto>> ListarTodosAsync()
        {
            var bairros = await _context.Bairros
                .OrderBy(b => b.Nome)
                .ToListAsync();

            return bairros.Select(Mapear).ToList();
        }

        public async Task<BairroDto> CriarAsync(SalvarBairroDto dto)
        {
            var (nome, taxa) = Validar(dto);

            await GarantirNomeLivreAsync(nome, idAtual: null);

            var bairro = new Bairro(nome, taxa);

            await _context.Bairros.AddAsync(bairro);
            await _context.SaveChangesAsync();

            return Mapear(bairro);
        }

        public async Task<BairroDto> AtualizarAsync(Guid id, SalvarBairroDto dto)
        {
            var bairro = await BuscarPorIdAsync(id);

            var (nome, taxa) = Validar(dto);

            await GarantirNomeLivreAsync(nome, idAtual: id);

            bairro.Atualizar(nome, taxa);

            await _context.SaveChangesAsync();

            return Mapear(bairro);
        }

        public async Task<BairroDto> AlterarAtivoAsync(Guid id, bool ativo)
        {
            var bairro = await BuscarPorIdAsync(id);

            if (ativo)
                bairro.Ativar();
            else
                bairro.Desativar();

            await _context.SaveChangesAsync();

            return Mapear(bairro);
        }

        // Cria os novos e atualiza a taxa dos que já existem (pelo nome)
        public async Task<ResultadoImportacaoBairrosDto> ImportarAsync(ImportarBairrosDto dto)
        {
            if (dto.Bairros == null || dto.Bairros.Count == 0)
                throw new BadRequestException("Nenhum bairro para importar.");

            var existentes = await _context.Bairros.ToListAsync();

            var resultado = new ResultadoImportacaoBairrosDto();

            foreach (var item in dto.Bairros)
            {
                var (nome, taxa) = Validar(item);

                var normalizado = Bairro.Normalizar(nome);

                var bairro = existentes
                    .FirstOrDefault(b => b.NomeNormalizado == normalizado);

                if (bairro != null)
                {
                    bairro.Atualizar(nome, taxa);
                    resultado.Atualizados++;
                    continue;
                }

                bairro = new Bairro(nome, taxa);

                existentes.Add(bairro);
                await _context.Bairros.AddAsync(bairro);

                resultado.Criados++;
            }

            await _context.SaveChangesAsync();

            return resultado;
        }

        // =====================================================
        // CHECKOUT E PEDIDO
        // =====================================================

        // Lista que o cliente vê no checkout
        public async Task<List<BairroDto>> ListarAtivosAsync()
        {
            var bairros = await _context.Bairros
                .Where(b => b.Ativo)
                .OrderBy(b => b.Nome)
                .ToListAsync();

            return bairros.Select(Mapear).ToList();
        }

        // Enquanto nenhum bairro estiver ativo, o checkout
        // usa o jeito antigo (bairro digitado + taxa padrão)
        public async Task<bool> UsaTaxaPorBairroAsync()
        {
            return await _context.Bairros.AnyAsync(b => b.Ativo);
        }

        public async Task<Bairro> ObterAtivoParaPedidoAsync(Guid? bairroId)
        {
            if (!bairroId.HasValue)
                throw new BadRequestException("Escolha o seu bairro na lista.");

            var bairro = await _context.Bairros
                .FirstOrDefaultAsync(b => b.Id == bairroId.Value);

            if (bairro == null || !bairro.Ativo)
                throw new BadRequestException(
                    "Ainda não entregamos neste bairro. Você pode escolher Retirada."
                );

            return bairro;
        }

        // =====================================================
        // AUXILIARES
        // =====================================================

        private static (string Nome, decimal Taxa) Validar(SalvarBairroDto dto)
        {
            // Nome vai para a impressão: sem emojis
            var nome = TextoHelper.LimparParaImpressao(dto.Nome);

            if (string.IsNullOrWhiteSpace(nome))
                throw new BadRequestException("Informe o nome do bairro.");

            if (nome.Length > 100)
                throw new BadRequestException("O nome do bairro deve ter no máximo 100 caracteres.");

            if (dto.TaxaEntrega < 0)
                throw new BadRequestException($"A taxa do bairro {nome} não pode ser negativa.");

            return (nome, Math.Round(dto.TaxaEntrega, 2));
        }

        private async Task GarantirNomeLivreAsync(string nome, Guid? idAtual)
        {
            var normalizado = Bairro.Normalizar(nome);

            var existe = await _context.Bairros
                .AnyAsync(b => b.NomeNormalizado == normalizado && b.Id != idAtual);

            if (existe)
                throw new BadRequestException($"O bairro {nome} já está cadastrado.");
        }

        private async Task<Bairro> BuscarPorIdAsync(Guid id)
        {
            var bairro = await _context.Bairros.FirstOrDefaultAsync(b => b.Id == id);

            if (bairro == null)
                throw new NotFoundException("Bairro não encontrado.");

            return bairro;
        }

        private static BairroDto Mapear(Bairro bairro)
        {
            return new BairroDto
            {
                Id = bairro.Id,
                Nome = bairro.Nome,
                TaxaEntrega = bairro.TaxaEntrega,
                Ativo = bairro.Ativo
            };
        }
    }
}
