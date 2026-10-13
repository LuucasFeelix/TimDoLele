import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfiguracaoLojaService } from '../../core/services/configuracao-loja.service';

@Component({
  selector: 'app-confirmacao',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmacao.component.html',
  styleUrls: ['./confirmacao.component.css']
})
export class ConfirmacaoComponent implements OnInit {

  pedido: any = null;

  // WhatsApp cadastrado em Admin > Configurações > Contato da loja
  whatsAppLoja: string | null = null;

  constructor(
    private configuracaoLojaService: ConfiguracaoLojaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const pedidoStorage = localStorage.getItem('ultimoPedido');

    if (pedidoStorage) {
      this.pedido = JSON.parse(pedidoStorage);
    }

    this.configuracaoLojaService.obterStatusLoja().subscribe({
      next: (status) => {
        this.whatsAppLoja = status.whatsApp?.trim() || null;
        this.cdr.detectChanges();
      },
      error: (erro) => {
        // Sem o WhatsApp o botão só não aparece; a confirmação continua
        console.error('Erro ao carregar o WhatsApp da loja:', erro);
      }
    });
  }

  voltarCardapio(): void {
    window.location.href = '/cardapio';
  }

  falarWhatsapp(): void {
    if (!this.whatsAppLoja) {
      return;
    }

    let numeros = this.whatsAppLoja.replace(/\D/g, '');

    // (16) 99999-9999 -> 5516999999999
    if (numeros.length === 10 || numeros.length === 11) {
      numeros = `55${numeros}`;
    }

    const mensagem =
      `Olá! Acabei de fazer um pedido no Tim do Lelê. Pedido #${this.pedido?.codigo}`;

    window.open(
      `https://wa.me/${numeros}?text=${encodeURIComponent(mensagem)}`,
      '_blank'
    );
  }
}
