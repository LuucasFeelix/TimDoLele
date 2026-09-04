import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class Login {

  email = '';
  senha = '';

  carregando = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  login(): void {

    if (this.carregando) {
      return;
    }

    if (
      !this.email.trim() ||
      !this.senha
    ) {
      alert('Informe o e-mail e a senha.');
      return;
    }

    this.carregando = true;

    this.authService
      .login(
        this.email.trim(),
        this.senha
      )
      .subscribe({

        next: () => {

          this.carregando = false;

          this.router.navigate(
            ['/admin/dashboard']
          );
        },

        error: (err: any) => {

          this.carregando = false;

          console.error(
            'Erro ao realizar login:',
            err
          );

          alert(
            'Email ou senha inválidos'
          );
        }
      });
  }
}
