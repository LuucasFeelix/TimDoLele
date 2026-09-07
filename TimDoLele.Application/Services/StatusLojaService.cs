using Microsoft.EntityFrameworkCore;
using TimDolele.Core.Entities;
using TimDolele.Core.Enums;
using TimDoLele.Application.DTOs;
using TimDoLele.Infrastructure.Data;
using TimDoLeLe.Application.DTOs;

namespace TimDoLele.Application.Services
{
    public class StatusLojaService
    {
        private readonly TimDoLeleDbContext _context;

        public StatusLojaService(
            TimDoLeleDbContext context)
        {
            _context = context;
        }

        public async Task<StatusLojaDto>
            ObterStatusAsync()
        {
            var agora =
                DateTime.Now;

            var configuracao =
                await ObterConfiguracaoAsync();

            if (configuracao.FechadaManual)
            {
                return CriarStatusFechado(
                    configuracao,
                    configuracao
                        .MotivoFechamentoManual
                        ?? "Loja fechada manualmente.",
                    await ObterProximaAberturaAsync(
                        agora
                    )
                );
            }

            var statusDataEspecial =
                await VerificarDataEspecialAsync(
                    agora,
                    configuracao
                );

            if (statusDataEspecial != null)
            {
                return statusDataEspecial;
            }

            var statusHorarioAnterior =
                await VerificarHorarioDoDiaAnteriorAsync(
                    agora,
                    configuracao
                );

            if (statusHorarioAnterior != null)
            {
                return statusHorarioAnterior;
            }

            var horarioHoje =
                await _context
                    .HorariosFuncionamento
                    .FirstOrDefaultAsync(
                        h =>
                            h.DiaSemana ==
                            agora.DayOfWeek
                    );

            if (
                horarioHoje == null ||
                !horarioHoje.Aberto ||
                !horarioHoje.HoraAbertura.HasValue ||
                !horarioHoje.HoraFechamento.HasValue
            )
            {
                return CriarStatusFechado(
                    configuracao,
                    "A loja não funciona hoje.",
                    await ObterProximaAberturaAsync(
                        agora
                    )
                );
            }

            var horaAtual =
                agora.TimeOfDay;

            var abertura =
                horarioHoje.HoraAbertura.Value;

            var fechamento =
                horarioHoje.HoraFechamento.Value;

            if (
                HorarioAtravessaMeiaNoite(
                    abertura,
                    fechamento
                )
            )
            {
                if (horaAtual >= abertura)
                {
                    return CriarStatusAberto(
                        configuracao,
                        abertura,
                        fechamento
                    );
                }
            }
            else
            {
                if (
                    horaAtual >= abertura &&
                    horaAtual < fechamento
                )
                {
                    return CriarStatusAberto(
                        configuracao,
                        abertura,
                        fechamento
                    );
                }
            }

            return CriarStatusFechado(
                configuracao,
                "Loja fechada no momento.",
                await ObterProximaAberturaAsync(
                    agora
                )
            );
        }

        private async Task<StatusLojaDto?>
            VerificarDataEspecialAsync(
                DateTime agora,
                ConfiguracaoLoja configuracao)
        {
            var dataEspecial =
                await _context
                    .DatasEspeciais
                    .FirstOrDefaultAsync(
                        d =>
                            d.Data.Date ==
                            agora.Date
                    );

            if (dataEspecial == null)
            {
                return null;
            }

            if (
                dataEspecial.Tipo ==
                TipoDataEspecial.Fechado
            )
            {
                return CriarStatusFechado(
                    configuracao,
                    string.IsNullOrWhiteSpace(
                        dataEspecial.Descricao
                    )
                        ? "Loja fechada hoje."
                        : dataEspecial.Descricao,
                    await ObterProximaAberturaAsync(
                        agora.AddDays(1)
                    )
                );
            }

            if (
                dataEspecial.Tipo ==
                TipoDataEspecial.HorarioEspecial
                &&
                dataEspecial.HoraAbertura.HasValue
                &&
                dataEspecial.HoraFechamento.HasValue
            )
            {
                var horaAtual =
                    agora.TimeOfDay;

                var abertura =
                    dataEspecial
                        .HoraAbertura
                        .Value;

                var fechamento =
                    dataEspecial
                        .HoraFechamento
                        .Value;

                if (
                    HorarioAtravessaMeiaNoite(
                        abertura,
                        fechamento
                    )
                )
                {
                    if (horaAtual >= abertura)
                    {
                        return CriarStatusAberto(
                            configuracao,
                            abertura,
                            fechamento
                        );
                    }
                }
                else
                {
                    if (
                        horaAtual >= abertura &&
                        horaAtual < fechamento
                    )
                    {
                        return CriarStatusAberto(
                            configuracao,
                            abertura,
                            fechamento
                        );
                    }
                }

                return CriarStatusFechado(
                    configuracao,
                    $"Horário especial: {FormatarHora(abertura)} às {FormatarHora(fechamento)}.",
                    agora.TimeOfDay < abertura
                        ? $"Hoje às {FormatarHora(abertura)}"
                        : await ObterProximaAberturaAsync(
                            agora.AddDays(1)
                        )
                );
            }

            return null;
        }

