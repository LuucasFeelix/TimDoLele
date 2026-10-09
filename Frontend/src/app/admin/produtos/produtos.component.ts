import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProdutoService } from '../../core/services/produto.service';
import { CategoriaService } from '../../core/services/categoria.service';
import { AdicionalService } from '../../core/services/adicional.service';
import { SemEmojiDirective } from '../../core/directives/sem-emoji.directive';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SemEmojiDirective],
  templateUrl: './produtos.component.html',
  styleUrls: ['./produtos.component.css']
})
export class ProdutosComponent implements OnInit {

  produtos: any[] = [];
  categorias: any[] = [];
  adicionais: any[] = [];

  nome = '';
  descricao = '';
  preco: number | null = null;
  categoriaId = '';

  editandoId: string | null = null;
  loading = false;

  produtoSelecionado: any = null;
  adicionaisProduto: any[] = [];
  modalAdicionaisAberto = false;

  // Filtros da lista
  filtroCategoria = 'Todas';
  filtroBusca = '';
  filtroStatus: 'todos' | 'ativos' | 'inativos' = 'todos';

  // Reajuste de preço por categoria
  reajusteCategoriaId = '';
  reajusteTipo: 'aumentar' | 'diminuir' = 'aumentar';
  reajusteValor: number | null = null;
  aplicandoReajuste = false;

  // Foto: id do produto que está enviando foto agora
  enviandoFotoId: string | null = null;
  private produtoFoto: any = null;

  constructor(
    private produtoService: ProdutoService,
    private categoriaService: CategoriaService,
    private adicionalService: AdicionalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarCategorias();
    this.carregarProdutos();
    this.carregarAdicionais();
  }

