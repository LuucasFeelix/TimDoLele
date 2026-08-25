import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
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

@Injectable({
  providedIn: 'root'
})
export class ImpressaoPedidoService {

  private fila: ItemFilaImpressao[] = [];
  private processando = false;

  private pedidosConhecidos = new Set<string>();

  private readonly filaSubject =
    new BehaviorSubject<ItemFilaImpressao[]>([]);

  readonly fila$ =
    this.filaSubject.asObservable();

  constructor(
    private pedidoService: PedidoService
  ) { }


  async adicionarNaFila(pedido: any): Promise<void> {

    if (!pedido?.id) {
      console.warn('Pedido inválido.');
      return;
    }

    if (this.pedidosConhecidos.has(pedido.id)) {
      console.log(
        `Pedido #${pedido.codigo} já está na fila.`
      );
      return;
    }

    this.pedidosConhecidos.add(pedido.id);

    await firstValueFrom(
      this.pedidoService.colocarNaFila(
        pedido.id
      )
    );

    this.fila.push({
      pedido,
      status: 'Aguardando',
      adicionadoEm: new Date(),
      tentativas: 0
    });

    console.log(
      `📥 Pedido #${pedido.codigo} entrou na fila.`
    );

    this.emitirFila();

    void this.processarFila();
  }


  private async processarFila(): Promise<void> {

    if (this.processando) {
      return;
    }

    this.processando = true;

    try {

      while (this.fila.length > 0) {

        const item = this.fila[0];

        item.status = 'Imprimindo';
        item.tentativas++;

        this.emitirFila();

        try {

          await firstValueFrom(
            this.pedidoService.iniciarImpressao(
              item.pedido.id
            )
          );

          await this.imprimirPedido(
            item.pedido
          );

          await firstValueFrom(
            this.pedidoService.concluirImpressao(
              item.pedido.id
            )
          );

          item.status = 'Impresso';

          console.log(
            `✅ Pedido #${item.pedido.codigo} impresso.`
          );

          this.emitirFila();

          await this.aguardar(500);

          this.fila.shift();

          this.emitirFila();

        } catch (erro) {

          item.status = 'Erro';

          await firstValueFrom(
            this.pedidoService.erroImpressao(
              item.pedido.id
            )
          );

          console.error(
            `❌ Erro ao imprimir ${item.pedido.codigo}`,
            erro
          );

          this.emitirFila();

          this.fila.shift();

          this.emitirFila();
        }
      }

    } finally {

      this.processando = false;

    }
  }


  private async imprimirPedido(
    pedido: any
  ): Promise<void> {

    console.log(
      `🖨️ Iniciando impressão #${pedido.codigo}`
    );

    console.table({
      Código: pedido.codigo,
      Cliente: pedido.nomeCliente,
      Total: pedido.total
    });

    await this.aguardar(2000);

    console.log(
      `🧾 Impressão concluída #${pedido.codigo}`
    );
  }


  async reimprimir(pedido: any): Promise<void> {

    this.pedidosConhecidos.delete(
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


  private emitirFila(): void {

    this.filaSubject.next(
      this.fila.map(item => ({ ...item }))
    );

  }

  private aguardar(ms: number): Promise<void> {

    return new Promise(resolve =>
      setTimeout(resolve, ms)
    );

  }
}
