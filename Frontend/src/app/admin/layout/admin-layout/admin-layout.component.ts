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

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent
  implements OnInit, OnDestroy {

  pedidosComErro: PedidoComErroImpressao[] = [];

  private readonly destroy$ =
    new Subject<void>();

  constructor(
    private impressaoPedidoService:
      ImpressaoPedidoService,

    private notificacaoSignalrService:
      NotificacaoSignalrService,

    private pedidoService:
      PedidoService,

    private router:
      Router,

    private ngZone:
      NgZone,

    private cdr:
      ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {

    console.log(
      '🚀 Ambiente administrativo iniciado.'
    );

    this.escutarErrosImpressao();

    this.escutarNovosPedidos();

    await this.notificacaoSignalrService
      .iniciarConexao();

    await this.impressaoPedidoService
      .recuperarPedidosPendentes();
  }

  ngOnDestroy(): void {

    this.destroy$.next();

    this.destroy$.complete();
  }

  private escutarNovosPedidos(): void {

    this.notificacaoSignalrService
      .pedidoCriado$
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({

        next: (
          notificacao: PedidoCriadoSignalR
        ) => {

          this.ngZone.run(() => {

            console.log(
              '🖨️ Admin recebeu pedido para impressão global:',
              notificacao
            );

            this.buscarPedidoEImprimir(
              notificacao.pedidoId
            );

          });

        }

      });
  }

  private buscarPedidoEImprimir(
    pedidoId: string
  ): void {

    this.pedidoService
      .getPedidoPorId(
        pedidoId
      )
      .subscribe({

        next: async (pedido) => {

          console.log(
            `📦 Pedido #${pedido.codigo} carregado para impressão global.`
          );

          await this.impressaoPedidoService
            .adicionarNaFila(
              pedido
            );

        },

        error: (erro) => {

          console.error(
            `❌ Erro ao carregar o pedido ${pedidoId} para impressão.`,
            erro
          );

        }

      });
  }

  private escutarErrosImpressao(): void {

    this.impressaoPedidoService
      .pedidosComErro$
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({

        next: (pedidos) => {

          this.ngZone.run(() => {

            this.pedidosComErro =
              [...pedidos];

            console.log(
              '🚨 Pedidos com erro de impressão:',
              this.pedidosComErro
            );

            this.cdr.detectChanges();

          });

        }

      });
  }

  async tentarNovamente(
    erro: PedidoComErroImpressao
  ): Promise<void> {

    await this.impressaoPedidoService
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
}
