using Microsoft.EntityFrameworkCore;
using TimDolele.Core.Entities;
using TimDolele.Core.Enums;
using TimDoLele.Application.DTOs;
using TimDoLele.Application.Exceptions;
using TimDoLele.Infrastructure.Data;
using TimDoLeLe.Application.DTOs;

namespace TimDoLele.Application.Services
{
    public class ConfiguracaoLojaService
    {
        private readonly TimDoLeleDbContext _context;

        public ConfiguracaoLojaService(
            TimDoLeleDbContext context)
        {
            _context = context;
        }

        public async Task<ConfiguracaoLojaDto>
            ObterConfiguracaoAsync()
        {
            var configuracao =
                await ObterOuCriarConfiguracaoAsync();

            return MapearConfiguracao(
                configuracao
            );
        }

        public async Task<ConfiguracaoLojaDto>
            AtualizarConfiguracaoAsync(
                AtualizarConfiguracaoLojaDto dto)
        {
            var configuracao =
                await ObterOuCriarConfiguracaoAsync();

            configuracao.Atualizar(
                dto.PrazoEntregaMin,
                dto.PrazoEntregaMax,
                dto.PrazoRetiradaMin,
                dto.PrazoRetiradaMax,
                dto.TaxaEntregaPadrao
            );

            await _context.SaveChangesAsync();

            return MapearConfiguracao(
                configuracao
            );
        }

        public async Task<ConfiguracaoLojaDto>
            FecharLojaManualAsync(
                string? motivo)
        {
            var configuracao =
                await ObterOuCriarConfiguracaoAsync();

            configuracao.FecharManual(
                motivo
            );

            await _context.SaveChangesAsync();

            return MapearConfiguracao(
                configuracao
            );
        }

        public async Task<ConfiguracaoLojaDto>
            AbrirLojaManualAsync()
        {
            var configuracao =
                await ObterOuCriarConfiguracaoAsync();

            configuracao.AbrirManual();

            await _context.SaveChangesAsync();

            return MapearConfiguracao(
                configuracao
            );
        }

        public async Task<List<HorarioFuncionamentoDto>>
            ObterHorariosAsync()
        {
            await GarantirHorariosPadraoAsync();

            var horarios =
                await _context
                    .HorariosFuncionamento
                    .OrderBy(
                        h => h.DiaSemana
                    )
                    .ToListAsync();

            return horarios
                .Select(
                    MapearHorario
                )
                .ToList();
        }

        public async Task<
            List<HorarioFuncionamentoDto>>
            AtualizarHorariosAsync(
                List<AtualizarHorarioFuncionamentoDto>
                    horariosDto)
        {
            if (
                horariosDto == null ||
                horariosDto.Count == 0
            )
            {
                throw new BadRequestException(
                    "Informe os horários de funcionamento."
                );
            }

            var diasDuplicados =
                horariosDto
                    .GroupBy(
                        h => h.DiaSemana
                    )
                    .Where(
                        g => g.Count() > 1
                    )
                    .Select(
                        g => g.Key
                    )
                    .ToList();

            if (diasDuplicados.Any())
            {
                throw new BadRequestException(
                    "Existem dias da semana duplicados."
                );
            }

            foreach (
                var horarioDto in horariosDto
            )
            {
                if (
                    horarioDto.DiaSemana < 0 ||
                    horarioDto.DiaSemana > 6
                )
                {
                    throw new BadRequestException(
                        "Dia da semana inválido."
                    );
                }

                var diaSemana =
                    (DayOfWeek)
                    horarioDto.DiaSemana;

                TimeSpan? horaAbertura =
                    null;

                TimeSpan? horaFechamento =
                    null;

                if (horarioDto.Aberto)
                {
                    horaAbertura =
                        ConverterHora(
                            horarioDto.HoraAbertura,
                            "Hora de abertura inválida."
                        );

                    horaFechamento =
                        ConverterHora(
                            horarioDto.HoraFechamento,
                            "Hora de fechamento inválida."
                        );
                }

                var horario =
                    await _context
                        .HorariosFuncionamento
                        .FirstOrDefaultAsync(
                            h =>
                                h.DiaSemana ==
                                diaSemana
                        );

                if (horario == null)
                {
                    horario =
                        new HorarioFuncionamento(
                            diaSemana,
                            horarioDto.Aberto,
                            horaAbertura,
                            horaFechamento
                        );

                    await _context
                        .HorariosFuncionamento
                        .AddAsync(
                            horario
                        );
                }
                else
                {
                    horario.Atualizar(
                        diaSemana,
                        horarioDto.Aberto,
                        horaAbertura,
                        horaFechamento
                    );
                }
            }

            await _context.SaveChangesAsync();

            return await ObterHorariosAsync();
        }

        public async Task<List<DataEspecialDto>>
            ObterDatasEspeciaisAsync()
        {
            var datas =
                await _context
                    .DatasEspeciais
                    .OrderBy(
                        d => d.Data
                    )
                    .ToListAsync();

            return datas
                .Select(
                    MapearDataEspecial
                )
                .ToList();
        }

