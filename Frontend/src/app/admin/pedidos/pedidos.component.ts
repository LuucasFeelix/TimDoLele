import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ActivatedRoute,
  RouterModule
} from '@angular/router';

import {
  Subject,
  forkJoin,
  takeUntil
} from 'rxjs';

import {
  PedidoService
} from '../../core/services/pedido.service';

import {
  ImpressaoPedidoService
} from '../../core/services/impressao-pedido.service';

import {
  DashboardAtualizadoSignalR,
  NotificacaoSignalrService,
  PedidoAtualizadoSignalR,
  PedidoCriadoSignalR
} from '../../core/services/notificacao-signalr.service';
import { AvisoService } from '../../core/services/aviso.service';
import { ComandaImpressaoService } from '../../core/services/comanda-impressao.service';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { DinheiroPipe } from '../../shared/pipes/dinheiro.pipe';


@Component({
  selector: 'app-pedidos',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DinheiroPipe
  ],

  templateUrl:
    './pedidos.component.html',

  styleUrls: [
    './pedidos.component.css'
  ]
})
export class PedidosComponent
  implements OnInit, OnDestroy {

  // Popup padrão de avisos (substitui alert/confirm)
  private aviso = inject(AvisoService);

  // Monta e imprime a comanda (cupom térmico)
  private comandaImpressaoService = inject(ComandaImpressaoService);

  // Mensagens de WhatsApp para o cliente (abre o WhatsApp pronto)
  private whatsappService = inject(WhatsappService);

  pedidos: any[] = [];

  pedidosFiltrados: any[] = [];

  loading = false;

  filtroAtual = 'Todos';

  // Dia escolhido (formato 2026-10-19). Abre sempre em hoje.
  dataSelecionada = this.formatarDataIso(new Date());

  // Busca por código, nome ou telefone
  busca = '';

  private timeoutBusca:
    ReturnType<typeof setTimeout> | null = null;

  // Paginação (20 por página)
  readonly porPagina = 20;

  pagina = 1;

  totalPaginas = 1;

  totalPedidos = 0;

  // Quantidade de cada aba no dia (vem do backend)
  resumo = {
    todos: 0,
    pendentes: 0,
    emPreparo: 0,
    entrega: 0,
    retirada: 0,
    entregues: 0,
    cancelados: 0
  };

  pedidoSelecionado: any = null;

  pedidoNovoId: string | null = null;

  pedidoIdDaUrl: string | null = null;

  toastNovoPedidoVisivel = false;

  toastNovoPedido: any = null;

  conexaoSignalRAtiva = false;


  private readonly destroy$ =
    new Subject<void>();


  private audioNovoPedido:
    HTMLAudioElement | null = null;


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
    private pedidoService:
      PedidoService,

    private notificacaoSignalrService:
      NotificacaoSignalrService,

    private impressaoPedidoService:
      ImpressaoPedidoService,

    private route:
      ActivatedRoute,

    private cdr:
      ChangeDetectorRef
  ) {
    this.prepararAudio();
  }


  ngOnInit(): void {

    this.lerPedidoDaUrl();

    this.carregarPedidos();

    this.escutarEventosSignalR();

    void this.iniciarSignalR();
  }


  ngOnDestroy(): void {

    this.destroy$.next();

    this.destroy$.complete();


    if (this.timeoutDestaque) {

      clearTimeout(
        this.timeoutDestaque
      );
    }


    if (this.timeoutToast) {

      clearTimeout(
        this.timeoutToast
      );
    }
  }


  // =========================================
  // QUERY PARAM - PEDIDO VINDO DA URL
  // =========================================

  private lerPedidoDaUrl(): void {

    this.route
      .queryParamMap
      .pipe(
        takeUntil(
          this.destroy$
        )
      )
      .subscribe(
        params => {

          const pedidoId =
            params.get(
              'pedidoId'
            );


          if (!pedidoId) {

            this.pedidoIdDaUrl =
              null;

            return;
          }


          this.pedidoIdDaUrl =
            pedidoId;


          if (
            this.pedidos.length > 0
          ) {

            this.abrirPedidoPorId(
              pedidoId
            );
          }
        }
      );
  }


  private abrirPedidoPorId(
    pedidoId: string
  ): void {

    this.pedidosFiltrados =
      this.pedidos;


    const pedidoNaLista =
      this.pedidos.find(
        (pedido: any) =>
          pedido.id ===
          pedidoId
      );


    if (pedidoNaLista) {

      this.pedidoSelecionado =
        pedidoNaLista;

      this.pedidoIdDaUrl =
        pedidoId;

      this.cdr.detectChanges();


      this.rolarAtePedido(
        pedidoId
      );


      this.rolarDetalhesParaTopo();

      return;
    }


    this.pedidoService
      .getPedidoPorId(
        pedidoId
      )
      .subscribe({

        next: (res: any) => {

          const pedido =
            res?.data ?? res;


          if (!pedido) {
            return;
          }


          const jaExiste =
            this.pedidos.some(
              (item: any) =>
                item.id ===
                pedido.id
            );


          if (!jaExiste) {

            this.pedidos = [
              pedido,
              ...this.pedidos
            ];
          }


          this.pedidosFiltrados =
            this.pedidos;


          this.pedidoSelecionado =
            pedido;


          this.pedidoIdDaUrl =
            pedido.id;


          this.cdr.detectChanges();


          this.rolarAtePedido(
            pedido.id
          );


          this.rolarDetalhesParaTopo();
        },


        error: (erro: any) => {

          console.error(
            'Erro ao localizar pedido da URL:',
            erro
          );
        }
      });
  }


  private rolarAtePedido(
    pedidoId: string
  ): void {

    setTimeout(
      () => {

        const linhaPedido =
          document.querySelector(
            `[data-pedido-id="${pedidoId}"]`
          );


        linhaPedido
          ?.scrollIntoView({
            behavior:
              'smooth',

            block:
              'center'
          });

      },
      150
    );
  }


  private rolarDetalhesParaTopo():
    void {

    setTimeout(
      () => {

        const painel =
          document.querySelector(
            '.order-details'
          );


        painel?.scrollTo({
          top: 0,
          behavior: 'smooth'
        });

      },
      150
    );
  }


  // =========================================
  // SIGNALR
  // =========================================

  private async iniciarSignalR():
    Promise<void> {

    await this
      .notificacaoSignalrService
      .iniciarConexao();


    this.conexaoSignalRAtiva =
      this
        .notificacaoSignalrService
        .estaConectado();


    this.cdr.detectChanges();
  }


  private escutarEventosSignalR():
    void {

    this
      .notificacaoSignalrService
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

          this.aoReceberNovoPedido(
            notificacao
          );
        }
      });


    this
      .notificacaoSignalrService
      .pedidoAtualizado$
      .pipe(
        takeUntil(
          this.destroy$
        )
      )
      .subscribe({

        next: (
          notificacao:
            PedidoAtualizadoSignalR
        ) => {

          this
            .aoReceberPedidoAtualizado(
              notificacao
            );
        }
      });


    this
      .notificacaoSignalrService
      .dashboardAtualizado$
      .pipe(
        takeUntil(
          this.destroy$
        )
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
  notificacao:
    PedidoCriadoSignalR
): void {

  console.log(
    'Novo pedido recebido em tempo real na tela de pedidos:',
    notificacao
  );

  this.destacarNovoPedido(
    notificacao.pedidoId
  );

  const pedidoSelecionadoId =
    this.pedidoSelecionado?.id;

  this.carregarPedidos(
    pedidoSelecionadoId
  );
}


  private aoReceberPedidoAtualizado(
    notificacao:
      PedidoAtualizadoSignalR
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


  // =========================================
  // DESTAQUE DE NOVO PEDIDO
  // =========================================

  private destacarNovoPedido(
    pedidoId: string
  ): void {

    this.pedidoNovoId =
      pedidoId;


    if (this.timeoutDestaque) {

      clearTimeout(
        this.timeoutDestaque
      );
    }


    this.timeoutDestaque =
      setTimeout(
        () => {

          this.pedidoNovoId =
            null;


          this.cdr.detectChanges();

        },
        10000
      );
  }


  // =========================================
  // TOAST DE NOVO PEDIDO
  // =========================================

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


    const pedido =
      this.pedidos.find(
        (item: any) =>
          item.id ===
          pedidoId
      );


    if (pedido) {

      this.pedidoSelecionado =
        pedido;

    } else {

      // Está vendo outro dia/aba/página: volta para hoje, "Todos",
      // e abre o pedido novo quando a lista carregar
      this.dataSelecionada =
        this.formatarDataIso(new Date());

      this.filtroAtual =
        'Todos';

      this.busca =
        '';

      this.pagina =
        1;

      this.carregarPedidos(
        pedidoId
      );
    }


    this.fecharToastNovoPedido();


    this.rolarAtePedido(
      pedidoId
    );


    this.rolarDetalhesParaTopo();
  }


  // =========================================
  // SOM
  // =========================================

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
        (erro) => {

          console.warn(
            'O navegador bloqueou o som da notificação. Clique na página pelo menos uma vez.',
            erro
          );
        }
      );
  }


  // =========================================
  // CARREGAMENTO DOS PEDIDOS
  // =========================================

  carregarPedidos(
    pedidoIdParaManter?: string,
    novoPedidoId?: string
  ): void {

    this.loading =
      true;


    forkJoin({

      lista:
        this.pedidoService
          .listarPedidosDia({
            data: this.dataSelecionada,
            filtro: this.filtroAtual,
            busca: this.busca,
            page: this.pagina,
            pageSize: this.porPagina
          }),

      resumo:
        this.pedidoService
          .getResumoDia(
            this.dataSelecionada,
            this.busca
          )
    })
      .subscribe({

        next: ({ lista, resumo }: any) => {

          this.pedidos =
            lista?.data ?? [];

          this.totalPedidos =
            lista?.total ?? 0;

          this.totalPaginas =
            Math.max(
              lista?.totalPages ?? 1,
              1
            );

          this.resumo = {
            ...this.resumo,
            ...resumo
          };

          // O backend já devolve filtrado pela aba escolhida
          this.pedidosFiltrados =
            this.pedidos;


          if (
            pedidoIdParaManter
          ) {

            const pedidoAtualizado =
              this.pedidos.find(
                (pedido: any) =>
                  pedido.id ===
                  pedidoIdParaManter
              );


            if (
              pedidoAtualizado
            ) {

              this.pedidoSelecionado =
                pedidoAtualizado;
            }
          }


          if (
            novoPedidoId
          ) {

            const novoPedido =
              this.pedidos.find(
                (pedido: any) =>
                  pedido.id ===
                  novoPedidoId
              );


            if (
              novoPedido
            ) {

              this.exibirToastNovoPedido(
                novoPedido
              );
            }
          }


          this.loading =
            false;


          this.cdr.detectChanges();


          if (
            this.pedidoIdDaUrl
          ) {

            this.abrirPedidoPorId(
              this.pedidoIdDaUrl
            );
          }
        },


        error: (erro: any) => {

          console.error(
            'Erro ao carregar pedidos:',
            erro
          );


          this.loading =
            false;


          this.cdr.detectChanges();
        }
      });
  }


  // =========================================
  // FILTROS
  // =========================================

  aplicarFiltro(
    filtro: string
  ): void {

    this.filtroAtual =
      filtro;

    this.pagina =
      1;

    this.carregarPedidos(
      this.pedidoSelecionado?.id
    );
  }


  // =========================================
  // DIA, BUSCA E PAGINAÇÃO
  // =========================================

  selecionarDia(
    data: string
  ): void {

    if (!data) {
      return;
    }

    this.dataSelecionada =
      data;

    this.pagina =
      1;

    this.pedidoSelecionado =
      null;

    this.carregarPedidos();
  }

  irParaHoje(): void {

    this.selecionarDia(
      this.formatarDataIso(new Date())
    );
  }

  irParaOntem(): void {

    const ontem =
      new Date();

    ontem.setDate(
      ontem.getDate() - 1
    );

    this.selecionarDia(
      this.formatarDataIso(ontem)
    );
  }

  get ehHoje(): boolean {

    return (
      this.dataSelecionada ===
      this.formatarDataIso(new Date())
    );
  }

  get ehOntem(): boolean {

    const ontem =
      new Date();

    ontem.setDate(
      ontem.getDate() - 1
    );

    return (
      this.dataSelecionada ===
      this.formatarDataIso(ontem)
    );
  }

  // Espera parar de digitar (0,4 s) para buscar
  aoBuscar(): void {

    if (this.timeoutBusca) {

      clearTimeout(
        this.timeoutBusca
      );
    }

    this.timeoutBusca =
      setTimeout(
        () => {

          this.pagina =
            1;

          this.carregarPedidos(
            this.pedidoSelecionado?.id
          );
        },
        400
      );
  }

  limparBusca(): void {

    this.busca =
      '';

    this.aoBuscar();
  }

  irParaPagina(
    pagina: number
  ): void {

    const destino =
      Math.min(
        Math.max(pagina, 1),
        this.totalPaginas
      );

    if (destino === this.pagina) {
      return;
    }

    this.pagina =
      destino;

    this.carregarPedidos(
      this.pedidoSelecionado?.id
    );
  }

  // Date -> "2026-10-19" (no fuso do computador da loja)
  private formatarDataIso(
    data: Date
  ): string {

    const mes =
      String(data.getMonth() + 1).padStart(2, '0');

    const dia =
      String(data.getDate()).padStart(2, '0');

    return `${data.getFullYear()}-${mes}-${dia}`;
  }

  // "2026-10-19" -> "19/10/2026"
  get dataSelecionadaTexto(): string {

    const [ano, mes, dia] =
      this.dataSelecionada.split('-');

    return `${dia}/${mes}/${ano}`;
  }


  // =========================================
  // SELECIONAR PEDIDO
  // =========================================

  selecionarPedido(
    pedido: any
  ): void {

    this.pedidoSelecionado =
      pedido;


    this.rolarDetalhesParaTopo();
  }


  // =========================================
  // IMPRESSÃO
  // =========================================

  temErroImpressao(
    pedido: any
  ): boolean {

    if (!pedido) {
      return false;
    }


    const status =
      String(
        pedido.statusImpressao ?? ''
      )
        .trim()
        .toLowerCase();


    return status === 'erro';
  }


  getStatusImpressaoTexto(
    pedido: any
  ): string {

    if (!pedido) {
      return '';
    }


    const status =
      String(
        pedido.statusImpressao ?? ''
      ).trim();


    if (
      status ===
      'NaoImpresso'
    ) {

      return 'Não impresso';
    }


    if (
      status ===
      'NaFila'
    ) {

      return 'Na fila';
    }


    if (
      status ===
      'Imprimindo'
    ) {

      return 'Imprimindo';
    }


    if (
      status ===
      'Impresso'
    ) {

      return 'Impresso';
    }


    if (
      status ===
      'Erro'
    ) {

      return 'Erro de impressão';
    }


    return status;
  }


  tentarNovamenteImpressao(
    pedido: any
  ): void {

    if (!pedido) {
      return;
    }


    console.log(
      'Solicitando nova tentativa de impressão:',
      pedido.codigo
    );


    void this
      .impressaoPedidoService
      .reimprimir(
        pedido
      );
  }


  // Imprime a COMANDA do pedido (cupom no tamanho do papel térmico).
  // Sem impressora: escolha "Microsoft Print to PDF" para ver como fica.
  async imprimirPedido(): Promise<void> {

    if (
      !this.pedidoSelecionado
    ) {

      return;
    }


    try {

      await this
        .comandaImpressaoService
        .imprimir(
          this.pedidoSelecionado
        );

    } catch (erro) {

      console.error(
        'Erro ao imprimir a comanda:',
        erro
      );

      this.aviso.erro(
        'Não foi possível imprimir a comanda.'
      );
    }
  }


  // =========================================
  // ALTERAÇÃO DE STATUS
  // =========================================

  alterarStatus(
    pedidoId: string,
    status: number
  ): void {

    // Abre a aba do WhatsApp já no clique (o navegador só deixa
    // abrir aba nova neste momento); a mensagem entra depois
    const janelaWhatsapp =
      this.whatsappService
        .abrirJanelaParaStatus(
          status
        );

    this.pedidoService
      .atualizarStatus(
        pedidoId,
        status
      )
      .subscribe({

        next: async () => {

          // Em preparo / saiu / pronto: WhatsApp pronto para o cliente
          await this.whatsappService
            .enviarPendentes(
              pedidoId,
              janelaWhatsapp
            );

          this.carregarPedidos(
            pedidoId
          );
        },


        error: (erro: any) => {

          janelaWhatsapp?.close();

          console.error(
            'Erro ao atualizar status:',
            erro
          );


          this.aviso.erro(
            'Erro ao atualizar status'
          );
        }
      });
  }


  // "📲 Avisar cliente": envia as mensagens que nasceram sozinhas
  // (pedido recebido, em preparo depois da impressão...)
  async avisarClienteWhatsapp(
    pedido: any
  ): Promise<void> {

    const janela =
      this.whatsappService
        .abrirJanela();

    await this.whatsappService
      .enviarPendentes(
        pedido.id,
        janela
      );

    this.carregarPedidos(
      pedido.id
    );
  }


  avancarStatus(
    pedido: any
  ): void {

    const proximoStatus =
      this.getProximoStatus(
        pedido
      );


    if (
      proximoStatus === null
    ) {

      return;
    }


    this.alterarStatus(
      pedido.id,
      proximoStatus
    );
  }


  // =========================================
  // TEXTO DO STATUS
  // =========================================

  getStatusTexto(
    pedido: any
  ): string {

    if (!pedido) {
      return '';
    }


    if (
      pedido.tipoEntrega ===
        'Retirada' &&
      pedido.status ===
        'SaiuParaEntrega'
    ) {

      return 'Pronto para retirada';
    }


    if (
      pedido.tipoEntrega ===
        'Delivery' &&
      pedido.status ===
        'SaiuParaEntrega'
    ) {

      return 'Entrega';
    }


    if (
      pedido.status ===
      'Pendente'
    ) {

      return 'Pendente';
    }


    if (
      pedido.status ===
      'EmPreparo'
    ) {

      return 'Em preparo';
    }


    if (
      pedido.status ===
      'Entregue'
    ) {

      return 'Entregue';
    }


    if (
      pedido.status ===
      'Cancelado'
    ) {

      return 'Cancelado';
    }


    return pedido.status ?? '';
  }


  // =========================================
  // CLASSE DO STATUS
  // =========================================

  getStatusClasse(
    pedido: any
  ): string {

    if (!pedido) {
      return '';
    }


    if (
      pedido.status ===
      'Pendente'
    ) {

      return 'status-pendente';
    }


    if (
      pedido.status ===
      'EmPreparo'
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


    if (
      pedido.status ===
      'Entregue'
    ) {

      return 'status-entregue';
    }


    if (
      pedido.status ===
      'Cancelado'
    ) {

      return 'status-cancelado';
    }


    return '';
  }


  // =========================================
  // PRÓXIMO STATUS
  // =========================================

  getProximoTexto(
    pedido: any
  ): string {

    if (
      this.isPendente(
        pedido
      )
    ) {

      return '▶️ Iniciar preparo';
    }


    if (
      this.isEmPreparo(
        pedido
      )
    ) {

      return pedido.tipoEntrega ===
        'Retirada'

        ? '🛍️ Pronto para retirada'

        : '🛵 Saiu para entrega';
    }


    if (
      this.isSaiuParaEntrega(
        pedido
      )
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

    if (
      this.isPendente(
        pedido
      )
    ) {

      return 1;
    }


    if (
      this.isEmPreparo(
        pedido
      )
    ) {

      return 2;
    }


    if (
      this.isSaiuParaEntrega(
        pedido
      )
    ) {

      return 3;
    }


    return null;
  }


  // =========================================
  // CANCELAMENTO
  // =========================================

  podeCancelar(
    pedido: any
  ): boolean {

    const status =
      String(
        pedido?.status
      ).trim();


    return (
      status !== 'Entregue' &&
      status !== 'Cancelado'
    );
  }


  // =========================================
  // VERIFICAÇÕES DE STATUS
  // =========================================

  isPendente(
    pedido: any
  ): boolean {

    return (
      String(
        pedido?.status
      ).trim() ===
      'Pendente'
    );
  }


  isEmPreparo(
    pedido: any
  ): boolean {

    return (
      String(
        pedido?.status
      ).trim() ===
      'EmPreparo'
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


  // =========================================
  // CONTADORES
  // =========================================

  contarPendentes(): number {
    return this.resumo.pendentes;
  }


  contarEmPreparo(): number {
    return this.resumo.emPreparo;
  }


  contarEntrega(): number {
    return this.resumo.entrega;
  }


  contarRetirada(): number {
    return this.resumo.retirada;
  }


  contarCancelados(): number {
    return this.resumo.cancelados;
  }


  // Número de cada aba (todos os pedidos do dia, não só a página)
  contarFiltro(
    filtro: string
  ): number {

    const mapa: Record<string, number> = {
      Todos: this.resumo.todos,
      Pendente: this.resumo.pendentes,
      EmPreparo: this.resumo.emPreparo,
      Entrega: this.resumo.entrega,
      Retirada: this.resumo.retirada,
      Entregue: this.resumo.entregues,
      Cancelado: this.resumo.cancelados
    };

    return mapa[filtro] ?? 0;
  }


  // =========================================
  // PAGAMENTO
  // =========================================

  traduzirPagamento(
    formaPagamento: string
  ): string {

    if (!formaPagamento) {
      return '-';
    }


    const mapa:
      Record<string, string> = {

      Pix:
        'Pix',

      Dinheiro:
        'Dinheiro',

      CartaoCredito:
        'Crédito',

      CartaoDebito:
        'Débito'
    };


    return (
      mapa[formaPagamento] ??
      formaPagamento
    );
  }


  // =========================================
  // FORMATAÇÃO DE HORA
  // =========================================

  formatarHora(
    dataHora: string
  ): string {

    if (!dataHora) {
      return '';
    }


    const data =
      new Date(
        dataHora
      );


    return data
      .toLocaleTimeString(
        'pt-BR',
        {
          hour:
            '2-digit',

          minute:
            '2-digit'
        }
      );
  }


  // =========================================
  // FORMATAÇÃO DE DATA
  // =========================================

  formatarData(
    dataHora: string
  ): string {

    if (!dataHora) {
      return '';
    }


    const data =
      new Date(
        dataHora
      );


    return data
      .toLocaleDateString(
        'pt-BR'
      );
  }
}
