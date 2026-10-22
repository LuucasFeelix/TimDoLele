import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import QRCode from 'qrcode';

import { PixService, PixSituacao } from '../../core/services/pix.service';
import { DinheiroPipe } from '../../shared/pipes/dinheiro.pipe';

// Itens do pedido PIX guardados até o pagamento ser confirmado
const CHAVE_PIX_PENDENTE = 'pixPendente';

@Component({
  selector: 'app-pagamento-pix',
  standalone: true,
  imports: [CommonModule, DinheiroPipe],
  templateUrl: './pagamento-pix.component.html',
  styleUrls: ['./pagamento-pix.component.css']
})
export class PagamentoPixComponent implements OnInit, OnDestroy {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pixService = inject(PixService);
  private cdr = inject(ChangeDetectorRef);

  pedidoId = '';

  situacao: PixSituacao | null = null;

  // Imagem do QR Code (gerada a partir do copia-e-cola)
  qrCodeImagem: string | null = null;

  segundosRestantes = 0;

  copiado = false;

  simulando = false;

  erro: string | null = null;

  // Pergunta ao servidor a cada 3 s se o PIX foi pago
  private intervaloConsulta: ReturnType<typeof setInterval> | null = null;

  // Cronômetro na tela (1 s)
  private intervaloCronometro: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.pedidoId = this.route.snapshot.paramMap.get('pedidoId') ?? '';

    if (!this.pedidoId) {
      this.router.navigate(['/cardapio']);
      return;
    }

    this.consultar();

    this.intervaloConsulta = setInterval(() => this.consultar(), 3000);

    this.intervaloCronometro = setInterval(() => {
      if (this.segundosRestantes > 0) {
        this.segundosRestantes--;
        this.cdr.detectChanges();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    this.pararConsultas();
  }

  // ===== CONSULTA AO SERVIDOR =====

  private consultar(): void {
    this.pixService.obterSituacao(this.pedidoId).subscribe({
      next: (situacao) => {
        const primeiraVez = !this.situacao;

        this.situacao = situacao;
        this.erro = null;

        // O servidor manda o tempo certo; o cronômetro só "anda" entre consultas
        this.segundosRestantes = situacao.segundosRestantes;

        if (primeiraVez && situacao.copiaECola) {
          this.gerarQrCode(situacao.copiaECola);
        }

        if (situacao.status === 'Pago') {
          this.aoConfirmarPagamento();
        }

        if (situacao.status === 'Expirado') {
          this.pararConsultas();
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao consultar o PIX:', err);

        if (err?.status === 404) {
          this.erro = 'Pagamento não encontrado.';
          this.pararConsultas();
        }

        this.cdr.detectChanges();
      }
    });
  }

  private async gerarQrCode(texto: string): Promise<void> {
    try {
      this.qrCodeImagem = await QRCode.toDataURL(texto, {
        width: 260,
        margin: 1
      });
    } catch (e) {
      console.error('Erro ao gerar o QR Code:', e);
      this.qrCodeImagem = null;
    }

    this.cdr.detectChanges();
  }

  // PIX confirmado: limpa o carrinho e vai para a confirmação
  private aoConfirmarPagamento(): void {
    this.pararConsultas();

    try {
      const pendente = localStorage.getItem(CHAVE_PIX_PENDENTE);

      if (pendente) {
        // "Pedir de novo" do cardápio
        localStorage.setItem('ultimoPedidoItens', pendente);
      }

      localStorage.removeItem(CHAVE_PIX_PENDENTE);
      localStorage.removeItem('carrinho');
    } catch {
      // Sem localStorage: só não guarda o "Pedir de novo"
    }

    setTimeout(() => {
      window.location.href = '/confirmacao';
    }, 2500);
  }

  private pararConsultas(): void {
    if (this.intervaloConsulta) {
      clearInterval(this.intervaloConsulta);
      this.intervaloConsulta = null;
    }

    if (this.intervaloCronometro) {
      clearInterval(this.intervaloCronometro);
      this.intervaloCronometro = null;
    }
  }

  // ===== AÇÕES =====

  async copiarCodigo(): Promise<void> {
    if (!this.situacao?.copiaECola) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.situacao.copiaECola);
    } catch {
      // Navegador sem permissão: seleciona o texto para copiar na mão
      const campo = document.getElementById('pix-copia-e-cola') as HTMLTextAreaElement | null;
      campo?.select();
      document.execCommand('copy');
    }

    this.copiado = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      this.copiado = false;
      this.cdr.detectChanges();
    }, 2500);
  }

  // PIX expirou: volta ao checkout com o carrinho intacto
  tentarNovamente(): void {
    localStorage.removeItem(CHAVE_PIX_PENDENTE);
    window.location.href = '/checkout';
  }

  voltarCardapio(): void {
    localStorage.removeItem(CHAVE_PIX_PENDENTE);
    window.location.href = '/cardapio';
  }

  // SÓ TESTES: faz o papel do cliente pagando
  simularPagamento(): void {
    this.simulando = true;

    this.pixService.simularPagamento(this.pedidoId).subscribe({
      next: () => {
        this.simulando = false;
        this.consultar();
      },
      error: (err) => {
        console.error(err);
        this.simulando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ===== TEXTOS =====

  get tempoTexto(): string {
    const m = Math.floor(this.segundosRestantes / 60);
    const s = this.segundosRestantes % 60;

    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // Último minuto: cronômetro em vermelho
  get tempoAcabando(): boolean {
    return this.segundosRestantes <= 60;
  }
}
