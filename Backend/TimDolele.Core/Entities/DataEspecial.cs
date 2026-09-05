using TimDolele.Core.Enums;

namespace TimDolele.Core.Entities
{
    public class DataEspecial : BaseEntity
    {
        public DateTime Data { get; private set; }

        public TipoDataEspecial Tipo { get; private set; }

        public string Descricao { get; private set; } =
            string.Empty;

        public TimeSpan? HoraAbertura { get; private set; }

        public TimeSpan? HoraFechamento { get; private set; }

        private DataEspecial()
        {
        }

        public DataEspecial(
            DateTime data,
            TipoDataEspecial tipo,
            string descricao,
            TimeSpan? horaAbertura = null,
            TimeSpan? horaFechamento = null)
        {
            Data =
                data.Date;

            Tipo =
                tipo;

            Descricao =
                descricao;

            if (
                tipo ==
                TipoDataEspecial.HorarioEspecial
            )
            {
                if (
                    !horaAbertura.HasValue ||
                    !horaFechamento.HasValue
                )
                {
                    throw new Exception(
                        "Horário especial precisa de abertura e fechamento."
                    );
                }

                HoraAbertura =
                    horaAbertura;

                HoraFechamento =
                    horaFechamento;
            }
        }
    }
}