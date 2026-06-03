import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService } from '../../core/services/pedido.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class Dashboard implements OnInit {

  pedidos: any[] = [];
  loading = false;

  constructor(
    private pedidoService: PedidoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarPedidos();
  }

  carregarPedidos(): void {
    this.loading = true;

    this.pedidoService.getPedidos().subscribe({
      next: (res: any) => {
        this.pedidos = res.data ?? res;

        console.log('PEDIDOS:', this.pedidos);

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  alterarStatus(pedidoId: string, status: number): void {
    this.pedidoService.atualizarStatus(pedidoId, status).subscribe({
      next: () => {
        alert('Status atualizado!');
        this.carregarPedidos();
      },
      error: (err: any) => {
        console.error(err);
        alert('Erro ao atualizar status');
      }
    });
  }

  isPendente(pedido: any): boolean {
    return String(pedido.status).trim() === 'Pendente';
  }

  isEmPreparo(pedido: any): boolean {
    return String(pedido.status).trim() === 'EmPreparo';
  }

  isSaiuParaEntrega(pedido: any): boolean {
    return String(pedido.status).trim() === 'SaiuParaEntrega';
  }

  podeCancelar(pedido: any): boolean {
    const status = String(pedido.status).trim();

    return status !== 'Entregue' && status !== 'Cancelado';
  }
}
