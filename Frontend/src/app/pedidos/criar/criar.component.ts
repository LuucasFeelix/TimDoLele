import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../core/services/pedido.service';

@Component({
  selector: 'app-criar-pedido',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h2>Criar Pedido 🍔</h2>

    <form (ngSubmit)="criar()">
      <input [(ngModel)]="descricao" name="descricao" placeholder="Descrição do pedido" required />
      <br><br>

      <button type="submit">Criar Pedido</button>
    </form>
  `
})
export class CriarPedidoComponent {

  descricao: string = '';

  constructor(private pedidoService: PedidoService) {}

  criar() {
    const dto = {
      descricao: this.descricao
    };

    this.pedidoService.criarPedido(dto).subscribe({
      next: (res) => {
        console.log('Pedido criado', res);
        alert('Pedido criado com sucesso!');
        this.descricao = '';
      },
      error: (err) => {
        console.error(err);
        alert('Erro ao criar pedido');
      }
    });
  }
}
