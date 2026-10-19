using Microsoft.EntityFrameworkCore;
using TimDolele.Core.Entities;
using TimDolele.Core.Enums;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.DTOs.Common;
using TimDoLele.Application.Exceptions;
using TimDoLele.Application.Helpers;
using TimDoLele.Infrastructure.Data;
using TimDoLeLe.Application.DTOs;

namespace TimDoLele.Application.Services
{
    public class PedidoService
    {
        private readonly TimDoLeleDbContext _context;
        private readonly StatusLojaService _statusLojaService;
        private readonly CupomService _cupomService;
        private readonly BairroService _bairroService;

        public PedidoService(
            TimDoLeleDbContext context,
            StatusLojaService statusLojaService,
            CupomService cupomService,
            BairroService bairroService)
        {
            _context = context;
            _statusLojaService = statusLojaService;
            _cupomService = cupomService;
            _bairroService = bairroService;
        }

        // Devolve o Id (uso interno) e o Código curto (mostrado ao cliente)
        public async Task<(Guid Id, string Codigo)> CriarPedidoAsync(
            CriarPedidoDto dto)
        {
            var statusLoja =
                await _statusLojaService
                    .ObterStatusAsync();

            if (!statusLoja.Aberta)
            {
                var mensagem =
                    !string.IsNullOrWhiteSpace(
                        statusLoja.Motivo
                    )
                        ? statusLoja.Motivo
                        : statusLoja.Mensagem;

                if (
                    !string.IsNullOrWhiteSpace(
                        statusLoja.ProximaAbertura
                    )
                )
                {
                    mensagem +=
                        $" Próxima abertura: " +
                        $"{statusLoja.ProximaAbertura}.";
                }

                throw new BadRequestException(
                    mensagem
                    ?? "A loja está fechada no momento."
                );
            }

            if (
                dto.Itens == null ||
                !dto.Itens.Any()
            )
            {
                throw new BadRequestException(
                    "O pedido deve possuir pelo menos um item."
                );
            }

            // Sem emojis: nome e endereço vão para a impressora térmica
            var nomeCliente =
                TextoHelper.LimparParaImpressao(
                    dto.Nome
                );

            if (nomeCliente == null)
            {
                throw new BadRequestException(
                    "Informe seu nome."
                );
            }

            var enderecoCliente =
                TextoHelper.LimparParaImpressao(
                    dto.Endereco
                ) ?? string.Empty;

            // Taxa de entrega:
            // - com bairros cadastrados: a taxa do bairro escolhido
            //   (o backend decide; não confia no valor da tela)
            // - sem bairros cadastrados: a taxa padrão (jeito antigo)
            decimal taxaEntrega = 0;

            var nomeBairro = string.Empty;

            if (
                dto.TipoEntrega ==
                TipoEntrega.Delivery
            )
            {
                if (
                    await _bairroService
                        .UsaTaxaPorBairroAsync()
                )
                {
                    var bairro =
                        await _bairroService
                            .ObterAtivoParaPedidoAsync(
                                dto.BairroId
                            );

                    taxaEntrega =
                        bairro.TaxaEntrega;

                    nomeBairro =
                        bairro.Nome;
                }
                else
                {
                    taxaEntrega =
                        statusLoja.TaxaEntrega;
                }
            }

            var cliente =
                new Cliente(
                    nomeCliente,
                    dto.Telefone,
                    new Endereco(
                        enderecoCliente,
                        "0",
                        nomeBairro,
                        "",
                        "",
                        ""
                    )
                );

            var pedido =
                new Pedido(
                    cliente.Id,
                    dto.TipoEntrega,
                    dto.FormaPagamento,
                    taxaEntrega,
                    dto.TrocoPara
                );

            foreach (
                var itemDto in dto.Itens
            )
            {
                var produto =
                    await _context
                        .Produtos
                        .FirstOrDefaultAsync(
                            p =>
                                p.Id ==
                                itemDto.ProdutoId
                        );

                if (produto == null)
                {
                    throw new NotFoundException(
                        $"Produto não encontrado: " +
                        $"{itemDto.ProdutoId}"
                    );
                }

                if (!produto.Ativo)
                {
                    throw new BadRequestException(
                        $"O produto \"{produto.Nome}\" não está mais disponível. " +
                        "Remova-o do carrinho para continuar."
                    );
                }

                var item =
                    new ItemPedido(
                        produto,
                        itemDto.Quantidade,
                        // Sem emojis: a impressora térmica não imprime
                        TextoHelper.LimparParaImpressao(
                            itemDto.Observacao
                        )
                    );

                if (
                    itemDto.Adicionais != null &&
                    itemDto.Adicionais.Any()
                )
                {
                    foreach (
                        var adicionalDto
                        in itemDto.Adicionais
                    )
                    {
                        var adicional =
                            await _context
                                .Adicionais
                                .FirstOrDefaultAsync(
                                    a =>
                                        a.Id ==
                                        adicionalDto
                                            .AdicionalId
                                );

                        if (adicional == null)
                        {
                            throw new NotFoundException(
                                $"Adicional não encontrado: " +
                                $"{adicionalDto.AdicionalId}"
                            );
                        }

                        if (
                            adicionalDto.Quantidade < 1 ||
                            adicionalDto.Quantidade > 5
                        )
                        {
                            throw new BadRequestException(
                                $"Quantidade inválida para o adicional {adicional.Nome}. " +
                                "Escolha de 1 a 5."
                            );
                        }

                        item.AdicionarAdicional(
                            adicional.Id,
                            adicional.Preco,
                            adicionalDto.Quantidade
                        );
                    }
                }

                pedido.AdicionarItem(
                    item
                );
            }

            // Cupom: confere de novo aqui (o backend decide o desconto)
            if (
                !string.IsNullOrWhiteSpace(
                    dto.CupomCodigo
                )
            )
            {
                var cupom =
                    await _cupomService
                        .ObterCupomValidoAsync(
                            dto.CupomCodigo,
                            pedido.Subtotal
                        );

                pedido.AplicarCupom(
                    cupom.Id,
                    cupom.Codigo,
                    cupom.CalcularDesconto(
                        pedido.Subtotal
                    )
                );

                cupom.RegistrarUso();
            }

            // Pagamento em dinheiro: o troco precisa cobrir o total,
            // senão a loja não sabe quanto levar de troco
            if (
                dto.FormaPagamento ==
                FormaPagamento.Dinheiro
            )
            {
                if (!dto.TrocoPara.HasValue)
                {
                    throw new BadRequestException(
                        "Informe para quanto precisa de troco."
                    );
                }

                if (dto.TrocoPara.Value < pedido.Total)
                {
                    throw new BadRequestException(
                        $"O valor para troco ({TextoHelper.FormatarDinheiro(dto.TrocoPara.Value)}) " +
                        $"é menor que o total do pedido ({TextoHelper.FormatarDinheiro(pedido.Total)})."
                    );
                }
            }

            var statusAntesDeSalvar =
                await _statusLojaService
                    .ObterStatusAsync();

            if (!statusAntesDeSalvar.Aberta)
            {
                var mensagem =
                    !string.IsNullOrWhiteSpace(
                        statusAntesDeSalvar.Motivo
                    )
                        ? statusAntesDeSalvar.Motivo
                        : statusAntesDeSalvar.Mensagem;

                if (
                    !string.IsNullOrWhiteSpace(
                        statusAntesDeSalvar
                            .ProximaAbertura
                    )
                )
                {
                    mensagem +=
                        $" Próxima abertura: " +
                        $"{statusAntesDeSalvar.ProximaAbertura}.";
                }

                throw new BadRequestException(
                    mensagem
                    ?? "A loja fechou e não está mais recebendo pedidos."
                );
            }

            await _context
                .Clientes
                .AddAsync(
                    cliente
                );

            await _context
                .Pedidos
                .AddAsync(
                    pedido
                );

            await _context
                .SaveChangesAsync();

            return (pedido.Id, pedido.Codigo);
        }

