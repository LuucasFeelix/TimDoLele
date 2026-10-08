import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProdutoService } from '../../core/services/produto.service';
import { CategoriaService } from '../../core/services/categoria.service';
import { AdicionalService } from '../../core/services/adicional.service';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
