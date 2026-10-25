using Microsoft.EntityFrameworkCore;
using TimDolele.Core.Entities;
using TimDolele.Core.Enums;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.Helpers;
using TimDoLele.Application.WhatsApp;
using TimDoLele.Infrastructure.Data;

namespace TimDoLele.Application.Services
{
    // Mensagens de WhatsApp para o cliente a cada etapa do pedido:
    // recebido -> em preparo -> saiu para entrega / pronto para retirada
    public class WhatsappService
    {
        private readonly TimDoLeleDbContext _context;
        private readonly IEnvioWhatsapp _envio;

        public WhatsappService(
            TimDoLeleDbContext context,
            IEnvioWhatsapp envio)
        {
            _context = context;
            _envio = envio;
        }

        // =====================================================
        // REGISTRAR (chamado quando o pedido muda de etapa)
        // Não salva: quem chama faz o SaveChanges junto com o pedido.
        // =====================================================

        public async Task RegistrarAsync(
            Pedido pedido,
            string nomeCliente,
            string telefoneCliente,
            TipoMensagemWhatsapp tipo)
        {
            var telefone = NormalizarTelefone(telefoneCliente);

            // Sem telefone válido não tem como avisar
            if (telefone == null)
                return;

            // Etapa nova deixa as anteriores de "andamento" velhas
            // (o "recebemos seu pedido" continua valendo)
            if (tipo != TipoMensagemWhatsapp.PedidoRecebido)
            {
                var antigas = await _context.MensagensWhatsapp
                    .Where(m =>
                        m.PedidoId == pedido.Id &&
                        m.Status == StatusMensagemWhatsapp.Pendente &&
                        m.Tipo != TipoMensagemWhatsapp.PedidoRecebido)
                    .ToListAsync();

                antigas.ForEach(m => m.Ignorar());
            }

            var texto = await MontarTextoAsync(pedido, nomeCliente, tipo);

            await _context.MensagensWhatsapp.AddAsync(
                new MensagemWhatsapp(pedido.Id, tipo, telefone, texto)
            );
        }

        // Atalho para quando só temos o pedido (carrega o cliente)
        public async Task RegistrarAsync(Pedido pedido, TipoMensagemWhatsapp tipo)
        {
            var cliente = await _context.Clientes.FindAsync(pedido.ClienteId);

            if (cliente == null)
                return;

            await RegistrarAsync(pedido, cliente.Nome, cliente.Telefone, tipo);
        }

        // Mensagem certa para cada status do pedido
        public static TipoMensagemWhatsapp? TipoParaStatus(StatusPedido status, TipoEntrega tipoEntrega)
        {
            return status switch
            {
                StatusPedido.EmPreparo => TipoMensagemWhatsapp.EmPreparo,

                StatusPedido.SaiuParaEntrega => tipoEntrega == TipoEntrega.Delivery
                    ? TipoMensagemWhatsapp.SaiuParaEntrega
                    : TipoMensagemWhatsapp.ProntoParaRetirada,

                _ => null
            };
        }

        public bool EnviaAutomaticamente => _envio.EnviaAutomaticamente;

        // =====================================================
        // MODO MANUAL: admin abre o WhatsApp com a mensagem pronta
        // =====================================================

        // Junta as mensagens pendentes do pedido num texto só
        public async Task<WhatsappPendenteDto?> ObterPendenteAsync(Guid pedidoId)
        {
            var pendentes = await _context.MensagensWhatsapp
                .Where(m =>
                    m.PedidoId == pedidoId &&
                    m.Status == StatusMensagemWhatsapp.Pendente)
                .OrderBy(m => m.CriadaEm)
                .ToListAsync();

            if (pendentes.Count == 0)
                return null;

            var texto = string.Join("\n\n", pendentes.Select(m => m.Texto));
            var telefone = pendentes.Last().Telefone;

            return new WhatsappPendenteDto
            {
                PedidoId = pedidoId,
                Telefone = telefone,
                Texto = texto,
                Link = $"https://wa.me/{telefone}?text={Uri.EscapeDataString(texto)}",
                MensagensIds = pendentes.Select(m => m.Id).ToList()
            };
        }

        public async Task MarcarEnviadasAsync(Guid pedidoId, List<Guid> ids)
        {
            var mensagens = await _context.MensagensWhatsapp
                .Where(m =>
                    m.PedidoId == pedidoId &&
                    ids.Contains(m.Id) &&
                    m.Status == StatusMensagemWhatsapp.Pendente)
                .ToListAsync();

            mensagens.ForEach(m => m.MarcarEnviada());

            await _context.SaveChangesAsync();
        }

