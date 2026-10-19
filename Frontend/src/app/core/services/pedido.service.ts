import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {

  private api = `${environment.apiUrl}/api/pedidos`;
  private cardapioApi = `${environment.apiUrl}/api/cardapio`;

  constructor(private http: HttpClient) { }


  getPedidos() {
    return this.http.get<any>(this.api);
  }

  // Tela de Pedidos: pedidos do dia, com aba, busca e paginação.
  // data no formato "2026-10-19"; filtro = Todos, Pendente, EmPreparo,
  // Entrega, Retirada, Entregue ou Cancelado.
  listarPedidosDia(opcoes: {
    data: string;
    filtro: string;
    busca: string;
    page: number;
    pageSize: number;
  }) {
    const params: Record<string, string | number> = {
      data: opcoes.data,
      filtro: opcoes.filtro,
      page: opcoes.page,
      pageSize: opcoes.pageSize
    };

    if (opcoes.busca.trim()) {
      params['busca'] = opcoes.busca.trim();
    }

    return this.http.get<any>(this.api, { params });
  }

  // Quantidade de pedidos de cada aba, no dia escolhido
  getResumoDia(data: string, busca: string) {
    const params: Record<string, string> = { data };

    if (busca.trim()) {
      params['busca'] = busca.trim();
    }

    return this.http.get<any>(`${this.api}/resumo-dia`, { params });
  }

  // Pedidos de um status (0 Pendente, 1 EmPreparo, 2 SaiuParaEntrega...).
  // Usado pelo dashboard: busca até 50 de cada status.
  getPedidosPorStatus(status: number, pageSize = 50) {
    return this.http.get<any>(this.api, {
      params: { status, page: 1, pageSize }
    });
  }

  getPedidoPorId(id: string) {
    return this.http.get<any>(
      `${this.api}/${id}`
    );
  }

  criarPedido(dto: any) {
    return this.http.post<any>(
      this.api,
      dto
    );
  }

  atualizarStatus(id: string, status: number) {
    return this.http.put(
      `${this.api}/${id}/status`,
      status
    );
  }


  colocarNaFila(id: string) {
    return this.http.put(
      `${this.api}/${id}/impressao/fila`,
      {}
    );
  }

  iniciarImpressao(id: string) {
    return this.http.put(
      `${this.api}/${id}/impressao/iniciar`,
      {}
    );
  }

  // avancarStatus = true: impressão automática, o pedido
  // passa de "Pendente" para "Em preparo"
  concluirImpressao(id: string, avancarStatus = false) {
    return this.http.put(
      `${this.api}/${id}/impressao/concluir`,
      {},
      { params: { avancarStatus } }
    );
  }

  erroImpressao(id: string) {
    return this.http.put(
      `${this.api}/${id}/impressao/erro`,
      {}
    );
  }

  reimprimir(id: string) {
    return this.http.put(
      `${this.api}/${id}/impressao/reimprimir`,
      {}
    );
  }

  getPendentesImpressao() {
    return this.http.get<string[]>(
      `${this.api}/impressao/pendentes`
    );
  }


  getDashboard() {
    return this.http.get<any>(
      `${this.api}/dashboard`
    );
  }

  getRelatorio(periodo: string = 'hoje') {
    return this.http.get<any>(
      `${this.api}/relatorios?periodo=${periodo}`
    );
  }

  getCardapio() {
    return this.http.get<any>(
      this.cardapioApi
    );
  }
}
