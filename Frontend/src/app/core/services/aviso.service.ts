import { Injectable, signal } from '@angular/core';

// =====================================================
// Popup padrão do sistema (substitui alert() e confirm())
//
// Uso em qualquer componente:
//   private aviso = inject(AvisoService);
//
//   this.aviso.sucesso('Produto criado!');
//   this.aviso.erro('Erro ao salvar.');
//   this.aviso.atencao('Informe o nome.');
//
//   if (!(await this.aviso.confirmar('Excluir "X"?'))) return;
//
//   const motivo = await this.aviso.perguntarMotivo('Por quê?', { motivos: ['A', 'B'] });
//   if (!motivo) return;   // null = desistiu
// =====================================================

export type TipoAviso = 'sucesso' | 'erro' | 'atencao' | 'info';

export interface Aviso {
  tipo: TipoAviso;
  titulo: string;
  mensagem: string;

  // true = mostra "Confirmar" e "Cancelar"
  confirmacao: boolean;
  textoConfirmar: string;
  textoCancelar: string;

  // Botão de confirmar em vermelho (ações como excluir)
  perigo: boolean;

  // Pergunta com motivo: opções prontas + campo "Outro"
  motivos?: string[];

  responder: (confirmou: boolean, texto?: string) => void;
}

export interface OpcoesConfirmacao {
  titulo?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  perigo?: boolean;
}

export interface OpcoesMotivo extends OpcoesConfirmacao {
  motivos: string[];
}

const TITULOS: Record<TipoAviso, string> = {
  sucesso: 'Tudo certo!',
  erro: 'Algo deu errado',
  atencao: 'Atenção',
  info: 'Informação'
};

@Injectable({
  providedIn: 'root'
})
export class AvisoService {

  // Aviso aberto agora (o componente do popup lê daqui)
  readonly atual = signal<Aviso | null>(null);

  // Se pedirem um aviso com outro aberto, ele espera a vez
  private fila: Aviso[] = [];

  sucesso(mensagem: string, titulo?: string): Promise<void> {
    return this.mostrar('sucesso', mensagem, titulo);
  }

  erro(mensagem: string, titulo?: string): Promise<void> {
    return this.mostrar('erro', mensagem, titulo);
  }

  atencao(mensagem: string, titulo?: string): Promise<void> {
    return this.mostrar('atencao', mensagem, titulo);
  }

  info(mensagem: string, titulo?: string): Promise<void> {
    return this.mostrar('info', mensagem, titulo);
  }

  // Resolve true se clicar em Confirmar, false se Cancelar/fechar
  confirmar(mensagem: string, opcoes: OpcoesConfirmacao = {}): Promise<boolean> {
    return new Promise(resolve => {
      this.enfileirar({
        tipo: opcoes.perigo ? 'erro' : 'atencao',
        titulo: opcoes.titulo ?? 'Confirmar',
        mensagem,
        confirmacao: true,
        textoConfirmar: opcoes.textoConfirmar ?? 'Confirmar',
        textoCancelar: opcoes.textoCancelar ?? 'Cancelar',
        perigo: opcoes.perigo ?? false,
        responder: resolve
      });
    });
  }

  // Resolve o motivo escolhido/digitado, ou null se desistir
  perguntarMotivo(mensagem: string, opcoes: OpcoesMotivo): Promise<string | null> {
    return new Promise(resolve => {
      this.enfileirar({
        tipo: opcoes.perigo ? 'erro' : 'atencao',
        titulo: opcoes.titulo ?? 'Informe o motivo',
        mensagem,
        confirmacao: true,
        textoConfirmar: opcoes.textoConfirmar ?? 'Confirmar',
        textoCancelar: opcoes.textoCancelar ?? 'Cancelar',
        perigo: opcoes.perigo ?? false,
        motivos: opcoes.motivos,
        responder: (confirmou, texto) =>
          resolve(confirmou && texto?.trim() ? texto.trim() : null)
      });
    });
  }

  // Chamado pelo componente do popup
  responder(confirmou: boolean, texto?: string): void {
    const aviso = this.atual();

    if (!aviso) {
      return;
    }

    this.atual.set(this.fila.shift() ?? null);

    aviso.responder(confirmou, texto);
  }

  private mostrar(tipo: TipoAviso, mensagem: string, titulo?: string): Promise<void> {
    return new Promise(resolve => {
      this.enfileirar({
        tipo,
        titulo: titulo ?? TITULOS[tipo],
        mensagem,
        confirmacao: false,
        textoConfirmar: 'OK',
        textoCancelar: '',
        perigo: false,
        responder: () => resolve()
      });
    });
  }

  private enfileirar(aviso: Aviso): void {
    if (this.atual()) {
      this.fila.push(aviso);
      return;
    }

    this.atual.set(aviso);
  }
}
