import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  firstValueFrom
} from 'rxjs';

import { PedidoService } from './pedido.service';

export type StatusImpressao =
  | 'Aguardando'
  | 'Imprimindo'
  | 'Impresso'
  | 'Erro';

export interface ItemFilaImpressao {
  pedido: any;
  status: StatusImpressao;
  adicionadoEm: Date;
  tentativas: number;
}

export interface PedidoComErroImpressao {
  pedido: any;
  tentativas: number;
  dataErro: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ImpressaoPedidoService {

  private readonly MAX_TENTATIVAS = 3;

  private fila: ItemFilaImpressao[] = [];

  private processando = false;

  private recuperandoPendentes = false;

  private simularErroImpressao = false;

  private pedidosConhecidos =
    new Set<string>();

  private pedidosComErro:
    PedidoComErroImpressao[] = [];

  private readonly filaSubject =
    new BehaviorSubject<ItemFilaImpressao[]>([]);

  readonly fila$ =
    this.filaSubject.asObservable();

  private readonly pedidosComErroSubject =
    new BehaviorSubject<PedidoComErroImpressao[]>([]);

  readonly pedidosComErro$ =
    this.pedidosComErroSubject.asObservable();

  constructor(
    private pedidoService: PedidoService
  ) { }

  async adicionarNaFila(
    pedido: any
  ): Promise<void> {

    if (!pedido?.id) {
      console.warn(
        'Pedido inválido recebido para impressão.',
        pedido
      );

      return;
    }

    if (
      this.pedidosConhecidos.has(pedido.id)
    ) {
      console.log(
        `Pedido #${pedido.codigo} já está na fila.`
      );

      return;
    }

    try {

      await firstValueFrom(
        this.pedidoService.colocarNaFila(
          pedido.id
        )
      );

      this.adicionarPedidoNaFilaLocal(
        pedido
      );

    } catch (erro) {

      console.error(
        `Erro ao colocar o pedido #${pedido.codigo} na fila.`,
        erro
      );

    }
  }

  private async adicionarPedidoRecuperado(
    pedido: any
  ): Promise<void> {

    if (!pedido?.id) {
      return;
    }

    if (
      this.pedidosConhecidos.has(pedido.id)
    ) {
      return;
    }

    try {

      await firstValueFrom(
        this.pedidoService.colocarNaFila(
          pedido.id
        )
      );

      this.adicionarPedidoNaFilaLocal(
        pedido
      );

    } catch (erro) {

      console.error(
        `Erro ao recuperar o pedido #${pedido.codigo} para a fila.`,
        erro
      );

    }
  }

  private adicionarPedidoNaFilaLocal(
    pedido: any
  ): void {

    this.pedidosConhecidos.add(
      pedido.id
    );

    this.fila.push({
      pedido,
      status: 'Aguardando',
      adicionadoEm: new Date(),
      tentativas: 0
    });

    console.log(
      `📥 Pedido #${pedido.codigo} entrou na fila de impressão.`
    );

    this.emitirFila();

    void this.processarFila();
  }

  async recuperarPedidosPendentes():
    Promise<void> {

    if (this.recuperandoPendentes) {
      return;
    }

    this.recuperandoPendentes = true;

    try {

      console.log(
        '🔎 Procurando pedidos pendentes de impressão...'
      );

      const ids =
        await firstValueFrom(
          this.pedidoService
            .getPendentesImpressao()
        );

      if (
        !ids ||
        ids.length === 0
      ) {

        console.log(
          '✅ Nenhum pedido pendente de impressão.'
        );

        return;
      }

      console.log(
        `🧾 ${ids.length} pedido(s) pendente(s) encontrado(s).`
      );

      for (const pedidoId of ids) {

        if (
          this.pedidosConhecidos.has(
            pedidoId
          )
        ) {
          continue;
        }

        try {

          const pedido =
            await firstValueFrom(
              this.pedidoService
                .getPedidoPorId(
                  pedidoId
                )
            );

          await this.adicionarPedidoRecuperado(
            pedido
          );

        } catch (erro) {

          console.error(
            `Erro ao recuperar o pedido ${pedidoId}.`,
            erro
          );

        }
      }

    } catch (erro) {

      console.error(
        'Erro ao consultar pedidos pendentes de impressão.',
        erro
      );

    } finally {

      this.recuperandoPendentes = false;

    }
  }

  private async processarFila():
    Promise<void> {

    if (this.processando) {
      return;
    }

    this.processando = true;

    try {

      while (
        this.fila.length > 0
      ) {

        const item =
          this.fila[0];

        const impresso =
          await this.processarPedido(
            item
          );

        if (impresso) {

          item.status =
            'Impresso';

          console.log(
            `✅ Pedido #${item.pedido.codigo} impresso com sucesso na tentativa ${item.tentativas}/${this.MAX_TENTATIVAS}.`
          );

          this.emitirFila();

          await this.aguardar(
            500
          );

        } else {

          item.status =
            'Erro';

          console.error(
            `🚨 Pedido #${item.pedido.codigo} não pôde ser impresso após ${this.MAX_TENTATIVAS} tentativas. Impressão manual necessária.`
          );

          try {

            await firstValueFrom(
              this.pedidoService
                .erroImpressao(
                  item.pedido.id
                )
            );

          } catch (erroBackend) {

            console.error(
              `Não foi possível registrar o erro de impressão do pedido #${item.pedido.codigo} no backend.`,
              erroBackend
            );

          }

          this.adicionarPedidoComErro(
            item
          );

          this.emitirFila();
        }

        this.fila.shift();

        this.emitirFila();
      }

    } finally {

      this.processando =
        false;

    }
  }

  private async processarPedido(
    item: ItemFilaImpressao
  ): Promise<boolean> {

    while (
      item.tentativas <
      this.MAX_TENTATIVAS
    ) {

      item.tentativas++;

      item.status =
        'Imprimindo';

      this.emitirFila();

      console.log(
        `🖨️ Tentativa ${item.tentativas}/${this.MAX_TENTATIVAS} - Pedido #${item.pedido.codigo}`
      );

      try {

        if (
          item.tentativas > 1
        ) {

          await firstValueFrom(
            this.pedidoService
              .colocarNaFila(
                item.pedido.id
              )
          );
        }

        await firstValueFrom(
          this.pedidoService
            .iniciarImpressao(
              item.pedido.id
            )
        );

        await this.imprimirPedido(
          item.pedido
        );

        await firstValueFrom(
          this.pedidoService
            .concluirImpressao(
              item.pedido.id
            )
        );

        return true;

      } catch (erro) {

        console.error(
          `❌ Tentativa ${item.tentativas}/${this.MAX_TENTATIVAS} falhou para o pedido #${item.pedido.codigo}.`,
          erro
        );

        if (
          item.tentativas <
          this.MAX_TENTATIVAS
        ) {

          item.status =
            'Aguardando';

          this.emitirFila();

          const tempoEspera =
            item.tentativas === 1
              ? 3000
              : 5000;

          console.warn(
            `⏳ Nova tentativa do pedido #${item.pedido.codigo} em ${tempoEspera / 1000} segundos.`
          );

          await this.aguardar(
            tempoEspera
          );
        }
      }
    }

    return false;
  }

  private async imprimirPedido(
    pedido: any
  ): Promise<void> {

    console.log(
      `🖨️ Iniciando impressão do pedido #${pedido.codigo}...`
    );

    console.log(
      'Pedido enviado para impressão:',
      {
        id:
          pedido.id,

        codigo:
          pedido.codigo,

        cliente:
          pedido.nomeCliente,

        total:
          pedido.total,

        itens:
          pedido.itens
      }
    );

    await this.aguardar(
      2000
    );

    if (
      this.simularErroImpressao
    ) {

      throw new Error(
        `Falha simulada na impressão do pedido #${pedido.codigo}`
      );
    }

    console.log(
      `🧾 Impressão simulada concluída: #${pedido.codigo}`
    );
  }

  private adicionarPedidoComErro(
    item: ItemFilaImpressao
  ): void {

    const existe =
      this.pedidosComErro.some(
        x =>
          x.pedido.id ===
          item.pedido.id
      );

    if (existe) {
      return;
    }

    this.pedidosComErro.push({
      pedido:
        item.pedido,

      tentativas:
        item.tentativas,

      dataErro:
        new Date()
    });

    this.emitirPedidosComErro();
  }

  async reimprimir(
    pedido: any
  ): Promise<void> {

    if (!pedido?.id) {
      return;
    }

    this.pedidosConhecidos.delete(
      pedido.id
    );

    this.removerPedidoComErro(
      pedido.id
    );

    await firstValueFrom(
      this.pedidoService.reimprimir(
        pedido.id
      )
    );

    await this.adicionarNaFila(
      pedido
    );
  }

  removerPedidoComErro(
    pedidoId: string
  ): void {

    this.pedidosComErro =
      this.pedidosComErro.filter(
        item =>
          item.pedido.id !==
          pedidoId
      );

    this.emitirPedidosComErro();
  }

  private emitirFila(): void {

    this.filaSubject.next(
      this.fila.map(
        item => ({
          ...item
        })
      )
    );
  }

  private emitirPedidosComErro():
    void {

    this.pedidosComErroSubject.next(
      this.pedidosComErro.map(
        item => ({
          ...item
        })
      )
    );
  }

  private aguardar(
    milissegundos: number
  ): Promise<void> {

    return new Promise(
      resolve =>
        setTimeout(
          resolve,
          milissegundos
        )
    );
  }
}
