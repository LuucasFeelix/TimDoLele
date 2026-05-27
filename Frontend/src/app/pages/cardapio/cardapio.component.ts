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

  constructor(
    private pedidoService: PedidoService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.carregarCardapio();
  }

  carregarCardapio(): void {

    this.pedidoService.getCardapio().subscribe({

      next: (res: any) => {

        console.log('RESPOSTA API:', res);

        this.cardapio = [...res];

        this.cdr.detectChanges();
      },

      error: (err: any) => {
        console.error(err);
      }
    });
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
        JSON.stringify(x.adicionais)
        === JSON.stringify(item.adicionais) &&
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

    this.carrinho =
      this.carrinho.filter(x => x !== item);
  }

  calcularTotal(): string {

    let total = 0;

    this.carrinho.forEach(item => {

      let subtotal =
        Number(item.preco.replace(',', '.'));

      item.adicionais?.forEach((a: any) => {

        subtotal += Number(
          a.preco.replace(',', '.')
        );
      });

      total += subtotal * item.quantidade;
    });

    return total
      .toFixed(2)
      .replace('.', ',');
  }

  calcularItemTotal(item: any): string {
    let total = Number(item.preco.replace(',', '.'));

    item.adicionais?.forEach((a: any) => {
      total += Number(a.preco.replace(',', '.'));
    });

    total *= item.quantidade;

    return total
      .toFixed(2)
      .replace('.', ',');
  }

  calcularTotalComEntrega(): string {
    const subtotal = Number(
      this.calcularTotal().replace(',', '.')
    );

    return (subtotal + 5)
      .toFixed(2)
      .replace('.', ',');
  }
}
