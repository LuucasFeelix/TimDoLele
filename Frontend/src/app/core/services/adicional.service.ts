import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdicionalService {

  private apiUrl = `${environment.apiUrl}/api/adicionais`;

  constructor(private http: HttpClient) {}

  getAdicionais(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  criarAdicional(dto: any): Observable<any> {
    return this.http.post(this.apiUrl, dto);
  }

  atualizarAdicional(id: string, dto: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, dto);
  }

  excluirAdicional(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
