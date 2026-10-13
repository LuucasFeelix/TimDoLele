import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {

  private api = `${environment.apiUrl}/api/categorias`;

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
