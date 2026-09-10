import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  forkJoin
} from 'rxjs';

import {
  ConfiguracaoLojaService,
  ConfiguracaoLoja,
  HorarioFuncionamento,
  DataEspecial,
  StatusLoja,
  AtualizarConfiguracaoLojaRequest,
  AtualizarHorarioFuncionamentoRequest,
  CriarDataEspecialRequest
} from '../../core/services/configuracao-loja.service';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './configuracoes.component.html',
  styleUrls: ['./configuracoes.component.css']
})
export class ConfiguracoesComponent implements OnInit {

  carregando = true;

  salvandoConfiguracoes = false;
  salvandoHorarios = false;
  alterandoStatusLoja = false;
  adicionandoDataEspecial = false;

  mensagemSucesso = '';
  mensagemErro = '';

  statusLoja: StatusLoja | null = null;

  motivoFechamento = '';

  configuracao: AtualizarConfiguracaoLojaRequest = {
    prazoEntregaMin: 0,
    prazoEntregaMax: 0,
    prazoRetiradaMin: 0,
    prazoRetiradaMax: 0,
    taxaEntregaPadrao: 0
  };

  horarios: HorarioFuncionamento[] = [];

  datasEspeciais: DataEspecial[] = [];

  novaDataEspecial: CriarDataEspecialRequest = {
    data: '',
    tipo: 0,
    descricao: '',
    horaAbertura: null,
    horaFechamento: null
  };

  constructor(
    private configuracaoLojaService:
      ConfiguracaoLojaService,

    private cdr:
      ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarTudo();
  }

  carregarTudo(): void {

    this.carregando = true;

    this.limparMensagens();

    this.cdr.detectChanges();

    forkJoin({
      configuracao:
        this.configuracaoLojaService
          .obterConfiguracoes(),

      horarios:
        this.configuracaoLojaService
          .obterHorarios(),

      datasEspeciais:
        this.configuracaoLojaService
          .obterDatasEspeciais(),

      status:
        this.configuracaoLojaService
          .obterStatusLoja()
    })
      .subscribe({

        next: (resultado) => {

          this.preencherConfiguracao(
            resultado.configuracao
          );

          this.horarios =
            [...resultado.horarios];

          this.datasEspeciais =
            [...resultado.datasEspeciais];

          this.statusLoja =
            resultado.status;

          this.carregando =
            false;

          console.log(
            '⚙️ Configurações carregadas:',
            resultado
          );

          this.cdr.detectChanges();
        },

        error: (erro) => {

          console.error(
            '❌ Erro ao carregar configurações:',
            erro
          );

          this.mensagemErro =
            'Não foi possível carregar as configurações da loja.';

          this.carregando =
            false;

          this.cdr.detectChanges();
        }
      });
  }

  private preencherConfiguracao(
    configuracao: ConfiguracaoLoja
  ): void {

    this.configuracao = {
      prazoEntregaMin:
        configuracao.prazoEntregaMin,

      prazoEntregaMax:
        configuracao.prazoEntregaMax,

      prazoRetiradaMin:
        configuracao.prazoRetiradaMin,

      prazoRetiradaMax:
        configuracao.prazoRetiradaMax,

      taxaEntregaPadrao:
        configuracao.taxaEntregaPadrao
    };
  }

  salvarConfiguracoes(): void {

    this.limparMensagens();

    if (
      this.configuracao.prazoEntregaMin < 0 ||
      this.configuracao.prazoEntregaMax < 0 ||
      this.configuracao.prazoRetiradaMin < 0 ||
      this.configuracao.prazoRetiradaMax < 0 ||
      this.configuracao.taxaEntregaPadrao < 0
    ) {

      this.mensagemErro =
        'Os valores das configurações não podem ser negativos.';

      this.cdr.detectChanges();

      return;
    }

    if (
      this.configuracao.prazoEntregaMin >
      this.configuracao.prazoEntregaMax
    ) {

      this.mensagemErro =
        'O prazo mínimo de entrega não pode ser maior que o prazo máximo.';

      this.cdr.detectChanges();

      return;
    }

    if (
      this.configuracao.prazoRetiradaMin >
      this.configuracao.prazoRetiradaMax
    ) {

      this.mensagemErro =
        'O prazo mínimo de retirada não pode ser maior que o prazo máximo.';

      this.cdr.detectChanges();

      return;
    }

    this.salvandoConfiguracoes =
      true;

    this.cdr.detectChanges();

    this.configuracaoLojaService
      .atualizarConfiguracoes(
        this.configuracao
      )
      .subscribe({

        next: (resultado) => {

          this.preencherConfiguracao(
            resultado
          );

          this.salvandoConfiguracoes =
            false;

          this.mensagemSucesso =
            'Configurações salvas com sucesso.';

          this.cdr.detectChanges();

          this.atualizarStatus();
        },

        error: (erro) => {

          console.error(
            '❌ Erro ao salvar configurações:',
            erro
          );

          this.salvandoConfiguracoes =
            false;

          this.mensagemErro =
            'Não foi possível salvar as configurações.';

          this.cdr.detectChanges();
        }
      });
  }

