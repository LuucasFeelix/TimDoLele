import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriaService } from '../../core/services/categoria.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.css']
})
export class CategoriasComponent implements OnInit {

  categorias: any[] = [];

  nome = '';

  editandoId: string | null = null;

  loading = false;

  constructor(
    private categoriaService: CategoriaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarCategorias();
  }

  carregarCategorias(): void {
    this.loading = true;

    this.categoriaService.getCategorias().subscribe({
      next: (res: any[]) => {
        this.categorias = res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  salvar(): void {
    if (!this.nome.trim()) {
      alert('Informe o nome da categoria.');
      return;
    }

    const dto = {
      nome: this.nome
    };

    if (this.editandoId) {
      this.categoriaService.atualizarCategoria(this.editandoId, dto)
        .subscribe({
          next: () => {
            alert('Categoria atualizada!');
            this.limparFormulario();
            this.carregarCategorias();
          },
          error: (err: any) => {
            console.error(err);
            alert('Erro ao atualizar categoria.');
          }
        });

      return;
    }

    this.categoriaService.criarCategoria(dto)
      .subscribe({
        next: () => {
          alert('Categoria criada!');
          this.limparFormulario();
          this.carregarCategorias();
        },
        error: (err: any) => {
          console.error(err);
          alert('Erro ao criar categoria.');
        }
      });
  }

  editar(categoria: any): void {
    this.editandoId = categoria.id;
    this.nome = categoria.nome;
  }

  excluir(categoria: any): void {
    const confirmar = confirm(
      `Deseja excluir a categoria "${categoria.nome}"?`
    );

    if (!confirmar) {
      return;
    }

    this.categoriaService.excluirCategoria(categoria.id)
      .subscribe({
        next: () => {
          alert('Categoria excluída!');
          this.carregarCategorias();
        },
        error: (err: any) => {
          console.error(err);
          alert('Erro ao excluir categoria. Verifique se ela possui produtos vinculados.');
        }
      });
  }

  limparFormulario(): void {
    this.nome = '';
    this.editandoId = null;
  }
}
