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
    { label: 'Este mês', value: 'mes' },
    { label: 'Personalizado', value: 'personalizado' }
  ];

  coresPagamento = [
    '#22c55e',
    '#f8b400',
    '#8b5cf6',
    '#0ea5e9',
    '#ef4444'
  ];

  constructor(
    private pedidoService: PedidoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarRelatorio('hoje');
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

  getDonutEntregaStyle(): string {
    const entrega = this.relatorio?.percentualDelivery ?? 0;

    return `conic-gradient(
      #f8b400 0% ${entrega}%,
      #22c55e ${entrega}% 100%
    )`;
  }

  getDonutPagamentoStyle(): string {
    if (!this.relatorio?.formasPagamento?.length) {
      return 'conic-gradient(#e5e7eb 0% 100%)';
    }

    let inicio = 0;

    const partes = this.relatorio.formasPagamento.map((item: any, index: number) => {
      const fim = inicio + Number(item.percentual || 0);
      const cor = this.coresPagamento[index] || '#999';

      const parte = `${cor} ${inicio}% ${fim}%`;

      inicio = fim;

      return parte;
    });

    return `conic-gradient(${partes.join(', ')})`;
  }

  getCorPagamento(index: number): string {
    return this.coresPagamento[index] || '#999';
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

  getMaiorFormaPagamento(): any {
    if (!this.relatorio?.formasPagamento?.length) {
      return null;
    }

    return this.relatorio.formasPagamento[0];
  }
}
