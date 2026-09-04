import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Observable,
  tap
} from 'rxjs';

export interface LoginResponse {
  token: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly api =
    'https://localhost:57668/api/auth';

  constructor(
    private http: HttpClient
  ) {}

  login(
    email: string,
    senha: string
  ): Observable<LoginResponse> {

    return this.http
      .post<LoginResponse>(
        `${this.api}/login`,
        {
          email,
          senha
        }
      )
      .pipe(
        tap(response => {
          this.salvarTokens(
            response.token,
            response.refreshToken
          );
        })
      );
  }

  refreshToken():
    Observable<LoginResponse> {

    const refreshToken =
      this.getRefreshToken();

    return this.http
      .post<LoginResponse>(
        `${this.api}/refresh`,
        {
          refreshToken
        }
      )
      .pipe(
        tap(response => {
          this.salvarTokens(
            response.token,
            response.refreshToken
          );
        })
      );
  }

  logout(): Observable<any> {

    const refreshToken =
      this.getRefreshToken();

    return this.http.post(
      `${this.api}/logout`,
      {
        refreshToken
      }
    );
  }

  salvarTokens(
    token: string,
    refreshToken: string
  ): void {

    localStorage.setItem(
      'token',
      token
    );

    localStorage.setItem(
      'refreshToken',
      refreshToken
    );
  }

  getToken():
    string | null {

    return localStorage.getItem(
      'token'
    );
  }

  getRefreshToken():
    string | null {

    return localStorage.getItem(
      'refreshToken'
    );
  }

  limparSessao(): void {

    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'refreshToken'
    );
  }

  estaLogado(): boolean {

    return !!this.getToken();
  }
}
