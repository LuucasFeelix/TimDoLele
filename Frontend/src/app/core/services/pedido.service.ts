import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {

  private api = 'https://localhost:57668/api/pedidos';
  private cardapioApi = 'https://localhost:57668/api/cardapio';

  constructor(private http: HttpClient) { }


  getPedidos() {
    return this.http.get<any>(this.api);
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

  concluirImpressao(id: string) {
    return this.http.put(
      `${this.api}/${id}/impressao/concluir`,
      {}
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
