import {
  ChangeDetectorRef,
  Component,
  NgZone,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  Router,
  RouterModule
} from '@angular/router';

import {
  Subject,
  takeUntil
} from 'rxjs';

import {
  ImpressaoPedidoService,
  PedidoComErroImpressao
} from '../../../core/services/impressao-pedido.service';

import {
  NotificacaoSignalrService,
  PedidoCriadoSignalR
} from '../../../core/services/notificacao-signalr.service';

import {
  PedidoService
} from '../../../core/services/pedido.service';

import {
  AuthService
} from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',

  standalone: true,

  imports: [
    CommonModule,
    RouterModule
  ],

  templateUrl:
    './admin-layout.component.html',

  styleUrls: [
    './admin-layout.component.css'
  ]
})
export class AdminLayoutComponent
  implements OnInit, OnDestroy {

  pedidosComErro:
    PedidoComErroImpressao[] = [];

  toastNovoPedidoVisivel = false;

  toastNovoPedido: any = null;

  saindo = false;

  private readonly destroy$ =
    new Subject<void>();

  private audioNovoPedido:
    HTMLAudioElement | null = null;

  private timeoutToast:
    ReturnType<typeof setTimeout> | null = null;

  constructor(
    private impressaoPedidoService:
      ImpressaoPedidoService,

    private notificacaoSignalrService:
      NotificacaoSignalrService,

    private pedidoService:
      PedidoService,

    private authService:
      AuthService,

    private router:
      Router,

    private ngZone:
      NgZone,

    private cdr:
      ChangeDetectorRef
  ) {
    this.prepararAudio();
  }

  async ngOnInit():
    Promise<void> {

    console.log(
      '🚀 Ambiente administrativo iniciado.'
    );

    this.escutarErrosImpressao();

    this.escutarNovosPedidos();

    await this
      .notificacaoSignalrService
      .iniciarConexao();

    await this
      .impressaoPedidoService
      .recuperarPedidosPendentes();
  }

  ngOnDestroy(): void {

    this.destroy$.next();

    this.destroy$.complete();

    if (this.timeoutToast) {

      clearTimeout(
        this.timeoutToast
      );

      this.timeoutToast =
        null;
    }
  }

  private escutarNovosPedidos():
    void {

    this.notificacaoSignalrService
      .pedidoCriado$
      .pipe(
        takeUntil(
          this.destroy$
        )
      )
      .subscribe({

        next: (
          notificacao:
            PedidoCriadoSignalR
        ) => {

          this.ngZone.run(
            () => {

              console.log(
                '🔔 Novo pedido recebido globalmente:',
                notificacao
              );

              this.tocarSomNovoPedido();

              this.buscarPedido(
                notificacao.pedidoId
              );
            }
          );
        }
      });
  }

  private buscarPedido(
    pedidoId: string
  ): void {

    this.pedidoService
      .getPedidoPorId(
        pedidoId
      )
      .subscribe({

        next: async (pedido) => {

          console.log(
            `📦 Pedido #${pedido.codigo} recebido globalmente.`
          );

          this.exibirToastNovoPedido(
            pedido
          );

          await this
            .impressaoPedidoService
            .adicionarNaFila(
              pedido
            );
        },

        error: (erro) => {

          console.error(
            `❌ Erro ao carregar o pedido ${pedidoId}.`,
            erro
          );
        }
      });
  }

  private prepararAudio():
    void {

    this.audioNovoPedido =
      new Audio(
        '/sounds/novo-pedido.mp3'
      );

    this.audioNovoPedido.preload =
      'auto';
  }

  private tocarSomNovoPedido():
    void {

    if (!this.audioNovoPedido) {
      return;
    }

    this.audioNovoPedido.currentTime =
      0;

    this.audioNovoPedido
      .play()
      .catch(
        erro => {

          console.warn(
            'O navegador bloqueou o som da notificação. Clique na página pelo menos uma vez.',
            erro
          );
        }
      );
  }

  private exibirToastNovoPedido(
    pedido: any
  ): void {

    if (!pedido) {
      return;
    }

    this.toastNovoPedido =
      pedido;

    this.toastNovoPedidoVisivel =
      true;

    if (this.timeoutToast) {

      clearTimeout(
        this.timeoutToast
      );
    }

    this.timeoutToast =
      setTimeout(
        () => {

          this.fecharToastNovoPedido();

        },
        10000
      );

    this.cdr.detectChanges();
  }

  fecharToastNovoPedido():
    void {

    this.toastNovoPedidoVisivel =
      false;

    if (this.timeoutToast) {

      clearTimeout(
        this.timeoutToast
      );

      this.timeoutToast =
        null;
    }

    this.cdr.detectChanges();
  }

  abrirNovoPedido(): void {

    if (!this.toastNovoPedido) {
      return;
    }

    const pedidoId =
      this.toastNovoPedido.id;

    this.fecharToastNovoPedido();

    this.router.navigate(
      ['/admin/pedidos'],
      {
        queryParams: {
          pedidoId:
            pedidoId
        }
      }
    );
  }

  private escutarErrosImpressao():
    void {

    this.impressaoPedidoService
      .pedidosComErro$
      .pipe(
        takeUntil(
          this.destroy$
        )
      )
      .subscribe({

        next: (pedidos) => {

          this.ngZone.run(
            () => {

              this.pedidosComErro =
                [...pedidos];

              console.log(
                '🚨 Pedidos com erro de impressão:',
                this.pedidosComErro
              );

              this.cdr.detectChanges();
            }
          );
        }
      });
  }

  async tentarNovamente(
    erro: PedidoComErroImpressao
  ): Promise<void> {

    await this
      .impressaoPedidoService
      .reimprimir(
        erro.pedido
      );
  }

  verPedido(
    erro: PedidoComErroImpressao
  ): void {

    this.router.navigate(
      ['/admin/pedidos'],
      {
        queryParams: {
          pedidoId:
            erro.pedido.id
        }
      }
    );
  }

  removerAviso(
    erro: PedidoComErroImpressao
  ): void {

    this.impressaoPedidoService
      .removerPedidoComErro(
        erro.pedido.id
      );
  }

  formatarMoeda(
    valor: number
  ): string {

    return new Intl.NumberFormat(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL'
      }
    ).format(
      valor ?? 0
    );
  }

  getTipoEntrega(
    pedido: any
  ): string {

    return pedido?.tipoEntrega ===
      'Delivery'
      ? 'Entrega'
      : 'Retirada';
  }

  sair(): void {

    if (this.saindo) {
      return;
    }

    this.saindo = true;

    this.authService
      .logout()
      .subscribe({

        next: async () => {

          await this
            .finalizarSessao();
        },

        error: async (erro) => {

          console.warn(
            'Não foi possível registrar o logout no backend.',
            erro
          );

          await this
            .finalizarSessao();
        }
      });
  }

  private async finalizarSessao():
    Promise<void> {

    try {

      await this
        .notificacaoSignalrService
        .pararConexao();

    } catch (erro) {

      console.warn(
        'Erro ao encerrar SignalR.',
        erro
      );
    }

    this.authService
      .limparSessao();

    this.saindo = false;

    await this.router.navigate(
      ['/admin/login']
    );
  }
}
