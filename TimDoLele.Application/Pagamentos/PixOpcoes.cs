namespace TimDoLele.Application.Pagamentos
{
    // Seção "Pix" do appsettings.json
    public class PixOpcoes
    {
        // "Simulador" (testes) | futuramente "PagBank", "MercadoPago"
        public string Provedor { get; set; } = "Simulador";

        // Tempo que o cliente tem para pagar
        public int MinutosParaPagar { get; set; } = 5;
    }
}
