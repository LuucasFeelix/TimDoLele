import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService } from '../../core/services/pedido.service';

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './relatorios.component.html',
  styleUrls: ['./relatorios.component.css']
})
export class RelatoriosComponent implements OnInit {

  pedidos: any[] = [];

  totalPedidos = 0;
  totalEntregues = 0;
  totalCancelados = 0;
  faturamento = 0;
  ticketMedio = 0;

  constructor(
    private pedidoService: PedidoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.pedidoService.getPedidos().subscribe({
      next: (res: any) => {
        console.log('RELATORIOS PEDIDOS:', res);

        this.pedidos = res.data ?? res;

        this.totalPedidos = this.pedidos.length;

        this.totalEntregues = this.pedidos.filter(
          (p: any) => String(p.status).trim() === 'Entregue'
        ).length;

        this.totalCancelados = this.pedidos.filter(
          (p: any) => String(p.status).trim() === 'Cancelado'
        ).length;

        this.faturamento = this.pedidos
          .filter((p: any) => String(p.status).trim() !== 'Cancelado')
          .reduce(
            (soma: number, p: any) => soma + Number(p.total),
            0
          );

        this.ticketMedio =
          this.totalPedidos > 0
            ? this.faturamento / this.totalPedidos
            : 0;

        this.cdr.detectChanges();
      },
      error: (err: any) => console.error(err)
    });
  }
}
