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
    { label: 'Todos', valor: 'Todos', icone: '☰' },
    { label: 'Pendentes', valor: 'Pendente', icone: '📋' },
    { label: 'Em preparo', valor: 'EmPreparo', icone: '👨‍🍳' },
    { label: 'Entrega', valor: 'Entrega', icone: '🛵' },
    { label: 'Retirada', valor: 'Retirada', icone: '🛍️' },
    { label: 'Entregues', valor: 'Entregue', icone: '✅' },
    { label: 'Cancelados', valor: 'Cancelado', icone: '❌' }
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
            (p: any) => p.id === pedidoIdParaManter
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
        this.cdr.detectChanges();
      }
    });
  }

  aplicarFiltro(filtro: string): void {
    this.filtroAtual = filtro;

    if (filtro === 'Todos') {
      this.pedidosFiltrados = this.pedidos;
      return;
    }

    if (filtro === 'Entrega') {
      this.pedidosFiltrados = this.pedidos.filter(
        (pedido: any) =>
          pedido.tipoEntrega === 'Delivery' &&
          pedido.status === 'SaiuParaEntrega'
      );
      return;
    }

    if (filtro === 'Retirada') {
      this.pedidosFiltrados = this.pedidos.filter(
        (pedido: any) =>
          pedido.tipoEntrega === 'Retirada' &&
          pedido.status === 'SaiuParaEntrega'
      );
      return;
    }

    this.pedidosFiltrados = this.pedidos.filter(
      (pedido: any) => String(pedido.status).trim() === filtro
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

  getStatusTexto(pedido: any): string {
    if (!pedido) {
      return '';
    }

    if (
      pedido.tipoEntrega === 'Retirada' &&
      pedido.status === 'SaiuParaEntrega'
    ) {
      return 'Retirada';
    }

    if (
      pedido.tipoEntrega === 'Delivery' &&
      pedido.status === 'SaiuParaEntrega'
    ) {
      return 'Entrega';
    }

    if (pedido.status === 'Pendente') {
      return 'Pendente';
    }

    if (pedido.status === 'EmPreparo') {
      return 'Em preparo';
    }

    if (pedido.status === 'Entregue') {
      return 'Entregue';
    }

    if (pedido.status === 'Cancelado') {
      return 'Cancelado';
    }

    return pedido.status ?? '';
  }

  getStatusClasse(pedido: any): string {
    if (!pedido) {
      return '';
    }

    if (pedido.status === 'Pendente') {
      return 'status-pendente';
    }

    if (pedido.status === 'EmPreparo') {
      return 'status-preparo';
    }

    if (
      pedido.tipoEntrega === 'Delivery' &&
      pedido.status === 'SaiuParaEntrega'
    ) {
      return 'status-entrega';
    }

    if (
      pedido.tipoEntrega === 'Retirada' &&
      pedido.status === 'SaiuParaEntrega'
    ) {
      return 'status-retirada';
    }

    if (pedido.status === 'Entregue') {
      return 'status-entregue';
    }

    if (pedido.status === 'Cancelado') {
      return 'status-cancelado';
    }

    return '';
  }

  getProximoTexto(pedido: any): string {
    if (this.isPendente(pedido)) {
      return '▶️ Iniciar preparo';
    }

    if (this.isEmPreparo(pedido)) {
      return pedido.tipoEntrega === 'Retirada'
        ? '🛍️ Retirada pronta'
        : '🛵 Saiu para entrega';
    }

    if (this.isSaiuParaEntrega(pedido)) {
      return pedido.tipoEntrega === 'Retirada'
        ? '✅ Entregue ao cliente'
        : '✅ Entregue';
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

  podeCancelar(pedido: any): boolean {
    const status = String(pedido?.status).trim();

    return status !== 'Entregue' && status !== 'Cancelado';
  }

  isPendente(pedido: any): boolean {
    return String(pedido?.status).trim() === 'Pendente';
  }

  isEmPreparo(pedido: any): boolean {
    return String(pedido?.status).trim() === 'EmPreparo';
  }

  isSaiuParaEntrega(pedido: any): boolean {
    return String(pedido?.status).trim() === 'SaiuParaEntrega';
  }

  contarPendentes(): number {
    return this.pedidos.filter(
      (pedido: any) => pedido.status === 'Pendente'
    ).length;
  }

  contarEmPreparo(): number {
    return this.pedidos.filter(
      (pedido: any) => pedido.status === 'EmPreparo'
    ).length;
  }

  contarEntrega(): number {
    return this.pedidos.filter(
      (pedido: any) =>
        pedido.tipoEntrega === 'Delivery' &&
        pedido.status === 'SaiuParaEntrega'
    ).length;
  }

  contarRetirada(): number {
    return this.pedidos.filter(
      (pedido: any) =>
        pedido.tipoEntrega === 'Retirada' &&
        pedido.status === 'SaiuParaEntrega'
    ).length;
  }

  contarCancelados(): number {
    return this.pedidos.filter(
      (pedido: any) => pedido.status === 'Cancelado'
    ).length;
  }

  contarFiltro(filtro: string): number {
    if (filtro === 'Todos') {
      return this.pedidos.length;
    }

    if (filtro === 'Pendente') {
      return this.contarPendentes();
    }

    if (filtro === 'EmPreparo') {
      return this.contarEmPreparo();
    }

    if (filtro === 'Entrega') {
      return this.contarEntrega();
    }

    if (filtro === 'Retirada') {
      return this.contarRetirada();
    }

    if (filtro === 'Cancelado') {
      return this.contarCancelados();
    }

    return this.pedidos.filter(
      (pedido: any) => String(pedido.status).trim() === filtro
    ).length;
  }

  traduzirPagamento(formaPagamento: string): string {
    if (!formaPagamento) {
      return '-';
    }

    const mapa: any = {
      Pix: 'Pix',
      Dinheiro: 'Dinheiro',
      CartaoCredito: 'Crédito',
      CartaoDebito: 'Débito'
    };

    return mapa[formaPagamento] ?? formaPagamento;
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

  formatarData(dataHora: string): string {
    if (!dataHora) {
      return '';
    }

    const data = new Date(dataHora);

    return data.toLocaleDateString('pt-BR');
  }
}
