import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

// 1 = Percentual (ex.: 10%) | 2 = Valor fixo (ex.: R$ 5,00)
export type TipoDesconto = 1 | 2;

export interface Cupom {
  id: string;
  codigo: string;
  tipo: TipoDesconto;
  valor: number;
  pedidoMinimo: number | null;
  validoAte: string | null;
  limiteUsos: number | null;
  usos: number;
  ativo: boolean;
}

export interface SalvarCupomRequest {
  codigo: string;
  tipo: TipoDesconto;
  valor: number;
  pedidoMinimo: number | null;
  validoAte: string | null;
  limiteUsos: number | null;
}

export interface CupomValidado {
  codigo: string;
  tipo: TipoDesconto;
  valor: number;
  pedidoMinimo: number | null;
  desconto: number;
}

@Injectable({
  providedIn: 'root'
})
export class CupomService {

  private api = 'https://localhost:57668/api/cupons';

  constructor(private http: HttpClient) {}

  // ===== ADMIN =====

  listar() {
    return this.http.get<Cupom[]>(this.api);
  }

  criar(dto: SalvarCupomRequest) {
    return this.http.post<Cupom>(this.api, dto);
  }

  atualizar(id: string, dto: SalvarCupomRequest) {
    return this.http.put<Cupom>(`${this.api}/${id}`, dto);
  }

  ativar(id: string) {
    return this.http.patch<Cupom>(`${this.api}/${id}/ativar`, {});
  }

  desativar(id: string) {
    return this.http.patch<Cupom>(`${this.api}/${id}/desativar`, {});
  }

  // ===== CHECKOUT =====

  validar(codigo: string, subtotal: number) {
    return this.http.post<CupomValidado>(`${this.api}/validar`, {
      codigo,
      subtotal
    });
  }
}

// Mesma regra do backend (Cupom.CalcularDesconto): desconto sobre o
// subtotal, nunca maior que ele. Usado para atualizar o desconto
// quando o cliente muda o carrinho depois de aplicar o cupom.
export function calcularDescontoCupom(
  cupom: { tipo: TipoDesconto; valor: number },
  subtotal: number
): number {
  const desconto =
    cupom.tipo === 1
      ? (subtotal * cupom.valor) / 100
      : cupom.valor;

  return Math.round(Math.min(desconto, subtotal) * 100) / 100;
}

// Mensagem de erro vinda da API (ApiResponse usa "Message")
export function mensagemErroApi(err: any, padrao: string): string {
  return (
    err?.error?.Message ??
    err?.error?.message ??
    (typeof err?.error === 'string' ? err.error : null) ??
    padrao
  );
}
