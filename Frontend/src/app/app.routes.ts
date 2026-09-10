import { Routes } from '@angular/router';

import { Login } from './admin/login/login.component';
import { Dashboard } from './admin/dashboard/dashboard.component';

import { CardapioComponent } from './pages/cardapio/cardapio.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { ConfirmacaoComponent } from './pages/confirmacao/confirmacao.component';

import { CategoriasComponent } from './admin/categorias/categorias.component';
import { ProdutosComponent } from './admin/produtos/produtos.component';
import { AdicionaisComponent } from './admin/adicionais/adicionais.component';
import { PedidosComponent } from './admin/pedidos/pedidos.component';
import { RelatoriosComponent } from './admin/relatorios/relatorios.component';
import { ConfiguracoesComponent } from './admin/configuracoes/configuracoes.component';

import { AdminLayoutComponent } from './admin/layout/admin-layout/admin-layout.component';

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
    component: CheckoutComponent,
  },

  {
    path: 'confirmacao',
    component: ConfirmacaoComponent,
  },


  {
    path: 'admin/login',
    component: Login,
  },


  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],

    children: [

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },

      {
        path: 'dashboard',
        component: Dashboard,
      },

      {
        path: 'pedidos',
        component: PedidosComponent,
      },

      {
        path: 'produtos',
        component: ProdutosComponent,
      },

      {
        path: 'categorias',
        component: CategoriasComponent,
      },

      {
        path: 'adicionais',
        component: AdicionaisComponent,
      },

      {
        path: 'relatorios',
        component: RelatoriosComponent,
      },


      {
        path: 'configuracoes',
        component: ConfiguracoesComponent,
      },

    ],
  },


  {
    path: '**',
    redirectTo: 'cardapio',
  },

];
