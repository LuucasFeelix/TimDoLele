import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CardapioComponent } from './pages/cardapio/cardapio.component';
import { CriarPedidoComponent } from './pedidos/criar/criar.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'cardapio',
    pathMatch: 'full',
  },
  {
    path: 'cardapio',
    component: CardapioComponent,
  },
  {
    path: 'checkout',
    component: CriarPedidoComponent,
  },
  {
    path: 'admin/login',
    component: LoginComponent,
  },
  {
    path: 'admin/dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'cardapio',
  },
];