  atualizarStatus(): void {

    this.configuracaoLojaService
      .obterStatusLoja()
      .subscribe({

        next: (status) => {

          this.statusLoja =
            status;

          this.cdr.detectChanges();
        },

        error: (erro) => {

          console.error(
            '❌ Erro ao atualizar status da loja:',
            erro
          );

          this.cdr.detectChanges();
        }
      });
  }

  fecharLoja(): void {

    this.limparMensagens();

    this.alterandoStatusLoja =
      true;

    this.cdr.detectChanges();

    this.configuracaoLojaService
      .fecharLojaManualmente(
        this.motivoFechamento
      )
      .subscribe({

        next: () => {

          this.alterandoStatusLoja =
            false;

          this.motivoFechamento =
            '';

          this.mensagemSucesso =
            'Loja fechada manualmente com sucesso.';

          this.cdr.detectChanges();

          this.atualizarStatus();
        },

        error: (erro) => {

          console.error(
            '❌ Erro ao fechar loja:',
            erro
          );

          this.alterandoStatusLoja =
            false;

          this.mensagemErro =
            'Não foi possível fechar a loja.';

          this.cdr.detectChanges();
        }
      });
  }

  abrirLoja(): void {

    this.limparMensagens();

    this.alterandoStatusLoja =
      true;

    this.cdr.detectChanges();

    this.configuracaoLojaService
      .abrirLojaManualmente()
      .subscribe({

        next: () => {

          this.alterandoStatusLoja =
            false;

          this.mensagemSucesso =
            'Controle manual removido. A loja voltou a seguir os horários configurados.';

          this.cdr.detectChanges();

          this.atualizarStatus();
        },

        error: (erro) => {

          console.error(
            '❌ Erro ao abrir loja:',
            erro
          );

          this.alterandoStatusLoja =
            false;

          this.mensagemErro =
            'Não foi possível abrir a loja.';

          this.cdr.detectChanges();
        }
      });
  }

  salvarHorarios(): void {

    this.limparMensagens();

    for (
      const horario of
      this.horarios
    ) {

      if (
        horario.aberto &&
        (
          !horario.horaAbertura ||
          !horario.horaFechamento
        )
      ) {

        this.mensagemErro =
          `Informe o horário de abertura e fechamento de ${horario.diaSemanaTexto}.`;

        this.cdr.detectChanges();

        return;
      }
    }

    const request:
      AtualizarHorarioFuncionamentoRequest[] =
      this.horarios.map(
        horario => ({
          diaSemana:
            horario.diaSemana,

          aberto:
            horario.aberto,

          horaAbertura:
            horario.aberto
              ? horario.horaAbertura
              : null,

          horaFechamento:
            horario.aberto
              ? horario.horaFechamento
              : null
        })
      );

    this.salvandoHorarios =
      true;

    this.cdr.detectChanges();

    this.configuracaoLojaService
      .atualizarHorarios(
        request
      )
      .subscribe({

        next: (horarios) => {

          this.horarios =
            [...horarios];

          this.salvandoHorarios =
            false;

          this.mensagemSucesso =
            'Horários atualizados com sucesso.';

          this.cdr.detectChanges();

          this.atualizarStatus();
        },

        error: (erro) => {

          console.error(
            '❌ Erro ao salvar horários:',
            erro
          );

          this.salvandoHorarios =
            false;

          this.mensagemErro =
            'Não foi possível atualizar os horários.';

          this.cdr.detectChanges();
        }
      });
  }

