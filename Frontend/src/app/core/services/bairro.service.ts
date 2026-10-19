import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface Bairro {
  id: string;
  nome: string;
  taxaEntrega: number;
  ativo: boolean;
}

export interface SalvarBairroRequest {
  nome: string;
  taxaEntrega: number;
}

@Injectable({
  providedIn: 'root'
})
export class BairroService {

  private api = `${environment.apiUrl}/api/bairros`;

  constructor(private http: HttpClient) {}

  // ===== CHECKOUT =====

  listarAtivos() {
    return this.http.get<Bairro[]>(`${this.api}/ativos`);
  }

  // ===== ADMIN =====

  listarTodos() {
    return this.http.get<Bairro[]>(this.api);
  }

  criar(dto: SalvarBairroRequest) {
    return this.http.post<Bairro>(this.api, dto);
  }

  atualizar(id: string, dto: SalvarBairroRequest) {
    return this.http.put<Bairro>(`${this.api}/${id}`, dto);
  }

  ativar(id: string) {
    return this.http.patch<Bairro>(`${this.api}/${id}/ativar`, {});
  }

  desativar(id: string) {
    return this.http.patch<Bairro>(`${this.api}/${id}/desativar`, {});
  }

  importar(bairros: SalvarBairroRequest[]) {
    return this.http.post<{ criados: number; atualizados: number }>(
      `${this.api}/importar`,
      { bairros }
    );
  }
}

// "  Jardim  Bela Vísta " -> "jardim bela vista"
// Mesma regra do backend (Bairro.Normalizar): para buscar
// e comparar sem ligar para acento, maiúscula ou espaço.
export function normalizarBairro(nome: string | null | undefined): string {
  return (nome ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
