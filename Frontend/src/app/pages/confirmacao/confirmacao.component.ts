import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfiguracaoLojaService } from '../../core/services/configuracao-loja.service';
import { DinheiroPipe } from '../../shared/pipes/dinheiro.pipe';

@Component({
  selector: 'app-confirmacao',
  standalone: true,
  imports: [CommonModule, DinheiroPipe],
  templateUrl: './confirmacao.component.html',
  styleUrls: ['./confirmacao.component.css']
})
export class ConfirmacaoComponent implements OnInit {

  pedido: any = null;

  // WhatsApp cadastrado em Admin > Configurações > Contato da loja
  whatsAppLoja: string | null = null;

  // "45 a 60 min" (entrega) ou "20 a 30 min" (retirada)
  prazo: string | null = null;

  get ehRetirada(): boolean {
    return this.pedido?.tipoEntrega === 'Retirada';
  }

  constructor(
    private configuracaoLojaService: ConfiguracaoLojaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const pedidoStorage = localStorage.getItem('ultimoPedido');

    if (pedidoStorage) {
      this.pedido = JSON.parse(pedidoStorage);
    }

    // Prazo salvo no momento do pedido (o que o cliente viu no checkout)
    this.prazo = this.pedido?.prazo ?? null;

    this.configuracaoLojaService.obterStatusLoja().subscribe({
      next: (status) => {
        this.whatsAppLoja = status.whatsApp?.trim() || null;

        // Pedido antigo, sem prazo salvo: usa o prazo atual da loja
        if (!this.prazo && this.pedido) {
          const minimo = this.ehRetirada ? status.prazoRetiradaMin : status.prazoEntregaMin;
          const maximo = this.ehRetirada ? status.prazoRetiradaMax : status.prazoEntregaMax;

          this.prazo = minimo === maximo
            ? `${minimo} min`
            : `${minimo} a ${maximo} min`;
        }

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
      this.pedido?.codigo
        ? `Olá! Acabei de fazer um pedido no Tim do Lelê. Pedido #${this.pedido.codigo}`
        : 'Olá! Acabei de fazer um pedido no Tim do Lelê.';

    window.open(
      `https://wa.me/${numeros}?text=${encodeURIComponent(mensagem)}`,
      '_blank'
    );
  }
}
