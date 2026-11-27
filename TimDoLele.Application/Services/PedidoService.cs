using Microsoft.EntityFrameworkCore;
using ClosedXML.Excel;
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
        private readonly PixService _pixService;
        private readonly WhatsappService _whatsappService;

        public PedidoService(
            TimDoLeleDbContext context,
            StatusLojaService statusLojaService,
            CupomService cupomService,
            BairroService bairroService,
            PixService pixService,
            WhatsappService whatsappService)
        {
            _context = context;
            _statusLojaService = statusLojaService;
            _cupomService = cupomService;
            _bairroService = bairroService;
            _pixService = pixService;
            _whatsappService = whatsappService;
        }

        // Devolve o Id (uso interno), o Código curto (mostrado ao cliente)
        // e se o pedido está esperando o pagamento PIX
        public async Task<(Guid Id, string Codigo, bool AguardandoPagamento)> CriarPedidoAsync(
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

            // PIX: gera a cobrança. O pedido fica "Aguardando pagamento"
            // e só vai para a loja quando o PIX for confirmado.
            if (
                dto.FormaPagamento ==
                FormaPagamento.Pix
            )
            {
                await _pixService
                    .GerarCobrancaAsync(
                        pedido,
                        nomeCliente,
                        CpfHelper.ApenasNumeros(dto.CpfPagador),
                        dto.Telefone
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

            // WhatsApp "recebemos seu pedido" (PIX: só quando for pago)
            if (pedido.VisivelParaLoja)
            {
                await _whatsappService
                    .RegistrarAsync(
                        pedido,
                        nomeCliente,
                        dto.Telefone,
                        TipoMensagemWhatsapp.PedidoRecebido
                    );
            }

            await _context
                .SaveChangesAsync();

            return (pedido.Id, pedido.Codigo, !pedido.VisivelParaLoja);
        }

        // =====================================================
        // TELA DE PEDIDOS: dia, busca, abas e contagens
        // =====================================================

        // Contagem de cada aba para o dia escolhido (e a busca, se houver)
        public async Task<ResumoPedidosDiaDto> ObterResumoDiaAsync(
            DateTime? data,
            string? busca)
        {
            var query = FiltrarPorDiaEBusca(
                ApenasVisiveisParaLoja(_context.Pedidos.AsQueryable()),
                data,
                busca
            );

            var grupos = await query
                .GroupBy(p => new { p.Status, p.TipoEntrega })
                .Select(g => new
                {
                    g.Key.Status,
                    g.Key.TipoEntrega,
                    Quantidade = g.Count()
                })
                .ToListAsync();

            int Contar(StatusPedido status, TipoEntrega? tipo = null) =>
                grupos
                    .Where(g => g.Status == status && (tipo == null || g.TipoEntrega == tipo))
                    .Sum(g => g.Quantidade);

            return new ResumoPedidosDiaDto
            {
                Todos = grupos.Sum(g => g.Quantidade),
                Pendentes = Contar(StatusPedido.Pendente),
                EmPreparo = Contar(StatusPedido.EmPreparo),
                Entrega = Contar(StatusPedido.SaiuParaEntrega, TipoEntrega.Delivery),
                Retirada = Contar(StatusPedido.SaiuParaEntrega, TipoEntrega.Retirada),
                Entregues = Contar(StatusPedido.Entregue),
                Cancelados = Contar(StatusPedido.Cancelado)
            };
        }

        // Pedidos (da lista informada) com cobrança PIX confirmada
        private async Task<HashSet<Guid>> ObterPedidosComPixPagoAsync(
            List<Guid> pedidoIds)
        {
            if (pedidoIds.Count == 0)
                return new HashSet<Guid>();

            var pagos = await _context.CobrancasPix
                .Where(c =>
                    pedidoIds.Contains(c.PedidoId) &&
                    c.Status == StatusCobrancaPix.Paga)
                .Select(c => c.PedidoId)
                .ToListAsync();

            return pagos.ToHashSet();
        }

        // PIX esperando pagamento ou expirado: a loja não vê
        private static IQueryable<Pedido> ApenasVisiveisParaLoja(
            IQueryable<Pedido> query)
        {
            return query.Where(p =>
                p.Status != StatusPedido.AguardandoPagamento &&
                p.Status != StatusPedido.PagamentoExpirado);
        }

        // Dia: pedidos feitos naquela data.
        // Busca: código, nome ou telefone do cliente.
        private static IQueryable<Pedido> FiltrarPorDiaEBusca(
            IQueryable<Pedido> query,
            DateTime? data,
            string? busca)
        {
            if (data.HasValue)
            {
                var inicio = data.Value.Date;
                var fim = inicio.AddDays(1);

                query = query.Where(
                    p => p.DataHora >= inicio && p.DataHora < fim
                );
            }

            var termo = (busca ?? string.Empty).Trim().TrimStart('#');

            if (termo.Length == 0)
            {
                return query;
            }

            var codigo = termo.ToUpper();

            var numeros = new string(termo.Where(char.IsDigit).ToArray());

            // Telefone é salvo formatado: "(16) 99383-7839".
            // Compara só os números, para achar "1699383" ou "99383-7839".
            return query.Where(
                p =>
                    p.Codigo.Contains(codigo) ||
                    p.Cliente!.Nome.Contains(termo) ||
                    (
                        numeros.Length >= 4 &&
                        p.Cliente.Telefone
                            .Replace("(", "")
                            .Replace(")", "")
                            .Replace(" ", "")
                            .Replace("-", "")
                            .Contains(numeros)
                    )
            );
        }

        // Mesmas abas da tela de Pedidos
        private static IQueryable<Pedido> FiltrarPorAba(
            IQueryable<Pedido> query,
            string? filtro)
        {
            return filtro switch
            {
                "Pendente" =>
                    query.Where(p => p.Status == StatusPedido.Pendente),

                "EmPreparo" =>
                    query.Where(p => p.Status == StatusPedido.EmPreparo),

                "Entrega" =>
                    query.Where(p =>
                        p.Status == StatusPedido.SaiuParaEntrega &&
                        p.TipoEntrega == TipoEntrega.Delivery),

                "Retirada" =>
                    query.Where(p =>
                        p.Status == StatusPedido.SaiuParaEntrega &&
                        p.TipoEntrega == TipoEntrega.Retirada),

                "Entregue" =>
                    query.Where(p => p.Status == StatusPedido.Entregue),

                "Cancelado" =>
                    query.Where(p => p.Status == StatusPedido.Cancelado),

                // "Todos" ou vazio: sem filtro
                _ => query
            };
        }

        public async Task<PagedResult<PedidoResponseDto>>
            ObterPedidosAsync(
                Guid? clienteId,
                StatusPedido? status,
                int page = 1,
                int pageSize = 10,
                Guid? usuarioId = null,
                DateTime? dia = null,
                string? busca = null,
                string? filtro = null)
        {
            var query = _context.Pedidos
                .Include(p => p.Cliente)
                .Include(p => p.Itens)
                    .ThenInclude(i => i.Produto)
                .Include(p => p.Itens)
                    .ThenInclude(i => i.Adicionais)
                        .ThenInclude(a => a.Adicional)
                .AsQueryable();

            // PIX não pago não aparece para a loja
            query = ApenasVisiveisParaLoja(query);

            // Tela de Pedidos: dia escolhido, busca e aba (Pendentes, Entrega...)
            query = FiltrarPorDiaEBusca(query, dia, busca);

            query = FiltrarPorAba(query, filtro);

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

            var idsPagina = pedidos.Select(p => p.Id).ToList();

            var pixPagos = await ObterPedidosComPixPagoAsync(idsPagina);

            var whatsappPendentes =
                await _whatsappService.ContarPendentesAsync(idsPagina);

            var data = pedidos
                .Select(p => new PedidoResponseDto
                {
                    PixPago = pixPagos.Contains(p.Id),

                    MotivoCancelamento = p.MotivoCancelamento,

                    CanceladoEm = p.CanceladoEm,

                    WhatsappPendentes =
                        whatsappPendentes.GetValueOrDefault(p.Id),

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

            var pixPago =
                (await ObterPedidosComPixPagoAsync(
                    new List<Guid> { pedido.Id }
                )).Contains(pedido.Id);

            var whatsappPendentes =
                await _whatsappService.ContarPendentesAsync(
                    new List<Guid> { pedido.Id }
                );

            return new PedidoResponseDto
            {
                PixPago = pixPago,

                MotivoCancelamento = pedido.MotivoCancelamento,

                CanceladoEm = pedido.CanceladoEm,

                WhatsappPendentes =
                    whatsappPendentes.GetValueOrDefault(pedido.Id),

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

            // WhatsApp para o cliente: em preparo / saiu / pronto
            var tipoMensagem =
                WhatsappService.TipoParaStatus(
                    status,
                    pedido.TipoEntrega
                );

            if (tipoMensagem.HasValue)
            {
                await _whatsappService
                    .RegistrarAsync(
                        pedido,
                        tipoMensagem.Value
                    );
            }

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

        // Cancela guardando o motivo (aparece nos detalhes do pedido)
        public async Task CancelarAsync(
            Guid pedidoId,
            string? motivo)
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

            // Sem emoji/símbolos estranhos (mesma regra das observações)
            var texto =
                TextoHelper.LimparParaImpressao(motivo);

            if (string.IsNullOrWhiteSpace(texto))
            {
                throw new BadRequestException(
                    "Informe o motivo do cancelamento."
                );
            }

            pedido.Cancelar(texto);

            // Cancelou um pedido com cupom: devolve o uso do cupom
            if (pedido.CupomId.HasValue)
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

                await _whatsappService
                    .RegistrarAsync(
                        pedido,
                        TipoMensagemWhatsapp.EmPreparo
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
            return await ApenasVisiveisParaLoja(_context.Pedidos)
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

        // =====================================================
        // RELATÓRIO: período e exportação (planilha)
        // =====================================================

        // "hoje", "ontem", "semana", "mes" ou "personalizado" -> [inicio, fim)
        private static (DateTime Inicio, DateTime Fim) PeriodoRelatorio(
            string periodo,
            DateTime? dataInicio,
            DateTime? dataFim)
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

            return (inicio, fim);
        }

        // Planilha do Excel (.xlsx): resumo, valores por forma de
        // pagamento e valores de cada dia do período.
        // Cancelados não entram nos valores.
        public async Task<byte[]> ExportarRelatorioExcelAsync(
            string periodo = "hoje",
            DateTime? dataInicio = null,
            DateTime? dataFim = null)
        {
            var relatorio =
                await ObterRelatorioAsync(periodo, dataInicio, dataFim);

            var (inicio, fim) =
                PeriodoRelatorio(periodo, dataInicio, dataFim);

            var pedidos =
                await ApenasVisiveisParaLoja(_context.Pedidos)
                    .Where(p =>
                        p.DataHora >= inicio &&
                        p.DataHora < fim &&
                        p.Status != StatusPedido.Cancelado)
                    .Select(p => new { p.DataHora, p.FormaPagamento, p.TipoEntrega, p.Total })
                    .ToListAsync();

            // Colunas de pagamento (só aparece "Não informado" se existir)
            var formas = new List<(string Titulo, Func<FormaPagamento, bool> Filtro)>
            {
                ("PIX", f => f == FormaPagamento.Pix),
                ("Dinheiro", f => f == FormaPagamento.Dinheiro),
                ("Crédito", f => f == FormaPagamento.CartaoCredito),
                ("Débito", f => f == FormaPagamento.CartaoDebito)
            };

            if (pedidos.Any(p => !Enum.IsDefined(p.FormaPagamento)))
                formas.Add(("Não informado", f => !Enum.IsDefined(f)));

            const string FormatoDinheiro = "\"R$\" #,##0.00";

            // Zero aparece como "-" (tabela por dia fica mais limpa)
            const string FormatoDinheiroDia = "\"R$\" #,##0.00;-\"R$\" #,##0.00;\"-\"";
            var amarelo = XLColor.FromHtml("#F8B400");
            var cinza = XLColor.FromHtml("#F3F4F6");

            using var planilha = new XLWorkbook();
            var aba = planilha.Worksheets.Add("Relatório");

            aba.Style.Font.FontName = "Calibri";
            aba.Style.Font.FontSize = 11;

            var ultimaColuna = formas.Count + 3;

            // ---------- TÍTULO ----------
            var titulo = aba.Range(1, 1, 1, ultimaColuna).Merge();
            titulo.Value = "Relatório de vendas - Tim do Lelê Lanches";
            titulo.Style.Font.Bold = true;
            titulo.Style.Font.FontSize = 16;
            titulo.Style.Fill.BackgroundColor = amarelo;
            titulo.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            aba.Row(1).Height = 28;

            var subtitulo = aba.Range(2, 1, 2, ultimaColuna).Merge();
            subtitulo.Value =
                $"Período: {inicio:dd/MM/yyyy} a {fim.AddDays(-1):dd/MM/yyyy}" +
                $"   |   Gerado em {DateTime.Now:dd/MM/yyyy HH:mm}";
            subtitulo.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            subtitulo.Style.Font.FontColor = XLColor.FromHtml("#555555");

            var linha = 4;

            // ---------- RESUMO ----------
            linha = TituloSecao(aba, linha, "RESUMO", ultimaColuna, amarelo);

            var totalVendido = pedidos.Sum(p => p.Total);

            var resumo = new List<(string Rotulo, object Valor, string? Formato)>
            {
                ("Total vendido (sem cancelados)", totalVendido, FormatoDinheiro),
                ("Faturamento (pedidos entregues)", relatorio.Faturamento, FormatoDinheiro),
                ("Pedidos (sem cancelados)", pedidos.Count, null),
                ("Ticket médio", pedidos.Count > 0 ? totalVendido / pedidos.Count : 0m, FormatoDinheiro),
                ("Pedidos entregues", relatorio.Resumo.PedidosEntregues, null),
                ("Pedidos cancelados", relatorio.Resumo.PedidosCancelados, null),
                ("Pedidos de entrega", pedidos.Count(p => p.TipoEntrega == TipoEntrega.Delivery), null),
                ("Pedidos de retirada", pedidos.Count(p => p.TipoEntrega == TipoEntrega.Retirada), null)
            };

            foreach (var (rotulo, valor, formato) in resumo)
            {
                aba.Cell(linha, 1).Value = rotulo;
                aba.Cell(linha, 1).Style.Font.Bold = true;

                var celula = aba.Cell(linha, 2);
                celula.Value = XLCellValue.FromObject(valor);
                celula.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

                if (formato != null)
                    celula.Style.NumberFormat.Format = formato;

                aba.Range(linha, 1, linha, 2).Style.Border.BottomBorder = XLBorderStyleValues.Hair;
                linha++;
            }

            linha++;

            // ---------- POR FORMA DE PAGAMENTO ----------
            linha = TituloSecao(aba, linha, "POR FORMA DE PAGAMENTO", ultimaColuna, amarelo);

            Cabecalho(aba, linha, cinza, "Forma de pagamento", "Pedidos", "Valor", "% do total");
            linha++;

            var inicioFormas = linha;

            foreach (var (tituloForma, filtro) in formas)
            {
                var daForma = pedidos.Where(p => filtro(p.FormaPagamento)).ToList();
                var valor = daForma.Sum(p => p.Total);

                aba.Cell(linha, 1).Value = tituloForma;
                aba.Cell(linha, 2).Value = daForma.Count;
                aba.Cell(linha, 3).Value = valor;
                aba.Cell(linha, 3).Style.NumberFormat.Format = FormatoDinheiro;
                aba.Cell(linha, 4).Value = totalVendido > 0 ? valor / totalVendido : 0m;
                aba.Cell(linha, 4).Style.NumberFormat.Format = "0.00%";
                linha++;
            }

            LinhaTotal(aba, linha, 4);
            aba.Cell(linha, 1).Value = "TOTAL";
            aba.Cell(linha, 2).FormulaA1 = $"SUM(B{inicioFormas}:B{linha - 1})";
            aba.Cell(linha, 3).FormulaA1 = $"SUM(C{inicioFormas}:C{linha - 1})";
            aba.Cell(linha, 3).Style.NumberFormat.Format = FormatoDinheiro;
            aba.Cell(linha, 4).Value = totalVendido > 0 ? 1m : 0m;
            aba.Cell(linha, 4).Style.NumberFormat.Format = "0.00%";
            Bordas(aba.Range(inicioFormas - 1, 1, linha, 4));
            linha += 2;

            // ---------- POR DIA ----------
            linha = TituloSecao(aba, linha, "VALORES POR DIA", ultimaColuna, amarelo);

            var cabecalhoDia = new List<string> { "Data", "Pedidos" };
            cabecalhoDia.AddRange(formas.Select(f => f.Titulo));
            cabecalhoDia.Add("Total do dia");

            Cabecalho(aba, linha, cinza, cabecalhoDia.ToArray());
            linha++;

            var inicioDias = linha;

            foreach (var dia in pedidos.GroupBy(p => p.DataHora.Date).OrderBy(g => g.Key))
            {
                aba.Cell(linha, 1).Value = dia.Key;
                aba.Cell(linha, 1).Style.NumberFormat.Format = "dd/mm/yyyy";
                aba.Cell(linha, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                aba.Cell(linha, 2).Value = dia.Count();

                var coluna = 3;

                foreach (var (_, filtro) in formas)
                {
                    aba.Cell(linha, coluna).Value = dia.Where(p => filtro(p.FormaPagamento)).Sum(p => p.Total);
                    coluna++;
                }

                aba.Cell(linha, coluna).Value = dia.Sum(p => p.Total);
                aba.Cell(linha, coluna).Style.Font.Bold = true;

                aba.Range(linha, 3, linha, coluna).Style.NumberFormat.Format = FormatoDinheiroDia;
                linha++;
            }

            if (linha == inicioDias)
            {
                aba.Range(linha, 1, linha, ultimaColuna).Merge().Value = "Nenhuma venda no período.";
                aba.Cell(linha, 1).Style.Font.Italic = true;
                linha++;
            }
            else
            {
                LinhaTotal(aba, linha, ultimaColuna);
                aba.Cell(linha, 1).Value = "TOTAL";

                for (var coluna = 2; coluna <= ultimaColuna; coluna++)
                {
                    var letra = XLHelper.GetColumnLetterFromNumber(coluna);
                    aba.Cell(linha, coluna).FormulaA1 = $"SUM({letra}{inicioDias}:{letra}{linha - 1})";

                    if (coluna > 2)
                        aba.Cell(linha, coluna).Style.NumberFormat.Format = FormatoDinheiro;
                }
            }

            Bordas(aba.Range(inicioDias - 1, 1, linha, ultimaColuna));

            // ---------- LARGURAS ----------
            aba.Column(1).Width = 34;

            for (var coluna = 2; coluna <= ultimaColuna; coluna++)
                aba.Column(coluna).Width = 16;

            aba.PageSetup.PageOrientation = XLPageOrientation.Landscape;
            aba.PageSetup.FitToPages(1, 0);

            using var memoria = new MemoryStream();
            planilha.SaveAs(memoria);

            return memoria.ToArray();
        }

        private static int TituloSecao(IXLWorksheet aba, int linha, string texto, int colunas, XLColor cor)
        {
            var faixa = aba.Range(linha, 1, linha, colunas).Merge();
            faixa.Value = texto;
            faixa.Style.Font.Bold = true;
            faixa.Style.Font.FontSize = 12;
            faixa.Style.Border.BottomBorder = XLBorderStyleValues.Medium;
            faixa.Style.Border.BottomBorderColor = cor;

            return linha + 1;
        }

        private static void Cabecalho(IXLWorksheet aba, int linha, XLColor cor, params string[] titulos)
        {
            for (var i = 0; i < titulos.Length; i++)
            {
                var celula = aba.Cell(linha, i + 1);
                celula.Value = titulos[i];
                celula.Style.Font.Bold = true;
                celula.Style.Fill.BackgroundColor = cor;
                celula.Style.Alignment.Horizontal = i == 0
                    ? XLAlignmentHorizontalValues.Left
                    : XLAlignmentHorizontalValues.Right;
            }
        }

        private static void LinhaTotal(IXLWorksheet aba, int linha, int colunas)
        {
            var faixa = aba.Range(linha, 1, linha, colunas);
            faixa.Style.Font.Bold = true;
            faixa.Style.Fill.BackgroundColor = XLColor.FromHtml("#FFF4C2");
            faixa.Style.Border.TopBorder = XLBorderStyleValues.Thin;
        }

        private static void Bordas(IXLRange faixa)
        {
            faixa.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            faixa.Style.Border.InsideBorder = XLBorderStyleValues.Hair;
        }

        public async Task<RelatorioDto>
            ObterRelatorioAsync(
                string periodo = "hoje",
                DateTime? dataInicio = null,
                DateTime? dataFim = null)
        {
            var (inicio, fim) =
                PeriodoRelatorio(
                    periodo,
                    dataInicio,
                    dataFim
                );

            var pedidos =
                await ApenasVisiveisParaLoja(_context.Pedidos)
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
                                    Enum.IsDefined(g.Key) ? g.Key.ToString() : "NaoInformado",

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
                await ApenasVisiveisParaLoja(_context.Pedidos)
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