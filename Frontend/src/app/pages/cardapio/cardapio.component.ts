import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PedidoService } from '../../core/services/pedido.service';

@Component({
  selector: 'app-cardapio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <h1>🍔 Cardápio</h1>

  <div *ngFor="let categoria of cardapio">

    <h2>{{ categoria.categoria }}</h2>

    <div
      style="
        display:flex;
        gap:20px;
        flex-wrap:wrap;
      "
    >

      <div
        *ngFor="let produto of categoria.produtos"
        style="
          border:1px solid #ccc;
          border-radius:10px;
          padding:15px;
          width:250px;
        "
      >

        <h3>{{ produto.nome }}</h3>

        <p>
          💰 R$ {{ produto.preco }}
        </p>

        <button
          (click)="adicionarCarrinho(produto)"
        >
          ➕ Adicionar
        </button>

      </div>

    </div>

  </div>

  <hr>

  <h2>🛒 Carrinho</h2>

  <div *ngIf="carrinho.length === 0">
    Nenhum item no carrinho
  </div>

  <div *ngFor="let item of carrinho">

    <p>
      {{ item.nome }}
      -
      Quantidade: {{ item.quantidade }}
    </p>

  </div>

  <button (click)="irCheckout()">
    🔥 Finalizar Pedido
  </button>
  `,
})
export class CardapioComponent implements OnInit {

  cardapio: any[] = [];

  carrinho: any[] = [];

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

      console.log('CARDAPIO:', this.cardapio);
    },

    error: (err: any) => {

      console.error(err);
    },
    });
  }

  adicionarCarrinho(produto: any): void {

    const itemExistente = this.carrinho.find(
      x => x.id === produto.id
    );

    if (itemExistente) {

      itemExistente.quantidade++;

    } else {

      this.carrinho.push({

        ...produto,

        quantidade: 1
      });
    }
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
