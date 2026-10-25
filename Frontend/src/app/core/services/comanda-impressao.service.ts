import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ConfiguracaoLojaService } from './configuracao-loja.service';

// =====================================================
// COMANDA (cupom impresso na impressora térmica)
//
// Monta a comanda do pedido em HTML no tamanho do papel
// e manda imprimir por um "iframe" escondido, sem mexer
// na tela do admin.
//
// Para ver como fica sem impressora: na janela de impressão,
// escolha "Microsoft Print to PDF".
// =====================================================

// Largura do papel da impressora térmica: 80 (mais comum) ou 58 mm
const LARGURA_PAPEL_MM = 80;

// Quantas vias imprimir de cada pedido (ex.: 2 = cozinha + entregador)
const VIAS = 1;

@Injectable({
  providedIn: 'root'
})
export class ComandaImpressaoService {

  private configuracaoLojaService = inject(ConfiguracaoLojaService);

  // Nome/telefone da loja (Admin > Configurações), buscado uma vez
  private dadosLoja: { nome: string; telefone: string | null } | null = null;

  // Imprime a comanda do pedido. Resolve quando a janela de
  // impressão fecha (ou após alguns segundos, em modo silencioso).
  async imprimir(pedido: any): Promise<void> {
    const loja = await this.obterDadosLoja();

    const html = this.montarDocumento(pedido, loja);

    await this.imprimirHtml(html);
  }

  // =====================================================
  // MONTAGEM DA COMANDA
  // =====================================================

