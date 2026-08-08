import { Injectable } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from '@microsoft/signalr';
import {
  Observable,
  Subject
} from 'rxjs';

export interface PedidoCriadoSignalR {
  pedidoId: string;
  criadoEm: string;
}

export interface PedidoAtualizadoSignalR {
  pedidoId: string;
  status: string;
  atualizadoEm: string;
}

export interface DashboardAtualizadoSignalR {
  motivo: string;
  pedidoId?: string;
  status?: string;
  atualizadoEm: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacaoSignalrService {

  private readonly hubUrl =
    'https://localhost:57668/hubs/notificacoes';

  private hubConnection: HubConnection;

  private readonly eventos =
    new Map<string, Subject<unknown>>();

  readonly pedidoCriado$ =
    this.ouvir<PedidoCriadoSignalR>('PedidoCriado');

  readonly pedidoAtualizado$ =
    this.ouvir<PedidoAtualizadoSignalR>('PedidoAtualizado');

  readonly dashboardAtualizado$ =
    this.ouvir<DashboardAtualizadoSignalR>(
      'DashboardAtualizado'
    );

  constructor() {
    this.hubConnection =
      new HubConnectionBuilder()
        .withUrl(this.hubUrl)
        .withAutomaticReconnect([
          0,
          2000,
          5000,
          10000
        ])
        .configureLogging(LogLevel.Information)
        .build();

    this.registrarEventosDoBackend();
    this.registrarEventosDaConexao();
  }

  async iniciarConexao(): Promise<void> {
    if (
      this.hubConnection.state ===
      HubConnectionState.Connected
    ) {
      return;
    }

    if (
      this.hubConnection.state ===
      HubConnectionState.Connecting
    ) {
      return;
    }

    if (
      this.hubConnection.state ===
      HubConnectionState.Reconnecting
    ) {
      return;
    }

    try {
      await this.hubConnection.start();

      console.log(
        'SignalR conectado com sucesso.',
        this.hubConnection.connectionId
      );
    } catch (erro) {
      console.error(
        'Erro ao conectar ao SignalR:',
        erro
      );

      setTimeout(() => {
        void this.iniciarConexao();
      }, 5000);
    }
  }

  async pararConexao(): Promise<void> {
    if (
      this.hubConnection.state ===
      HubConnectionState.Disconnected
    ) {
      return;
    }

    try {
      await this.hubConnection.stop();

      console.log(
        'Conexão SignalR encerrada.'
      );
    } catch (erro) {
      console.error(
        'Erro ao encerrar o SignalR:',
        erro
      );
    }
  }

  ouvir<T>(nomeEvento: string): Observable<T> {
    let eventoSubject =
      this.eventos.get(nomeEvento);

    if (!eventoSubject) {
      eventoSubject = new Subject<unknown>();

      this.eventos.set(
        nomeEvento,
        eventoSubject
      );
    }

    return eventoSubject.asObservable() as Observable<T>;
  }

  estaConectado(): boolean {
    return (
      this.hubConnection.state ===
      HubConnectionState.Connected
    );
  }

  getEstadoConexao(): HubConnectionState {
    return this.hubConnection.state;
  }

  private registrarEventosDoBackend(): void {
    this.registrarEvento<PedidoCriadoSignalR>(
      'PedidoCriado'
    );

    this.registrarEvento<PedidoAtualizadoSignalR>(
      'PedidoAtualizado'
    );

    this.registrarEvento<DashboardAtualizadoSignalR>(
      'DashboardAtualizado'
    );
  }

  private registrarEvento<T>(
    nomeEvento: string
  ): void {
    this.hubConnection.off(nomeEvento);

    this.hubConnection.on(
      nomeEvento,
      (dados: T) => {
        console.log(
          `Evento SignalR recebido: ${nomeEvento}`,
          dados
        );

        const eventoSubject =
          this.eventos.get(nomeEvento);

        eventoSubject?.next(dados);
      }
    );
  }

  private registrarEventosDaConexao(): void {
    this.hubConnection.onreconnecting(
      erro => {
        console.warn(
          'SignalR tentando reconectar...',
          erro
        );
      }
    );

    this.hubConnection.onreconnected(
      connectionId => {
        console.log(
          'SignalR reconectado com sucesso.',
          connectionId
        );
      }
    );

    this.hubConnection.onclose(
      erro => {
        if (erro) {
          console.error(
            'Conexão SignalR encerrada com erro.',
            erro
          );
        } else {
          console.log(
            'Conexão SignalR encerrada.'
          );
        }
      }
    );
  }
}
