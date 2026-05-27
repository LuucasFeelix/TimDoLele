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

  @Output() fechar = new EventEmitter<void>();
  @Output() adicionar = new EventEmitter<any>();

  quantidade = 1;
  observacao = '';
  adicionaisSelecionados: any[] = [];

  toggleAdicional(adicional: any): void {
    const existe = this.adicionaisSelecionados.find(a => a.id === adicional.id);

    if (existe) {
      this.adicionaisSelecionados = this.adicionaisSelecionados.filter(a => a.id !== adicional.id);
    } else {
      this.adicionaisSelecionados.push(adicional);
    }
  }

  aumentarQuantidade(): void {
    this.quantidade++;
  }

  diminuirQuantidade(): void {
    if (this.quantidade > 1) {
      this.quantidade--;
    }
  }

  calcularTotal(): string {
    let total = Number(this.produto.preco.toString().replace(',', '.'));

    this.adicionaisSelecionados.forEach(a => {
      total += Number(a.preco.toString().replace(',', '.'));
    });

    total *= this.quantidade;

    return total.toFixed(2).replace('.', ',');
  }

  confirmar(): void {
    this.adicionar.emit({
      produtoId: this.produto.id,
      nome: this.produto.nome,
      preco: this.produto.preco,
      quantidade: this.quantidade,
      observacao: this.observacao,
      adicionais: [...this.adicionaisSelecionados]
    });

    this.fechar.emit();

    this.quantidade = 1;
    this.observacao = '';
    this.adicionaisSelecionados = [];
  }
}
