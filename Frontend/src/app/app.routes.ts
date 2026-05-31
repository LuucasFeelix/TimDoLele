import { Routes } from '@angular/router';
import { Login } from './admin/login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CardapioComponent } from './pages/cardapio/cardapio.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { authGuard } from './core/guards/auth.guard';
import { ConfirmacaoComponent } from './pages/confirmacao/confirmacao.component';
import { CategoriasComponent } from './admin/categorias/categorias.component';

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
    component: Login,
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
    path: 'admin/categorias',
    component: CategoriasComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: 'cardapio',
  },

];
