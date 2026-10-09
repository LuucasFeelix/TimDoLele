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
  ProdutoService
} from '../../core/services/produto.service';

import {
  nomeAdicional,
  separarItensPersonalizados,
  temPersonalizacao,
  valorUnitarioItem
} from '../../core/utils/carrinho.utils';

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

  // "Pedir de novo": itens do último pedido feito neste aparelho
  ultimoPedidoItens: any[] = [];

  ultimoPedidoData: string | null = null;

  mensagemPedirDeNovo: string | null = null;

  private intervaloStatus:
    ReturnType<typeof setInterval> | null = null;

  constructor(
    private pedidoService:
      PedidoService,

    private produtoService:
      ProdutoService,

    private configuracaoLojaService:
      ConfiguracaoLojaService,

    private cdr:
      ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    this.carregarCarrinhoSalvo();

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

          // Atualiza o carrinho salvo com preços atuais
          // e tira produtos que saíram do cardápio
          const sincronizado =
            this.sincronizarItens(
              this.carrinho
            );

          this.carrinho =
            separarItensPersonalizados(
              sincronizado.itens
            );

          this.salvarCarrinho();

          this.carregarUltimoPedido();

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

  urlImagem(
    produto: any
  ): string | null {

    return this.produtoService.urlImagem(
      produto?.imagemUrl
    );
  }

  get telefoneFixo(): string | null {

    return (
      this.statusLoja?.telefoneFixo?.trim() ||
      null
    );
  }

  get celular(): string | null {

    return (
      this.statusLoja?.celular?.trim() ||
      null
    );
  }

  get temTelefoneContato(): boolean {

    return (
      !!this.telefoneFixo ||
      !!this.celular
    );
  }

  // Monta o link "tel:" só com números.
  // Ex.: "(16) 99999-9999" -> "tel:+5516999999999"
  linkTelefone(
    telefone: string
  ): string {

    const numeros =
      telefone.replace(
        /\D/g,
        ''
      );

    if (
      numeros.length === 10 ||
      numeros.length === 11
    ) {

      return `tel:+55${numeros}`;
    }

    return `tel:${numeros}`;
  }

  // Formata para exibição.
  // Ex.: "1636633366"  -> "(16) 3663-3366"
  //      "16992618003" -> "(16) 99261-8003"
  formatarTelefone(
    telefone: string
  ): string {

    let numeros =
      telefone.replace(
        /\D/g,
        ''
      );

    // Remove o +55 se vier junto
    if (
      numeros.length > 11 &&
      numeros.startsWith('55')
    ) {

      numeros =
        numeros.substring(2);
    }

    if (numeros.length === 11) {

      return numeros.replace(
        /(\d{2})(\d{5})(\d{4})/,
        '($1) $2-$3'
      );
    }

    if (numeros.length === 10) {

      return numeros.replace(
        /(\d{2})(\d{4})(\d{4})/,
        '($1) $2-$3'
      );
    }

    // Formato desconhecido: mostra como foi cadastrado
    return telefone;
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

    // Lanche com adicional/observação: uma linha por unidade
    // (ex.: 2x X-Tudo + Bacon vira duas linhas de 1x)
    if (
      temPersonalizacao(
        item
      )
    ) {

      this.carrinho.push(
        ...separarItensPersonalizados([
          item
        ])
      );

      this.salvarCarrinho();

      this.produtoSelecionado =
        null;

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

    this.salvarCarrinho();

    this.produtoSelecionado =
      null;
  }

  // =====================================================
  // CARRINHO SALVO NO NAVEGADOR
  // (o checkout lê o mesmo 'carrinho')
  // =====================================================

  private carregarCarrinhoSalvo(): void {

    try {

      const salvo =
        localStorage.getItem(
          'carrinho'
        );

      this.carrinho =
        salvo
          ? JSON.parse(salvo)
          : [];

    } catch {

      this.carrinho = [];
    }
  }

  private salvarCarrinho(): void {

    localStorage.setItem(
      'carrinho',
      JSON.stringify(
        this.carrinho
      )
    );
  }

  // =====================================================
  // PEDIR DE NOVO
  // =====================================================

  private carregarUltimoPedido(): void {

    try {

      const salvo =
        localStorage.getItem(
          'ultimoPedidoItens'
        );

      if (!salvo) {
        return;
      }

      const ultimo =
        JSON.parse(salvo);

      // Mostra só o que ainda está no cardápio
      this.ultimoPedidoItens =
        this.sincronizarItens(
          ultimo.itens
        ).itens;

      this.ultimoPedidoData =
        ultimo.data ?? null;

    } catch {

      this.ultimoPedidoItens = [];
    }
  }

  get ultimoPedidoDataTexto(): string {

    if (!this.ultimoPedidoData) {
      return '';
    }

    const data =
      new Date(
        this.ultimoPedidoData
      );

    return data.toLocaleDateString(
      'pt-BR',
      {
        day: '2-digit',
        month: '2-digit'
      }
    );
  }

  descreverItem(
    item: any
  ): string {

    const adicionais =
      (item.adicionais ?? [])
        .map((a: any) => nomeAdicional(a))
        .join(', ');

    return adicionais
      ? `${item.nome} (+ ${adicionais})`
      : item.nome;
  }

  pedirDeNovo(): void {

    if (!this.lojaAberta) {

      this.popupLojaFechadaVisivel =
        true;

      this.cdr.detectChanges();

      return;
    }

    // Confere de novo na hora do clique
    const salvo =
      JSON.parse(
        localStorage.getItem(
          'ultimoPedidoItens'
        ) ?? '{"itens":[]}'
      );

    const sincronizado =
      this.sincronizarItens(
        salvo.itens
      );

    // Cópia de cada item, para não ligar o carrinho
    // à lista do último pedido
    sincronizado.itens.forEach(
      item =>
        this.adicionarAoCarrinho({
          ...item,
          adicionais: [...item.adicionais]
        })
    );

    this.mensagemPedirDeNovo =
      sincronizado.indisponiveis.length > 0
        ? `Adicionado ao carrinho! Não está mais disponível: ${sincronizado.indisponiveis.join(', ')}.`
        : 'Adicionado ao carrinho! 🛒';

    this.cdr.detectChanges();

    setTimeout(
      () => {

        this.mensagemPedirDeNovo =
          null;

        this.cdr.detectChanges();
      },
      5000
    );
  }

  private buscarProdutoNoCardapio(
    produtoId: string
  ): any | null {

    for (const categoria of this.cardapio) {

      const produto =
        categoria.produtos?.find(
          (p: any) => p.id === produtoId
        );

      if (produto) {
        return produto;
      }
    }

    return null;
  }

  // Confere itens guardados (carrinho ou último pedido)
  // com o cardápio de agora:
  // - usa nome e preço atuais
  // - tira adicionais que não existem mais no produto
  // - separa produtos que saíram do cardápio
  private sincronizarItens(
    itens: any[]
  ): { itens: any[]; indisponiveis: string[] } {

    const resultado: any[] = [];

    const indisponiveis: string[] = [];

    for (const item of itens ?? []) {

      const produto =
        this.buscarProdutoNoCardapio(
          item.produtoId
        );

      if (!produto) {

        indisponiveis.push(
          item.nome
        );

        continue;
      }

      // Mantém a quantidade escolhida (ex.: 2x Bacon)
      // com nome e preço atuais do adicional
      const adicionais =
        (item.adicionais ?? [])
          .map((a: any) => {

            const atual =
              produto.adicionais?.find(
                (pa: any) => pa.id === a.id
              );

            return atual
              ? { ...atual, quantidade: a.quantidade ?? 1 }
              : null;
          })
          .filter((a: any) => !!a);

      resultado.push({
        produtoId: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        imagemUrl: produto.imagemUrl,
        quantidade: item.quantidade,
        observacao: item.observacao ?? '',
        adicionais
      });
    }

    return {
      itens: resultado,
      indisponiveis
    };
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

    this.salvarCarrinho();
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

      this.salvarCarrinho();

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

    this.salvarCarrinho();
  }

  calcularTotal(): string {

    let total = 0;

    this.carrinho.forEach(
      item => {

        total +=
          valorUnitarioItem(
            item
          ) *
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

    const total =
      valorUnitarioItem(
        item
      ) *
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
