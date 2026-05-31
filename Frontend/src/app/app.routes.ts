import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CardapioComponent } from './pages/cardapio/cardapio.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { authGuard } from './core/guards/auth.guard';
import { ConfirmacaoComponent } from './pages/confirmacao/confirmacao.component';

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
    component: CheckoutComponent,
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
    path: 'confirmacao',
    component: ConfirmacaoComponent,
  },
  {
    path: '**',
    redirectTo: 'cardapio',
  },

];