        public async Task<PagedResult<PedidoResponseDto>>
            ObterPedidosAsync(
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
            {
                query = query.Where(
                    p => p.ClienteId == clienteId.Value
                );
            }

            if (status.HasValue)
            {
                query = query.Where(
                    p => p.Status == status.Value
                );
            }

            query = query
                .OrderByDescending(p => p.DataHora);

            if (page <= 0)
            {
                page = 1;
            }

            if (pageSize <= 0)
            {
                pageSize = 10;
            }

            if (pageSize > 50)
            {
                pageSize = 50;
            }

            var total =
                await query.CountAsync();

            var pedidos = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var data = pedidos
                .Select(p => new PedidoResponseDto
                {
                    Id = p.Id,

                    Codigo = p.Codigo,

                    DataHora = p.DataHora,

                    NomeCliente = p.Cliente!.Nome,

                    Telefone = p.Cliente.Telefone,

                    Endereco =
                        string.IsNullOrWhiteSpace(p.Cliente.Endereco?.Rua)
                            ? null
                            : p.Cliente.Endereco.Rua,

                    Bairro =
                        string.IsNullOrWhiteSpace(p.Cliente.Endereco?.Bairro)
                            ? null
                            : p.Cliente.Endereco.Bairro,

                    SubTotal = p.Subtotal,

                    Delivery = p.Delivery,

                    Total = p.Total,

                    Desconto = p.Desconto,

                    CupomCodigo = p.CupomCodigo,

                    Status = p.Status.ToString(),

                    TipoEntrega = p.TipoEntrega.ToString(),

                    FormaPagamento =
                        p.FormaPagamento.ToString(),

                    TrocoPara = p.TrocoPara,

                    StatusImpressao =
                        p.StatusImpressao.ToString(),

                    TentativasImpressao =
                        p.TentativasImpressao,

                    DataImpressao =
                        p.DataImpressao,

                    Itens = p.Itens
                        .Select(i =>
                            new ItemPedidoResponseDto
                            {
                                ProdutoNome =
                                    i.Produto!.Nome,

                                Quantidade =
                                    i.Quantidade,

                                ValorUnitario =
                                    i.ValorUnitario,

                                Valor =
                                    i.Valor,

                                Observacao =
                                    i.Observacao,

                                Adicionais =
                                    i.Adicionais
                                    .Select(a =>
                                        new AdicionalResponseDto
                                        {
                                            AdicionalId =
                                                a.AdicionalId,

                                            Nome =
                                                a.Adicional != null
                                                    ? a.Adicional.Nome
                                                    : "",

                                            Preco =
                                                a.Preco,

                                            Quantidade =
                                                a.Quantidade
                                        })
                                    .ToList()
                            })
                        .ToList()
                })
                .ToList();

            return new PagedResult<PedidoResponseDto>
            {
                Page = page,

                PageSize = pageSize,

                Total = total,

                TotalPages =
                    (int)Math.Ceiling(
                        (double)total / pageSize
                    ),

                Data = data
            };
        }

