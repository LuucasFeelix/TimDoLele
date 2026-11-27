import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AvisoService } from '../../core/services/aviso.service';
import { SemEmojiDirective } from '../../core/directives/sem-emoji.directive';

// Popup único do sistema. Fica no app.html, então aparece
// em qualquer tela quando alguém chama o AvisoService.
@Component({
  selector: 'app-aviso-popup',
  standalone: true,
  imports: [CommonModule, SemEmojiDirective],
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

  // Pergunta com motivo
  motivoEscolhido = '';
  outroMotivo = '';

  get pedeMotivo(): boolean {
    return !!this.avisoService.atual()?.motivos?.length;
  }

  get motivoFinal(): string {
    return this.motivoEscolhido === 'Outro'
      ? this.outroMotivo.trim()
      : this.motivoEscolhido;
  }

  escolherMotivo(motivo: string): void {
    this.motivoEscolhido = motivo;

    if (motivo === 'Outro') {
      setTimeout(() =>
        (document.getElementById('aviso-outro-motivo') as HTMLTextAreaElement | null)?.focus()
      );
    }
  }

  aoDigitarOutro(evento: Event): void {
    this.outroMotivo = (evento.target as HTMLTextAreaElement).value;
  }

  confirmar(): void {
    if (this.pedeMotivo && !this.motivoFinal) {
      return;
    }

    const texto = this.pedeMotivo ? this.motivoFinal : undefined;

    this.limparMotivo();
    this.avisoService.responder(true, texto);
  }

  cancelar(): void {
    this.limparMotivo();
    this.avisoService.responder(false);
  }

  private limparMotivo(): void {
    this.motivoEscolhido = '';
    this.outroMotivo = '';
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

    // No campo "Outro" o Enter só quebra a linha
    if (evento.key === 'Enter' && !(evento.target instanceof HTMLTextAreaElement)) {
      evento.preventDefault();
      this.confirmar();
    }
  }
}
