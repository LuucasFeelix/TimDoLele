namespace TimDolele.Core.Entities
{
    public class ConfiguracaoLoja : BaseEntity
    {
        public int PrazoEntregaMin { get; private set; }

        public int PrazoEntregaMax { get; private set; }

        public int PrazoRetiradaMin { get; private set; }

        public int PrazoRetiradaMax { get; private set; }

        public decimal TaxaEntregaPadrao { get; private set; }

        public bool FechadaManual { get; private set; }

        public string? MotivoFechamentoManual { get; private set; }

        private ConfiguracaoLoja()
        {
        }

        public ConfiguracaoLoja(
            int prazoEntregaMin,
            int prazoEntregaMax,
            int prazoRetiradaMin,
            int prazoRetiradaMax,
            decimal taxaEntregaPadrao)
        {
            Atualizar(
                prazoEntregaMin,
                prazoEntregaMax,
                prazoRetiradaMin,
                prazoRetiradaMax,
                taxaEntregaPadrao
            );
        }

        public void Atualizar(
            int prazoEntregaMin,
            int prazoEntregaMax,
            int prazoRetiradaMin,
            int prazoRetiradaMax,
            decimal taxaEntregaPadrao)
        {
            if (prazoEntregaMin <= 0)
            {
                throw new Exception(
                    "Prazo mínimo de entrega inválido."
                );
            }

            if (prazoEntregaMax < prazoEntregaMin)
            {
                throw new Exception(
                    "Prazo máximo de entrega inválido."
                );
            }

            if (prazoRetiradaMin <= 0)
            {
                throw new Exception(
                    "Prazo mínimo de retirada inválido."
                );
            }

            if (prazoRetiradaMax < prazoRetiradaMin)
            {
                throw new Exception(
                    "Prazo máximo de retirada inválido."
                );
            }

            if (taxaEntregaPadrao < 0)
            {
                throw new Exception(
                    "Taxa de entrega inválida."
                );
            }

            PrazoEntregaMin =
                prazoEntregaMin;

            PrazoEntregaMax =
                prazoEntregaMax;

            PrazoRetiradaMin =
                prazoRetiradaMin;

            PrazoRetiradaMax =
                prazoRetiradaMax;

            TaxaEntregaPadrao =
                taxaEntregaPadrao;
        }

        public void FecharManual(
            string? motivo = null)
        {
            FechadaManual = true;

            MotivoFechamentoManual =
                motivo;
        }

        public void AbrirManual()
        {
            FechadaManual = false;

            MotivoFechamentoManual =
                null;
        }
    }
}