import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PedidoService } from '../../core/services/pedido.service';

@Component({
  selector: 'app-cardapio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <h1>🍔 Cardápio</h1>
    <div *ngFor="let cat of cardapio">
      <h2>{{ cat.categoria }}</h2>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <div
          *ngFor="let p of cat.produtos"
          style="border:1px solid #ccc; padding:10px; width:220px; border-radius:8px;"
        >
          <h3>{{ p.nome }}</h3>
          <p>💰 R$ {{ p.preco }}</p>
          <button (click)="adicionarCarrinho(p)">➕ Adicionar</button>
        </div>
      </div>
    </div>
    <hr>
    <h2>🛒 Carrinho</h2>
    <div *ngFor="let item of carrinho">
      <p>{{ item.nome }}</p>
    </div>
  `,
})
export class CardapioComponent implements OnInit {
  cardapio: any[] = [];
  carrinho: any[] = [];

  constructor(private pedidoService: PedidoService) {}

  ngOnInit(): void {
    this.carregarCardapio();
  }

  carregarCardapio(): void {
    this.pedidoService.getCardapio().subscribe({
      next: (res: any) => {
        console.log(res);
        this.cardapio = res;
      },
      error: (err: any) => {
        console.error(err);
      },
    });
  }

  adicionarCarrinho(produto: any): void {
    this.carrinho.push(produto);
  }
}
