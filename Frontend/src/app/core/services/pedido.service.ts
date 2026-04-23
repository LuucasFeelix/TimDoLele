import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {

  private api = 'https://localhost:57668/api/pedidos';

  constructor(private http: HttpClient) {}

  getPedidos() {
    return this.http.get<any>(this.api);
  }

  getDashboard() {
    return this.http.get<any>(`${this.api}/dashboard`);
  }

  criarPedido(dto: any) {

  return this.http.post<any>(this.api, dto);

  }
}
