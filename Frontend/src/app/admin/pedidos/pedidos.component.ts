import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import {
  Subject,
  takeUntil
} from 'rxjs';

import { PedidoService } from '../../core/services/pedido.service';
import { ImpressaoPedidoService } from '../../core/services/impressao-pedido.service';

import {
  DashboardAtualizadoSignalR,
  NotificacaoSignalrService,
  PedidoAtualizadoSignalR,
  PedidoCriadoSignalR
} from '../../core/services/notificacao-signalr.service';

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
export class PedidosComponent
  implements OnInit, OnDestroy {

  pedidos: any[] = [];
  pedidosFiltrados: any[] = [];

  loading = false;
  filtroAtual = 'Todos';
  pedidoSelecionado: any = null;

  pedidoNovoId: string | null = null;

  toastNovoPedidoVisivel = false;
  toastNovoPedido: any = null;

  conexaoSignalRAtiva = false;

  private readonly destroy$ =
    new Subject<void>();

  private audioNovoPedido: HTMLAudioElement | null =
    null;

  private timeoutDestaque:
    ReturnType<typeof setTimeout> | null = null;

  private timeoutToast:
    ReturnType<typeof setTimeout> | null = null;

  filtros = [
    {
      label: 'Todos',
      valor: 'Todos',
      icone: '☰'
    },
    {
      label: 'Pendentes',
      valor: 'Pendente',
      icone: '📋'
    },
    {
      label: 'Em preparo',
      valor: 'EmPreparo',
      icone: '👨‍🍳'
    },
    {
      label: 'Entrega',
      valor: 'Entrega',
      icone: '🛵'
    },
    {
      label: 'Retirada',
      valor: 'Retirada',
      icone: '🛍️'
    },
    {
      label: 'Entregues',
      valor: 'Entregue',
      icone: '✅'
    },
    {
      label: 'Cancelados',
      valor: 'Cancelado',
      icone: '❌'
    }
  ];

  constructor(
    private pedidoService: PedidoService,
    private notificacaoSignalrService:
      NotificacaoSignalrService,
    private impressaoPedidoService: ImpressaoPedidoService,
    private cdr: ChangeDetectorRef
  ) {
    this.prepararAudio();
  }

  ngOnInit(): void {
    this.carregarPedidos();
    this.escutarEventosSignalR();

    void this.iniciarSignalR();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.timeoutDestaque) {
      clearTimeout(this.timeoutDestaque);
    }

    if (this.timeoutToast) {
      clearTimeout(this.timeoutToast);
    }
  }

  private async iniciarSignalR(): Promise<void> {
    await this.notificacaoSignalrService
      .iniciarConexao();

    this.conexaoSignalRAtiva =
      this.notificacaoSignalrService
        .estaConectado();

    this.cdr.detectChanges();
  }

  private escutarEventosSignalR(): void {
    this.notificacaoSignalrService
      .pedidoCriado$
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (
          notificacao: PedidoCriadoSignalR
        ) => {
          this.aoReceberNovoPedido(
            notificacao
          );
        }
      });

    this.notificacaoSignalrService
      .pedidoAtualizado$
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (
          notificacao:
            PedidoAtualizadoSignalR
        ) => {
          this.aoReceberPedidoAtualizado(
            notificacao
          );
        }
      });

    this.notificacaoSignalrService
      .dashboardAtualizado$
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (
          notificacao:
            DashboardAtualizadoSignalR
        ) => {
          console.log(
            'Dashboard deverá ser atualizado:',
            notificacao
          );
        }
      });
  }

  private aoReceberNovoPedido(
    notificacao: PedidoCriadoSignalR
  ): void {
    console.log(
      'Novo pedido recebido em tempo real:',
      notificacao
    );

    this.destacarNovoPedido(
      notificacao.pedidoId
    );

    this.tocarSomNovoPedido();

    const pedidoSelecionadoId =
      this.pedidoSelecionado?.id;

    this.carregarPedidos(
      pedidoSelecionadoId,
      notificacao.pedidoId
    );
  }

  private aoReceberPedidoAtualizado(
    notificacao: PedidoAtualizadoSignalR
  ): void {
    console.log(
      'Pedido atualizado em tempo real:',
      notificacao
    );

    const pedidoSelecionadoId =
      this.pedidoSelecionado?.id;

    this.carregarPedidos(
      pedidoSelecionadoId
    );
  }

  private destacarNovoPedido(
    pedidoId: string
  ): void {
    this.pedidoNovoId = pedidoId;

    if (this.timeoutDestaque) {
      clearTimeout(this.timeoutDestaque);
    }

    this.timeoutDestaque =
      setTimeout(() => {
        this.pedidoNovoId = null;
        this.cdr.detectChanges();
      }, 10000);
  }

  private exibirToastNovoPedido(pedido: any): void {
    if (!pedido) {
      return;
    }

    this.toastNovoPedido = pedido;
    this.toastNovoPedidoVisivel = true;

    if (this.timeoutToast) {
      clearTimeout(this.timeoutToast);
    }

    this.timeoutToast = setTimeout(() => {
      this.fecharToastNovoPedido();
    }, 10000);

    this.cdr.detectChanges();
  }

  fecharToastNovoPedido(): void {
    this.toastNovoPedidoVisivel = false;

    if (this.timeoutToast) {
      clearTimeout(this.timeoutToast);
      this.timeoutToast = null;
    }

    this.cdr.detectChanges();
  }

  abrirNovoPedido(): void {
    if (!this.toastNovoPedido) {
      return;
    }

    this.aplicarFiltro('Todos');

    const pedido = this.pedidos.find(
      (item: any) => item.id === this.toastNovoPedido.id
    );

    if (pedido) {
      this.pedidoSelecionado = pedido;
    }

    this.fecharToastNovoPedido();

    setTimeout(() => {
      const linhaPedido = document.querySelector(
        `[data-pedido-id="${this.pedidoNovoId}"]`
      );

      linhaPedido?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }, 50);
  }

  private prepararAudio(): void {
    this.audioNovoPedido =
      new Audio(
        '/sounds/novo-pedido.mp3'
      );

    this.audioNovoPedido.preload = 'auto';
  }

  private tocarSomNovoPedido(): void {
    if (!this.audioNovoPedido) {
      return;
    }

    this.audioNovoPedido.currentTime = 0;

    this.audioNovoPedido.play().catch((erro) => {
      console.warn(
        'O navegador bloqueou o som da notificação. Clique na página pelo menos uma vez.',
        erro
      );
    });
  }

  carregarPedidos(
    pedidoIdParaManter?: string,
    novoPedidoId?: string
  ): void {
    this.loading = true;

    this.pedidoService
      .getPedidos()
      .subscribe({
        next: (res: any) => {
          this.pedidos =
            res.data ?? res;

          this.aplicarFiltro(
            this.filtroAtual
          );

          if (pedidoIdParaManter) {
            const pedidoAtualizado =
              this.pedidos.find(
                (pedido: any) =>
                  pedido.id ===
                  pedidoIdParaManter
              );

            if (pedidoAtualizado) {
              this.pedidoSelecionado =
                pedidoAtualizado;
            }
          }

          if (novoPedidoId) {
            const novoPedido =
              this.pedidos.find(
                (pedido: any) =>
                  pedido.id === novoPedidoId
              );

            if (novoPedido) {
              this.exibirToastNovoPedido(
                novoPedido
              );

              this.impressaoPedidoService.adicionarNaFila(
                novoPedido
              );
            }
          }

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (erro: any) => {
          console.error(
            'Erro ao carregar pedidos:',
            erro
          );

          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  aplicarFiltro(filtro: string): void {
    this.filtroAtual = filtro;

    if (filtro === 'Todos') {
      this.pedidosFiltrados =
        this.pedidos;

      return;
    }

    if (filtro === 'Entrega') {
      this.pedidosFiltrados =
        this.pedidos.filter(
          (pedido: any) =>
            pedido.tipoEntrega ===
            'Delivery' &&
            pedido.status ===
            'SaiuParaEntrega'
        );

      return;
    }

    if (filtro === 'Retirada') {
      this.pedidosFiltrados =
        this.pedidos.filter(
          (pedido: any) =>
            pedido.tipoEntrega ===
            'Retirada' &&
            pedido.status ===
            'SaiuParaEntrega'
        );

      return;
    }

    this.pedidosFiltrados =
      this.pedidos.filter(
        (pedido: any) =>
          String(pedido.status).trim() ===
          filtro
      );
  }

  selecionarPedido(pedido: any): void {
    this.pedidoSelecionado = pedido;
  }

  alterarStatus(
    pedidoId: string,
    status: number
  ): void {
    this.pedidoService
      .atualizarStatus(
        pedidoId,
        status
      )
      .subscribe({
        next: () => {

          this.carregarPedidos(pedidoId);
        },
        error: (erro: any) => {
          console.error(
            'Erro ao atualizar status:',
            erro
          );

          alert(
            'Erro ao atualizar status'
          );
        }
      });
  }

  avancarStatus(pedido: any): void {
    const proximoStatus =
      this.getProximoStatus(pedido);

    if (proximoStatus === null) {
      return;
    }

    this.alterarStatus(
      pedido.id,
      proximoStatus
    );
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
      pedido.tipoEntrega ===
      'Retirada' &&
      pedido.status ===
      'SaiuParaEntrega'
    ) {
      return 'Retirada';
    }

    if (
      pedido.tipoEntrega ===
      'Delivery' &&
      pedido.status ===
      'SaiuParaEntrega'
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

    if (
      pedido.status === 'EmPreparo'
    ) {
      return 'status-preparo';
    }

    if (
      pedido.tipoEntrega ===
      'Delivery' &&
      pedido.status ===
      'SaiuParaEntrega'
    ) {
      return 'status-entrega';
    }

    if (
      pedido.tipoEntrega ===
      'Retirada' &&
      pedido.status ===
      'SaiuParaEntrega'
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
      return pedido.tipoEntrega ===
        'Retirada'
        ? '🛍️ Retirada pronta'
        : '🛵 Saiu para entrega';
    }

    if (
      this.isSaiuParaEntrega(pedido)
    ) {
      return pedido.tipoEntrega ===
        'Retirada'
        ? '✅ Entregue ao cliente'
        : '✅ Entregue';
    }

    return '';
  }

  getProximoStatus(
    pedido: any
  ): number | null {
    if (this.isPendente(pedido)) {
      return 1;
    }

    if (this.isEmPreparo(pedido)) {
      return 2;
    }

    if (
      this.isSaiuParaEntrega(pedido)
    ) {
      return 3;
    }

    return null;
  }

  podeCancelar(pedido: any): boolean {
    const status =
      String(
        pedido?.status
      ).trim();

    return (
      status !== 'Entregue' &&
      status !== 'Cancelado'
    );
  }

  isPendente(pedido: any): boolean {
    return (
      String(
        pedido?.status
      ).trim() === 'Pendente'
    );
  }

  isEmPreparo(pedido: any): boolean {
    return (
      String(
        pedido?.status
      ).trim() === 'EmPreparo'
    );
  }

  isSaiuParaEntrega(
    pedido: any
  ): boolean {
    return (
      String(
        pedido?.status
      ).trim() ===
      'SaiuParaEntrega'
    );
  }

  contarPendentes(): number {
    return this.pedidos.filter(
      (pedido: any) =>
        pedido.status === 'Pendente'
    ).length;
  }

  contarEmPreparo(): number {
    return this.pedidos.filter(
      (pedido: any) =>
        pedido.status === 'EmPreparo'
    ).length;
  }

  contarEntrega(): number {
    return this.pedidos.filter(
      (pedido: any) =>
        pedido.tipoEntrega ===
        'Delivery' &&
        pedido.status ===
        'SaiuParaEntrega'
    ).length;
  }

  contarRetirada(): number {
    return this.pedidos.filter(
      (pedido: any) =>
        pedido.tipoEntrega ===
        'Retirada' &&
        pedido.status ===
        'SaiuParaEntrega'
    ).length;
  }

  contarCancelados(): number {
    return this.pedidos.filter(
      (pedido: any) =>
        pedido.status ===
        'Cancelado'
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
      (pedido: any) =>
        String(
          pedido.status
        ).trim() === filtro
    ).length;
  }

  traduzirPagamento(
    formaPagamento: string
  ): string {
    if (!formaPagamento) {
      return '-';
    }

    const mapa: Record<
      string,
      string
    > = {
      Pix: 'Pix',
      Dinheiro: 'Dinheiro',
      CartaoCredito: 'Crédito',
      CartaoDebito: 'Débito'
    };

    return (
      mapa[formaPagamento] ??
      formaPagamento
    );
  }

  formatarHora(
    dataHora: string
  ): string {
    if (!dataHora) {
      return '';
    }

    const data =
      new Date(dataHora);

    return data.toLocaleTimeString(
      'pt-BR',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }

  formatarData(
    dataHora: string
  ): string {
    if (!dataHora) {
      return '';
    }

    const data =
      new Date(dataHora);

    return data.toLocaleDateString(
      'pt-BR'
    );
  }
}
