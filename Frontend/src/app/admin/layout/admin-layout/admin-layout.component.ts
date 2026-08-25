import {
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import {
  ImpressaoPedidoService
} from '../../../core/services/impressao-pedido.service';

import {
  NotificacaoSignalrService
} from '../../../core/services/notificacao-signalr.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.css']
})
export class AdminLayoutComponent
  implements OnInit {

  constructor(
    private impressaoPedidoService:
      ImpressaoPedidoService,

    private notificacaoSignalrService:
      NotificacaoSignalrService
  ) {}

  async ngOnInit(): Promise<void> {

    console.log(
      '🚀 Ambiente administrativo iniciado.'
    );


    await this.notificacaoSignalrService
      .iniciarConexao();


    await this.impressaoPedidoService
      .recuperarPedidosPendentes();
  }
}
