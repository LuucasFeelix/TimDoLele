namespace TimDolele.Core.Entities
{
    public class HorarioFuncionamento : BaseEntity
    {
        public DayOfWeek DiaSemana { get; private set; }

        public bool Aberto { get; private set; }

        public TimeSpan? HoraAbertura { get; private set; }

        public TimeSpan? HoraFechamento { get; private set; }

        private HorarioFuncionamento()
        {
        }

        public HorarioFuncionamento(
            DayOfWeek diaSemana,
            bool aberto,
            TimeSpan? horaAbertura,
            TimeSpan? horaFechamento)
        {
            Atualizar(
                diaSemana,
                aberto,
                horaAbertura,
                horaFechamento
            );
        }

        public void Atualizar(
            DayOfWeek diaSemana,
            bool aberto,
            TimeSpan? horaAbertura,
            TimeSpan? horaFechamento)
        {
            if (
                aberto &&
                (
                    !horaAbertura.HasValue ||
                    !horaFechamento.HasValue
                )
            )
            {
                throw new Exception(
                    "Horário de abertura e fechamento são obrigatórios."
                );
            }

            DiaSemana =
                diaSemana;

            Aberto =
                aberto;

            HoraAbertura =
                aberto
                    ? horaAbertura
                    : null;

            HoraFechamento =
                aberto
                    ? horaFechamento
                    : null;
        }
    }
}