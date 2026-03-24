using Microsoft.EntityFrameworkCore;
using TimDoLele.Application.DTOs;
using TimDoLele.Infrastructure.Data;
using TimDolele.Core.Entities;

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

        public async Task<List<PedidoResponseDto>> ObterPedidosAsync()
        {
            var pedidos = await _context.Pedidos
                .Include(p => p.Cliente)
                .Include(p => p.Itens)
                    .ThenInclude(i => i.Produto)
                .Include(p => p.Itens)
                    .ThenInclude(i => i.Adicionais)
                .ToListAsync();

            var resultado = pedidos.Select(p => new PedidoResponseDto
            {
                Id = p.Id,
                Codigo = p.Codigo,
                DataHora = p.DataHora,
                NomeCliente = p.Cliente!.Nome,

                SubTotal = p.Subtotal,
                Delivery = p.Delivery,
                Total = p.Total,

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

            return resultado;
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
    }
}