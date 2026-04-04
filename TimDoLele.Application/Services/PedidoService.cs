using Microsoft.EntityFrameworkCore;
using TimDolele.Core.Entities;
using TimDolele.Core.Enums;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.DTOs.Common;
using TimDoLele.Infrastructure.Data;
using TimDoLele.Application.Exceptions;

namespace TimDoLele.Application.Services
{
    public class PedidoService
    {
        private readonly TimDoLeleDbContext _context;

        public PedidoService(TimDoLeleDbContext context)
        {
            _context = context;
        }

        public async Task<Guid> CriarPedidoAsync(CriarPedidoDto dto, Guid usuarioId)
        {
            if (dto == null)
                throw new BadRequestException("Dados do pedido não informados");

            if (dto.Itens == null || !dto.Itens.Any())
                throw new BadRequestException("Pedido deve conter pelo menos um item");

            if (dto.ClienteId == Guid.Empty)
                throw new BadRequestException("Cliente inválido");

            var cliente = await _context.Clientes
                .FirstOrDefaultAsync(c => c.Id == dto.ClienteId);

            if (cliente == null)
                throw new NotFoundException("Cliente não encontrado");

            var pedido = new Pedido(cliente.Id, usuarioId);

            foreach (var itemDto in dto.Itens)
            {
                if (itemDto.ProdutoId == Guid.Empty)
                    throw new BadRequestException("ProdutoId inválido");

                if (itemDto.Quantidade <= 0)
                    throw new BadRequestException("Quantidade deve ser maior que zero");

                var produto = await _context.Produtos
                    .FirstOrDefaultAsync(p => p.Id == itemDto.ProdutoId);

                if (produto == null)
                    throw new NotFoundException($"Produto não encontrado: {itemDto.ProdutoId}");

                var item = new ItemPedido(produto, itemDto.Quantidade);

                if (itemDto.Adicionais != null && itemDto.Adicionais.Any())
                {
                    foreach (var adicionalDto in itemDto.Adicionais)
                    {
                        if (adicionalDto.AdicionalId == Guid.Empty)
                            throw new BadRequestException("AdicionalId inválido");

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
                .AsQueryable();

            if (usuarioId.HasValue)
                query = query.Where(p => p.UsuarioId == usuarioId.Value);

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
                UsuarioId = p.UsuarioId,

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
                UsuarioId = pedido.UsuarioId,

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
                throw new NotFoundException("Pedido não encontrado");

            pedido.AtualizarStatus(status);

            await _context.SaveChangesAsync();
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