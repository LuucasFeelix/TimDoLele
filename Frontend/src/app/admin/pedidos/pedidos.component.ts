import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PedidoService } from '../../core/services/pedido.service';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './pedidos.component.html',
  styleUrls: ['./pedidos.component.css']
})
export class PedidosComponent implements OnInit {

  pedidos: any[] = [];
  pedidosFiltrados: any[] = [];

  loading = false;

  filtroAtual = 'Todos';

  pedidoSelecionado: any = null;

  filtros = [
    'Todos',
    'Pendente',
    'EmPreparo',
    'SaiuParaEntrega',
    'Entregue',
    'Cancelado'
  ];

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
        this.aplicarFiltro(this.filtroAtual);

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  aplicarFiltro(filtro: string): void {
    this.filtroAtual = filtro;

    if (filtro === 'Todos') {
      this.pedidosFiltrados = this.pedidos;
      return;
    }

    this.pedidosFiltrados = this.pedidos.filter(
      pedido => String(pedido.status).trim() === filtro
    );
  }

  selecionarPedido(pedido: any): void {
    this.pedidoSelecionado = pedido;
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

  contar(status: string): number {
    if (status === 'Todos') {
      return this.pedidos.length;
    }

    return this.pedidos.filter(
      pedido => String(pedido.status).trim() === status
    ).length;
  }
}
