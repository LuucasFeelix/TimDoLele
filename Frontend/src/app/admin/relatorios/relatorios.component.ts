import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService } from '../../core/services/pedido.service';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './relatorios.component.html',
  styleUrls: ['./relatorios.component.css']
})
export class RelatoriosComponent implements OnInit {

  relatorio: any = null;
  loading = false;

  periodoAtual = 'hoje';

  periodos = [
    { label: 'Hoje', value: 'hoje' },
    { label: 'Ontem', value: 'ontem' },
    { label: 'Esta semana', value: 'semana' },
    { label: 'Este mês', value: 'mes' }
  ];

  constructor(
    private pedidoService: PedidoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    setTimeout(() => {
      this.carregarRelatorio('hoje');
    });
  }

  carregarRelatorio(periodo: string): void {
    this.periodoAtual = periodo;
    this.loading = true;
    this.relatorio = null;

    this.pedidoService.getRelatorio(periodo).subscribe({
      next: (res: any) => {
        this.relatorio = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Erro ao carregar relatório:', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  formatarMoeda(valor: number): string {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  getDeliveryPercentual(): number {
    return this.relatorio?.percentualDelivery ?? 0;
  }

  getRetiradaPercentual(): number {
    return this.relatorio?.percentualRetirada ?? 0;
  }

  getPagamentoPercentual(item: any): number {
    return item?.percentual ?? 0;
  }

  getDonutEntregaStyle(): string {
    const entrega = this.getDeliveryPercentual();

    return `conic-gradient(#f8b400 0% ${entrega}%, #22c55e ${entrega}% 100%)`;
  }

  getMaiorFormaPagamento(): any {
    if (!this.relatorio?.formasPagamento?.length) {
      return null;
    }

    return this.relatorio.formasPagamento[0];
  }

  traduzirPagamento(nome: string): string {
    if (!nome) return '-';

    const mapa: any = {
      Pix: 'Pix',
      Dinheiro: 'Dinheiro',
      CartaoCredito: 'Crédito',
      CartaoDebito: 'Débito'
    };

    return mapa[nome] ?? nome;
  }
}
