import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import {
  forkJoin
} from 'rxjs';

import {
  PedidoService
} from '../../core/services/pedido.service';

import {
  ConfiguracaoLojaService,
  StatusLoja
} from '../../core/services/configuracao-loja.service';

import {
  ProdutoModalComponent
} from '../produto-modal/produto-modal.component';

@Component({
  selector: 'app-cardapio',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ProdutoModalComponent
  ],
  templateUrl: './cardapio.component.html',
  styleUrls: ['./cardapio.component.css']
})
export class CardapioComponent
  implements OnInit, OnDestroy {

  cardapio: any[] = [];

  carrinho: any[] = [];

  produtoSelecionado: any = null;

  categoriaSelecionada = 'Todos';

  statusLoja: StatusLoja | null = null;

  carregando = true;

  erroCarregamento = false;

  minutosParaFechar: number | null = null;

  popupFechamentoVisivel = false;

  popupLojaFechadaVisivel = false;

  avisoFechamentoFechado = false;

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

    this.carregarPagina();

    this.iniciarMonitoramento();
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

  carregarPagina(): void {

    this.carregando = true;

    this.erroCarregamento = false;

    forkJoin({

      cardapio:
        this.pedidoService
          .getCardapio(),

      statusLoja:
        this.configuracaoLojaService
          .obterStatusLoja()

    })
      .subscribe({

        next: (resultado: any) => {

          this.cardapio = [
            ...resultado.cardapio
          ];

          this.aplicarStatusLoja(
            resultado.statusLoja
          );

          this.carregando = false;

          this.cdr.detectChanges();
        },

        error: (erro: any) => {

          console.error(
            'Erro ao carregar o cardápio:',
            erro
          );

          this.carregando = false;

          this.erroCarregamento = true;

          this.cdr.detectChanges();
        }
      });
  }

  private iniciarMonitoramento(): void {

    if (this.intervaloStatus) {

      clearInterval(
        this.intervaloStatus
      );
    }

    this.intervaloStatus =
      setInterval(
        () => {

          this.atualizarTempoFechamento();

        },
        1000
      );
  }

  private aplicarStatusLoja(
    status: StatusLoja
  ): void {

    const estavaAberta =
      this.statusLoja?.aberta === true;

    this.statusLoja =
      status;

    if (!status.aberta) {

      this.minutosParaFechar =
        null;

      this.popupFechamentoVisivel =
        false;

      if (estavaAberta) {

        this.popupLojaFechadaVisivel =
          true;
      }

      this.cdr.detectChanges();

      return;
    }

    this.popupLojaFechadaVisivel =
      false;

    this.avisoFechamentoFechado =
      false;

    this.atualizarTempoFechamento();

    this.cdr.detectChanges();
  }

  private atualizarTempoFechamento(): void {

    if (
      !this.statusLoja?.aberta ||
      !this.statusLoja.horaFechamento ||
      !this.statusLoja.horaAbertura
    ) {

      this.minutosParaFechar =
        null;

      this.cdr.detectChanges();

      return;
    }

    const agora =
      new Date();

    const partesAbertura =
      this.statusLoja
        .horaAbertura
        .split(':');

    const partesFechamento =
      this.statusLoja
        .horaFechamento
        .split(':');

    if (
      partesAbertura.length < 2 ||
      partesFechamento.length < 2
    ) {

      this.minutosParaFechar =
        null;

      this.cdr.detectChanges();

      return;
    }

    const horaAbertura =
      Number(
        partesAbertura[0]
      );

    const minutoAbertura =
      Number(
        partesAbertura[1]
      );

    const horaFechamento =
      Number(
        partesFechamento[0]
      );

    const minutoFechamento =
      Number(
        partesFechamento[1]
      );

    const aberturaEmMinutos =
      horaAbertura * 60 +
      minutoAbertura;

    const fechamentoEmMinutos =
      horaFechamento * 60 +
      minutoFechamento;

    const agoraEmMinutos =
      agora.getHours() * 60 +
      agora.getMinutes();

    const atravessaMeiaNoite =
      fechamentoEmMinutos <=
      aberturaEmMinutos;

    const fechamento =
      new Date(
        agora.getFullYear(),
        agora.getMonth(),
        agora.getDate(),
        horaFechamento,
        minutoFechamento,
        0,
        0
      );

    if (
      atravessaMeiaNoite &&
      agoraEmMinutos >= aberturaEmMinutos
    ) {

      fechamento.setDate(
        fechamento.getDate() + 1
      );
    }

    const diferencaMs =
      fechamento.getTime() -
      agora.getTime();

    const minutos =
      Math.ceil(
        diferencaMs / 60000
      );

    if (
      minutos <= 0
    ) {

      this.minutosParaFechar =
        0;

      this.popupFechamentoVisivel =
        false;

      this.verificarStatusAgora();

      this.cdr.detectChanges();

      return;
    }

    this.minutosParaFechar =
      minutos;

    if (
      minutos <= 5 &&
      !this.avisoFechamentoFechado
    ) {

      this.popupFechamentoVisivel =
        true;
    }

    this.cdr.detectChanges();
  }

  private verificarStatusAgora(): void {

    this.configuracaoLojaService
      .obterStatusLoja()
      .subscribe({

        next: (
          status
        ) => {

          const estavaAberta =
            this.statusLoja?.aberta ===
            true;

          this.statusLoja =
            status;

          if (
            estavaAberta &&
            !status.aberta
          ) {

            this.popupFechamentoVisivel =
              false;

            this.popupLojaFechadaVisivel =
              true;

            this.minutosParaFechar =
              null;

            this.cdr.detectChanges();

            return;
          }

          if (
            status.aberta
          ) {

            this.atualizarTempoFechamento();

          } else {

            this.minutosParaFechar =
              null;

            this.popupFechamentoVisivel =
              false;
          }

          this.cdr.detectChanges();
        },

        error: (
          erro
        ) => {

          console.error(
            'Erro ao atualizar status da loja:',
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

  get mostrarAvisoDiscreto(): boolean {

    return (
      this.lojaAberta &&
      this.minutosParaFechar !== null &&
      this.minutosParaFechar <= 30 &&
      this.minutosParaFechar > 10
    );
  }

  get mostrarAvisoDestacado(): boolean {

    return (
      this.lojaAberta &&
      this.minutosParaFechar !== null &&
      this.minutosParaFechar <= 10 &&
      this.minutosParaFechar > 0
    );
  }

  fecharPopupFechamento(): void {

    this.popupFechamentoVisivel =
      false;

    this.avisoFechamentoFechado =
      true;

    this.cdr.detectChanges();
  }

  fecharPopupLojaFechada(): void {

    this.popupLojaFechadaVisivel =
      false;

    this.cdr.detectChanges();
  }

  get categorias(): string[] {

    return [
      'Todos',
      ...this.cardapio.map(
        c => c.categoria
      )
    ];
  }

  get cardapioFiltrado(): any[] {

    if (
      this.categoriaSelecionada ===
      'Todos'
    ) {

      return this.cardapio;
    }

    return this.cardapio.filter(
      c =>
        c.categoria ===
        this.categoriaSelecionada
    );
  }

  selecionarCategoria(
    categoria: string
  ): void {

    this.categoriaSelecionada =
      categoria;
  }

  abrirProduto(
    produto: any
  ): void {

    if (!this.lojaAberta) {

      this.popupLojaFechadaVisivel =
        true;

      this.cdr.detectChanges();

      return;
    }

    this.produtoSelecionado =
      produto;
  }

  fecharModal(): void {

    this.produtoSelecionado =
      null;
  }

  adicionarAoCarrinho(
    item: any
  ): void {

    if (!this.lojaAberta) {

      this.popupLojaFechadaVisivel =
        true;

      this.cdr.detectChanges();

      return;
    }

    const itemExistente =
      this.carrinho.find(
        x =>
          x.produtoId ===
            item.produtoId &&

          JSON.stringify(
            x.adicionais
          ) ===
          JSON.stringify(
            item.adicionais
          ) &&

          x.observacao ===
            item.observacao
      );

    if (
      itemExistente
    ) {

      itemExistente.quantidade +=
        item.quantidade;

    } else {

      this.carrinho.push(
        item
      );
    }

    this.produtoSelecionado =
      null;
  }

  irCheckout(): void {

    this.configuracaoLojaService
      .obterStatusLoja()
      .subscribe({

        next: (
          status
        ) => {

          this.statusLoja =
            status;

          if (
            !status.aberta
          ) {

            this.popupLojaFechadaVisivel =
              true;

            this.cdr.detectChanges();

            return;
          }

          if (
            this.carrinho.length ===
            0
          ) {

            alert(
              'Carrinho vazio'
            );

            return;
          }

          localStorage.setItem(
            'carrinho',
            JSON.stringify(
              this.carrinho
            )
          );

          window.location.href =
            '/checkout';
        },

        error: (
          erro
        ) => {

          console.error(
            'Erro ao validar funcionamento da loja:',
            erro
          );

          alert(
            'Não foi possível verificar o funcionamento da loja.'
          );
        }
      });
  }

  aumentarQuantidade(
    item: any
  ): void {

    if (!this.lojaAberta) {

      return;
    }

    item.quantidade++;
  }

  diminuirQuantidade(
    item: any
  ): void {

    if (!this.lojaAberta) {

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
  }

  removerItem(
    item: any
  ): void {

    this.carrinho =
      this.carrinho.filter(
        x => x !== item
      );
  }

  calcularTotal(): string {

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

  quantidadeTotalCarrinho(): number {

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
}
