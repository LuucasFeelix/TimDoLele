import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProdutoService } from '../../core/services/produto.service';
import { limparTextoImpressao } from '../../core/utils/texto.utils';
import { SemEmojiDirective } from '../../core/directives/sem-emoji.directive';

@Component({
  selector: 'app-produto-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, SemEmojiDirective],
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

    // Marca os adicionais (e quantidades) que o cliente já tinha escolhido.
    // Usa os dados atuais do produto (nome/preço de agora).
    this.adicionaisSelecionados = (this.itemEdicao.adicionais ?? [])
      .map((escolhido: any) => {
        const atual = (this.produto?.adicionais ?? []).find(
          (a: any) => a.id === escolhido.id
        );

        return atual
          ? { ...atual, quantidade: escolhido.quantidade ?? 1 }
          : null;
      })
      .filter((a: any) => !!a);
  }

  get urlImagem(): string | null {
    return this.produtoService.urlImagem(this.produto?.imagemUrl);
  }

  // =====================================================
  // ADICIONAIS (cada um pode ir até 5x: ex. 2x Bacon)
  // =====================================================

  readonly maximoPorAdicional = 5;

  quantidadeAdicional(adicional: any): number {
    return (
      this.adicionaisSelecionados.find(a => a.id === adicional.id)
        ?.quantidade ?? 0
    );
  }

  adicionalSelecionado(adicional: any): boolean {
    return this.quantidadeAdicional(adicional) > 0;
  }

  // Clicar no adicional: se ainda não tem, adiciona 1
  toggleAdicional(adicional: any): void {
    if (!this.adicionalSelecionado(adicional)) {
      this.aumentarAdicional(adicional);
    }
  }

  aumentarAdicional(adicional: any): void {
    const existente = this.adicionaisSelecionados.find(
      a => a.id === adicional.id
    );

    if (!existente) {
      this.adicionaisSelecionados.push({ ...adicional, quantidade: 1 });
      return;
    }

    if (existente.quantidade < this.maximoPorAdicional) {
      existente.quantidade++;
    }
  }

  diminuirAdicional(adicional: any): void {
    const existente = this.adicionaisSelecionados.find(
      a => a.id === adicional.id
    );

    if (!existente) {
      return;
    }

    if (existente.quantidade > 1) {
      existente.quantidade--;
      return;
    }

    this.adicionaisSelecionados = this.adicionaisSelecionados.filter(
      a => a.id !== adicional.id
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
      ) * (a.quantidade ?? 1);
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
      observacao: limparTextoImpressao(this.observacao)
        .replace(/ {2,}/g, ' ')
        .trim(),
      adicionais: this.adicionaisSelecionados.map(a => ({ ...a }))
    });

    this.fechar.emit();

    this.quantidade = 1;
    this.observacao = '';
    this.adicionaisSelecionados = [];
  }
}
