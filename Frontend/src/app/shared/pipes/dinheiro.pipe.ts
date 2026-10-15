import { Pipe, PipeTransform } from '@angular/core';

// Formata qualquer valor em dinheiro no padrão brasileiro.
// Uso no HTML:  {{ pedido.total | dinheiro }}  ->  R$ 1.234,50
//
// Aceita número (55, 28.5) ou texto ("25.00", "25,00", "1.234,50"),
// porque alguns valores já chegam como texto da API ou de cálculos.
@Pipe({
  name: 'dinheiro',
  standalone: true
})
export class DinheiroPipe implements PipeTransform {

  private static readonly formatador = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  transform(valor: number | string | null | undefined): string {
    const numero = DinheiroPipe.paraNumero(valor);

    return DinheiroPipe.formatador.format(numero);
  }

  private static paraNumero(valor: number | string | null | undefined): number {
    if (valor === null || valor === undefined || valor === '') {
      return 0;
    }

    if (typeof valor === 'number') {
      return isNaN(valor) ? 0 : valor;
    }

    let texto = valor.replace(/[^\d.,-]/g, '');

    // "1.234,50" -> "1234.50" | "25,00" -> "25.00" | "25.00" fica igual
    if (texto.includes(',')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    }

    const numero = Number(texto);

    return isNaN(numero) ? 0 : numero;
  }
}
