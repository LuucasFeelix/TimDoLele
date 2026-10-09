import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  PedidoService
} from '../../core/services/pedido.service';

import {
  ConfiguracaoLojaService,
  StatusLoja
} from '../../core/services/configuracao-loja.service';

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
export class CheckoutComponent
  implements OnInit, OnDestroy {

  etapa = 1;

  carrinho: any[] = [];

  nome = '';
  telefone = '';
  endereco = '';
  bairro = '';
  referencia = '';

  tipoEntrega = 2;

  formaPagamento = 1;

  trocoPara = '';

  taxaEntrega = 5;

  statusLoja: StatusLoja | null = null;

  lojaFechadaVisivel = false;

  // Popup de produto que foi desativado
  produtoIndisponivelVisivel = false;

  mensagemProdutoIndisponivel = '';

  nomeProdutoIndisponivel: string | null = null;

  verificandoLoja = false;

  finalizandoPedido = false;

  private intervaloStatus:
    ReturnType<typeof setInterval> | null = null;

  constructor(
    private pedidoService:
      PedidoService,

    private configuracaoLojaService:
      ConfiguracaoLojaService,

    private cdr:
      ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    const carrinhoStorage =
      localStorage.getItem(
        'carrinho'
      );

    if (carrinhoStorage) {

      this.carrinho =
        JSON.parse(
          carrinhoStorage
        );
    }

    this.verificarStatusLoja();

    this.iniciarMonitoramentoLoja();
  }

  ngOnDestroy(): void {

    if (this.intervaloStatus) {

      clearInterval(
        this.intervaloStatus
      );

      this.intervaloStatus =
        null;
    }
  }

  private iniciarMonitoramentoLoja(): void {

    if (this.intervaloStatus) {

      clearInterval(
        this.intervaloStatus
      );
    }

    this.intervaloStatus =
      setInterval(
        () => {

          this.verificarStatusLoja();

        },
        30000
      );
  }

  private verificarStatusLoja(): void {

    this.configuracaoLojaService
      .obterStatusLoja()
      .subscribe({

        next: (
          status
        ) => {

          const estavaAberta =
            this.statusLoja?.aberta === true;

          this.statusLoja =
            status;

          this.taxaEntrega =
            status.taxaEntrega;

          if (
            estavaAberta &&
            !status.aberta
          ) {

            this.lojaFechadaVisivel =
              true;
          }

          this.cdr.detectChanges();
        },

        error: (
          erro
        ) => {

          console.error(
            'Erro ao verificar status da loja:',
            erro
          );
        }
      });
  }

  get lojaAberta(): boolean {

    return (
      this.statusLoja?.aberta ===
      true
    );
  }

  voltar(): void {

    if (this.etapa > 1) {

      this.etapa--;

      return;
    }

    window.location.href =
      '/cardapio';
  }

  irParaEtapa(
    etapa: number
  ): void {

    if (!this.lojaAberta) {

      this.lojaFechadaVisivel =
        true;

      this.cdr.detectChanges();

      return;
    }

    if (
      etapa === 2 &&
      this.carrinho.length === 0
    ) {

      alert(
        'Carrinho vazio.'
      );

      return;
    }

    if (
      etapa === 3 &&
      !this.dadosValidos()
    ) {

      return;
    }

    this.etapa =
      etapa;
  }

  selecionarTipoEntrega(
    tipo: number
  ): void {

    this.tipoEntrega =
      tipo;

    if (tipo === 1) {

      this.endereco =
        '';

      this.bairro =
        '';

      this.referencia =
        '';
    }
  }

  selecionarFormaPagamento(
    forma: number
  ): void {

    this.formaPagamento =
      forma;

    if (forma !== 2) {

      this.trocoPara =
        '';
    }
  }

  isDelivery(): boolean {

    return (
      this.tipoEntrega ===
      2
    );
  }

  isDinheiro(): boolean {

    return (
      this.formaPagamento ===
      2
    );
  }

  getTaxaEntrega(): number {

    return this.isDelivery()
      ? this.taxaEntrega
      : 0;
  }

  obterFormaPagamentoTexto():
    string {

    if (
      this.formaPagamento ===
      1
    ) {

      return 'PIX';
    }

    if (
      this.formaPagamento ===
      2
    ) {

      return 'Dinheiro';
    }

    if (
      this.formaPagamento ===
      3
    ) {

      return 'Cartão Crédito';
    }

    return 'Cartão Débito';
  }

  quantidadeTotal(): number {

    return this.carrinho.reduce(
      (
        total,
        item
      ) =>
        total +
        item.quantidade,
      0
    );
  }

  aumentarQuantidade(
    item: any
  ): void {

    if (!this.lojaAberta) {

      this.lojaFechadaVisivel =
        true;

      return;
    }

    item.quantidade++;

    this.salvarCarrinho();
  }

  diminuirQuantidade(
    item: any
  ): void {

    if (!this.lojaAberta) {

      this.lojaFechadaVisivel =
        true;

      return;
    }

    if (
      item.quantidade > 1
    ) {

      item.quantidade--;

    } else {

      this.removerItem(
        item
      );
    }

    this.salvarCarrinho();
  }

  removerItem(
    item: any
  ): void {

    this.carrinho =
      this.carrinho.filter(
        x => x !== item
      );

    this.salvarCarrinho();
  }

  salvarCarrinho(): void {

    localStorage.setItem(
      'carrinho',
      JSON.stringify(
        this.carrinho
      )
    );
  }

  calcularItemTotal(
    item: any
  ): string {

    let total =
      Number(
        item.preco
          .toString()
          .replace(
            ',',
            '.'
          )
      );

    item.adicionais
      ?.forEach(
        (
          adicional: any
        ) => {

          total +=
            Number(
              adicional.preco
                .toString()
                .replace(
                  ',',
                  '.'
                )
            );
        }
      );

    total *=
      item.quantidade;

    return total
      .toFixed(2)
      .replace(
        '.',
        ','
      );
  }

  calcularSubtotal(): string {

    let total = 0;

    this.carrinho.forEach(
      item => {

        let subtotal =
          Number(
            item.preco
              .toString()
              .replace(
                ',',
                '.'
              )
          );

        item.adicionais
          ?.forEach(
            (
              adicional: any
            ) => {

              subtotal +=
                Number(
                  adicional.preco
                    .toString()
                    .replace(
                      ',',
                      '.'
                    )
                );
            }
          );

        total +=
          subtotal *
          item.quantidade;
      }
    );

    return total
      .toFixed(2)
      .replace(
        '.',
        ','
      );
  }

  calcularTotal(): string {

    const subtotal =
      Number(
        this.calcularSubtotal()
          .replace(
            ',',
            '.'
          )
      );

    return (
      subtotal +
      this.getTaxaEntrega()
    )
      .toFixed(2)
      .replace(
        '.',
        ','
      );
  }

  // Aceita só números, no máximo 11 (DDD + 9 dígitos),
  // e formata enquanto digita: (16) 99261-8003
  aoDigitarTelefone(
    event: Event
  ): void {

    const input =
      event.target as HTMLInputElement;

    const numeros =
      input.value
        .replace(
          /\D/g,
          ''
        )
        .substring(
          0,
          11
        );

    const formatado =
      this.formatarTelefone(
        numeros
      );

    input.value =
      formatado;

    this.telefone =
      formatado;
  }

  private formatarTelefone(
    numeros: string
  ): string {

    if (numeros.length === 0) {
      return '';
    }

    if (numeros.length <= 2) {
      return `(${numeros}`;
    }

    const ddd =
      numeros.substring(0, 2);

    const resto =
      numeros.substring(2);

    if (resto.length <= 4) {
      return `(${ddd}) ${resto}`;
    }

    // Celular (9 dígitos): 99261-8003
    if (resto.length === 9) {
      return `(${ddd}) ${resto.substring(0, 5)}-${resto.substring(5)}`;
    }

    // Fixo (8 dígitos) ou ainda digitando: 3663-3366
    return `(${ddd}) ${resto.substring(0, 4)}-${resto.substring(4)}`;
  }

  dadosValidos(): boolean {

    if (
      !this.nome ||
      !this.telefone
    ) {

      alert(
        'Preencha nome e WhatsApp.'
      );

      return false;
    }

    const digitosTelefone =
      this.telefone.replace(
        /\D/g,
        ''
      ).length;

    if (
      digitosTelefone !== 10 &&
      digitosTelefone !== 11
    ) {

      alert(
        'Informe um WhatsApp válido com DDD. Ex.: (16) 99999-9999'
      );

      return false;
    }

    if (
      this.isDelivery() &&
      (
        !this.endereco ||
        !this.bairro
      )
    ) {

      alert(
        'Informe endereço e bairro para delivery.'
      );

      return false;
    }

    return true;
  }

  finalizarPedido(): void {

    if (
      this.finalizandoPedido ||
      this.verificandoLoja
    ) {

      return;
    }

    if (
      !this.dadosValidos()
    ) {

      return;
    }

    if (
      this.carrinho.length ===
      0
    ) {

      alert(
        'Carrinho vazio.'
      );

      return;
    }

    this.verificandoLoja =
      true;

    this.configuracaoLojaService
      .obterStatusLoja()
      .subscribe({

        next: (
          status
        ) => {

          this.statusLoja =
            status;

          this.taxaEntrega =
            status.taxaEntrega;

          this.verificandoLoja =
            false;

          if (
            !status.aberta
          ) {

            this.lojaFechadaVisivel =
              true;

            this.cdr.detectChanges();

            return;
          }

          this.enviarPedido();
        },

        error: (
          erro
        ) => {

          console.error(
            'Erro ao verificar funcionamento da loja:',
            erro
          );

          this.verificandoLoja =
            false;

          alert(
            'Não foi possível verificar se a loja está aberta. Tente novamente.'
          );

          this.cdr.detectChanges();
        }
      });
  }

  private enviarPedido(): void {

    if (
      this.finalizandoPedido
    ) {

      return;
    }

    const enderecoFinal =
      this.isDelivery()

        ? `${this.endereco} - ${this.bairro}${this.referencia
            ? ' - Ref: ' +
              this.referencia
            : ''
          }`

        : '';

    const dto = {

      nome:
        this.nome,

      telefone:
        this.telefone,

      endereco:
        enderecoFinal,

      tipoEntrega:
        this.tipoEntrega,

      formaPagamento:
        this.formaPagamento,

      trocoPara:
        this.isDinheiro() &&
        this.trocoPara

          ? Number(
              this.trocoPara
            )

          : null,

      itens:
        this.carrinho.map(
          item => ({

            produtoId:
              item.produtoId,

            quantidade:
              item.quantidade,

            adicionais:
              (
                item.adicionais ??
                []
              ).map(
                (
                  adicional: any
                ) => ({

                  adicionalId:
                    adicional.id
                })
              )
          })
        )
    };

    this.finalizandoPedido =
      true;

    this.pedidoService
      .criarPedido(
        dto
      )
      .subscribe({

        next: (
          res: any
        ) => {

          localStorage.setItem(
            'ultimoPedido',
            JSON.stringify({

              nome:
                this.nome,

              telefone:
                this.telefone,

              endereco:
                this.isDelivery()

                  ? enderecoFinal

                  : 'Retirada na loja',

              tipoEntrega:
                this.isDelivery()

                  ? 'Delivery'

                  : 'Retirada',

              formaPagamento:
                this.obterFormaPagamentoTexto(),

              trocoPara:
                this.trocoPara,

              taxaEntrega:
                this.getTaxaEntrega(),

              total:
                this.calcularTotal(),

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

          // Guarda os itens para o "Pedir de novo" do cardápio
          localStorage.setItem(
            'ultimoPedidoItens',
            JSON.stringify({

              data:
                new Date().toISOString(),

              itens:
                this.carrinho
            })
          );

          localStorage.removeItem(
            'carrinho'
          );

          window.location.href =
            '/confirmacao';
        },

        error: (
          err: any
        ) => {

          console.error(
            'Erro ao finalizar pedido:',
            err
          );

          this.finalizandoPedido =
            false;

          if (
            this.erroIndicaLojaFechada(
              err
            )
          ) {

            this.atualizarStatusAposFechamento();

            return;
          }

          // Erro 400 traz uma mensagem pensada para o cliente
          // (ex.: produto que não está mais disponível)
          const mensagemApi =
            err?.status === 400
              ? err?.error?.Message ??
                err?.error?.message
              : null;

          if (
            mensagemApi?.includes(
              'não está mais disponível'
            )
          ) {

            this.abrirPopupProdutoIndisponivel(
              mensagemApi
            );

            return;
          }

          alert(
            mensagemApi ||
            'Não foi possível finalizar seu pedido. Tente novamente.'
          );

          this.cdr.detectChanges();
        }
      });
  }

  private abrirPopupProdutoIndisponivel(
    mensagem: string
  ): void {

    // A mensagem da API traz o nome entre aspas:
    // O produto "X - Frango" não está mais disponível...
    const nome =
      mensagem.match(
        /"(.+?)"/
      )?.[1] ?? null;

    this.nomeProdutoIndisponivel =
      nome;

    this.mensagemProdutoIndisponivel =
      nome
        ? `O produto "${nome}" foi retirado do cardápio e não pode mais ser pedido.`
        : mensagem;

    this.produtoIndisponivelVisivel =
      true;

    this.cdr.detectChanges();
  }

  get produtoIndisponivelNoCarrinho(): boolean {

    return (
      !!this.nomeProdutoIndisponivel &&
      this.carrinho.some(
        item =>
          item.nome ===
          this.nomeProdutoIndisponivel
      )
    );
  }

  removerProdutoIndisponivel(): void {

    this.carrinho =
      this.carrinho.filter(
        item =>
          item.nome !==
          this.nomeProdutoIndisponivel
      );

    this.salvarCarrinho();

    this.fecharPopupProdutoIndisponivel();

    if (
      this.carrinho.length === 0
    ) {

      this.voltarCardapio();
    }
  }

  fecharPopupProdutoIndisponivel(): void {

    this.produtoIndisponivelVisivel =
      false;

    this.nomeProdutoIndisponivel =
      null;

    this.cdr.detectChanges();
  }

  private erroIndicaLojaFechada(
    erro: any
  ): boolean {

    const conteudo =
      JSON.stringify(
        erro?.error ??
        erro ??
        ''
      )
        .toLowerCase();

    return (
      conteudo.includes(
        'loja fechada'
      ) ||
      conteudo.includes(
        'loja está fechada'
      ) ||
      conteudo.includes(
        'loja esta fechada'
      ) ||
      conteudo.includes(
        'fechada no momento'
      )
    );
  }

  private atualizarStatusAposFechamento():
    void {

    this.configuracaoLojaService
      .obterStatusLoja()
      .subscribe({

        next: (
          status
        ) => {

          this.statusLoja =
            status;

          this.lojaFechadaVisivel =
            true;

          this.cdr.detectChanges();
        },

        error: () => {

          this.lojaFechadaVisivel =
            true;

          this.cdr.detectChanges();
        }
      });
  }

  fecharAvisoLojaFechada():
    void {

    this.lojaFechadaVisivel =
      false;

    this.cdr.detectChanges();
  }

  voltarCardapio(): void {

    window.location.href =
      '/cardapio';
  }
}
