import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // private api = 'https://localhost:57668/api/auth';

  constructor(private http: HttpClient) {}

login(email: string, senha: string) {
  console.log("🔥 ENTROU NO AUTH SERVICE CORRETO");

    return this.http.post<any>('https://localhost:57668/api/auth/login', {
      email,
      senha
    });
  }
}