  carregarCategorias(): void {
    this.categoriaService.getCategorias().subscribe({
      next: (res: any[]) => {
        this.categorias = res;
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error(err)
    });
  }

  carregarProdutos(): void {
    this.loading = true;

    this.produtoService.getProdutos().subscribe({
      next: (res: any[]) => {
        this.produtos = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  carregarAdicionais(): void {
    this.adicionalService.getAdicionais().subscribe({
      next: (res: any[]) => {
        this.adicionais = res;
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error(err)
    });
  }

  salvar(): void {
    if (!this.nome.trim() || !this.preco || !this.categoriaId) {
      alert('Informe nome, preço e categoria.');
      return;
    }

    const dto = {
      nome: this.nome,
      descricao: this.descricao,
      preco: this.preco,
      categoriaId: this.categoriaId
    };

    if (this.editandoId) {
      this.produtoService.atualizarProduto(this.editandoId, dto).subscribe({
        next: () => {
          alert('Produto atualizado!');
          this.limparFormulario();
          this.carregarProdutos();
        },
        error: (err: any) => {
          console.error(err);
          alert('Erro ao atualizar produto.');
        }
      });

      return;
    }

    this.produtoService.criarProduto(dto).subscribe({
      next: () => {
        alert('Produto criado!');
        this.limparFormulario();
        this.carregarProdutos();
      },
      error: (err: any) => {
        console.error(err);
        alert('Erro ao criar produto.');
      }
    });
  }

  editar(produto: any): void {
    this.editandoId = produto.id;
    this.nome = produto.nome;
    this.descricao = produto.descricao ?? '';
    this.preco = produto.preco;
    this.categoriaId = produto.categoriaId;
  }

  ativar(produto: any): void {
    this.produtoService.ativarProduto(produto.id).subscribe({
      next: () => this.carregarProdutos(),
      error: (err: any) => console.error(err)
    });
  }

  desativar(produto: any): void {
    this.produtoService.desativarProduto(produto.id).subscribe({
      next: () => this.carregarProdutos(),
      error: (err: any) => console.error(err)
    });
  }

  abrirModalAdicionais(produto: any): void {
    this.produtoSelecionado = produto;
    this.modalAdicionaisAberto = true;

    this.produtoService.getAdicionaisProduto(produto.id).subscribe({
      next: (res: any[]) => {
        this.adicionaisProduto = res;
        this.cdr.detectChanges();
      },
      error: (err: any) => console.error(err)
    });
  }

  fecharModalAdicionais(): void {
    this.produtoSelecionado = null;
    this.adicionaisProduto = [];
    this.modalAdicionaisAberto = false;
  }

  adicionalEstaVinculado(adicional: any): boolean {
    return this.adicionaisProduto.some(
      a => a.id === adicional.id
    );
  }

  toggleAdicional(adicional: any): void {
    if (!this.produtoSelecionado) {
      return;
    }

    if (this.adicionalEstaVinculado(adicional)) {
      this.produtoService
        .removerAdicional(this.produtoSelecionado.id, adicional.id)
        .subscribe({
          next: () => {
            this.adicionaisProduto = this.adicionaisProduto.filter(
              a => a.id !== adicional.id
            );

            this.cdr.detectChanges();
          },
          error: (err: any) => console.error(err)
        });

      return;
    }

    this.produtoService
      .vincularAdicional(this.produtoSelecionado.id, adicional.id)
      .subscribe({
        next: () => {
          this.adicionaisProduto = [
            ...this.adicionaisProduto,
            adicional
          ];

          this.cdr.detectChanges();
        },
        error: (err: any) => console.error(err)
      });
  }

  // =====================================================
  // FOTO DO PRODUTO
  // =====================================================

  urlImagem(produto: any): string | null {
    return this.produtoService.urlImagem(produto.imagemUrl);
  }

  // Guarda o produto e abre a janela de escolher arquivo
  escolherFoto(produto: any, input: HTMLInputElement): void {
    this.produtoFoto = produto;
    input.value = '';
    input.click();
  }

  fotoSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];

    if (!arquivo || !this.produtoFoto) {
      return;
    }

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!tiposPermitidos.includes(arquivo.type)) {
      alert('Formato inválido. Use JPG, PNG ou WEBP.');
      return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5 MB.');
      return;
    }

    const produto = this.produtoFoto;

    this.enviandoFotoId = produto.id;
    this.cdr.detectChanges();

    this.produtoService.enviarImagem(produto.id, arquivo).subscribe({
      next: (res) => {
        produto.imagemUrl = res.imagemUrl;
        this.enviandoFotoId = null;
        this.produtoFoto = null;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.enviandoFotoId = null;
        this.produtoFoto = null;

        alert(
          typeof err.error === 'string'
            ? err.error
            : 'Erro ao enviar a foto.'
        );

        this.cdr.detectChanges();
      }
    });
  }

  removerFoto(produto: any): void {
    if (!confirm(`Remover a foto de "${produto.nome}"?`)) {
      return;
    }

    this.produtoService.removerImagem(produto.id).subscribe({
      next: () => {
        produto.imagemUrl = null;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        alert('Erro ao remover a foto.');
      }
    });
  }

  // =====================================================
  // REAJUSTE DE PREÇO POR CATEGORIA
  // =====================================================

  // Valor com sinal: positivo aumenta, negativo diminui
  private get valorReajuste(): number {
    const valor = Math.abs(Number(this.reajusteValor) || 0);

    return this.reajusteTipo === 'aumentar' ? valor : -valor;
  }

  // Prévia: preço atual -> preço novo de cada produto da categoria
  get previaReajuste(): { nome: string; atual: number; novo: number }[] {
    if (!this.reajusteCategoriaId) {
      return [];
    }

    return this.produtos
      .filter(p => p.categoriaId === this.reajusteCategoriaId)
      .map(p => ({
        nome: p.nome,
        atual: Number(p.preco),
        novo: Math.round((Number(p.preco) + this.valorReajuste) * 100) / 100
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }

  get reajusteDeixaPrecoInvalido(): boolean {
    return this.previaReajuste.some(p => p.novo <= 0);
  }

  aplicarReajuste(): void {
    if (!this.reajusteCategoriaId) {
      alert('Selecione a categoria.');
      return;
    }

    if (!this.valorReajuste) {
      alert('Informe o valor do reajuste.');
      return;
    }

    if (this.previaReajuste.length === 0) {
      alert('Esta categoria não possui produtos.');
      return;
    }

    if (this.reajusteDeixaPrecoInvalido) {
      alert('Algum produto ficaria com preço zero ou negativo.');
      return;
    }

    const categoria = this.categorias.find(
      c => c.id === this.reajusteCategoriaId
    );

    const acao = this.reajusteTipo === 'aumentar' ? 'AUMENTAR' : 'DIMINUIR';

    const confirmou = confirm(
      `${acao} R$ ${this.formatarPreco(Math.abs(this.valorReajuste))} ` +
      `em ${this.previaReajuste.length} produto(s) da categoria ` +
      `"${categoria?.nome}"?`
    );

    if (!confirmou) {
      return;
    }

    this.aplicandoReajuste = true;

    this.produtoService
      .reajustarPrecoCategoria(this.reajusteCategoriaId, this.valorReajuste)
      .subscribe({
        next: (res) => {
          alert(`Preço de ${res.produtosAlterados} produto(s) atualizado!`);

          this.aplicandoReajuste = false;
          this.reajusteValor = null;
          this.carregarProdutos();
        },
        error: (err: any) => {
          console.error(err);

          this.aplicandoReajuste = false;

          alert(
            typeof err.error === 'string'
              ? err.error
              : 'Erro ao reajustar preços.'
          );

          this.cdr.detectChanges();
        }
      });
  }

  formatarPreco(valor: number): string {
    return Number(valor).toFixed(2).replace('.', ',');
  }

  // =====================================================
  // FILTROS
  // =====================================================

  // Categorias que têm produto, em ordem alfabética
  get categoriasComProduto(): string[] {
    const nomes = this.produtos.map(p => p.categoria || 'Sem categoria');

    return [...new Set<string>(nomes)].sort((a, b) =>
      a.localeCompare(b)
    );
  }

  contarPorCategoria(categoria: string): number {
    if (categoria === 'Todas') {
      return this.produtos.length;
    }

    return this.produtos.filter(
      p => (p.categoria || 'Sem categoria') === categoria
    ).length;
  }

  get produtosFiltrados(): any[] {
    const busca = this.filtroBusca.trim().toLowerCase();

    return this.produtos.filter(p => {
      const categoria = p.categoria || 'Sem categoria';

      if (
        this.filtroCategoria !== 'Todas' &&
        categoria !== this.filtroCategoria
      ) {
        return false;
      }

      if (this.filtroStatus === 'ativos' && !p.ativo) {
        return false;
      }

      if (this.filtroStatus === 'inativos' && p.ativo) {
        return false;
      }

      if (busca && !p.nome?.toLowerCase().includes(busca)) {
        return false;
      }

      return true;
    });
  }

  // Produtos filtrados separados por categoria
  get gruposProdutos(): { categoria: string; produtos: any[] }[] {
    const grupos: { categoria: string; produtos: any[] }[] = [];

    for (const produto of this.produtosFiltrados) {
      const categoria = produto.categoria || 'Sem categoria';

      let grupo = grupos.find(g => g.categoria === categoria);

      if (!grupo) {
        grupo = { categoria, produtos: [] };
        grupos.push(grupo);
      }

      grupo.produtos.push(produto);
    }

    grupos.sort((a, b) => a.categoria.localeCompare(b.categoria));

    grupos.forEach(g =>
      g.produtos.sort((a, b) => a.nome.localeCompare(b.nome))
    );

    return grupos;
  }

  selecionarCategoria(categoria: string): void {
    this.filtroCategoria = categoria;
  }

  limparFiltros(): void {
    this.filtroCategoria = 'Todas';
    this.filtroBusca = '';
    this.filtroStatus = 'todos';
  }

  limparFormulario(): void {
    this.editandoId = null;
    this.nome = '';
    this.descricao = '';
    this.preco = null;
    this.categoriaId = '';
  }
}
