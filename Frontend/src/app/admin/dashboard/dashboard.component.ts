import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PedidoService } from '../../core/services/pedido.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class Dashboard implements OnInit {

  pedidos: any[] = [];

  pedidosRetirada: any[] = [];
  pedidosEntrega: any[] = [];

  pedidosPendentes: any[] = [];
  pedidosEmPreparo: any[] = [];

  faturamentoHoje = 0;

  loading = false;

  constructor(
    private pedidoService: PedidoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarPedidos();
  }

  carregarPedidos(): void {
    this.loading = true;

    this.pedidoService.getPedidos().subscribe({
      next: (res: any) => {
        this.pedidos = res.data ?? res;

        this.pedidosPendentes = this.pedidos.filter(
          (p: any) => p.status === 'Pendente'
        );

        this.pedidosEmPreparo = this.pedidos.filter(
          (p: any) => p.status === 'EmPreparo'
        );

        this.pedidosRetirada = this.pedidos.filter(
          (p: any) =>
            p.tipoEntrega === 'Retirada' &&
            p.status === 'EmPreparo'
        );

        this.pedidosEntrega = this.pedidos.filter(
          (p: any) =>
            p.tipoEntrega === 'Delivery' &&
            p.status === 'SaiuParaEntrega'
        );

        this.faturamentoHoje = this.pedidos.reduce(
          (total: number, pedido: any) =>
            total + Number(pedido.total),
          0
        );

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  formatarHora(dataHora: string): string {
    if (!dataHora) {
      return '';
    }

    const data = new Date(dataHora);

    return data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  alterarStatus(pedidoId: string, status: number): void {
    this.pedidoService.atualizarStatus(pedidoId, status).subscribe({
      next: () => {
        this.carregarPedidos();
      },
      error: (err: any) => {
        console.error(err);
        alert('Erro ao atualizar status');
      }
    });
  }

  isPendente(pedido: any): boolean {
    return String(pedido.status).trim() === 'Pendente';
  }

  isEmPreparo(pedido: any): boolean {
    return String(pedido.status).trim() === 'EmPreparo';
  }

  isSaiuParaEntrega(pedido: any): boolean {
    return String(pedido.status).trim() === 'SaiuParaEntrega';
  }

  podeCancelar(pedido: any): boolean {
    const status = String(pedido.status).trim();

    return status !== 'Entregue' && status !== 'Cancelado';
  }
}
