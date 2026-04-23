import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email: string = '';
  senha: string = '';

  constructor(private authService: AuthService, private router: Router) {}

login() {
  this.authService.login(this.email, this.senha).subscribe({
    next: (response: any) => {
      localStorage.setItem('token', response.token);

      this.router.navigate(['/dashboard']);
    }
  });
  }
}
