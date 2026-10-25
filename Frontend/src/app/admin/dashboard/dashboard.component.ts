import { Component, OnDestroy, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription, debounceTime, forkJoin, merge } from 'rxjs';

import { PedidoService } from '../../core/services/pedido.service';
import { AvisoService } from '../../core/services/aviso.service';
import { NotificacaoSignalrService } from '../../core/services/notificacao-signalr.service';
import { DinheiroPipe } from '../../shared/pipes/dinheiro.pipe';
import { WhatsappService } from '../../core/services/whatsapp.service';

// Status do backend (StatusPedido)
const STATUS_EM_PREPARO = 1;
const STATUS_SAIU_PARA_ENTREGA = 2;
const STATUS_ENTREGUE = 3;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DinheiroPipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class Dashboard implements OnInit, OnDestroy {

  // Popup padrão de avisos (substitui alert/confirm)
  private aviso = inject(AvisoService);

  private signalR = inject(NotificacaoSignalrService);

  // Mensagens de WhatsApp para o cliente (abre o WhatsApp pronto)
  private whatsappService = inject(WhatsappService);

  // Cards do topo (contagens certas, vindas do /api/pedidos/dashboard)
  pedidosHoje = 0;
  totalPendentes = 0;
  totalEmPreparo = 0;

  // Blocos (mais antigos primeiro: são os que precisam de atenção)
  pedidosEmPreparo: any[] = [];
  pedidosRetirada: any[] = [];
  pedidosEntrega: any[] = [];

  loading = false;

  // "Atualizado às 14:32:10"
  ultimaAtualizacao: Date | null = null;

  // Pedido cujo status está sendo alterado (desativa o botão)
  atualizandoId: string | null = null;

  private assinaturas = new Subscription();

  // Segurança: recarrega a cada 1 minuto caso algum aviso se perca
  private intervalo: ReturnType<typeof setInterval> | null = null;

  constructor(
    private pedidoService: PedidoService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.carregarPedidos();

    this.escutarTempoReal();

    this.intervalo = setInterval(
      () => this.carregarPedidos(),
      60000
    );
  }

  ngOnDestroy(): void {
    this.assinaturas.unsubscribe();

    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
  }

  // Pedido novo ou status alterado (em qualquer tela): recarrega na hora.
  // O debounce junta vários avisos seguidos numa única recarga.
  private escutarTempoReal(): void {
    void this.signalR.iniciarConexao();

    this.assinaturas.add(
      merge(
        this.signalR.pedidoCriado$,
        this.signalR.pedidoAtualizado$,
        this.signalR.dashboardAtualizado$
      )
        .pipe(debounceTime(500))
        .subscribe(() => this.carregarPedidos())
    );
  }

  carregarPedidos(): void {
    this.loading = true;

    forkJoin({
      resumo: this.pedidoService.getDashboard(),
      emPreparo: this.pedidoService.getPedidosPorStatus(STATUS_EM_PREPARO),
      saiu: this.pedidoService.getPedidosPorStatus(STATUS_SAIU_PARA_ENTREGA)
    }).subscribe({
      next: ({ resumo, emPreparo, saiu }) => {
        this.pedidosHoje = resumo.quantidadePedidosHoje ?? 0;
        this.totalPendentes = resumo.pendentes ?? 0;
        this.totalEmPreparo = resumo.emPreparo ?? 0;

        this.pedidosEmPreparo = this.maisAntigosPrimeiro(emPreparo);

        const prontosOuEmRota = this.maisAntigosPrimeiro(saiu);

        this.pedidosRetirada = prontosOuEmRota.filter(
          p => p.tipoEntrega === 'Retirada'
        );

        this.pedidosEntrega = prontosOuEmRota.filter(
          p => p.tipoEntrega === 'Delivery'
        );

        this.ultimaAtualizacao = new Date();
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

  private maisAntigosPrimeiro(resposta: any): any[] {
    const lista: any[] = resposta?.data ?? resposta ?? [];

    return [...lista].sort(
      (a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime()
    );
  }

  // =====================================================
  // AÇÕES DOS BOTÕES
  // =====================================================

  // Em preparo -> Saiu para entrega (delivery) / Pronto para retirada
  marcarPronto(pedido: any): void {
    this.alterarStatus(pedido, STATUS_SAIU_PARA_ENTREGA);
  }

  // Saiu para entrega / Pronto para retirada -> Entregue
  marcarEntregue(pedido: any): void {
    this.alterarStatus(pedido, STATUS_ENTREGUE);
  }

  private alterarStatus(pedido: any, status: number): void {
    if (this.atualizandoId) {
      return;
    }

    this.atualizandoId = pedido.id;

    // Abre a aba do WhatsApp já no clique; a mensagem entra depois
    const janelaWhatsapp = this.whatsappService.abrirJanelaParaStatus(status);

    this.pedidoService.atualizarStatus(pedido.id, status).subscribe({
      next: async () => {
        // Saiu para entrega / pronto: WhatsApp pronto para o cliente
        await this.whatsappService.enviarPendentes(pedido.id, janelaWhatsapp);

        this.atualizandoId = null;
        this.carregarPedidos();
      },
      error: (err: any) => {
        janelaWhatsapp?.close();
        console.error(err);
        this.atualizandoId = null;
        this.aviso.erro('Erro ao atualizar o status do pedido.');
        this.cdr.detectChanges();
      }
    });
  }

  // "📲 Avisar cliente": mensagens que nasceram sozinhas
  // (pedido recebido, em preparo depois da impressão)
  async avisarCliente(pedido: any): Promise<void> {
    const janela = this.whatsappService.abrirJanela();

    await this.whatsappService.enviarPendentes(pedido.id, janela);

    this.carregarPedidos();
  }

  // =====================================================
  // TEXTOS
  // =====================================================

  formatarHora(dataHora: string | Date | null): string {
    if (!dataHora) {
      return '';
    }

    return new Date(dataHora).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get horaAtualizacao(): string {
    return this.ultimaAtualizacao
      ? this.ultimaAtualizacao.toLocaleTimeString('pt-BR')
      : '';
  }
}
