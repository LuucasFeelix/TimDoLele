import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PedidoService } from '../../core/services/pedido.service';

@Component({
  selector: 'app-criar-pedido',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h1>📦 Checkout</h1>

    <div *ngFor="let item of carrinho">

      <p>
        {{ item.nome }}
        -
        Quantidade: {{ item.quantidade }}
      </p>

    </div>

    <hr>

    <h2>👤 Dados do Cliente</h2>

    <input
      type="text"
      [(ngModel)]="nome"
      placeholder="Seu nome"
    />

    <br><br>

    <input
      type="text"
      [(ngModel)]="telefone"
      placeholder="Telefone"
    />

    <br><br>

    <input
      type="text"
      [(ngModel)]="endereco"
      placeholder="Endereço"
    />

    <br><br>

    <button (click)="finalizarPedido()">
      🚀 Confirmar Pedido
    </button>
  `
})
export class CriarPedidoComponent implements OnInit {

  carrinho: any[] = [];

  nome: string = '';

  telefone: string = '';

  endereco: string = '';

  constructor(
    private pedidoService: PedidoService
  ) {}

  ngOnInit(): void {

    const carrinhoStorage =
      localStorage.getItem('carrinho');

    if (carrinhoStorage) {

      this.carrinho =
        JSON.parse(carrinhoStorage);
    }
  }

  finalizarPedido(): void {

    const dto = {

      nome: this.nome,

      telefone: this.telefone,

      endereco: this.endereco,

      itens: this.carrinho.map(item => ({

        produtoId: item.id,

        quantidade: item.quantidade,

        adicionais: []
      }))
    };

    console.log(dto);

    this.pedidoService.criarPedido(dto)
      .subscribe({

        next: () => {

          alert('Pedido realizado com sucesso! 🎉');

          localStorage.removeItem('carrinho');

          window.location.href = '/cardapio';
        },

        error: (err) => {

          console.error(err);

          alert('Erro ao finalizar pedido');
        }
      });
  }
}
