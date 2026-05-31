import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmacao',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmacao.component.html',
  styleUrls: ['./confirmacao.component.css']
})
export class ConfirmacaoComponent implements OnInit {

  pedido: any = null;

  ngOnInit(): void {
    const pedidoStorage = localStorage.getItem('ultimoPedido');

    if (pedidoStorage) {
      this.pedido = JSON.parse(pedidoStorage);
    }
  }

  voltarCardapio(): void {
    window.location.href = '/cardapio';
  }

  falarWhatsapp(): void {
    const mensagem =
      `Olá! Acabei de fazer um pedido no Tim do Lelê. Pedido #${this.pedido?.codigo}`;

    window.open(
      `https://wa.me/5516999999999?text=${encodeURIComponent(mensagem)}`,
      '_blank'
    );
  }
}