        private async Task<StatusLojaDto?>
            VerificarHorarioDoDiaAnteriorAsync(
                DateTime agora,
                ConfiguracaoLoja configuracao)
        {
            var ontem =
                agora.AddDays(-1);

            var dataEspecialOntem =
                await _context
                    .DatasEspeciais
                    .FirstOrDefaultAsync(
                        d =>
                            d.Data.Date ==
                            ontem.Date
                    );

            if (
                dataEspecialOntem != null &&
                dataEspecialOntem.Tipo ==
                    TipoDataEspecial.HorarioEspecial &&
                dataEspecialOntem
                    .HoraAbertura
                    .HasValue &&
                dataEspecialOntem
                    .HoraFechamento
                    .HasValue
            )
            {
                var abertura =
                    dataEspecialOntem
                        .HoraAbertura
                        .Value;

                var fechamento =
                    dataEspecialOntem
                        .HoraFechamento
                        .Value;

                if (
                    HorarioAtravessaMeiaNoite(
                        abertura,
                        fechamento
                    )
                    &&
                    agora.TimeOfDay <
                    fechamento
                )
                {
                    return CriarStatusAberto(
                        configuracao,
                        abertura,
                        fechamento
                    );
                }
            }

            var horarioOntem =
                await _context
                    .HorariosFuncionamento
                    .FirstOrDefaultAsync(
                        h =>
                            h.DiaSemana ==
                            ontem.DayOfWeek
                    );

            if (
                horarioOntem == null ||
                !horarioOntem.Aberto ||
                !horarioOntem.HoraAbertura.HasValue ||
                !horarioOntem.HoraFechamento.HasValue
            )
            {
                return null;
            }

            var horaAbertura =
                horarioOntem
                    .HoraAbertura
                    .Value;

            var horaFechamento =
                horarioOntem
                    .HoraFechamento
                    .Value;

            if (
                HorarioAtravessaMeiaNoite(
                    horaAbertura,
                    horaFechamento
                )
                &&
                agora.TimeOfDay <
                horaFechamento
            )
            {
                return CriarStatusAberto(
                    configuracao,
                    horaAbertura,
                    horaFechamento
                );
            }

            return null;
        }

        private async Task<string?>
            ObterProximaAberturaAsync(
                DateTime referencia)
        {
            for (
                var i = 0;
                i <= 14;
                i++
            )
            {
                var data =
                    referencia.Date
                        .AddDays(i);

                var especial =
                    await _context
                        .DatasEspeciais
                        .FirstOrDefaultAsync(
                            d =>
                                d.Data.Date ==
                                data.Date
                        );

                if (especial != null)
                {
                    if (
                        especial.Tipo ==
                        TipoDataEspecial.Fechado
                    )
                    {
                        continue;
                    }

                    if (
                        especial.Tipo ==
                            TipoDataEspecial
                                .HorarioEspecial
                        &&
                        especial
                            .HoraAbertura
                            .HasValue
                    )
                    {
                        var abertura =
                            data.Date
                                .Add(
                                    especial
                                        .HoraAbertura
                                        .Value
                                );

                        if (
                            abertura >
                            referencia
                        )
                        {
                            return FormatarProximaAbertura(
                                referencia,
                                abertura
                            );
                        }

                        continue;
                    }
                }

                var horario =
                    await _context
                        .HorariosFuncionamento
                        .FirstOrDefaultAsync(
                            h =>
                                h.DiaSemana ==
                                data.DayOfWeek
                        );

                if (
                    horario == null ||
                    !horario.Aberto ||
                    !horario
                        .HoraAbertura
                        .HasValue
                )
                {
                    continue;
                }

                var proximaAbertura =
                    data.Date
                        .Add(
                            horario
                                .HoraAbertura
                                .Value
                        );

                if (
                    proximaAbertura >
                    referencia
                )
                {
                    return FormatarProximaAbertura(
                        referencia,
                        proximaAbertura
                    );
                }
            }

            return null;
        }

