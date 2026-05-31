import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {

  private api = 'https://localhost:57668/api/categorias';

  constructor(
    private http: HttpClient
  ) {}

  getCategorias() {
    return this.http.get<any[]>(this.api);
  }

  criarCategoria(dto: any) {
    return this.http.post<any>(this.api, dto);
  }

  atualizarCategoria(id: string, dto: any) {
    return this.http.put<any>(`${this.api}/${id}`, dto);
  }

  excluirCategoria(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
