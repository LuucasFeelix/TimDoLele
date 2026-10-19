import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
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

import {
  ProdutoModalComponent
} from '../produto-modal/produto-modal.component';

import {
  calcularDescontoCupom,
  CupomService,
  CupomValidado,
  mensagemErroApi
} from '../../core/services/cupom.service';

import {
  Bairro,
  BairroService,
  normalizarBairro
} from '../../core/services/bairro.service';

import {
  copiarItem,
  nomeAdicional,
  separarItensPersonalizados,
  temPersonalizacao,
  valorUnitarioItem
} from '../../core/utils/carrinho.utils';
import { SemEmojiDirective } from '../../core/directives/sem-emoji.directive';
import { AvisoService } from '../../core/services/aviso.service';
import { DinheiroPipe } from '../../shared/pipes/dinheiro.pipe';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProdutoModalComponent,
    SemEmojiDirective,
    DinheiroPipe
  ],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent
  implements OnInit, OnDestroy {

  // Popup padrão de avisos (substitui alert/confirm)
  private aviso = inject(AvisoService);

  etapa = 1;

  carrinho: any[] = [];

  nome = '';
  telefone = '';
  endereco = '';
  bairro = '';
  referencia = '';

  // Bairros com taxa (Admin > Bairros e taxas).
  // Lista vazia = jeito antigo (bairro digitado + taxa padrão).
  bairrosDisponiveis: Bairro[] = [];

  buscaBairro = '';

  bairroSelecionado: Bairro | null = null;

  listaBairroAberta = false;

  tipoEntrega = 2;

  formaPagamento = 1;

  trocoPara = '';

  taxaEntrega = 5;

  statusLoja: StatusLoja | null = null;

  lojaFechadaVisivel = false;

  // Cupom de desconto
  codigoCupom = '';

  cupomAplicado: CupomValidado | null = null;

  aplicandoCupom = false;

  erroCupom: string | null = null;

  // Edição de item do carrinho (abre o modal do produto)
  itemEditando: any = null;

  produtoEditando: any = null;

  carregandoEdicao = false;

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

    private cupomService:
      CupomService,

    private bairroService:
      BairroService,

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
        separarItensPersonalizados(
          JSON.parse(
            carrinhoStorage
          )
        );
    }

    this.verificarStatusLoja();

    this.iniciarMonitoramentoLoja();

    this.carregarBairros();
  }

  // =====================================================
  // BAIRRO E TAXA DE ENTREGA
  // =====================================================

  private carregarBairros(): void {

    this.bairroService
      .listarAtivos()
      .subscribe({

        next: (
          bairros
        ) => {

          this.bairrosDisponiveis =
            bairros;

          this.cdr.detectChanges();
        },

        error: (
          erro
        ) => {

          // Sem a lista, continua no jeito antigo (bairro digitado)
          console.error(
            'Erro ao carregar os bairros:',
            erro
          );
        }
      });
  }

  // true = cliente escolhe o bairro na lista (taxa por bairro)
  get usaListaBairros(): boolean {

    return (
      this.bairrosDisponiveis.length > 0
    );
  }

  // Bairros que combinam com o que foi digitado (até 8)
  get sugestoesBairro(): Bairro[] {

    const termo =
      normalizarBairro(
        this.buscaBairro
      );

    const lista =
      termo
        ? this.bairrosDisponiveis.filter(
            b =>
              normalizarBairro(b.nome)
                .includes(termo)
          )
        : this.bairrosDisponiveis;

    return lista.slice(
      0,
      8
    );
  }

  aoDigitarBairro(
    event: Event
  ): void {

    this.buscaBairro =
      (event.target as HTMLInputElement).value;

    // Só vale depois de clicar numa opção da lista
    this.bairroSelecionado =
      null;

    this.listaBairroAberta =
      true;
  }

  escolherBairro(
    bairro: Bairro
  ): void {

    this.bairroSelecionado =
      bairro;

    this.buscaBairro =
      bairro.nome;

    this.listaBairroAberta =
      false;
  }

  // Espera o clique na opção acontecer antes de fechar a lista
  fecharListaBairro(): void {

    setTimeout(
      () => {

        this.listaBairroAberta =
          false;

        // Digitou mas não escolheu: se o texto for exatamente
        // um bairro da lista, escolhe sozinho
        if (
          !this.bairroSelecionado &&
          this.buscaBairro.trim()
        ) {

          const exato =
            this.bairrosDisponiveis.find(
              b =>
                normalizarBairro(b.nome) ===
                normalizarBairro(this.buscaBairro)
            );

          if (exato) {

            this.escolherBairro(
              exato
            );
          }
        }

        this.cdr.detectChanges();
      },
      200
    );
  }

  async bairroForaDaLista(): Promise<void> {

    this.listaBairroAberta =
      false;

    const telefones =
      [
        this.statusLoja?.telefoneFixo,
        this.statusLoja?.celular
      ]
        .filter(t => !!t)
        .join(' ou ');

    const escolherRetirada =
      await this.aviso.confirmar(
        'Ainda não entregamos no seu bairro. ' +
        'Você pode escolher Retirada e buscar na loja' +
        (
          telefones
            ? `, ou ligar para nós: ${telefones}.`
            : '.'
        ),
        {
          titulo: 'Bairro fora da área de entrega',
          textoConfirmar: 'Escolher retirada',
          textoCancelar: 'Voltar'
        }
      );

    if (escolherRetirada) {

      this.selecionarTipoEntrega(
        1
      );

      this.cdr.detectChanges();
    }
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

      this.aviso.atencao(
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

      this.buscaBairro =
        '';

      this.bairroSelecionado =
        null;
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

  // "45 a 60 min" (entrega) ou "20 a 30 min" (retirada),
  // conforme Admin > Configurações
  private textoPrazo(): string | null {

    if (!this.statusLoja) {
      return null;
    }

    const minimo =
      this.isDelivery()
        ? this.statusLoja.prazoEntregaMin
        : this.statusLoja.prazoRetiradaMin;

    const maximo =
      this.isDelivery()
        ? this.statusLoja.prazoEntregaMax
        : this.statusLoja.prazoRetiradaMax;

    return minimo === maximo
      ? `${minimo} min`
      : `${minimo} a ${maximo} min`;
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

    if (!this.isDelivery()) {
      return 0;
    }

    // Com bairros cadastrados: taxa do bairro escolhido
    if (this.usaListaBairros) {

      return (
        this.bairroSelecionado?.taxaEntrega ??
        0
      );
    }

    // Sem bairros cadastrados: taxa padrão (jeito antigo)
    return this.taxaEntrega;
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

    // Lanche personalizado: o "+" cria outra linha igual,
    // logo abaixo, para poder editar separado
    if (
      temPersonalizacao(
        item
      )
    ) {

      const indice =
        this.carrinho.indexOf(
          item
        );

      this.carrinho.splice(
        indice + 1,
        0,
        copiarItem(
          item,
          1
        )
      );

      this.carrinho = [
        ...this.carrinho
      ];

    } else {

      item.quantidade++;
    }

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

  // =====================================================
  // EDITAR ITEM DO CARRINHO
  // =====================================================

  // Busca o produto atualizado (adicionais e preço de agora)
  // e abre o modal preenchido com o que o cliente escolheu
  editarItem(
    item: any
  ): void {

    if (this.carregandoEdicao) {
      return;
    }

    this.carregandoEdicao =
      true;

    this.pedidoService
      .getCardapio()
      .subscribe({

        next: (
          cardapio: any[]
        ) => {

          this.carregandoEdicao =
            false;

          const produto =
            cardapio
              .flatMap(
                (c: any) =>
                  c.produtos ?? []
              )
              .find(
                (p: any) =>
                  p.id === item.produtoId
              );

          if (!produto) {

            this.abrirPopupProdutoIndisponivel(
              `O produto "${item.nome}" não está mais disponível.`
            );

            return;
          }

          this.produtoEditando =
            produto;

          this.itemEditando =
            item;

          this.cdr.detectChanges();
        },

        error: (
          erro: any
        ) => {

          console.error(
            'Erro ao carregar produto para edição:',
            erro
          );

          this.carregandoEdicao =
            false;

          this.aviso.erro(
            'Não foi possível abrir o item para edição.'
          );
        }
      });
  }

  salvarEdicaoItem(
    novoItem: any
  ): void {

    const indice =
      this.carrinho.indexOf(
        this.itemEditando
      );

    if (indice >= 0) {

      // Se ficou personalizado com quantidade > 1,
      // já entra separado (uma linha por lanche)
      this.carrinho.splice(
        indice,
        1,
        ...separarItensPersonalizados([
          novoItem
        ])
      );

      this.carrinho = [
        ...this.carrinho
      ];

      this.salvarCarrinho();
    }

    this.fecharEdicaoItem();
  }

  fecharEdicaoItem(): void {

    this.itemEditando =
      null;

    this.produtoEditando =
      null;

    this.cdr.detectChanges();
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

  nomeAdicional(
    adicional: any
  ): string {

    return nomeAdicional(
      adicional
    );
  }

  calcularSubtotal(): string {

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

  calcularTotal(): string {

    return (
      this.subtotalNumero() -
      this.descontoCupom +
      this.getTaxaEntrega()
    )
      .toFixed(2)
      .replace(
        '.',
        ','
      );
  }

  private totalNumero(): number {

    return (
      this.subtotalNumero() -
      this.descontoCupom +
      this.getTaxaEntrega()
    );
  }

  // =====================================================
  // TROCO (pagamento em dinheiro)
  // =====================================================

  // Máscara de dinheiro: o cliente digita só números
  // e o valor vai se formando: 1 -> R$ 0,01 ... 10000 -> R$ 100,00
  aoDigitarTroco(
    event: Event
  ): void {

    const campo =
      event.target as HTMLInputElement;

    // Até 7 dígitos = R$ 99.999,99
    const numeros =
      campo.value
        .replace(
          /\D/g,
          ''
        )
        .replace(
          /^0+/,
          ''
        )
        .substring(
          0,
          7
        );

    const formatado =
      numeros
        ? this.formatarMoeda(
            Number(numeros) / 100
          )
        : '';

    campo.value =
      formatado;

    this.trocoPara =
      formatado;
  }

  pagarValorExato(): void {

    this.trocoPara =
      this.formatarMoeda(
        this.totalNumero()
      );
  }

  trocoNumero(): number {

    const numeros =
      (this.trocoPara ?? '')
        .toString()
        .replace(
          /\D/g,
          ''
        );

    return numeros
      ? Number(numeros) / 100
      : 0;
  }

  get trocoInsuficiente(): boolean {

    // Compara em centavos para não errar por arredondamento
    return (
      Math.round(this.trocoNumero() * 100) <
      Math.round(this.totalNumero() * 100)
    );
  }

  get valorTroco(): number {

    return Math.max(
      this.trocoNumero() -
      this.totalNumero(),
      0
    );
  }

  // 1234.5 -> "R$ 1.234,50"
  private formatarMoeda(
    valor: number
  ): string {

    return valor.toLocaleString(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL'
      }
    );
  }

  private subtotalNumero(): number {

    return Number(
      this.calcularSubtotal()
        .replace(
          ',',
          '.'
        )
    );
  }

  // =====================================================
  // CUPOM DE DESCONTO
  // (o backend confere tudo de novo ao finalizar)
  // =====================================================

  // Código: só letras e números, em maiúsculas
  aoDigitarCupom(
    event: Event
  ): void {

    const campo =
      event.target as HTMLInputElement;

    const limpo =
      campo.value
        .toUpperCase()
        .replace(
          /[^A-Z0-9]/g,
          ''
        )
        .substring(
          0,
          20
        );

    campo.value =
      limpo;

    this.codigoCupom =
      limpo;

    this.erroCupom =
      null;
  }

  aplicarCupom(): void {

    if (
      !this.codigoCupom ||
      this.aplicandoCupom
    ) {
      return;
    }

    this.aplicandoCupom =
      true;

    this.erroCupom =
      null;

    this.cupomService
      .validar(
        this.codigoCupom,
        this.subtotalNumero()
      )
      .subscribe({

        next: (
          cupom
        ) => {

          this.cupomAplicado =
            cupom;

          this.aplicandoCupom =
            false;

          this.cdr.detectChanges();
        },

        error: (
          err
        ) => {

          this.aplicandoCupom =
            false;

          this.erroCupom =
            mensagemErroApi(
              err,
              'Não foi possível aplicar o cupom.'
            );

          this.cdr.detectChanges();
        }
      });
  }

  removerCupom(): void {

    this.cupomAplicado =
      null;

    this.codigoCupom =
      '';

    this.erroCupom =
      null;
  }

  // Recalcula na hora se o cliente mudar o carrinho
  get descontoCupom(): number {

    if (
      !this.cupomAplicado ||
      this.cupomAbaixoDoMinimo
    ) {
      return 0;
    }

    return calcularDescontoCupom(
      this.cupomAplicado,
      this.subtotalNumero()
    );
  }

  get subtotalComDesconto(): number {

    return (
      this.subtotalNumero() -
      this.descontoCupom
    );
  }

  get cupomAbaixoDoMinimo(): boolean {

    return (
      !!this.cupomAplicado?.pedidoMinimo &&
      this.subtotalNumero() <
        this.cupomAplicado.pedidoMinimo
    );
  }

  formatarValor(
    valor: number
  ): string {

    return Number(valor)
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

      this.aviso.atencao(
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

      this.aviso.atencao(
        'Informe um WhatsApp válido com DDD. Ex.: (16) 99999-9999'
      );

      return false;
    }

    if (
      this.isDelivery() &&
      this.usaListaBairros &&
      !this.bairroSelecionado
    ) {

      this.aviso.atencao(
        'Escolha o seu bairro na lista. ' +
        'Comece a digitar o nome e toque no seu bairro.'
      );

      return false;
    }

    if (
      this.isDelivery() &&
      (
        !this.endereco ||
        (
          !this.usaListaBairros &&
          !this.bairro
        )
      )
    ) {

      this.aviso.atencao(
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
      this.isDinheiro() &&
      this.trocoNumero() <= 0
    ) {

      this.aviso.atencao(
        'Informe para quanto precisa de troco. ' +
        'Se for pagar o valor exato, toque em "Vou pagar o valor exato".'
      );

      return;
    }

    if (
      this.isDinheiro() &&
      this.trocoInsuficiente
    ) {

      this.aviso.atencao(
        `O valor para troco precisa ser de pelo menos R$ ${this.calcularTotal()}.`
      );

      return;
    }

    if (
      this.carrinho.length ===
      0
    ) {

      this.aviso.atencao(
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

          this.aviso.erro(
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

    const referenciaTexto =
      this.referencia
        ? ' - Ref: ' + this.referencia
        : '';

    // Com a lista de bairros, o bairro vai separado (bairroId)
    const enderecoFinal =
      !this.isDelivery()
        ? ''
        : this.usaListaBairros
          ? `${this.endereco}${referenciaTexto}`
          : `${this.endereco} - ${this.bairro}${referenciaTexto}`;

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
        this.isDinheiro()
          ? this.trocoNumero()
          : null,

      cupomCodigo:
        this.descontoCupom > 0
          ? this.cupomAplicado?.codigo
          : null,

      bairroId:
        this.isDelivery() &&
        this.usaListaBairros
          ? this.bairroSelecionado?.id
          : null,

      itens:
        this.carrinho.map(
          item => ({

            produtoId:
              item.produtoId,

            quantidade:
              item.quantidade,

            observacao:
              item.observacao?.trim() ||
              null,

            adicionais:
              (
                item.adicionais ??
                []
              ).map(
                (
                  adicional: any
                ) => ({

                  adicionalId:
                    adicional.id,

                  quantidade:
                    adicional.quantidade ?? 1
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

              // Prazo configurado no admin para o tipo escolhido
              prazo:
                this.textoPrazo(),

              formaPagamento:
                this.obterFormaPagamentoTexto(),

              trocoPara:
                this.isDinheiro()
                  ? this.trocoNumero()
                  : null,

              taxaEntrega:
                this.getTaxaEntrega(),

              total:
                this.calcularTotal(),

              codigo:
                res?.data?.codigo ??
                res?.codigo ??
                null
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

          this.aviso.erro(
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
