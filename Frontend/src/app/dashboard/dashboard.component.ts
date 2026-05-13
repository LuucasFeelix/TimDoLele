import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService } from '../core/services/pedido.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <h1>🍔 Cardápio</h1>

  <!-- CARDÁPIO -->
  <div *ngFor="let cat of cardapio">
    <h2>{{ cat.categoria }}</h2>

    <div style="display:flex; gap:10px; flex-wrap:wrap;">
      <div *ngFor="let p of cat.produtos" style="border:1px solid #ccc; padding:10px; width:220px; border-radius:8px;">

        <h3>{{ p.nome }}</h3>
        <p>💰 {{ p.preco }}</p>

        <!-- ADICIONAIS -->
        <div *ngIf="p.adicionais.length > 0">
          <p><b>Adicionais:</b></p>

          <div *ngFor="let a of p.adicionais">
            <label>
              <input type="checkbox" (change)="toggleAdicional(p.id, a)" />
              {{ a.nome }} (+{{ a.preco }})
            </label>
          </div>
        </div>

        <button (click)="adicionarCarrinho(p)">➕ Adicionar</button>

      </div>
    </div>
  </div>

  <hr>

  <!-- CARRINHO -->
  <h2>🛒 Carrinho</h2>

  <div *ngIf="carrinho.length === 0">
    Nenhum item no carrinho
  </div>

  <div *ngFor="let item of carrinho">
    <p>
      {{ item.nome }} - {{ item.quantidade }}x
      (Adicionais: {{ item.adicionais.length }})
    </p>
  </div>

  <p><b>Total: {{ total.toFixed(2).replace('.', ',') }}</b></p>

  <button (click)="finalizarPedido()">🔥 Finalizar Pedido</button>
  `
})
export class DashboardComponent implements OnInit {

  cardapio: any[] = [];
  carrinho: any[] = [];
  adicionaisSelecionados: any = {};
  total: number = 0;

  constructor(private pedidoService: PedidoService) {}

  ngOnInit() {
    this.carregarCardapio();
  }

  // 🔥 CARREGAR CARDÁPIO
  carregarCardapio() {
    this.pedidoService.getCardapio().subscribe({
      next: (res) => {
        console.log("Cardápio:", res);
        this.cardapio = res;
      },
      error: (err) => {
        console.error("Erro ao carregar cardápio:", err);
      }
    });
  }

  // 🔥 SELECIONAR ADICIONAL
  toggleAdicional(produtoId: string, adicional: any) {
    if (!this.adicionaisSelecionados[produtoId]) {
      this.adicionaisSelecionados[produtoId] = [];
    }

    const lista = this.adicionaisSelecionados[produtoId];

    const index = lista.findIndex((a: any) => a.id === adicional.id);

    if (index >= 0) {
      lista.splice(index, 1);
    } else {
      lista.push(adicional);
    }
  }

  // 🔥 ADICIONAR AO CARRINHO
adicionarCarrinho(produto: any) {

  const adicionais = this.adicionaisSelecionados[produto.id] || [];

  const itemExistente = this.carrinho.find(item =>
    item.produtoId === produto.id &&
    JSON.stringify(item.adicionais) === JSON.stringify(adicionais)
  );

  if (itemExistente) {
    itemExistente.quantidade++;
  } else {
    this.carrinho.push({
      produtoId: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      quantidade: 1,
      adicionais: adicionais
    });
  }

  this.calcularTotal();
}

  // 🔥 CALCULAR TOTAL
  calcularTotal() {
  this.total = 0;

  this.carrinho.forEach(item => {

    let precoProduto = Number(item.preco.toString().replace(",", "."));

    let subtotal = item.quantidade * precoProduto;

    item.adicionais.forEach((a: any) => {
      let precoAdicional = Number(a.preco.toString().replace(",", "."));
      subtotal += precoAdicional;
    });

    this.total += subtotal;
  });
}

  // 🔥 FINALIZAR PEDIDO
  finalizarPedido() {

    const clienteId = localStorage.getItem('clienteId');

    if (!clienteId) {
      alert("Erro: cliente não identificado");
      return;
    }

    const dto = {
      clienteId,
      itens: this.carrinho.map(item => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        adicionais: item.adicionais.map((a: any) => ({
          adicionalId: a.id
        }))
      }))
    };

    console.log("Enviando pedido:", dto);

    this.pedidoService.criarPedido(dto).subscribe({
      next: (res) => {
        console.log("Pedido criado:", res);

        alert('Pedido criado com sucesso! 🎉');

        this.carrinho = [];
        this.total = 0;
        this.adicionaisSelecionados = {};
      },
      error: (err) => {
        console.error("Erro ao criar pedido:", err);
        alert('Erro ao criar pedido');
      }
    });
  }
}
