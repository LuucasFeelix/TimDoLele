import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProdutoService {

  private api = 'https://localhost:57668/api/produtos';

  constructor(private http: HttpClient) { }

  getProdutos() {
    return this.http.get<any[]>(this.api);
  }

  criarProduto(dto: any) {
    return this.http.post<any>(this.api, dto);
  }

  atualizarProduto(id: string, dto: any) {
    return this.http.put<any>(`${this.api}/${id}`, dto);
  }

  ativarProduto(id: string) {
    return this.http.patch(`${this.api}/${id}/ativar`, {});
  }

  desativarProduto(id: string) {
    return this.http.patch(`${this.api}/${id}/desativar`, {});
  }

  getAdicionaisProduto(produtoId: string) {
    return this.http.get<any[]>(`${this.api}/${produtoId}/adicionais`);
  }

  vincularAdicional(produtoId: string, adicionalId: string) {
    return this.http.post(`${this.api}/${produtoId}/adicionais/${adicionalId}`, {});
  }

  removerAdicional(produtoId: string, adicionalId: string) {
    return this.http.delete(`${this.api}/${produtoId}/adicionais/${adicionalId}`);
  }
}
