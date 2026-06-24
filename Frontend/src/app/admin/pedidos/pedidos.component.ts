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

  carregarPedidos(pedidoIdParaManter?: string): void {
    this.loading = true;

    this.pedidoService.getPedidos().subscribe({
      next: (res: any) => {
        this.pedidos = res.data ?? res;

        this.aplicarFiltro(this.filtroAtual);

        if (pedidoIdParaManter) {
          const pedidoAtualizado = this.pedidos.find(
            p => p.id === pedidoIdParaManter
          );

          if (pedidoAtualizado) {
            this.pedidoSelecionado = pedidoAtualizado;
          }
        }

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
        this.carregarPedidos(pedidoId);
      },
      error: (err: any) => {
        console.error(err);
        alert('Erro ao atualizar status');
      }
    });
  }

  getStatusTexto(pedido: any): string {
    if (
      pedido?.tipoEntrega === 'Retirada' &&
      pedido?.status === 'SaiuParaEntrega'
    ) {
      return 'Pronto para retirada';
    }

    if (pedido?.status === 'EmPreparo') {
      return 'Em preparo';
    }

    if (pedido?.status === 'SaiuParaEntrega') {
      return 'Saiu para entrega';
    }

    return pedido?.status ?? '';
  }

  getProximoTexto(pedido: any): string {
    if (this.isPendente(pedido)) {
      return 'Iniciar preparo';
    }

    if (this.isEmPreparo(pedido)) {
      return pedido.tipoEntrega === 'Retirada'
        ? 'Pronto para retirada'
        : 'Saiu para entrega';
    }

    if (this.isSaiuParaEntrega(pedido)) {
      return pedido.tipoEntrega === 'Retirada'
        ? 'Entregue ao cliente'
        : 'Entregue';
    }

    return '';
  }

  getProximoStatus(pedido: any): number | null {
    if (this.isPendente(pedido)) {
      return 1;
    }

    if (this.isEmPreparo(pedido)) {
      return 2;
    }

    if (this.isSaiuParaEntrega(pedido)) {
      return 3;
    }

    return null;
  }

  avancarStatus(pedido: any): void {
    const proximoStatus = this.getProximoStatus(pedido);

    if (proximoStatus === null) {
      return;
    }

    this.alterarStatus(pedido.id, proximoStatus);
  }

  imprimirPedido(): void {
    if (!this.pedidoSelecionado) {
      return;
    }

    window.print();
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
