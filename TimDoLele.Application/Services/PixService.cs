using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TimDolele.Core.Entities;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.Exceptions;
using TimDoLele.Application.Pagamentos;
using TimDoLele.Infrastructure.Data;

namespace TimDoLele.Application.Services
{
    // Pagamento PIX: gera a cobrança, confere com a empresa
    // e só então libera o pedido para a loja.
    public class PixService
    {
        private readonly TimDoLeleDbContext _context;
        private readonly IProvedorPix _provedor;
        private readonly PixOpcoes _opcoes;
        private readonly WhatsappService _whatsappService;

        public PixService(
            TimDoLeleDbContext context,
            IProvedorPix provedor,
            IOptions<PixOpcoes> opcoes,
            WhatsappService whatsappService)
        {
            _context = context;
            _provedor = provedor;
            _opcoes = opcoes.Value;
            _whatsappService = whatsappService;
        }

        public bool UsaSimulador => _provedor is SimuladorPixProvedor;

        // Chamado ao criar o pedido (antes de salvar).
        // Se a empresa falhar, o pedido não é criado.
        public async Task GerarCobrancaAsync(Pedido pedido, string nomeCliente)
        {
            var expiraEm = DateTime.Now.AddMinutes(Math.Max(_opcoes.MinutosParaPagar, 1));

            CobrancaPixGerada gerada;

            try
            {
                gerada = await _provedor.CriarCobrancaAsync(new NovaCobrancaPix
                {
                    PedidoId = pedido.Id,
                    CodigoPedido = pedido.Codigo,
                    Valor = pedido.Total,
                    ExpiraEm = expiraEm,
                    NomeCliente = nomeCliente
                });
            }
            catch (Exception ex)
            {
                throw new BadRequestException(
                    "Não foi possível gerar o PIX agora. Tente novamente ou escolha outra forma de pagamento. " +
                    $"({ex.Message})"
                );
            }

            pedido.AguardarPagamento();

            await _context.CobrancasPix.AddAsync(new CobrancaPix(
                pedido.Id,
                _provedor.Nome,
                gerada.IdExterno,
                gerada.CopiaECola,
                pedido.Total,
                expiraEm
            ));
        }

        // Tela do cliente pergunta a situação a cada poucos segundos.
        // Retorna também se o pedido acabou de ser confirmado
        // (para avisar a loja em tempo real).
        public async Task<(PixSituacaoDto Situacao, bool ConfirmadoAgora)> ObterSituacaoAsync(Guid pedidoId)
        {
            var (cobranca, pedido) = await CarregarAsync(pedidoId);

            var confirmadoAgora = await AtualizarAsync(cobranca, pedido);

            if (_context.ChangeTracker.HasChanges())
                await _context.SaveChangesAsync();

            return (Mapear(cobranca, pedido), confirmadoAgora);
        }

        // Aviso da empresa (webhook). O conteúdo do aviso NÃO é confiado:
        // o sistema pergunta de volta à empresa se está pago.
        public async Task<List<Guid>> ProcessarAvisoAsync(string idExterno)
        {
            var cobranca = await _context.CobrancasPix
                .FirstOrDefaultAsync(c => c.IdExterno == idExterno);

            if (cobranca == null)
                return new List<Guid>();

            var pedido = await _context.Pedidos.FirstAsync(p => p.Id == cobranca.PedidoId);

            var confirmado = await AtualizarAsync(cobranca, pedido);

            await _context.SaveChangesAsync();

            return confirmado ? new List<Guid> { pedido.Id } : new List<Guid>();
        }

        // Rotina em segundo plano: confere os PIX pendentes e expira os vencidos.
        // Garante a confirmação mesmo se o aviso da empresa se perder.
        public async Task<List<Guid>> VerificarPendentesAsync()
        {
            var pendentes = await _context.CobrancasPix
                .Where(c => c.Status == StatusCobrancaPix.Pendente)
                .ToListAsync();

            var confirmados = new List<Guid>();

            foreach (var cobranca in pendentes)
            {
                var pedido = await _context.Pedidos.FirstOrDefaultAsync(p => p.Id == cobranca.PedidoId);

                if (pedido == null)
                    continue;

                if (await AtualizarAsync(cobranca, pedido))
                    confirmados.Add(pedido.Id);
            }

            if (_context.ChangeTracker.HasChanges())
                await _context.SaveChangesAsync();

            return confirmados;
        }

        // Botão "Simular pagamento" (somente com o simulador)
        public async Task SimularPagamentoAsync(Guid pedidoId)
        {
            if (!UsaSimulador)
                throw new BadRequestException("Simulação disponível apenas no modo de testes.");

            var (cobranca, _) = await CarregarAsync(pedidoId);

            SimuladorPixProvedor.SimularPagamento(cobranca.IdExterno);
        }

        // =====================================================
        // REGRA CENTRAL
        // =====================================================

        // Pago na empresa -> pedido vai para a loja.
        // Venceu sem pagar -> pedido expira (e devolve o uso do cupom).
        private async Task<bool> AtualizarAsync(CobrancaPix cobranca, Pedido pedido)
        {
            if (cobranca.Status != StatusCobrancaPix.Pendente)
                return false;

            if (await _provedor.EstaPagaAsync(cobranca.IdExterno))
            {
                cobranca.MarcarPaga();

                var confirmado = pedido.ConfirmarPagamento();

                // WhatsApp "recebemos seu pedido" (agora que foi pago)
                if (confirmado)
                {
                    await _whatsappService.RegistrarAsync(
                        pedido,
                        TipoMensagemWhatsapp.PedidoRecebido
                    );
                }

                return confirmado;
            }

            if (cobranca.Venceu)
            {
                cobranca.MarcarExpirada();

                if (pedido.ExpirarPagamento() && pedido.CupomId.HasValue)
                {
                    var cupom = await _context.Cupons.FindAsync(pedido.CupomId.Value);
                    cupom?.EstornarUso();
                }
            }

            return false;
        }

        private async Task<(CobrancaPix, Pedido)> CarregarAsync(Guid pedidoId)
        {
            var cobranca = await _context.CobrancasPix
                .Where(c => c.PedidoId == pedidoId)
                .OrderByDescending(c => c.CriadaEm)
                .FirstOrDefaultAsync();

            var pedido = await _context.Pedidos.FirstOrDefaultAsync(p => p.Id == pedidoId);

            if (cobranca == null || pedido == null)
                throw new NotFoundException("Pagamento PIX não encontrado.");

            return (cobranca, pedido);
        }

        private PixSituacaoDto Mapear(CobrancaPix cobranca, Pedido pedido)
        {
            var status = cobranca.Status switch
            {
                StatusCobrancaPix.Paga => "Pago",
                StatusCobrancaPix.Expirada => "Expirado",
                _ => "Aguardando"
            };

            var segundos = (int)Math.Max(0, Math.Ceiling((cobranca.ExpiraEm - DateTime.Now).TotalSeconds));

            return new PixSituacaoDto
            {
                PedidoId = pedido.Id,
                Codigo = pedido.Codigo,
                Status = status,
                CopiaECola = status == "Aguardando" ? cobranca.CopiaECola : string.Empty,
                Valor = cobranca.Valor,
                SegundosRestantes = status == "Aguardando" ? segundos : 0,
                Simulador = UsaSimulador
            };
        }
    }
}
