import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProdutoService } from '../../core/services/produto.service';

@Component({
  selector: 'app-produto-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './produto-modal.component.html',
  styleUrls: ['./produto-modal.component.css']
})
export class ProdutoModalComponent implements OnInit {
  @Input() produto: any;

  // Quando informado, o modal abre preenchido para editar
  // um item que já está no carrinho
  @Input() itemEdicao: any = null;

  @Output() fechar = new EventEmitter<void>();
  @Output() adicionar = new EventEmitter<any>();

  quantidade = 1;
  observacao = '';
  adicionaisSelecionados: any[] = [];

  constructor(private produtoService: ProdutoService) {}

  ngOnInit(): void {
    if (!this.itemEdicao) {
      return;
    }

    this.quantidade = this.itemEdicao.quantidade ?? 1;
    this.observacao = this.itemEdicao.observacao ?? '';

    // Marca os adicionais que o cliente já tinha escolhido
    const idsEscolhidos = (this.itemEdicao.adicionais ?? []).map(
      (a: any) => a.id
    );

    this.adicionaisSelecionados = (this.produto?.adicionais ?? []).filter(
      (a: any) => idsEscolhidos.includes(a.id)
    );
  }

  get urlImagem(): string | null {
    return this.produtoService.urlImagem(this.produto?.imagemUrl);
  }

  toggleAdicional(adicional: any): void {
    const existe = this.adicionaisSelecionados.find(
      a => a.id === adicional.id
    );

    if (existe) {
      this.adicionaisSelecionados =
        this.adicionaisSelecionados.filter(
          a => a.id !== adicional.id
        );

      return;
    }

    this.adicionaisSelecionados.push(adicional);
  }

  adicionalSelecionado(adicional: any): boolean {
    return this.adicionaisSelecionados.some(
      a => a.id === adicional.id
    );
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
    let total = Number(
      this.produto.preco.toString().replace(',', '.')
    );

    this.adicionaisSelecionados.forEach(a => {
      total += Number(
        a.preco.toString().replace(',', '.')
      );
    });

    total *= this.quantidade;

    return total
      .toFixed(2)
      .replace('.', ',');
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
