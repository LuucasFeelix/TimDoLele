using Microsoft.EntityFrameworkCore;
using TimDolele.Core.Entities;
using TimDolele.Core.Enums;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.DTOs.Common;
using TimDoLele.Application.Exceptions;
using TimDoLele.Infrastructure.Data;
using TimDoLeLe.Application.DTOs;

namespace TimDoLele.Application.Services
{
    public class PedidoService
    {
        private readonly TimDoLeleDbContext _context;

        public PedidoService(TimDoLeleDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> CriarPedidoAsync(CriarPedidoDto dto)
        {
            var cliente = new Cliente(
                dto.Nome,
                dto.Telefone,
                new Endereco(
                    dto.Endereco,
                    "0",
                    "",
                    "",
                    "",
                    ""
                )
            );

            await _context.Clientes.AddAsync(cliente);
            await _context.SaveChangesAsync();

            var taxaEntrega =
                dto.TipoEntrega == TipoEntrega.Delivery ? 5 : 0;

            var pedido = new Pedido(
                cliente.Id,
                dto.TipoEntrega,
                dto.FormaPagamento,
                taxaEntrega,
                dto.TrocoPara
            );

            foreach (var itemDto in dto.Itens)
            {
                var produto = await _context.Produtos
                    .FirstOrDefaultAsync(p => p.Id == itemDto.ProdutoId);

                if (produto == null)
                    throw new NotFoundException($"Produto não encontrado: {itemDto.ProdutoId}");

                var item = new ItemPedido(produto, itemDto.Quantidade);

                if (itemDto.Adicionais != null && itemDto.Adicionais.Any())
                {
                    foreach (var adicionalDto in itemDto.Adicionais)
                    {
                        var adicional = await _context.Adicionais
                            .FirstOrDefaultAsync(a => a.Id == adicionalDto.AdicionalId);

                        if (adicional == null)
                            throw new NotFoundException($"Adicional não encontrado: {adicionalDto.AdicionalId}");

                        item.AdicionarAdicional(adicional.Id, adicional.Preco);
                    }
                }

                pedido.AdicionarItem(item);
            }

            await _context.Pedidos.AddAsync(pedido);
            await _context.SaveChangesAsync();

            return pedido.Id;
        }

        public async Task<PagedResult<PedidoResponseDto>> ObterPedidosAsync(
            Guid? clienteId,
            StatusPedido? status,
            int page = 1,
            int pageSize = 10,
            Guid? usuarioId = null)
        {
            var query = _context.Pedidos
                .Include(p => p.Cliente)
                .Include(p => p.Itens)
                    .ThenInclude(i => i.Produto)
                .Include(p => p.Itens)
                    .ThenInclude(i => i.Adicionais)
                        .ThenInclude(a => a.Adicional)
                .AsQueryable();

            if (clienteId.HasValue)
                query = query.Where(p => p.ClienteId == clienteId.Value);

            if (status.HasValue)
                query = query.Where(p => p.Status == status.Value);

            query = query.OrderByDescending(p => p.DataHora);

            if (page <= 0) page = 1;
            if (pageSize <= 0) pageSize = 10;
            if (pageSize > 50) pageSize = 50;

            var total = await query.CountAsync();

            var pedidos = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var data = pedidos.Select(p => new PedidoResponseDto
            {
                Id = p.Id,
                Codigo = p.Codigo,
                DataHora = p.DataHora,
                NomeCliente = p.Cliente!.Nome,
                SubTotal = p.Subtotal,
                Delivery = p.Delivery,
                Total = p.Total,
                Status = p.Status.ToString(),
                TipoEntrega = p.TipoEntrega.ToString(),
                FormaPagamento = p.FormaPagamento.ToString(),
                TrocoPara = p.TrocoPara,

                Itens = p.Itens.Select(i => new ItemPedidoResponseDto
                {
                    ProdutoNome = i.Produto!.Nome,
                    Quantidade = i.Quantidade,
                    ValorUnitario = i.ValorUnitario,
                    Valor = i.Valor,

                    Adicionais = i.Adicionais.Select(a => new AdicionalResponseDto
                    {
                        AdicionalId = a.AdicionalId,
                        Nome = a.Adicional != null ? a.Adicional.Nome : "",
                        Preco = a.Preco
                    }).ToList()
                }).ToList()
            }).ToList();

            return new PagedResult<PedidoResponseDto>
            {
                Page = page,
                PageSize = pageSize,
                Total = total,
                TotalPages = (int)Math.Ceiling((double)total / pageSize),
                Data = data
            };
        }

        public async Task<PedidoResponseDto?> ObterPedidoPorIdAsync(Guid id)
        {
            var pedido = await _context.Pedidos
                .Include(p => p.Cliente)
                .Include(p => p.Itens)
                    .ThenInclude(i => i.Produto)
                .Include(p => p.Itens)
                    .ThenInclude(i => i.Adicionais)
                        .ThenInclude(a => a.Adicional)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (pedido == null)
                throw new NotFoundException("Pedido não encontrado");

            return new PedidoResponseDto
            {
                Id = pedido.Id,
                Codigo = pedido.Codigo,
                DataHora = pedido.DataHora,
                NomeCliente = pedido.Cliente!.Nome,
                SubTotal = pedido.Subtotal,
                Delivery = pedido.Delivery,
                Total = pedido.Total,
                Status = pedido.Status.ToString(),
                TipoEntrega = pedido.TipoEntrega.ToString(),
                FormaPagamento = pedido.FormaPagamento.ToString(),
                TrocoPara = pedido.TrocoPara,

                Itens = pedido.Itens.Select(i => new ItemPedidoResponseDto
                {
                    ProdutoNome = i.Produto!.Nome,
                    Quantidade = i.Quantidade,
                    ValorUnitario = i.ValorUnitario,
                    Valor = i.Valor,

                    Adicionais = i.Adicionais.Select(a => new AdicionalResponseDto
                    {
                        AdicionalId = a.AdicionalId,
                        Nome = a.Adicional != null ? a.Adicional.Nome : "",
                        Preco = a.Preco
                    }).ToList()
                }).ToList()
            };
        }

        public async Task AtualizarStatusAsync(Guid pedidoId, StatusPedido status)
        {
            var pedido = await _context.Pedidos.FindAsync(pedidoId);

            if (pedido == null)
                throw new NotFoundException("Pedido não encontrado");

            pedido.AtualizarStatus(status);

            await _context.SaveChangesAsync();
        }

        public async Task<RelatorioDto> ObterRelatorioAsync(
            string periodo = "hoje",
            DateTime? dataInicio = null,
            DateTime? dataFim = null)
        {
            DateTime inicio;
            DateTime fim;

            var hoje = DateTime.Today;

            switch (periodo.ToLower())
            {
                case "ontem":
                    inicio = hoje.AddDays(-1);
                    fim = hoje;
                    break;

                case "semana":
                    inicio = hoje.AddDays(-7);
                    fim = hoje.AddDays(1);
                    break;

                case "mes":
                    inicio = new DateTime(hoje.Year, hoje.Month, 1);
                    fim = inicio.AddMonths(1);
                    break;

                case "personalizado":
                    inicio = dataInicio?.Date ?? hoje;
                    fim = dataFim?.Date.AddDays(1) ?? hoje.AddDays(1);
                    break;

                default:
                    inicio = hoje;
                    fim = hoje.AddDays(1);
                    break;
            }

            var pedidos = await _context.Pedidos
                .Where(p => p.DataHora >= inicio && p.DataHora < fim)
                .ToListAsync();

            var totalPedidos = pedidos.Count;

            var pedidosEntregues = pedidos
                .Count(p => p.Status == StatusPedido.Entregue);

            var pedidosCancelados = pedidos
                .Count(p => p.Status == StatusPedido.Cancelado);

            var faturamento = pedidos
                .Where(p => p.Status == StatusPedido.Entregue)
                .Sum(p => p.Total);

            var delivery = pedidos
                .Count(p => p.TipoEntrega == TipoEntrega.Delivery);

            var retirada = pedidos
                .Count(p => p.TipoEntrega == TipoEntrega.Retirada);

            var clientesAtendidos = pedidos
                .Select(p => p.ClienteId)
                .Distinct()
                .Count();

            var taxaCancelamento = totalPedidos > 0
                ? Math.Round((decimal)pedidosCancelados / totalPedidos * 100, 2)
                : 0;

            var percentualDelivery = totalPedidos > 0
                ? Math.Round((decimal)delivery / totalPedidos * 100, 2)
                : 0;

            var percentualRetirada = totalPedidos > 0
                ? Math.Round((decimal)retirada / totalPedidos * 100, 2)
                : 0;

            var pedidosValidosPagamento = pedidos
                .Where(p => p.Status != StatusPedido.Cancelado)
                .ToList();

            var totalPagamento = pedidosValidosPagamento.Sum(p => p.Total);

            var formasPagamento = pedidosValidosPagamento
                .GroupBy(p => p.FormaPagamento)
                .Select(g => new FormaPagamentoRelatorioDto
                {
                    Nome = g.Key.ToString(),
                    Quantidade = g.Count(),
                    Valor = g.Sum(p => p.Total),
                    Percentual = totalPagamento > 0
                        ? Math.Round(g.Sum(p => p.Total) / totalPagamento * 100, 2)
                        : 0
                })
                .OrderByDescending(x => x.Valor)
                .ToList();

            return new RelatorioDto
            {
                Faturamento = faturamento,
                Pedidos = totalPedidos,
                Delivery = delivery,
                Retirada = retirada,
                PercentualDelivery = percentualDelivery,
                PercentualRetirada = percentualRetirada,
                FormasPagamento = formasPagamento,

                Resumo = new ResumoRelatorioDto
                {
                    TotalPedidos = totalPedidos,
                    PedidosEntregues = pedidosEntregues,
                    PedidosCancelados = pedidosCancelados,
                    TaxaCancelamento = taxaCancelamento,
                    ClientesAtendidos = clientesAtendidos
                }
            };
        }

        public async Task<DashBoardPedidosDto> ObterDashboardAsync()
        {
            var inicioHoje = DateTime.Today;
            var fimHoje = inicioHoje.AddDays(1);

            var pendentes = await _context.Pedidos
                .CountAsync(p => p.Status == StatusPedido.Pendente);

            var emPreparo = await _context.Pedidos
                .CountAsync(p => p.Status == StatusPedido.EmPreparo);

            var saiuEntrega = await _context.Pedidos
                .CountAsync(p => p.Status == StatusPedido.SaiuParaEntrega);

            var entregues = await _context.Pedidos
                .CountAsync(p => p.Status == StatusPedido.Entregue);

            var cancelados = await _context.Pedidos
                .CountAsync(p => p.Status == StatusPedido.Cancelado);

            var faturamentoHoje = await _context.Pedidos
                .Where(p => p.DataHora >= inicioHoje
                         && p.DataHora < fimHoje
                         && p.Status == StatusPedido.Entregue)
                .SumAsync(p => (decimal?)p.Total) ?? 0;

            var quantidadeHoje = await _context.Pedidos
                .CountAsync(p => p.DataHora >= inicioHoje
                              && p.DataHora < fimHoje);

            return new DashBoardPedidosDto
            {
                Pendentes = pendentes,
                EmPreparo = emPreparo,
                SaiuParaEntrega = saiuEntrega,
                Entregues = entregues,
                Cancelados = cancelados,
                FaturamentoHoje = faturamentoHoje,
                QuantidadePedidosHoje = quantidadeHoje
            };
        }
    }
}