        private async Task<ConfiguracaoLoja>
            ObterConfiguracaoAsync()
        {
            var configuracao =
                await _context
                    .ConfiguracoesLoja
                    .FirstOrDefaultAsync();

            if (configuracao != null)
            {
                return configuracao;
            }

            configuracao =
                new ConfiguracaoLoja(
                    prazoEntregaMin: 40,
                    prazoEntregaMax: 60,
                    prazoRetiradaMin: 20,
                    prazoRetiradaMax: 30,
                    taxaEntregaPadrao: 5
                );

            await _context
                .ConfiguracoesLoja
                .AddAsync(
                    configuracao
                );

            await _context
                .SaveChangesAsync();

            return configuracao;
        }

        private static StatusLojaDto
            CriarStatusAberto(
                ConfiguracaoLoja configuracao,
                TimeSpan abertura,
                TimeSpan fechamento)
        {
            return new StatusLojaDto
            {
                Aberta =
                    true,

                Status =
                    "Aberta",

                Mensagem =
                    "Estamos abertos!",

                Motivo =
                    null,

                ProximaAbertura =
                    null,

                HoraAbertura =
                    FormatarHora(
                        abertura
                    ),

                HoraFechamento =
                    FormatarHora(
                        fechamento
                    ),

                PrazoEntregaMin =
                    configuracao
                        .PrazoEntregaMin,

                PrazoEntregaMax =
                    configuracao
                        .PrazoEntregaMax,

                PrazoRetiradaMin =
                    configuracao
                        .PrazoRetiradaMin,

                PrazoRetiradaMax =
                    configuracao
                        .PrazoRetiradaMax,

                TaxaEntrega =
                    configuracao
                        .TaxaEntregaPadrao
            };
        }

        private static StatusLojaDto
            CriarStatusFechado(
                ConfiguracaoLoja configuracao,
                string motivo,
                string? proximaAbertura)
        {
            return new StatusLojaDto
            {
                Aberta =
                    false,

                Status =
                    "Fechada",

                Mensagem =
                    "Loja fechada no momento.",

                Motivo =
                    motivo,

                ProximaAbertura =
                    proximaAbertura,

                HoraAbertura =
                    null,

                HoraFechamento =
                    null,

                PrazoEntregaMin =
                    configuracao
                        .PrazoEntregaMin,

                PrazoEntregaMax =
                    configuracao
                        .PrazoEntregaMax,

                PrazoRetiradaMin =
                    configuracao
                        .PrazoRetiradaMin,

                PrazoRetiradaMax =
                    configuracao
                        .PrazoRetiradaMax,

                TaxaEntrega =
                    configuracao
                        .TaxaEntregaPadrao
            };
        }

        private static bool
            HorarioAtravessaMeiaNoite(
                TimeSpan abertura,
                TimeSpan fechamento)
        {
            return fechamento <= abertura;
        }

        private static string
            FormatarHora(
                TimeSpan hora)
        {
            return hora.ToString(
                @"hh\:mm"
            );
        }

        private static string
            FormatarProximaAbertura(
                DateTime referencia,
                DateTime abertura)
        {
            if (
                abertura.Date ==
                referencia.Date
            )
            {
                return
                    $"Hoje às {abertura:HH:mm}";
            }

            if (
                abertura.Date ==
                referencia.Date
                    .AddDays(1)
            )
            {
                return
                    $"Amanhã às {abertura:HH:mm}";
            }

            return
                $"{TraduzirDiaSemana(abertura.DayOfWeek)} às {abertura:HH:mm}";
        }

        private static string
            TraduzirDiaSemana(
                DayOfWeek dia)
        {
            return dia switch
            {
                DayOfWeek.Sunday =>
                    "Domingo",

                DayOfWeek.Monday =>
                    "Segunda-feira",

                DayOfWeek.Tuesday =>
                    "Terça-feira",

                DayOfWeek.Wednesday =>
                    "Quarta-feira",

                DayOfWeek.Thursday =>
                    "Quinta-feira",

                DayOfWeek.Friday =>
                    "Sexta-feira",

                DayOfWeek.Saturday =>
                    "Sábado",

                _ =>
                    dia.ToString()
            };
        }
    }
}