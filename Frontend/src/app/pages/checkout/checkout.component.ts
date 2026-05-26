import { Component, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { PedidoService } from '../../core/services/pedido.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
})
export class CheckoutComponent implements OnInit {

  carrinho: any[] = [];

  nome = '';

  telefone = '';

  endereco = '';

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

        produtoId: item.produtoId,

        quantidade: item.quantidade,

        adicionais: item.adicionais.map(
          (a: any) => ({
            adicionalId: a.id
          })
        )
      }))
    };

    console.log(dto);

    this.pedidoService.criarPedido(dto)
      .subscribe({

        next: () => {

          alert(
            'Pedido realizado com sucesso 🎉'
          );

          localStorage.removeItem(
            'carrinho'
          );

          window.location.href =
            '/cardapio';
        },

        error: (err) => {

          console.error(err);

          alert(
            'Erro ao finalizar pedido'
          );
        }
      });
  }
}
