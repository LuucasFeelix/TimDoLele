import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { authGuard } from './core/guards/auth.guard';
import { CriarPedidoComponent } from './pedidos/criar/criar.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },

  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  {
    path: 'criar-pedido',
    component: CriarPedidoComponent,
    canActivate: [authGuard]
  }
];
