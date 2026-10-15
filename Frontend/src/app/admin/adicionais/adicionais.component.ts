import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AdicionalService } from '../../core/services/adicional.service';
import { SemEmojiDirective } from '../../core/directives/sem-emoji.directive';
import { AvisoService } from '../../core/services/aviso.service';
import { DinheiroPipe } from '../../shared/pipes/dinheiro.pipe';

@Component({
  selector: 'app-adicionais',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SemEmojiDirective,
    DinheiroPipe
  ],
  templateUrl: './adicionais.component.html',
  styleUrls: ['./adicionais.component.css']
})
export class AdicionaisComponent implements OnInit {

  // Popup padrão de avisos (substitui alert/confirm)
  private aviso = inject(AvisoService);

  adicionais: any[] = [];

  nome = '';
  preco = 0;

  editandoId: string | null = null;

  loading = false;

  constructor(
    private adicionalService: AdicionalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarAdicionais();
  }

  carregarAdicionais(): void {
    this.loading = true;

    this.adicionalService.getAdicionais().subscribe({
      next: (res: any[]) => {
        this.adicionais = res;
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

    const dto = {
      nome: this.nome,
      preco: this.preco
    };

    if (this.editandoId) {

      this.adicionalService
        .atualizarAdicional(this.editandoId, dto)
        .subscribe({
          next: () => {
            this.aviso.sucesso('Adicional atualizado!');
            this.limparFormulario();
            this.carregarAdicionais();
          }
        });

      return;
    }

    this.adicionalService.criarAdicional(dto)
      .subscribe({
        next: () => {
          this.aviso.sucesso('Adicional criado!');
          this.limparFormulario();
          this.carregarAdicionais();
        }
      });
  }

  editar(adicional: any): void {
    this.editandoId = adicional.id;
    this.nome = adicional.nome;
    this.preco = adicional.preco;
  }

  async excluir(adicional: any): Promise<void> {

    const confirmou = await this.aviso.confirmar(
      `Deseja excluir o adicional "${adicional.nome}"?`,
      { titulo: 'Excluir adicional', textoConfirmar: 'Excluir', perigo: true }
    );

    if (!confirmou)
      return;

    this.adicionalService
      .excluirAdicional(adicional.id)
      .subscribe({
        next: () => {
          this.aviso.sucesso('Excluído!');
          this.carregarAdicionais();
        }
      });
  }

  limparFormulario(): void {
    this.nome = '';
    this.preco = 0;
    this.editandoId = null;
  }
}
