import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriaService } from '../../core/services/categoria.service';
import { RouterModule } from '@angular/router';
import { SemEmojiDirective } from '../../core/directives/sem-emoji.directive';
import { AvisoService } from '../../core/services/aviso.service';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SemEmojiDirective
  ],
  templateUrl: './categorias.component.html',
  styleUrls: ['./categorias.component.css']
})
export class CategoriasComponent implements OnInit {

  // Popup padrão de avisos (substitui alert/confirm)
  private aviso = inject(AvisoService);

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
      this.aviso.atencao('Informe o nome da categoria.');
      return;
    }

    const dto = {
      nome: this.nome
    };

    if (this.editandoId) {
      this.categoriaService.atualizarCategoria(this.editandoId, dto)
        .subscribe({
          next: () => {
            this.aviso.sucesso('Categoria atualizada!');
            this.limparFormulario();
            this.carregarCategorias();
          },
          error: (err: any) => {
            console.error(err);
            this.aviso.erro('Erro ao atualizar categoria.');
          }
        });

      return;
    }

    this.categoriaService.criarCategoria(dto)
      .subscribe({
        next: () => {
          this.aviso.sucesso('Categoria criada!');
          this.limparFormulario();
          this.carregarCategorias();
        },
        error: (err: any) => {
          console.error(err);
          this.aviso.erro('Erro ao criar categoria.');
        }
      });
  }

  editar(categoria: any): void {
    this.editandoId = categoria.id;
    this.nome = categoria.nome;
  }

  async excluir(categoria: any): Promise<void> {
    const confirmar = await this.aviso.confirmar(
      `Deseja excluir a categoria "${categoria.nome}"?`,
      { titulo: 'Excluir categoria', textoConfirmar: 'Excluir', perigo: true }
    );

    if (!confirmar) {
      return;
    }

    this.categoriaService.excluirCategoria(categoria.id)
      .subscribe({
        next: () => {
          this.aviso.sucesso('Categoria excluída!');
          this.carregarCategorias();
        },
        error: (err: any) => {
          console.error(err);
          this.aviso.erro('Erro ao excluir categoria. Verifique se ela possui produtos vinculados.');
        }
      });
  }

  limparFormulario(): void {
    this.nome = '';
    this.editandoId = null;
  }
}
