import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  Bairro,
  BairroService,
  SalvarBairroRequest,
  normalizarBairro
} from '../../core/services/bairro.service';
import { mensagemErroApi } from '../../core/services/cupom.service';
import { AvisoService } from '../../core/services/aviso.service';
import { SemEmojiDirective } from '../../core/directives/sem-emoji.directive';
import { DinheiroPipe } from '../../shared/pipes/dinheiro.pipe';

// Linha da prévia do "Adicionar vários"
interface LinhaImportacao {
  texto: string;
  nome: string;
  taxa: number | null;
  erro: string | null;
  jaExiste: boolean;
}

@Component({
  selector: 'app-bairros',
  standalone: true,
  imports: [CommonModule, FormsModule, SemEmojiDirective, DinheiroPipe],
  templateUrl: './bairros.component.html',
  styleUrls: ['./bairros.component.css']
})
export class BairrosComponent implements OnInit {

  private aviso = inject(AvisoService);

  bairros: Bairro[] = [];

  carregando = false;
  salvando = false;

  // Formulário (um bairro)
  editandoId: string | null = null;
  nome = '';
  taxa: number | null = null;

  // Busca na lista
  busca = '';

  // Paginação da lista (a busca procura em todos)
  readonly porPagina = 10;
  pagina = 1;

  // "Adicionar vários"
  textoImportacao = '';
  previa: LinhaImportacao[] = [];
  importando = false;

  constructor(
    private bairroService: BairroService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;

    this.bairroService.listarTodos().subscribe({
      next: (res) => {
        this.bairros = res;
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

  get bairrosFiltrados(): Bairro[] {
    const termo = normalizarBairro(this.busca);

    return termo
      ? this.bairros.filter(b => normalizarBairro(b.nome).includes(termo))
      : this.bairros;
  }

  // Só os bairros da página atual
  get bairrosPagina(): Bairro[] {
    const inicio = (this.paginaAtual - 1) * this.porPagina;

    return this.bairrosFiltrados.slice(inicio, inicio + this.porPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.bairrosFiltrados.length / this.porPagina));
  }

  // Garante uma página válida (ex.: depois de filtrar)
  get paginaAtual(): number {
    return Math.min(this.pagina, this.totalPaginas);
  }

  irParaPagina(pagina: number): void {
    this.pagina = Math.min(Math.max(pagina, 1), this.totalPaginas);
  }

  // Ao digitar na busca, volta para a primeira página
  aoBuscar(): void {
    this.pagina = 1;
  }

  get quantidadeAtivos(): number {
    return this.bairros.filter(b => b.ativo).length;
  }

  // ===== UM BAIRRO =====

  salvar(): void {
    if (!this.nome.trim()) {
      this.aviso.atencao('Informe o nome do bairro.');
      return;
    }

    if (this.taxa === null || this.taxa === undefined || Number(this.taxa) < 0) {
      this.aviso.atencao('Informe a taxa de entrega (pode ser 0 para entrega grátis).');
      return;
    }

    const dto: SalvarBairroRequest = {
      nome: this.nome.trim(),
      taxaEntrega: Number(this.taxa)
    };

    this.salvando = true;

    const requisicao = this.editandoId
      ? this.bairroService.atualizar(this.editandoId, dto)
      : this.bairroService.criar(dto);

    requisicao.subscribe({
      next: () => {
        this.salvando = false;
        this.limparFormulario();
        this.carregar();
      },
      error: (err) => {
        console.error(err);
        this.salvando = false;
        this.aviso.erro(mensagemErroApi(err, 'Erro ao salvar o bairro.'));
        this.cdr.detectChanges();
      }
    });
  }

  editar(bairro: Bairro): void {
    this.editandoId = bairro.id;
    this.nome = bairro.nome;
    this.taxa = bairro.taxaEntrega;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  alternarAtivo(bairro: Bairro): void {
    const requisicao = bairro.ativo
      ? this.bairroService.desativar(bairro.id)
      : this.bairroService.ativar(bairro.id);

    requisicao.subscribe({
      next: () => this.carregar(),
      error: (err) => {
        console.error(err);
        this.aviso.erro(mensagemErroApi(err, 'Erro ao alterar o bairro.'));
      }
    });
  }

  limparFormulario(): void {
    this.editandoId = null;
    this.nome = '';
    this.taxa = null;
  }

  // ===== ADICIONAR VÁRIOS =====

  // Cada linha: "Nome do bairro; 5,00"
  gerarPrevia(): void {
    const existentes = new Set(this.bairros.map(b => normalizarBairro(b.nome)));
    const vistos = new Set<string>();

    this.previa = this.textoImportacao
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .map(texto => {
        const partes = texto.split(';');
        const nome = (partes[0] ?? '').trim();
        const taxaTexto = (partes[1] ?? '').trim().replace('R$', '').trim();

        let erro: string | null = null;
        let taxa: number | null = null;

        if (!nome) {
          erro = 'Falta o nome';
        } else if (partes.length < 2 || !taxaTexto) {
          erro = 'Falta a taxa (use: Bairro; 5,00)';
        } else {
          // "5,00" ou "5.00" ou "5"
          taxa = Number(taxaTexto.replace(/\./g, '').replace(',', '.'));

          if (taxaTexto.includes('.') && !taxaTexto.includes(',')) {
            taxa = Number(taxaTexto);
          }

          if (isNaN(taxa) || taxa < 0) {
            erro = 'Taxa inválida';
            taxa = null;
          }
        }

        const normalizado = normalizarBairro(nome);

        if (!erro && vistos.has(normalizado)) {
          erro = 'Repetido na lista';
        }

        vistos.add(normalizado);

        return {
          texto,
          nome,
          taxa,
          erro,
          jaExiste: existentes.has(normalizado)
        };
      });

    if (this.previa.length === 0) {
      this.aviso.atencao('Cole a lista de bairros, um por linha. Ex.: Centro; 4,00');
    }
  }

  get linhasValidas(): LinhaImportacao[] {
    return this.previa.filter(l => !l.erro);
  }

  get linhasComErro(): number {
    return this.previa.filter(l => l.erro).length;
  }

  importar(): void {
    const bairros = this.linhasValidas.map(l => ({
      nome: l.nome,
      taxaEntrega: l.taxa as number
    }));

    if (bairros.length === 0) {
      this.aviso.atencao('Nenhuma linha válida para importar.');
      return;
    }

    this.importando = true;

    this.bairroService.importar(bairros).subscribe({
      next: (res) => {
        this.importando = false;
        this.textoImportacao = '';
        this.previa = [];

        this.aviso.sucesso(
          `${res.criados} bairro(s) adicionado(s) e ${res.atualizados} atualizado(s).`
        );

        this.carregar();
      },
      error: (err) => {
        console.error(err);
        this.importando = false;
        this.aviso.erro(mensagemErroApi(err, 'Erro ao importar os bairros.'));
        this.cdr.detectChanges();
      }
    });
  }

  cancelarImportacao(): void {
    this.previa = [];
  }
}