        public async Task<PedidoResponseDto?>
            ObterPedidoPorIdAsync(Guid id)
        {
            var pedido = await _context.Pedidos
                .Include(p => p.Cliente)
                .Include(p => p.Itens)
                    .ThenInclude(i => i.Produto)
                .Include(p => p.Itens)
                    .ThenInclude(i => i.Adicionais)
                        .ThenInclude(a => a.Adicional)
                .FirstOrDefaultAsync(
                    p => p.Id == id
                );

            if (pedido == null)
            {
                throw new NotFoundException(
                    "Pedido não encontrado"
                );
            }

            return new PedidoResponseDto
            {
                Id = pedido.Id,

                Codigo = pedido.Codigo,

                DataHora = pedido.DataHora,

                NomeCliente =
                    pedido.Cliente!.Nome,

                Telefone =
                    pedido.Cliente.Telefone,

                Endereco =
                    string.IsNullOrWhiteSpace(pedido.Cliente.Endereco?.Rua)
                        ? null
                        : pedido.Cliente.Endereco.Rua,

                Bairro =
                    string.IsNullOrWhiteSpace(pedido.Cliente.Endereco?.Bairro)
                        ? null
                        : pedido.Cliente.Endereco.Bairro,

                SubTotal =
                    pedido.Subtotal,

                Delivery =
                    pedido.Delivery,

                Total =
                    pedido.Total,

                Desconto =
                    pedido.Desconto,

                CupomCodigo =
                    pedido.CupomCodigo,

                Status =
                    pedido.Status.ToString(),

                TipoEntrega =
                    pedido.TipoEntrega.ToString(),

                FormaPagamento =
                    pedido.FormaPagamento.ToString(),

                TrocoPara =
                    pedido.TrocoPara,

                StatusImpressao =
                    pedido.StatusImpressao.ToString(),

                TentativasImpressao =
                    pedido.TentativasImpressao,

                DataImpressao =
                    pedido.DataImpressao,

                Itens = pedido.Itens
                    .Select(i =>
                        new ItemPedidoResponseDto
                        {
                            ProdutoNome =
                                i.Produto!.Nome,

                            Quantidade =
                                i.Quantidade,

                            ValorUnitario =
                                i.ValorUnitario,

                            Valor =
                                i.Valor,

                            Observacao =
                                i.Observacao,

                            Adicionais =
                                i.Adicionais
                                .Select(a =>
                                    new AdicionalResponseDto
                                    {
                                        AdicionalId =
                                            a.AdicionalId,

                                        Nome =
                                            a.Adicional != null
                                                ? a.Adicional.Nome
                                                : "",

                                        Preco =
                                            a.Preco,

                                        Quantidade =
                                            a.Quantidade
                                    })
                                .ToList()
                        })
                    .ToList()
            };
        }

