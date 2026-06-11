import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PedidoService } from '../../core/services/pedido.service';
import { ProdutoModalComponent } from '../produto-modal/produto-modal.component';

@Component({
  selector: 'app-cardapio',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ProdutoModalComponent
  ],
  templateUrl: './cardapio.component.html',
  styleUrls: ['./cardapio.component.css']
})
export class CardapioComponent implements OnInit {

  cardapio: any[] = [];
  carrinho: any[] = [];
  produtoSelecionado: any = null;

  categoriaSelecionada = 'Todos';

  constructor(
    private pedidoService: PedidoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarCardapio();
  }

  carregarCardapio(): void {
    this.pedidoService.getCardapio().subscribe({
      next: (res: any) => {
        this.cardapio = [...res];
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
      }
    });
  }

  get categorias(): string[] {
    return [
      'Todos',
      ...this.cardapio.map(c => c.categoria)
    ];
  }

  get cardapioFiltrado(): any[] {
    if (this.categoriaSelecionada === 'Todos') {
      return this.cardapio;
    }

    return this.cardapio.filter(
      c => c.categoria === this.categoriaSelecionada
    );
  }

  selecionarCategoria(categoria: string): void {
    this.categoriaSelecionada = categoria;
  }

  abrirProduto(produto: any): void {
    this.produtoSelecionado = produto;
  }

  fecharModal(): void {
    this.produtoSelecionado = null;
  }

  adicionarAoCarrinho(item: any): void {
    const itemExistente = this.carrinho.find(
      x =>
        x.produtoId === item.produtoId &&
        JSON.stringify(x.adicionais) === JSON.stringify(item.adicionais) &&
        x.observacao === item.observacao
    );

    if (itemExistente) {
      itemExistente.quantidade += item.quantidade;
    } else {
      this.carrinho.push(item);
    }

    this.produtoSelecionado = null;
  }

  irCheckout(): void {
    if (this.carrinho.length === 0) {
      alert('Carrinho vazio');
      return;
    }

    localStorage.setItem(
      'carrinho',
      JSON.stringify(this.carrinho)
    );

    window.location.href = '/checkout';
  }

  aumentarQuantidade(item: any): void {
    item.quantidade++;
  }

  diminuirQuantidade(item: any): void {
    if (item.quantidade > 1) {
      item.quantidade--;
    } else {
      this.removerItem(item);
    }
  }

  removerItem(item: any): void {
    this.carrinho = this.carrinho.filter(x => x !== item);
  }

  calcularTotal(): string {
    let total = 0;

    this.carrinho.forEach(item => {
      let subtotal = Number(
        item.preco.toString().replace(',', '.')
      );

      item.adicionais?.forEach((a: any) => {
        subtotal += Number(
          a.preco.toString().replace(',', '.')
        );
      });

      total += subtotal * item.quantidade;
    });

    return total.toFixed(2).replace('.', ',');
  }

  calcularItemTotal(item: any): string {
    let total = Number(
      item.preco.toString().replace(',', '.')
    );

    item.adicionais?.forEach((a: any) => {
      total += Number(
        a.preco.toString().replace(',', '.')
      );
    });

    total *= item.quantidade;

    return total.toFixed(2).replace('.', ',');
  }

  quantidadeTotalCarrinho(): number {
    return this.carrinho.reduce(
      (total, item) => total + item.quantidade,
      0
    );
  }
}
