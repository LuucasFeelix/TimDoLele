using Microsoft.EntityFrameworkCore;
using TimDolele.Core.Entities;
using TimDolele.Core.Enums;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.DTOs.Common;
using TimDoLele.Infrastructure.Data;

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
            try
            {
                var cliente = await _context.Clientes
                    .FirstOrDefaultAsync(c => c.Id == dto.ClienteId);

                if (cliente == null)
                    throw new Exception("Cliente não encontrado");

                var pedido = new Pedido(cliente.Id);

                foreach (var itemDto in dto.Itens)
                {
                    var produto = await _context.Produtos
                        .FirstOrDefaultAsync(p => p.Id == itemDto.ProdutoId);

                    if (produto == null)
                        throw new Exception("Produto não encontrado");

                    var item = new ItemPedido(produto, itemDto.Quantidade);

                    if (itemDto.Adicionais != null && itemDto.Adicionais.Any())
                    {
                        foreach (var adicionalDto in itemDto.Adicionais)
                        {
                            var adicional = await _context.Adicionais
                                .FirstOrDefaultAsync(a => a.Id == adicionalDto.AdicionalId);

                            if (adicional == null)
                                throw new Exception($"Adicional não encontrado: {adicionalDto.AdicionalId}");

                            item.AdicionarAdicional(adicional.Id, adicional.Preco);
                        }
                    }

                    pedido.AdicionarItem(item);
                }

                await _context.Pedidos.AddAsync(pedido);
                await _context.SaveChangesAsync();

                return pedido.Id;
            }
            catch (Exception ex)
            {
                throw new Exception(ex.InnerException?.Message ?? ex.Message);
            }
        }

        public async Task<PagedResult<PedidoResponseDto>> ObterPedidosAsync(
            Guid? clienteId,
            StatusPedido? status,
            int page = 1,
        int pageSize = 10)
        {
            var query = _context.Pedidos
                .Include(p => p.Cliente)
                .Include(p => p.Itens)
                    .ThenInclude(i => i.Produto)
                .Include(p => p.Itens)
                    .ThenInclude(i => i.Adicionais)
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

                Itens = p.Itens.Select(i => new ItemPedidoResponseDto
                {
                    ProdutoNome = i.Produto!.Nome,
                    Quantidade = i.Quantidade,
                    ValorUnitario = i.ValorUnitario,
                    Valor = i.Valor,

                    Adicionais = i.Adicionais.Select(a => new AdicionalResponseDto
                    {
                        AdicionalId = a.AdicionalId,
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
                .FirstOrDefaultAsync(p => p.Id == id);

            if (pedido == null)
                return null;

            return new PedidoResponseDto
            {
                Id = pedido.Id,
                Codigo = pedido.Codigo,
                DataHora = pedido.DataHora,
                NomeCliente = pedido.Cliente!.Nome,

                SubTotal = pedido.Subtotal,
                Delivery = pedido.Delivery,
                Total = pedido.Total,

                Itens = pedido.Itens.Select(i => new ItemPedidoResponseDto
                {
                    ProdutoNome = i.Produto!.Nome,
                    Quantidade = i.Quantidade,
                    ValorUnitario = i.ValorUnitario,
                    Valor = i.Valor,

                    Adicionais = i.Adicionais.Select(a => new AdicionalResponseDto
                    {
                        AdicionalId = a.AdicionalId,
                        Preco = a.Preco
                    }).ToList()

                }).ToList()
            };
        }

        public async Task AtualizarStatusAsync(Guid pedidoId, StatusPedido status)
        {
            var pedido = await _context.Pedidos.FindAsync(pedidoId);

            if (pedido == null)
                throw new Exception("Pedido não encontrado");

            pedido.AtualizarStatus(status);

            await _context.SaveChangesAsync();
        }

        public async Task<DashBoardPedidosDto> ObterDashboardAsync()
        {
            var hoje = DateTime.Today;

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
                .Where(p => p.DataHora.Date == hoje && p.Status == StatusPedido.Entregue)
                .SumAsync(p => (decimal?)p.Total) ?? 0;

            var quantidadeHoje = await _context.Pedidos
                .CountAsync(p => p.DataHora.Date == hoje);

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