        public async Task AtualizarStatusAsync(
            Guid pedidoId,
            StatusPedido status)
        {
            var pedido =
                await _context.Pedidos
                    .FindAsync(pedidoId);

            if (pedido == null)
            {
                throw new NotFoundException(
                    "Pedido não encontrado"
                );
            }

            pedido.AtualizarStatus(status);

            // Cancelou um pedido com cupom: devolve o uso do cupom
            if (
                status == StatusPedido.Cancelado &&
                pedido.CupomId.HasValue
            )
            {
                var cupom =
                    await _context.Cupons
                        .FindAsync(
                            pedido.CupomId.Value
                        );

                cupom?.EstornarUso();
            }

            await _context.SaveChangesAsync();
        }

        public async Task ColocarNaFilaImpressaoAsync(
            Guid pedidoId)
        {
            var pedido =
                await ObterPedidoEntidadeAsync(
                    pedidoId
                );

            pedido.ColocarNaFilaImpressao();

            await _context.SaveChangesAsync();
        }

        public async Task IniciarImpressaoAsync(
            Guid pedidoId)
        {
            var pedido =
                await ObterPedidoEntidadeAsync(
                    pedidoId
                );

            pedido.IniciarImpressao();

            await _context.SaveChangesAsync();
        }

        // avancarStatus = true na impressão automática:
        // pedido impresso vai para "Em preparo".
        // Na reimpressão manual (após erro) o status é mudado à mão.
        // Retorna true se o status mudou.
        public async Task<bool> ConcluirImpressaoAsync(
            Guid pedidoId,
            bool avancarStatus = false)
        {
            var pedido =
                await ObterPedidoEntidadeAsync(
                    pedidoId
                );

            pedido.MarcarComoImpresso();

            var statusMudou = false;

            // Só se ainda estiver Pendente: não desfaz
            // um status que alguém já mudou manualmente
            if (
                avancarStatus &&
                pedido.Status ==
                StatusPedido.Pendente
            )
            {
                pedido.AtualizarStatus(
                    StatusPedido.EmPreparo
                );

                statusMudou = true;
            }

            await _context.SaveChangesAsync();

            return statusMudou;
        }