        // Quantas mensagens faltam enviar (para o selo "📲 Avisar cliente")
        public async Task<Dictionary<Guid, int>> ContarPendentesAsync(List<Guid> pedidoIds)
        {
            if (pedidoIds.Count == 0)
                return new Dictionary<Guid, int>();

            return await _context.MensagensWhatsapp
                .Where(m =>
                    pedidoIds.Contains(m.PedidoId) &&
                    m.Status == StatusMensagemWhatsapp.Pendente)
                .GroupBy(m => m.PedidoId)
                .Select(g => new { g.Key, Quantidade = g.Count() })
                .ToDictionaryAsync(g => g.Key, g => g.Quantidade);
        }

        // =====================================================
        // MODO AUTOMÁTICO (API oficial, futuro)
        // =====================================================

        // Envia as pendentes sozinho. No modo manual não faz nada.
        public async Task EnviarPendentesAutomaticamenteAsync()
        {
            if (!_envio.EnviaAutomaticamente)
                return;

            var pendentes = await _context.MensagensWhatsapp
                .Where(m => m.Status == StatusMensagemWhatsapp.Pendente)
                .OrderBy(m => m.CriadaEm)
                .Take(50)
                .ToListAsync();

            foreach (var mensagem in pendentes)
            {
                try
                {
                    await _envio.EnviarAsync(mensagem.Telefone, mensagem.Texto);
                    mensagem.MarcarEnviada();
                }
                catch (Exception ex)
                {
                    mensagem.RegistrarFalha(ex.Message);
                }
            }

            if (_context.ChangeTracker.HasChanges())
                await _context.SaveChangesAsync();
        }

        // =====================================================
        // TEXTOS
        // =====================================================

        private async Task<string> MontarTextoAsync(
            Pedido pedido,
            string nomeCliente,
            TipoMensagemWhatsapp tipo)
        {
            var config = await _context.ConfiguracoesLoja.FirstOrDefaultAsync();

            var loja = config?.NomeEstabelecimento ?? "Tim do Lelê Lanches";
            var primeiroNome = (nomeCliente ?? "").Trim().Split(' ')[0];
            var codigo = pedido.Codigo;
            var entrega = pedido.TipoEntrega == TipoEntrega.Delivery;

            switch (tipo)
            {
                case TipoMensagemWhatsapp.PedidoRecebido:
                {
                    var prazo = config == null
                        ? null
                        : entrega
                            ? TextoPrazo(config.PrazoEntregaMin, config.PrazoEntregaMax)
                            : TextoPrazo(config.PrazoRetiradaMin, config.PrazoRetiradaMax);

                    var linhas = new List<string>
                    {
                        $"Olá, {primeiroNome}! ✅ Recebemos seu pedido *#{codigo}* no *{loja}*.",
                        $"Total: {TextoHelper.FormatarDinheiro(pedido.Total)}"
                    };

                    if (prazo != null)
                        linhas.Add($"Previsão de {(entrega ? "entrega" : "retirada")}: {prazo}.");

                    linhas.Add("Vamos te avisando por aqui. 😉");

                    return string.Join("\n", linhas);
                }

                case TipoMensagemWhatsapp.EmPreparo:
                    return $"👨‍🍳 Seu pedido *#{codigo}* já está sendo preparado!";

                case TipoMensagemWhatsapp.SaiuParaEntrega:
                    return $"🛵 Seu pedido *#{codigo}* saiu para entrega! Em breve chega aí.";

                case TipoMensagemWhatsapp.ProntoParaRetirada:
                {
                    var texto = $"🛍️ Seu pedido *#{codigo}* está pronto para retirada! Pode vir buscar.";

                    if (!string.IsNullOrWhiteSpace(config?.Endereco))
                        texto += $"\nEndereço: {config.Endereco}";

                    return texto;
                }

                default:
                    return $"Atualização do seu pedido *#{codigo}*.";
            }
        }

        private static string TextoPrazo(int minimo, int maximo)
        {
            return minimo == maximo ? $"{minimo} min" : $"{minimo} a {maximo} min";
        }

        // "(16) 99383-7839" -> "5516993837839"
        private static string? NormalizarTelefone(string? telefone)
        {
            var numeros = new string((telefone ?? "").Where(char.IsDigit).ToArray());

            if (numeros.Length == 10 || numeros.Length == 11)
                return "55" + numeros;

            if ((numeros.Length == 12 || numeros.Length == 13) && numeros.StartsWith("55"))
                return numeros;

            return null;
        }
    }
}
