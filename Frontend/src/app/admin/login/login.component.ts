import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { AvisoService } from '../../core/services/aviso.service';

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

  // Popup padrão de avisos (substitui alert/confirm)
  private aviso = inject(AvisoService);

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
      this.aviso.atencao('Informe o e-mail e a senha.');
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

          this.aviso.erro(
            'Email ou senha inválidos'
          );
        }
      });
  }
}