        public async Task MarcarErroImpressaoAsync(
            Guid pedidoId)
        {
            var pedido =
                await ObterPedidoEntidadeAsync(
                    pedidoId
                );

            pedido.MarcarErroImpressao();

            await _context.SaveChangesAsync();
        }

        public async Task PrepararReimpressaoAsync(
            Guid pedidoId)
        {
            var pedido =
                await ObterPedidoEntidadeAsync(
                    pedidoId
                );

            pedido.PrepararReimpressao();

            await _context.SaveChangesAsync();
        }

        public async Task<List<Guid>>
            ObterPedidosPendentesImpressaoAsync()
        {
            return await _context.Pedidos
                .Where(
                    p =>
                        p.StatusImpressao ==
                            StatusImpressao.NaoImpresso
                        ||
                        p.StatusImpressao ==
                            StatusImpressao.NaFila
                )
                .OrderBy(p => p.DataHora)
                .Select(p => p.Id)
                .ToListAsync();
        }

        private async Task<Pedido>
            ObterPedidoEntidadeAsync(
                Guid pedidoId)
        {
            var pedido =
                await _context.Pedidos
                    .FirstOrDefaultAsync(
                        p => p.Id == pedidoId
                    );

            if (pedido == null)
            {
                throw new NotFoundException(
                    "Pedido não encontrado"
                );
            }

            return pedido;
        }

        public async Task<RelatorioDto>
            ObterRelatorioAsync(
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

                    inicio =
                        hoje.AddDays(-1);

                    fim =
                        hoje;

                    break;

                case "semana":

                    inicio =
                        hoje.AddDays(-7);

                    fim =
                        hoje.AddDays(1);

                    break;

                case "mes":

                    inicio =
                        new DateTime(
                            hoje.Year,
                            hoje.Month,
                            1
                        );

                    fim =
                        inicio.AddMonths(1);

                    break;

                case "personalizado":

                    inicio =
                        dataInicio?.Date
                        ?? hoje;

                    fim =
                        dataFim?.Date
                            .AddDays(1)
                        ?? hoje.AddDays(1);

                    break;

                default:

                    inicio =
                        hoje;

                    fim =
                        hoje.AddDays(1);

                    break;
            }

            var pedidos =
                await _context.Pedidos
                    .Where(
                        p =>
                            p.DataHora >= inicio
                            &&
                            p.DataHora < fim
                    )
                    .ToListAsync();

            var totalPedidos =
                pedidos.Count;

            var pedidosEntregues =
                pedidos.Count(
                    p =>
                        p.Status ==
                        StatusPedido.Entregue
                );

            var pedidosCancelados =
                pedidos.Count(
                    p =>
                        p.Status ==
                        StatusPedido.Cancelado
                );

            var faturamento =
                pedidos
                    .Where(
                        p =>
                            p.Status ==
                            StatusPedido.Entregue
                    )
                    .Sum(
                        p => p.Total
                    );

            var delivery =
                pedidos.Count(
                    p =>
                        p.TipoEntrega ==
                        TipoEntrega.Delivery
                );

            var retirada =
                pedidos.Count(
                    p =>
                        p.TipoEntrega ==
                        TipoEntrega.Retirada
                );

            var clientesAtendidos =
                pedidos
                    .Select(
                        p => p.ClienteId
                    )
                    .Distinct()
                    .Count();

            var taxaCancelamento =
                totalPedidos > 0
                    ? Math.Round(
                        (decimal)pedidosCancelados
                        / totalPedidos
                        * 100,
                        2
                    )
                    : 0;

            var percentualDelivery =
                totalPedidos > 0
                    ? Math.Round(
                        (decimal)delivery
                        / totalPedidos
                        * 100,
                        2
                    )
                    : 0;

