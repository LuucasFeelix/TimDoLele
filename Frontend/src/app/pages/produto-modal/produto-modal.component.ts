import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-produto-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './produto-modal.component.html',
  styleUrls: ['./produto-modal.component.css']
})
export class ProdutoModalComponent {

  @Input() produto: any;

  @Output() fechar = new EventEmitter();

  @Output() adicionar = new EventEmitter();

  quantidade = 1;

  observacao = '';

  adicionaisSelecionados: any[] = [];

  toggleAdicional(adicional: any) {

    const existe =
      this.adicionaisSelecionados.find(
        a => a.id === adicional.id
      );

    if (existe) {

      this.adicionaisSelecionados =
        this.adicionaisSelecionados.filter(
          a => a.id !== adicional.id
        );

    } else {

      this.adicionaisSelecionados.push(adicional);
    }
  }

  confirmar() {

    this.adicionar.emit({

      produtoId: this.produto.id,

      nome: this.produto.nome,

      preco: this.produto.preco,

      quantidade: this.quantidade,

      observacao: this.observacao,

      adicionais: this.adicionaisSelecionados
    });

    this.fechar.emit();
  }
}
