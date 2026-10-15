import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AvisoService } from '../../core/services/aviso.service';

// Popup único do sistema. Fica no app.html, então aparece
// em qualquer tela quando alguém chama o AvisoService.
@Component({
  selector: 'app-aviso-popup',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './aviso-popup.component.html',
  styleUrls: ['./aviso-popup.component.css']
})
export class AvisoPopupComponent {

  readonly avisoService = inject(AvisoService);

  readonly icones = {
    sucesso: '✅',
    erro: '❌',
    atencao: '⚠️',
    info: 'ℹ️'
  };

  confirmar(): void {
    this.avisoService.responder(true);
  }

  cancelar(): void {
    this.avisoService.responder(false);
  }

  // Enter confirma / ESC fecha (cancela)
  @HostListener('document:keydown', ['$event'])
  aoTeclar(evento: KeyboardEvent): void {
    if (!this.avisoService.atual()) {
      return;
    }

    if (evento.key === 'Escape') {
      evento.preventDefault();
      this.cancelar();
    }

    if (evento.key === 'Enter') {
      evento.preventDefault();
      this.confirmar();
    }
  }
}
