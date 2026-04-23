import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email: string = '';
  senha: string = '';

  constructor(private authService: AuthService) {}

  login() {
    this.authService.login(this.email, this.senha).subscribe({
      next: (response: any) => {
        console.log('Login successful', response);
        // Handle successful login, e.g., navigate to dashboard
      },
      error: (error: any) => {
        console.error('Login failed', error);
        // Handle login error
      }
    });
  }
}
