import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService } from '../../core/services/pedido.service';
import { AvisoService } from '../../core/services/aviso.service';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './relatorios.component.html',
  styleUrls: ['./relatorios.component.css']
})
export class RelatoriosComponent implements OnInit {

  // Popup padrão de avisos
  private aviso = inject(AvisoService);

  relatorio: any = null;
  loading = false;
  exportando = false;

  periodoAtual = 'hoje';

  // Período "Personalizado" (formato do campo de data: 2026-11-01)
  dataInicio = this.dataCampo(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  dataFim = this.dataCampo(new Date());

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
    if (periodo === 'personalizado' && !this.datasValidas()) {
      this.periodoAtual = periodo;
      return;
    }

    this.periodoAtual = periodo;
    this.loading = true;
    this.relatorio = null;

    this.pedidoService.getRelatorio(periodo, this.dataInicio, this.dataFim).subscribe({
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

  // Campos de data do "Personalizado"
  alterarDataInicio(event: Event): void {
    this.dataInicio = (event.target as HTMLInputElement).value;
  }

  alterarDataFim(event: Event): void {
    this.dataFim = (event.target as HTMLInputElement).value;
  }

  aplicarPersonalizado(): void {
    if (!this.datasValidas()) {
      this.aviso.atencao('Escolha as duas datas. A data inicial não pode ser depois da final.');
      return;
    }

    this.carregarRelatorio('personalizado');
  }

  private datasValidas(): boolean {
    return !!this.dataInicio && !!this.dataFim && this.dataInicio <= this.dataFim;
  }

  // Date -> "2026-11-01" (no fuso do computador, não em UTC)
  private dataCampo(data: Date): string {
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');

    return `${data.getFullYear()}-${mes}-${dia}`;
  }

  // Baixa a planilha do período escolhido
  exportarRelatorio(): void {
    if (this.exportando) {
      return;
    }

    this.exportando = true;

    this.pedidoService.exportarRelatorio(this.periodoAtual, this.dataInicio, this.dataFim).subscribe({
      next: (arquivo: Blob) => {
        const hoje = new Date().toISOString().slice(0, 10);
        const url = URL.createObjectURL(arquivo);

        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-${this.periodoAtual}-${hoje}.xlsx`;
        link.click();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        this.exportando = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Erro ao exportar relatório:', err);
        this.exportando = false;
        this.aviso.erro('Não foi possível exportar o relatório.');
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
      CartaoDebito: 'Débito',
      NaoInformado: 'Não informado'
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
