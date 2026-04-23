import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService } from '../core/services/pedido.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <h1>Dashboard 🚀</h1>

      <button (click)="carregarPedidos()">🔄 Atualizar</button>
      <button routerLink="/criar-pedido"> ➕ Novo Pedido</button>

      <p *ngIf="loading">⏳ Carregando pedidos...</p>

      <p *ngIf="!loading && pedidos.length === 0">
        Nenhum pedido encontrado
      </p>

      <ul>
        <li *ngFor="let p of pedidos">
          🧾 Pedido: {{ p.id }} <br>
          📌 Status: <b>{{ p.status }}</b>
        </li>
      </ul>
    `
})
export class DashboardComponent implements OnInit {

  pedidos: any[] = [];
  loading: boolean = false;

  constructor(private pedidoService: PedidoService) {}

  ngOnInit() {
    this.carregarPedidos();
  }

  carregarPedidos() {
  this.loading = true;

  this.pedidoService.getPedidos().subscribe({
    next: (res) => {
      console.log("Resposta completa:", res);

      this.pedidos = res?.data ?? [];

      this.loading = false;
    },
    error: (err) => {
      console.error("Erro:", err);
      this.loading = false;
      }
    });
  }
}
