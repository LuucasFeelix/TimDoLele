import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  Cupom,
  CupomService,
  mensagemErroApi,
  SalvarCupomRequest,
  TipoDesconto
} from '../../core/services/cupom.service';

@Component({
  selector: 'app-cupons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cupons.component.html',
  styleUrls: ['./cupons.component.css']
})
export class CuponsComponent implements OnInit {

  cupons: Cupom[] = [];

  carregando = false;
  salvando = false;

  editandoId: string | null = null;

  // Formulário
  codigo = '';
  tipo: TipoDesconto = 1;
  valor: number | null = null;
  pedidoMinimo: number | null = null;
  validoAte = '';
  limiteUsos: number | null = null;

  constructor(
    private cupomService: CupomService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarCupons();
  }

  carregarCupons(): void {
    this.carregando = true;

    this.cupomService.listar().subscribe({
      next: (res) => {
        this.cupons = res;
        this.carregando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.carregando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Código: só letras e números, em maiúsculas
  aoDigitarCodigo(event: Event): void {
    const campo = event.target as HTMLInputElement;
    const limpo = campo.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 20);

    campo.value = limpo;
    this.codigo = limpo;
  }

  salvar(): void {
    if (this.codigo.length < 3) {
      alert('O código precisa ter pelo menos 3 letras ou números.');
      return;
    }

    if (!this.valor || this.valor <= 0) {
      alert('Informe o valor do desconto.');
      return;
    }

    if (this.tipo === 1 && this.valor > 100) {
      alert('O percentual não pode passar de 100%.');
      return;
    }

    const dto: SalvarCupomRequest = {
      codigo: this.codigo,
      tipo: Number(this.tipo) as TipoDesconto,
      valor: Number(this.valor),
      pedidoMinimo: this.pedidoMinimo ? Number(this.pedidoMinimo) : null,
      validoAte: this.validoAte || null,
      limiteUsos: this.limiteUsos ? Number(this.limiteUsos) : null
    };

    this.salvando = true;

    const requisicao = this.editandoId
      ? this.cupomService.atualizar(this.editandoId, dto)
      : this.cupomService.criar(dto);

    requisicao.subscribe({
      next: () => {
        this.salvando = false;
        this.limparFormulario();
        this.carregarCupons();
      },
      error: (err) => {
        console.error(err);
        this.salvando = false;
        alert(mensagemErroApi(err, 'Erro ao salvar o cupom.'));
        this.cdr.detectChanges();
      }
    });
  }

  editar(cupom: Cupom): void {
    this.editandoId = cupom.id;
    this.codigo = cupom.codigo;
    this.tipo = cupom.tipo;
    this.valor = cupom.valor;
    this.pedidoMinimo = cupom.pedidoMinimo;
    this.validoAte = cupom.validoAte ? cupom.validoAte.substring(0, 10) : '';
    this.limiteUsos = cupom.limiteUsos;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  alternarAtivo(cupom: Cupom): void {
    const requisicao = cupom.ativo
      ? this.cupomService.desativar(cupom.id)
      : this.cupomService.ativar(cupom.id);

    requisicao.subscribe({
      next: () => this.carregarCupons(),
      error: (err) => {
        console.error(err);
        alert(mensagemErroApi(err, 'Erro ao alterar o cupom.'));
      }
    });
  }

  limparFormulario(): void {
    this.editandoId = null;
    this.codigo = '';
    this.tipo = 1;
    this.valor = null;
    this.pedidoMinimo = null;
    this.validoAte = '';
    this.limiteUsos = null;
  }

  // ===== TEXTOS DA LISTA =====

  descreverDesconto(cupom: Cupom): string {
    return cupom.tipo === 1
      ? `${cupom.valor}% de desconto`
      : `R$ ${this.formatarValor(cupom.valor)} de desconto`;
  }

  situacao(cupom: Cupom): { texto: string; classe: string } {
    if (!cupom.ativo) {
      return { texto: 'Inativo', classe: 'inativo' };
    }

    if (cupom.validoAte && this.hoje() > cupom.validoAte.substring(0, 10)) {
      return { texto: 'Expirado', classe: 'expirado' };
    }

    if (cupom.limiteUsos && cupom.usos >= cupom.limiteUsos) {
      return { texto: 'Esgotado', classe: 'expirado' };
    }

    return { texto: 'Ativo', classe: 'ativo' };
  }

  formatarValor(valor: number): string {
    return Number(valor).toFixed(2).replace('.', ',');
  }

  formatarData(data: string): string {
    const [ano, mes, dia] = data.substring(0, 10).split('-');
    return `${dia}/${mes}/${ano}`;
  }

  private hoje(): string {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }
}
