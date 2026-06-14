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
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {

  carrinho: any[] = [];

  nome = '';
  telefone = '';
  endereco = '';

  tipoEntrega = 2; // 1 = Retirada, 2 = Delivery
  formaPagamento = 1; // 1 = Pix, 2 = Dinheiro, 3 = Crédito, 4 = Débito

  trocoPara = '';

  taxaEntrega = 5;

  constructor(
    private pedidoService: PedidoService
  ) { }

  ngOnInit(): void {
    const carrinhoStorage = localStorage.getItem('carrinho');

    if (carrinhoStorage) {
      this.carrinho = JSON.parse(carrinhoStorage);
    }
  }

  selecionarTipoEntrega(tipo: number): void {
    this.tipoEntrega = tipo;

    if (this.tipoEntrega === 1) {
      this.endereco = '';
    }
  }

  selecionarFormaPagamento(forma: number): void {
    this.formaPagamento = forma;

    if (forma !== 2) {
      this.trocoPara = '';
    }
  }

  isDelivery(): boolean {
    return this.tipoEntrega === 2;
  }

  isDinheiro(): boolean {
    return this.formaPagamento === 2;
  }

  getTaxaEntrega(): number {
    return this.isDelivery() ? this.taxaEntrega : 0;
  }

  obterFormaPagamentoTexto(): string {
    if (this.formaPagamento === 1) return 'PIX';
    if (this.formaPagamento === 2) return 'Dinheiro';
    if (this.formaPagamento === 3) return 'Cartão Crédito';

    return 'Cartão Débito';
  }

  calcularItemTotal(item: any): string {
    let total = Number(
      item.preco.toString().replace(',', '.')
    );

    item.adicionais?.forEach((a: any) => {
      total += Number(
        a.preco.toString().replace(',', '.')
      );
    });

    total *= item.quantidade;

    return total
      .toFixed(2)
      .replace('.', ',');
  }

  calcularSubtotal(): string {
    let total = 0;

    this.carrinho.forEach(item => {
      let subtotal = Number(
        item.preco.toString().replace(',', '.')
      );

      item.adicionais?.forEach((a: any) => {
        subtotal += Number(
          a.preco.toString().replace(',', '.')
        );
      });

      total += subtotal * item.quantidade;
    });

    return total
      .toFixed(2)
      .replace('.', ',');
  }

  calcularTotal(): string {
    const subtotal = Number(
      this.calcularSubtotal().replace(',', '.')
    );

    return (subtotal + this.getTaxaEntrega())
      .toFixed(2)
      .replace('.', ',');
  }

  voltarCardapio(): void {
    window.location.href = '/cardapio';
  }

  finalizarPedido(): void {
    if (!this.nome || !this.telefone) {
      alert('Preencha nome e telefone.');
      return;
    }

    if (this.isDelivery() && !this.endereco) {
      alert('Informe o endereço para delivery.');
      return;
    }

    if (this.carrinho.length === 0) {
      alert('Carrinho vazio.');
      return;
    }

    const dto = {
      nome: this.nome,
      telefone: this.telefone,
      endereco: this.isDelivery() ? this.endereco : '',
      tipoEntrega: this.tipoEntrega,
      formaPagamento: this.formaPagamento,
      trocoPara: this.isDinheiro() && this.trocoPara
        ? Number(this.trocoPara)
        : null,

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

    console.log('PEDIDO ENVIADO:', dto);

    this.pedidoService.criarPedido(dto)
      .subscribe({
        next: (res: any) => {
          console.log('RESPOSTA PEDIDO:', res);

          localStorage.setItem(
            'ultimoPedido',
            JSON.stringify({
              nome: this.nome,
              telefone: this.telefone,
              endereco: this.isDelivery() ? this.endereco : 'Retirada na loja',
              tipoEntrega: this.isDelivery() ? 'Delivery' : 'Retirada',
              formaPagamento: this.obterFormaPagamentoTexto(),
              trocoPara: this.trocoPara,
              taxaEntrega: this.getTaxaEntrega(),
              total: this.calcularTotal(),
              codigo:
                res?.data?.codigo ??
                res?.data?.pedidoCodigo ??
                res?.codigo ??
                res?.pedidoCodigo ??
                res?.data?.pedidoId ??
                res?.pedidoId ??
                '0000'
            })
          );

          localStorage.removeItem('carrinho');

          window.location.href = '/confirmacao';
        },
        error: (err: any) => {
          console.error(err);

          alert('Erro ao finalizar pedido');
        }
      });
  }
}