        public async Task<DataEspecialDto>
            CriarDataEspecialAsync(
                CriarDataEspecialDto dto)
        {
            if (
                string.IsNullOrWhiteSpace(
                    dto.Descricao
                )
            )
            {
                throw new BadRequestException(
                    "Informe a descrição da data especial."
                );
            }

            if (
                !Enum.IsDefined(
                    typeof(TipoDataEspecial),
                    dto.Tipo
                )
            )
            {
                throw new BadRequestException(
                    "Tipo de data especial inválido."
                );
            }

            var existe =
                await _context
                    .DatasEspeciais
                    .AnyAsync(
                        d =>
                            d.Data.Date ==
                            dto.Data.Date
                    );

            if (existe)
            {
                throw new BadRequestException(
                    "Já existe uma configuração especial para esta data."
                );
            }

            var tipo =
                (TipoDataEspecial)
                dto.Tipo;

            TimeSpan? horaAbertura =
                null;

            TimeSpan? horaFechamento =
                null;

            if (
                tipo ==
                TipoDataEspecial.HorarioEspecial
            )
            {
                horaAbertura =
                    ConverterHora(
                        dto.HoraAbertura,
                        "Hora de abertura inválida."
                    );

                horaFechamento =
                    ConverterHora(
                        dto.HoraFechamento,
                        "Hora de fechamento inválida."
                    );
            }

            var dataEspecial =
                new DataEspecial(
                    dto.Data,
                    tipo,
                    dto.Descricao.Trim(),
                    horaAbertura,
                    horaFechamento
                );

            await _context
                .DatasEspeciais
                .AddAsync(
                    dataEspecial
                );

            await _context.SaveChangesAsync();

            return MapearDataEspecial(
                dataEspecial
            );
        }

        public async Task ExcluirDataEspecialAsync(
            Guid id)
        {
            var dataEspecial =
                await _context
                    .DatasEspeciais
                    .FirstOrDefaultAsync(
                        d => d.Id == id
                    );

            if (dataEspecial == null)
            {
                throw new NotFoundException(
                    "Data especial não encontrada."
                );
            }

            _context
                .DatasEspeciais
                .Remove(
                    dataEspecial
                );

            await _context.SaveChangesAsync();
        }

        private async Task<ConfiguracaoLoja>
            ObterOuCriarConfiguracaoAsync()
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

            await _context.SaveChangesAsync();

            return configuracao;
        }

        private async Task
            GarantirHorariosPadraoAsync()
        {
            var quantidade =
                await _context
                    .HorariosFuncionamento
                    .CountAsync();

            if (quantidade > 0)
            {
                return;
            }

            var horarios =
                new List<HorarioFuncionamento>();

            foreach (
                DayOfWeek dia in
                Enum.GetValues(
                    typeof(DayOfWeek)
                )
            )
            {
                horarios.Add(
                    new HorarioFuncionamento(
                        dia,
                        false,
                        null,
                        null
                    )
                );
            }

            await _context
                .HorariosFuncionamento
                .AddRangeAsync(
                    horarios
                );

            await _context.SaveChangesAsync();
        }

        private static TimeSpan
            ConverterHora(
                string? valor,
                string mensagemErro)
        {
            if (
                string.IsNullOrWhiteSpace(
                    valor
                )
            )
            {
                throw new BadRequestException(
                    mensagemErro
                );
            }

            if (
                !TimeSpan.TryParse(
                    valor,
                    out var hora
                )
            )
            {
                throw new BadRequestException(
                    mensagemErro
                );
            }

            return hora;
        }

        private static ConfiguracaoLojaDto
            MapearConfiguracao(
                ConfiguracaoLoja configuracao)
        {
            return new ConfiguracaoLojaDto
            {
                Id =
                    configuracao.Id,

                PrazoEntregaMin =
                    configuracao.PrazoEntregaMin,

                PrazoEntregaMax =
                    configuracao.PrazoEntregaMax,

                PrazoRetiradaMin =
                    configuracao.PrazoRetiradaMin,

                PrazoRetiradaMax =
                    configuracao.PrazoRetiradaMax,

                TaxaEntregaPadrao =
                    configuracao.TaxaEntregaPadrao,

                FechadaManual =
                    configuracao.FechadaManual,

                MotivoFechamentoManual =
                    configuracao
                        .MotivoFechamentoManual
            };
        }

        private static HorarioFuncionamentoDto
            MapearHorario(
                HorarioFuncionamento horario)
        {
            return new HorarioFuncionamentoDto
            {
                Id =
                    horario.Id,

                DiaSemana =
                    (int)horario.DiaSemana,

                DiaSemanaTexto =
                    TraduzirDiaSemana(
                        horario.DiaSemana
                    ),

                Aberto =
                    horario.Aberto,

                HoraAbertura =
                    horario.HoraAbertura?
                        .ToString(
                            @"hh\:mm"
                        ),

                HoraFechamento =
                    horario.HoraFechamento?
                        .ToString(
                            @"hh\:mm"
                        )
            };
        }

        private static DataEspecialDto
            MapearDataEspecial(
                DataEspecial data)
        {
            return new DataEspecialDto
            {
                Id =
                    data.Id,

                Data =
                    data.Data,

                Tipo =
                    data.Tipo.ToString(),

                Descricao =
                    data.Descricao,

                HoraAbertura =
                    data.HoraAbertura?
                        .ToString(
                            @"hh\:mm"
                        ),

                HoraFechamento =
                    data.HoraFechamento?
                        .ToString(
                            @"hh\:mm"
                        )
            };
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