  alterarDia(
    horario: HorarioFuncionamento
  ): void {

    if (!horario.aberto) {

      horario.horaAbertura =
        null;

      horario.horaFechamento =
        null;
    }

    this.cdr.detectChanges();
  }

  adicionarDataEspecial(): void {

    this.limparMensagens();

    if (
      !this.novaDataEspecial.data
    ) {

      this.mensagemErro =
        'Informe a data especial.';

      this.cdr.detectChanges();

      return;
    }

    if (
      !this.novaDataEspecial
        .descricao
        .trim()
    ) {

      this.mensagemErro =
        'Informe uma descrição para a data especial.';

      this.cdr.detectChanges();

      return;
    }

    if (
      this.novaDataEspecial.tipo !== 0 &&
      (
        !this.novaDataEspecial.horaAbertura ||
        !this.novaDataEspecial.horaFechamento
      )
    ) {

      this.mensagemErro =
        'Informe os horários da data especial.';

      this.cdr.detectChanges();

      return;
    }

    const request:
      CriarDataEspecialRequest = {

        data:
          this.novaDataEspecial.data,

        tipo:
          Number(
            this.novaDataEspecial.tipo
          ),

        descricao:
          this.novaDataEspecial
            .descricao
            .trim(),

        horaAbertura:
          this.novaDataEspecial.tipo === 0
            ? null
            : this.novaDataEspecial
                .horaAbertura,

        horaFechamento:
          this.novaDataEspecial.tipo === 0
            ? null
            : this.novaDataEspecial
                .horaFechamento
      };

    this.adicionandoDataEspecial =
      true;

    this.cdr.detectChanges();

    this.configuracaoLojaService
      .adicionarDataEspecial(
        request
      )
      .subscribe({

        next: () => {

          this.adicionandoDataEspecial =
            false;

          this.mensagemSucesso =
            'Data especial adicionada com sucesso.';

          this.limparNovaDataEspecial();

          this.cdr.detectChanges();

          this.carregarDatasEspeciais();

          this.atualizarStatus();
        },

        error: (erro) => {

          console.error(
            '❌ Erro ao adicionar data especial:',
            erro
          );

          this.adicionandoDataEspecial =
            false;

          this.mensagemErro =
            'Não foi possível adicionar a data especial.';

          this.cdr.detectChanges();
        }
      });
  }

  excluirDataEspecial(
    dataEspecial: DataEspecial
  ): void {

    const confirmar =
      window.confirm(
        `Deseja realmente excluir "${dataEspecial.descricao}"?`
      );

    if (!confirmar) {
      return;
    }

    this.limparMensagens();

    this.configuracaoLojaService
      .excluirDataEspecial(
        dataEspecial.id
      )
      .subscribe({

        next: () => {

          this.mensagemSucesso =
            'Data especial excluída com sucesso.';

          this.cdr.detectChanges();

          this.carregarDatasEspeciais();

          this.atualizarStatus();
        },

        error: (erro) => {

          console.error(
            '❌ Erro ao excluir data especial:',
            erro
          );

          this.mensagemErro =
            'Não foi possível excluir a data especial.';

          this.cdr.detectChanges();
        }
      });
  }

  private carregarDatasEspeciais(): void {

    this.configuracaoLojaService
      .obterDatasEspeciais()
      .subscribe({

        next: (datas) => {

          this.datasEspeciais =
            [...datas];

          this.cdr.detectChanges();
        },

        error: (erro) => {

          console.error(
            '❌ Erro ao carregar datas especiais:',
            erro
          );

          this.cdr.detectChanges();
        }
      });
  }

  private limparNovaDataEspecial(): void {

    this.novaDataEspecial = {
      data: '',
      tipo: 0,
      descricao: '',
      horaAbertura: null,
      horaFechamento: null
    };
  }

  formatarData(
    data: string
  ): string {

    if (!data) {
      return '-';
    }

    const somenteData =
      data.substring(
        0,
        10
      );

    const partes =
      somenteData.split(
        '-'
      );

    if (
      partes.length !== 3
    ) {
      return data;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  formatarMoeda(
    valor: number
  ): string {

    return new Intl.NumberFormat(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL'
      }
    ).format(
      valor ?? 0
    );
  }

  private limparMensagens(): void {

    this.mensagemSucesso =
      '';

    this.mensagemErro =
      '';
  }
}
