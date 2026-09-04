import {
  Component
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  AuthService
} from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-login',

  standalone: true,

  imports: [
    FormsModule
  ],

  templateUrl:
    './login.component.html',

  styleUrls: [
    './login.component.css'
  ]
})
export class Login {

  email = '';

  senha = '';

  carregando =
    false;

  constructor(
    private authService:
      AuthService,

    private router:
      Router
  ) {}

  login(): void {

    if (
      !this.email ||
      !this.senha
    ) {

      alert(
        'Informe email e senha.'
      );

      return;
    }

    this.carregando =
      true;

    this.authService
      .login(
        this.email,
        this.senha
      )
      .subscribe({

        next: () => {

          this.carregando =
            false;

          this.router.navigate(
            ['/admin/dashboard']
          );
        },

        error: (erro: any) => {

          this.carregando =
            false;

          console.error(
            'Erro ao realizar login:',
            erro
          );

          alert(
            'Email ou senha inválidos'
          );
        }
      });
  }
}