            var percentualRetirada =
                totalPedidos > 0
                    ? Math.Round(
                        (decimal)retirada
                        / totalPedidos
                        * 100,
                        2
                    )
                    : 0;

            var pedidosValidosPagamento =
                pedidos
                    .Where(
                        p =>
                            p.Status !=
                            StatusPedido.Cancelado
                    )
                    .ToList();

            var totalPagamento =
                pedidosValidosPagamento
                    .Sum(
                        p => p.Total
                    );

            var formasPagamento =
                pedidosValidosPagamento
                    .GroupBy(
                        p => p.FormaPagamento
                    )
                    .Select(
                        g =>
                            new FormaPagamentoRelatorioDto
                            {
                                Nome =
                                    g.Key.ToString(),

                                Quantidade =
                                    g.Count(),

                                Valor =
                                    g.Sum(
                                        p => p.Total
                                    ),

                                Percentual =
                                    totalPagamento > 0
                                        ? Math.Round(
                                            g.Sum(
                                                p => p.Total
                                            )
                                            /
                                            totalPagamento
                                            * 100,
                                            2
                                        )
                                        : 0
                            }
                    )
                    .OrderByDescending(
                        x => x.Valor
                    )
                    .ToList();

            return new RelatorioDto
            {
                Faturamento =
                    faturamento,

                Pedidos =
                    totalPedidos,

                Delivery =
                    delivery,

                Retirada =
                    retirada,

                PercentualDelivery =
                    percentualDelivery,

                PercentualRetirada =
                    percentualRetirada,

                FormasPagamento =
                    formasPagamento,

                Resumo =
                    new ResumoRelatorioDto
                    {
                        TotalPedidos =
                            totalPedidos,

                        PedidosEntregues =
                            pedidosEntregues,

                        PedidosCancelados =
                            pedidosCancelados,

                        TaxaCancelamento =
                            taxaCancelamento,

                        ClientesAtendidos =
                            clientesAtendidos
                    }
            };
        }

        public async Task<DashBoardPedidosDto>
            ObterDashboardAsync()
        {
            var inicioHoje =
                DateTime.Today;

            var fimHoje =
                inicioHoje.AddDays(1);

            var pendentes =
                await _context.Pedidos
                    .CountAsync(
                        p =>
                            p.Status ==
                            StatusPedido.Pendente
                    );

            var emPreparo =
                await _context.Pedidos
                    .CountAsync(
                        p =>
                            p.Status ==
                            StatusPedido.EmPreparo
                    );

            var saiuEntrega =
                await _context.Pedidos
                    .CountAsync(
                        p =>
                            p.Status ==
                            StatusPedido.SaiuParaEntrega
                    );

            var entregues =
                await _context.Pedidos
                    .CountAsync(
                        p =>
                            p.Status ==
                            StatusPedido.Entregue
                    );

            var cancelados =
                await _context.Pedidos
                    .CountAsync(
                        p =>
                            p.Status ==
                            StatusPedido.Cancelado
                    );

            var faturamentoHoje =
                await _context.Pedidos
                    .Where(
                        p =>
                            p.DataHora >= inicioHoje
                            &&
                            p.DataHora < fimHoje
                            &&
                            p.Status ==
                            StatusPedido.Entregue
                    )
                    .SumAsync(
                        p =>
                            (decimal?)p.Total
                    )
                ?? 0;

            var quantidadeHoje =
                await _context.Pedidos
                    .CountAsync(
                        p =>
                            p.DataHora >= inicioHoje
                            &&
                            p.DataHora < fimHoje
                    );

            return new DashBoardPedidosDto
            {
                Pendentes =
                    pendentes,

                EmPreparo =
                    emPreparo,

                SaiuParaEntrega =
                    saiuEntrega,

                Entregues =
                    entregues,

                Cancelados =
                    cancelados,

                FaturamentoHoje =
                    faturamentoHoje,

                QuantidadePedidosHoje =
                    quantidadeHoje
            };
        }
    }
}