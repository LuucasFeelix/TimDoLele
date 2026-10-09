import { Directive, ElementRef, HostListener } from '@angular/core';

import { limparTextoImpressao } from '../utils/texto.utils';

// Uso: <input semEmoji [(ngModel)]="nome" />
//
// Remove emojis e símbolos que a impressora térmica não imprime
// enquanto o usuário digita ou cola. O ngModel recebe o texto limpo.
@Directive({
  selector: 'input[semEmoji], textarea[semEmoji]',
  standalone: true
})
export class SemEmojiDirective {

  constructor(
    private elemento: ElementRef<HTMLInputElement | HTMLTextAreaElement>
  ) {}

  @HostListener('input')
  aoDigitar(): void {
    const campo = this.elemento.nativeElement;
    const limpo = limparTextoImpressao(campo.value);

    if (limpo === campo.value) {
      return;
    }

    // Mantém o cursor no lugar certo depois de remover caracteres
    const removidos = campo.value.length - limpo.length;
    const cursor = Math.max((campo.selectionStart ?? limpo.length) - removidos, 0);

    campo.value = limpo;
    campo.setSelectionRange(cursor, cursor);

    // Avisa o ngModel do texto limpo (a segunda vez já vem limpo
    // e para no "if" acima, então não entra em loop)
    campo.dispatchEvent(new Event('input'));
  }
}
