import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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

  readonly fila$ = this.filaSubject.asObservable();

  adicionarNaFila(pedido: any): void {
    if (!pedido?.id) {
      console.warn('Pedido inválido recebido para impressão.', pedido);
      return;
    }

    if (this.pedidosConhecidos.has(pedido.id)) {
      console.log(`🖨️ Pedido #${pedido.codigo} já está ou já esteve na fila.`);
      return;
    }

    this.pedidosConhecidos.add(pedido.id);

    this.fila.push({
      pedido,
      status: 'Aguardando',
      adicionadoEm: new Date(),
      tentativas: 0
    });

    console.log(`📥 Pedido #${pedido.codigo} entrou na fila de impressão.`);
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
          await this.imprimirPedido(item.pedido);

          item.status = 'Impresso';
          console.log(`✅ Pedido #${item.pedido.codigo} finalizado na fila.`);
          this.emitirFila();

          await this.aguardar(300);

          this.fila.shift();
          this.emitirFila();
        } catch (erro) {
          item.status = 'Erro';
          console.error(
            `❌ Erro ao imprimir o pedido #${item.pedido.codigo}.`,
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

  private async imprimirPedido(pedido: any): Promise<void> {
    console.log(`🖨️ Iniciando impressão do pedido #${pedido.codigo}...`);

    console.log('Pedido enviado para impressão:', {
      id: pedido.id,
      codigo: pedido.codigo,
      cliente: pedido.nomeCliente,
      total: pedido.total,
      itens: pedido.itens
    });

    await this.aguardar(2000);

    console.log(`🧾 Impressão simulada concluída: #${pedido.codigo}`);
  }

  private emitirFila(): void {
    this.filaSubject.next(
      this.fila.map(item => ({ ...item }))
    );
  }

  private aguardar(milissegundos: number): Promise<void> {
    return new Promise(resolve =>
      setTimeout(resolve, milissegundos)
    );
  }

  reimprimir(pedido: any): void {
    if (!pedido?.id) {
      return;
    }

    this.pedidosConhecidos.delete(pedido.id);
    this.adicionarNaFila(pedido);
  }
}
