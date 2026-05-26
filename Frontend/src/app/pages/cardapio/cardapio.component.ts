import {Component, OnInit, ChangeDetectorRef} from '@angular/core';
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
  templateUrl: './cardapio.component.html'
})
export class CardapioComponent implements OnInit {

  cardapio: any[] = [];

  carrinho: any[] = [];

  produtoSelecionado: any = null;

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
}
