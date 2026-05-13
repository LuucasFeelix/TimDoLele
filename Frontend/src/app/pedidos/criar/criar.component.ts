import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../core/services/pedido.service';

@Component({
  selector: 'app-criar-pedido',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <h2>🍔 Criar Pedido</h2>

    <label>Categoria:</label>
    <select (change)="onCategoriaChange($event)">
      <option value="">Selecione</option>
      <option *ngFor="let c of cardapio" [value]="c.categoria">
        {{ c.categoria }}
      </option>
    </select>

    <br><br>

    <label>Produto:</label>
    <select [(ngModel)]="produtoSelecionado">
      <option *ngFor="let p of produtos" [ngValue]="p">
        {{ p.nome }} - R$ {{ p.preco }}
      </option>
    </select>

    <br><br>

    <div *ngIf="produtoSelecionado">
      <h4>Adicionais:</h4>

      <div *ngFor="let a of produtoSelecionado.adicionais">
        <input
          type="checkbox"
          (change)="toggleAdicional(a)"
        />
        {{ a.nome }} (+R$ {{ a.preco }})
      </div>
    </div>

    <br>

    <button (click)="criarPedido()">Finalizar Pedido</button>
  `
})
export class CriarPedidoComponent implements OnInit {

  cardapio: any[] = [];
  produtos: any[] = [];
  produtoSelecionado: any;
  adicionaisSelecionados: any[] = [];

  constructor(private pedidoService: PedidoService) {}

  ngOnInit() {
    this.pedidoService.getCardapio().subscribe({
      next: (res) => {
        console.log("Cardápio:", res);
        this.cardapio = res;
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  onCategoriaChange(event: any) {
    const categoria = this.cardapio.find(
      c => c.categoria === event.target.value
    );

    this.produtos = categoria?.produtos || [];
    this.produtoSelecionado = null;
    this.adicionaisSelecionados = [];
  }

  toggleAdicional(adicional: any) {
    const existe = this.adicionaisSelecionados.find(
      a => a.id === adicional.id
    );

    if (existe) {
      this.adicionaisSelecionados =
        this.adicionaisSelecionados.filter(
          a => a.id !== adicional.id
        );
    } else {
      this.adicionaisSelecionados.push(adicional);
    }
  }

  criarPedido() {

    if (!this.produtoSelecionado) {
      alert("Selecione um produto");
      return;
    }

    const dto = {
      clienteId:'02F607EE-1B60-4443-9379-BF8538780947',
      itens: [
        {
         produtoId: this.produtoSelecionado.id,
          quantidade: 1,
         adicionais: this.adicionaisSelecionados.map((a: any) => ({
            adicionalId: a.id
          }))
        }
      ]
    };

    console.log("Pedido enviado:", dto);

    this.pedidoService.criarPedido(dto).subscribe({
      next: (res) => {
        console.log("Pedido criado:", res);
        alert("Pedido criado com sucesso!");
      },
      error: (err) => {
        console.error("Erro detalhado:", err);
        console.log("Status:", err.status);
        console.log("Resposta backend:", err.error);
        alert("Erro ao criar pedido");
      }
    });
  }
}
