import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface PixSituacao {
  pedidoId: string;
  codigo: string;

  // Aguardando | Pago | Expirado
  status: 'Aguardando' | 'Pago' | 'Expirado';

  copiaECola: string;
  valor: number;

  // Calculado no servidor (não depende do relógio do celular)
  segundosRestantes: number;

  // true = PIX de teste (mostra o botão "Simular pagamento")
  simulador: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PixService {

  private api = `${environment.apiUrl}/api/pagamentos/pix`;

  constructor(private http: HttpClient) {}

  obterSituacao(pedidoId: string) {
    return this.http.get<PixSituacao>(`${this.api}/${pedidoId}`);
  }

  // Só funciona em desenvolvimento, com o simulador
  simularPagamento(pedidoId: string) {
    return this.http.post(`${this.api}/${pedidoId}/simular-pagamento`, {});
  }
}