  private montarDocumento(pedido: any, loja: { nome: string; telefone: string | null }): string {
    const via = this.montarVia(pedido, loja);

    // Várias vias: uma depois da outra, com linha de corte
    const vias = Array.from({ length: VIAS }, () => via)
      .join('<div class="corte">- - - - - - - - - - - - - - - -</div>');

    const largura = LARGURA_PAPEL_MM;

    // Área útil: o papel tem ~4 mm de margem morta em cada lado
    const areaUtil = largura - 8;

    return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Pedido ${this.esc(pedido.codigo)}</title>
<style>
  @page { size: ${largura}mm auto; margin: 0; }

  * { box-sizing: border-box; }

  body {
    width: ${areaUtil}mm;
    margin: 0 auto;
    padding: 3mm 0 6mm;
    font-family: 'Courier New', Courier, monospace;
    font-size: ${largura >= 80 ? 12 : 10.5}px;
    line-height: 1.35;
    color: #000;
  }

  .centro { text-align: center; }
  .loja { font-size: 1.45em; font-weight: 900; text-transform: uppercase; }
  .pedido { font-size: 1.6em; font-weight: 900; margin: 2px 0; }
  .tipo {
    margin: 4px 0;
    padding: 3px 0;
    border: 2px solid #000;
    font-size: 1.25em;
    font-weight: 900;
    text-align: center;
  }
  .linha { border-top: 1px dashed #000; margin: 5px 0; }
  .forte { font-weight: 900; }
  .item { margin: 4px 0; }
  .item-topo { display: flex; justify-content: space-between; gap: 6px; font-weight: 900; font-size: 1.1em; }
  .adicional { padding-left: 4mm; }
  .obs { padding-left: 4mm; font-weight: 900; text-transform: uppercase; }
  .valor { display: flex; justify-content: space-between; }
  .total { font-size: 1.3em; font-weight: 900; }
  .destaque { margin-top: 4px; padding: 3px; border: 1px solid #000; font-weight: 900; text-align: center; }
  .corte { margin: 6mm 0; text-align: center; }
  .rodape { margin-top: 6px; font-size: .9em; text-align: center; }
</style>
</head>
<body>${vias}</body>
</html>`;
  }

  private montarVia(pedido: any, loja: { nome: string; telefone: string | null }): string {
    const entrega = pedido.tipoEntrega === 'Delivery';

    const partes: string[] = [];

    // ---------- CABEÇALHO ----------
    partes.push(`<div class="centro loja">${this.esc(loja.nome)}</div>`);

    if (loja.telefone) {
      partes.push(`<div class="centro">${this.esc(loja.telefone)}</div>`);
    }

    partes.push('<div class="linha"></div>');
    partes.push(`<div class="centro pedido">PEDIDO #${this.esc(pedido.codigo)}</div>`);
    partes.push(`<div class="centro">${this.formatarDataHora(pedido.dataHora)}</div>`);
    partes.push(`<div class="tipo">${entrega ? '*** ENTREGA ***' : '*** RETIRADA ***'}</div>`);

    // ---------- CLIENTE ----------
    partes.push(`<div><span class="forte">Cliente:</span> ${this.esc(pedido.nomeCliente)}</div>`);

    if (pedido.telefone) {
      partes.push(`<div><span class="forte">Tel:</span> ${this.esc(pedido.telefone)}</div>`);
    }

    if (entrega) {
      if (pedido.endereco) {
        partes.push(`<div><span class="forte">End:</span> ${this.esc(pedido.endereco)}</div>`);
      }

      if (pedido.bairro) {
        partes.push(`<div><span class="forte">Bairro:</span> ${this.esc(pedido.bairro)}</div>`);
      }
    }

    // ---------- ITENS ----------
    partes.push('<div class="linha"></div>');

    for (const item of pedido.itens ?? []) {
      partes.push('<div class="item">');

      partes.push(
        `<div class="item-topo"><span>${item.quantidade}x ${this.esc(item.produtoNome)}</span>` +
        `<span>${this.dinheiro(item.valor)}</span></div>`
      );

      for (const adicional of item.adicionais ?? []) {
        const qtd = adicional.quantidade > 1 ? `${adicional.quantidade}x ` : '';
        partes.push(`<div class="adicional">+ ${qtd}${this.esc(adicional.nome)}</div>`);
      }

      if (item.observacao) {
        partes.push(`<div class="obs">OBS: ${this.esc(item.observacao)}</div>`);
      }

      partes.push('</div>');
    }

    // ---------- VALORES ----------
    partes.push('<div class="linha"></div>');
    partes.push(this.linhaValor('Subtotal', pedido.subTotal));

    if (pedido.desconto > 0) {
      const rotulo = pedido.cupomCodigo ? `Desconto (${this.esc(pedido.cupomCodigo)})` : 'Desconto';
      partes.push(this.linhaValor(rotulo, -pedido.desconto));
    }

    if (entrega) {
      partes.push(this.linhaValor('Taxa de entrega', pedido.delivery));
    }

    partes.push(`<div class="valor total"><span>TOTAL</span><span>${this.dinheiro(pedido.total)}</span></div>`);

    // ---------- PAGAMENTO ----------
    partes.push('<div class="linha"></div>');
    partes.push(`<div><span class="forte">Pagamento:</span> ${this.traduzirPagamento(pedido.formaPagamento)}</div>`);

    if (pedido.formaPagamento === 'Pix') {
      partes.push('<div class="destaque">PAGO VIA PIX - NAO COBRAR</div>');
    }

    if (pedido.formaPagamento === 'Dinheiro' && pedido.trocoPara) {
      const troco = Math.max(Number(pedido.trocoPara) - Number(pedido.total), 0);

      partes.push(`<div>Troco para: ${this.dinheiro(pedido.trocoPara)}</div>`);
      partes.push(`<div class="destaque">LEVAR DE TROCO: ${this.dinheiro(troco)}</div>`);
    }

    if (pedido.formaPagamento === 'CartaoCredito' || pedido.formaPagamento === 'CartaoDebito') {
      partes.push(`<div class="destaque">${entrega ? 'LEVAR A MAQUININHA' : 'COBRAR NA MAQUININHA'}</div>`);
    }

    partes.push('<div class="rodape">Obrigado pela preferencia!</div>');

    return partes.join('\n');
  }

  private linhaValor(rotulo: string, valor: number): string {
    return `<div class="valor"><span>${rotulo}</span><span>${this.dinheiro(valor)}</span></div>`;
  }

  // =====================================================
  // IMPRESSÃO (iframe escondido)
  // =====================================================

  private imprimirHtml(html: string): Promise<void> {
    return new Promise(resolve => {
      const iframe = document.createElement('iframe');

      iframe.setAttribute('aria-hidden', 'true');
      Object.assign(iframe.style, {
        position: 'fixed',
        right: '0',
        bottom: '0',
        width: '0',
        height: '0',
        border: '0',
        visibility: 'hidden'
      });

      document.body.appendChild(iframe);

      let terminou = false;

      const finalizar = () => {
        if (terminou) {
          return;
        }

        terminou = true;

        // Dá tempo do navegador mandar para a impressora antes de remover
        setTimeout(() => iframe.remove(), 1000);

        resolve();
      };

      iframe.onload = () => {
        const janela = iframe.contentWindow;

        if (!janela) {
          finalizar();
          return;
        }

        janela.onafterprint = finalizar;

        janela.focus();
        janela.print();

        // Segurança: alguns navegadores não avisam quando termina
        setTimeout(finalizar, 60000);
      };

      const documento = iframe.contentDocument;

      documento?.open();
      documento?.write(html);
      documento?.close();
    });
  }

  // =====================================================
  // AUXILIARES
  // =====================================================

  private async obterDadosLoja(): Promise<{ nome: string; telefone: string | null }> {
    if (this.dadosLoja) {
      return this.dadosLoja;
    }

    try {
      const config = await firstValueFrom(this.configuracaoLojaService.obterConfiguracoes());

      const telefone =
        config.telefoneFixo?.trim() || config.celular?.trim() || config.whatsApp?.trim() || null;

      this.dadosLoja = {
        nome: config.nomeEstabelecimento?.trim() || 'Tim do Lele Lanches',
        telefone: telefone ? this.formatarTelefone(telefone) : null
      };
    } catch {
      this.dadosLoja = { nome: 'Tim do Lele Lanches', telefone: null };
    }

    return this.dadosLoja;
  }

  // "16992618003" -> "(16) 99261-8003" | "1636633366" -> "(16) 3663-3366"
  private formatarTelefone(telefone: string): string {
    const n = telefone.replace(/\D/g, '');

    if (n.length === 11) {
      return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
    }

    if (n.length === 10) {
      return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
    }

    // Formato desconhecido: mostra como foi cadastrado
    return telefone;
  }

  // Protege a comanda contra textos com < > & etc.
  private esc(texto: any): string {
    return String(texto ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private dinheiro(valor: any): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
      .format(Number(valor) || 0);
  }

  private formatarDataHora(data: any): string {
    if (!data) {
      return '';
    }

    const d = new Date(data);

    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  private traduzirPagamento(forma: string): string {
    const mapa: Record<string, string> = {
      Pix: 'PIX',
      Dinheiro: 'DINHEIRO',
      CartaoCredito: 'CARTAO DE CREDITO',
      CartaoDebito: 'CARTAO DE DEBITO'
    };

    return mapa[forma] ?? forma ?? '-';
  }
}
