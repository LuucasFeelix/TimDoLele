import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import { Observable } from 'rxjs';

// =====================================================
// CONFIGURAÇÃO DA LOJA - RETORNO DA API
// =====================================================

export interface ConfiguracaoLoja {
  id: string;

  prazoEntregaMin: number;
  prazoEntregaMax: number;

  prazoRetiradaMin: number;
  prazoRetiradaMax: number;

  taxaEntregaPadrao: number;

  fechadaManual: boolean;

  motivoFechamentoManual: string | null;
}

// =====================================================
// CONFIGURAÇÃO DA LOJA - PUT
// =====================================================

export interface AtualizarConfiguracaoLojaRequest {
  prazoEntregaMin: number;
  prazoEntregaMax: number;

  prazoRetiradaMin: number;
  prazoRetiradaMax: number;

  taxaEntregaPadrao: number;
}

// =====================================================
// HORÁRIO - RETORNO DA API
// =====================================================

export interface HorarioFuncionamento {
  id: string;

  diaSemana: number;

  diaSemanaTexto: string;

  aberto: boolean;

  horaAbertura: string | null;

  horaFechamento: string | null;
}

// =====================================================
// HORÁRIO - PUT
// =====================================================

export interface AtualizarHorarioFuncionamentoRequest {
  diaSemana: number;

  aberto: boolean;

  horaAbertura: string | null;

  horaFechamento: string | null;
}

// =====================================================
// DATA ESPECIAL - RETORNO DA API
// =====================================================

export interface DataEspecial {
  id: string;

  data: string;

  tipo: string;

  descricao: string;

  horaAbertura: string | null;

  horaFechamento: string | null;
}

// =====================================================
// DATA ESPECIAL - POST
// =====================================================

export interface CriarDataEspecialRequest {
  data: string;

  tipo: number;

  descricao: string;

  horaAbertura: string | null;

  horaFechamento: string | null;
}

// =====================================================
// STATUS PÚBLICO DA LOJA
// =====================================================

export interface StatusLoja {
  aberta: boolean;

  status: string;

  mensagem: string;

  motivo: string | null;

  proximaAbertura: string | null;

  horaAbertura: string | null;

  horaFechamento: string | null;

  prazoEntregaMin: number;

  prazoEntregaMax: number;

  prazoRetiradaMin: number;

  prazoRetiradaMax: number;

  taxaEntrega: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConfiguracaoLojaService {

  private readonly apiUrl =
    'https://localhost:57668/api';

  constructor(
    private http: HttpClient
  ) {}

  obterConfiguracoes():
    Observable<ConfiguracaoLoja> {

    return this.http.get<ConfiguracaoLoja>(
      `${this.apiUrl}/configuracoes`
    );
  }

  atualizarConfiguracoes(
    configuracao: AtualizarConfiguracaoLojaRequest
  ): Observable<ConfiguracaoLoja> {

    return this.http.put<ConfiguracaoLoja>(
      `${this.apiUrl}/configuracoes`,
      configuracao
    );
  }


  fecharLojaManualmente(
    motivo?: string
  ): Observable<ConfiguracaoLoja> {

    let params = new HttpParams();

    if (motivo?.trim()) {
      params = params.set(
        'motivo',
        motivo.trim()
      );
    }

    return this.http.put<ConfiguracaoLoja>(
      `${this.apiUrl}/configuracoes/fechar-manualmente`,
      {},
      {
        params
      }
    );
  }


  abrirLojaManualmente():
    Observable<ConfiguracaoLoja> {

    return this.http.put<ConfiguracaoLoja>(
      `${this.apiUrl}/configuracoes/abrir-manualmente`,
      {}
    );
  }


  obterHorarios():
    Observable<HorarioFuncionamento[]> {

    return this.http.get<HorarioFuncionamento[]>(
      `${this.apiUrl}/configuracoes/horarios`
    );
  }

  atualizarHorarios(
    horarios: AtualizarHorarioFuncionamentoRequest[]
  ): Observable<HorarioFuncionamento[]> {

    return this.http.put<HorarioFuncionamento[]>(
      `${this.apiUrl}/configuracoes/horarios`,
      horarios
    );
  }

  obterDatasEspeciais():
    Observable<DataEspecial[]> {

    return this.http.get<DataEspecial[]>(
      `${this.apiUrl}/configuracoes/datas-especiais`
    );
  }

  adicionarDataEspecial(
    dataEspecial: CriarDataEspecialRequest
  ): Observable<DataEspecial> {

    return this.http.post<DataEspecial>(
      `${this.apiUrl}/configuracoes/datas-especiais`,
      dataEspecial
    );
  }

  excluirDataEspecial(
    id: string
  ): Observable<void> {

    return this.http.delete<void>(
      `${this.apiUrl}/configuracoes/datas-especiais/${id}`
    );
  }

  obterStatusLoja():
    Observable<StatusLoja> {

    return this.http.get<StatusLoja>(
      `${this.apiUrl}/loja/status`
    );
  }
}
