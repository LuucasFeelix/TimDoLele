using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TimDolele.Core.Entities;
using TimDolele.Core.Enums;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.Exceptions;
using TimDoLele.Infrastructure.Data;

namespace TimDoLele.Application.Services
{
    public class CupomService
    {
        private readonly TimDoLeleDbContext _context;

        // Código: só letras e números, de 3 a 20. Ex.: BEMVINDO10
        private static readonly Regex FormatoCodigo =
            new("^[A-Z0-9]{3,20}$", RegexOptions.Compiled);

        public CupomService(TimDoLeleDbContext context)
        {
            _context = context;
        }

        // =====================================================
        // ADMIN
        // =====================================================

        public async Task<List<CupomDto>> ListarAsync()
        {
            var cupons = await _context.Cupons
                .OrderByDescending(c => c.Ativo)
                .ThenBy(c => c.Codigo)
                .ToListAsync();

            return cupons.Select(Mapear).ToList();
        }

        public async Task<CupomDto> CriarAsync(SalvarCupomDto dto)
        {
            var codigo = await ValidarDadosAsync(dto, idAtual: null);

            var cupom = new Cupom(
                codigo,
                (TipoDesconto)dto.Tipo,
                dto.Valor,
                dto.PedidoMinimo,
                dto.ValidoAte,
                dto.LimiteUsos
            );

            await _context.Cupons.AddAsync(cupom);
            await _context.SaveChangesAsync();

            return Mapear(cupom);
        }

        public async Task<CupomDto> AtualizarAsync(Guid id, SalvarCupomDto dto)
        {
            var cupom = await BuscarPorIdAsync(id);

            var codigo = await ValidarDadosAsync(dto, idAtual: id);

            cupom.Atualizar(
                codigo,
                (TipoDesconto)dto.Tipo,
                dto.Valor,
                dto.PedidoMinimo,
                dto.ValidoAte,
                dto.LimiteUsos
            );

            await _context.SaveChangesAsync();

            return Mapear(cupom);
        }

        public async Task<CupomDto> AlterarAtivoAsync(Guid id, bool ativo)
        {
            var cupom = await BuscarPorIdAsync(id);

            if (ativo)
                cupom.Ativar();
            else
                cupom.Desativar();

            await _context.SaveChangesAsync();

            return Mapear(cupom);
        }

        // =====================================================
        // CHECKOUT E PEDIDO
        // =====================================================

        // Usado pelo checkout para mostrar o desconto antes de finalizar
        public async Task<CupomValidadoDto> ValidarAsync(string codigo, decimal subtotal)
        {
            var cupom = await ObterCupomValidoAsync(codigo, subtotal);

            return new CupomValidadoDto
            {
                Codigo = cupom.Codigo,
                Tipo = (int)cupom.Tipo,
                Valor = cupom.Valor,
                PedidoMinimo = cupom.PedidoMinimo,
                Desconto = cupom.CalcularDesconto(subtotal)
            };
        }

        // Usado pelo PedidoService ao finalizar: confere tudo de novo,
        // porque o backend é quem decide o desconto
        public async Task<Cupom> ObterCupomValidoAsync(string? codigo, decimal subtotal)
        {
            var codigoNormalizado = (codigo ?? string.Empty).Trim().ToUpperInvariant();

            var cupom = await _context.Cupons
                .FirstOrDefaultAsync(c => c.Codigo == codigoNormalizado);

            if (cupom == null || !cupom.Ativo)
                throw new BadRequestException("Cupom inválido.");

            if (cupom.ValidoAte.HasValue && DateTime.Today > cupom.ValidoAte.Value.Date)
                throw new BadRequestException("Este cupom expirou.");

            if (cupom.LimiteUsos.HasValue && cupom.Usos >= cupom.LimiteUsos.Value)
                throw new BadRequestException("Este cupom já atingiu o limite de usos.");

            if (cupom.PedidoMinimo.HasValue && subtotal < cupom.PedidoMinimo.Value)
                throw new BadRequestException(
                    $"Este cupom vale para pedidos a partir de R$ {cupom.PedidoMinimo.Value:N2}."
                );

            return cupom;
        }

        // =====================================================
        // AUXILIARES
        // =====================================================

        private async Task<string> ValidarDadosAsync(SalvarCupomDto dto, Guid? idAtual)
        {
            var codigo = (dto.Codigo ?? string.Empty).Trim().ToUpperInvariant();

            if (!FormatoCodigo.IsMatch(codigo))
                throw new BadRequestException(
                    "O código deve ter de 3 a 20 letras ou números, sem espaços."
                );

            if (!Enum.IsDefined(typeof(TipoDesconto), dto.Tipo))
                throw new BadRequestException("Tipo de desconto inválido.");

            if (dto.Valor <= 0)
                throw new BadRequestException("O valor do desconto deve ser maior que zero.");

            if (dto.Tipo == (int)TipoDesconto.Percentual && dto.Valor > 100)
                throw new BadRequestException("O percentual não pode passar de 100%.");

            if (dto.PedidoMinimo.HasValue && dto.PedidoMinimo.Value < 0)
                throw new BadRequestException("O pedido mínimo não pode ser negativo.");

            if (dto.LimiteUsos.HasValue && dto.LimiteUsos.Value < 1)
                throw new BadRequestException("O limite de usos deve ser de pelo menos 1.");

            var codigoEmUso = await _context.Cupons
                .AnyAsync(c => c.Codigo == codigo && c.Id != idAtual);

            if (codigoEmUso)
                throw new BadRequestException("Já existe um cupom com este código.");

            return codigo;
        }

        private async Task<Cupom> BuscarPorIdAsync(Guid id)
        {
            var cupom = await _context.Cupons.FirstOrDefaultAsync(c => c.Id == id);

            if (cupom == null)
                throw new NotFoundException("Cupom não encontrado.");

            return cupom;
        }

        private static CupomDto Mapear(Cupom cupom)
        {
            return new CupomDto
            {
                Id = cupom.Id,
                Codigo = cupom.Codigo,
                Tipo = (int)cupom.Tipo,
                Valor = cupom.Valor,
                PedidoMinimo = cupom.PedidoMinimo,
                ValidoAte = cupom.ValidoAte,
                LimiteUsos = cupom.LimiteUsos,
                Usos = cupom.Usos,
                Ativo = cupom.Ativo
            };
        }
    }
}
