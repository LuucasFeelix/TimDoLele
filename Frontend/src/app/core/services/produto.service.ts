import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProdutoService {

  private servidor = 'https://localhost:57668';

  private api = `${this.servidor}/api/produtos`;

  constructor(private http: HttpClient) { }

  // A API guarda só o caminho (/uploads/produtos/abc.jpg);
  // aqui monta o endereço completo para a tag <img>.
  urlImagem(caminho: string | null | undefined): string | null {
    if (!caminho) {
      return null;
    }

    return `${this.servidor}${caminho}`;
  }

  enviarImagem(produtoId: string, arquivo: File) {
    const formData = new FormData();

    formData.append('arquivo', arquivo);

    return this.http.post<{ imagemUrl: string }>(
      `${this.api}/${produtoId}/imagem`,
      formData
    );
  }

  removerImagem(produtoId: string) {
    return this.http.delete(`${this.api}/${produtoId}/imagem`);
  }

  getProdutos() {
    return this.http.get<any[]>(this.api);
  }

  criarProduto(dto: any) {
    return this.http.post<any>(this.api, dto);
  }

  atualizarProduto(id: string, dto: any) {
    return this.http.put<any>(`${this.api}/${id}`, dto);
  }

  reajustarPrecoCategoria(categoriaId: string, valor: number) {
    return this.http.post<{ produtosAlterados: number }>(
      `${this.api}/reajuste-categoria`,
      { categoriaId, valor }
    );
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
