import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

interface WhatsappPendente {
  pedidoId: string;
  telefone: string;
  texto: string;
  link: string;
  mensagensIds: string[];
}

// Status do pedido que geram mensagem para o cliente
// (1 = Em preparo, 2 = Saiu para entrega / Pronto para retirada)
const STATUS_COM_MENSAGEM = [1, 2];

// =====================================================
// WhatsApp para o cliente (MODO MANUAL)
//
// O sistema prepara a mensagem; aqui abrimos o WhatsApp com ela
// pronta para o número do cliente, e a pessoa só aperta "enviar".
//
// Quando a API oficial for ligada (modo automático), o servidor
// envia sozinho e estas funções não abrem nada.
// =====================================================
@Injectable({
  providedIn: 'root'
})
export class WhatsappService {

  private api = `${environment.apiUrl}/api/whatsapp`;

  // null = ainda não perguntou ao servidor
  private automatico: boolean | null = null;

  constructor(private http: HttpClient) {
    this.carregarModo();
  }

  // O navegador só deixa abrir aba nova NO MOMENTO DO CLIQUE.
  // Por isso a aba é aberta já no clique (em branco) e a mensagem
  // entra nela quando o servidor responder.
  abrirJanelaParaStatus(status: number): Window | null {
    if (this.automatico || !STATUS_COM_MENSAGEM.includes(status)) {
      return null;
    }

    return this.abrirJanela();
  }

  abrirJanela(): Window | null {
    if (this.automatico) {
      return null;
    }

    const janela = window.open('about:blank', '_blank');

    janela?.document.write(
      '<p style="font-family:sans-serif;padding:20px">Abrindo o WhatsApp...</p>'
    );

    return janela;
  }

  // Abre o WhatsApp com as mensagens pendentes do pedido
  // e marca como enviadas. Retorna false se não havia nada.
  async enviarPendentes(pedidoId: string, janela: Window | null): Promise<boolean> {
    if (this.automatico) {
      janela?.close();
      return false;
    }

    let pendente: WhatsappPendente | null = null;

    try {
      pendente = await firstValueFrom(
        this.http.get<WhatsappPendente | null>(`${this.api}/pedidos/${pedidoId}/pendente`)
      );
    } catch (erro) {
      console.error('Erro ao buscar a mensagem de WhatsApp:', erro);
    }

    if (!pendente) {
      janela?.close();
      return false;
    }

    if (janela && !janela.closed) {
      janela.location.href = pendente.link;
    } else {
      window.open(pendente.link, '_blank');
    }

    try {
      await firstValueFrom(
        this.http.post(`${this.api}/pedidos/${pedidoId}/enviadas`, pendente.mensagensIds)
      );
    } catch (erro) {
      console.error('Erro ao marcar mensagens como enviadas:', erro);
    }

    return true;
  }

  get modoAutomatico(): boolean {
    return this.automatico === true;
  }

  private carregarModo(): void {
    this.http.get<{ automatico: boolean }>(`${this.api}/modo`).subscribe({
      next: (res) => this.automatico = res.automatico,
      error: () => this.automatico = false
    });
  }
}
