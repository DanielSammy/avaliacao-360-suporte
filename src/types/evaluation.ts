// Tipos principais do sistema de avaliação

export interface Operador {
  id: string;
  nome: string;
  ativo: boolean;
  dataInclusao: Date;
}

export interface Criterio {
  id: string;
  nome: string;
  tipoMeta: 'maior_melhor' | 'menor_melhor';
  valorMeta: number;
  valorBonus: number;
  ordem: number;
  ativo: boolean;
  permiteImportacao: boolean; // false para "Quantitativo"
}

export interface CriterioAvaliacao {
  criterioId: string;
  valorAlcancado: number;
  valorBonusAlcancado: number;
  metaAtingida: boolean;
}

export interface Avaliacao {
  id: string;
  operadorId: string;
  periodo: string; // formato: "YYYY-MM"
  criterios: CriterioAvaliacao[];
  valorTotalMeta: number;
  valorTotalAlcancado: number;
  dataCriacao: Date;
  dataUltimaEdicao: Date;
}

export interface DadosImportacao {
  nome_operador: string;
  atraso_1_contato_percentual: number;
  preenchimento_incorreto_percentual: number;
  satisfacao_clientes_percentual: number;
  solicitacao_apoio_indevida_percentual: number;
  reabertura_tickets_percentual: number;
  periodo: string;
}

export interface EstatisticasOperador {
  operadorId: string;
  totalAvaliacoes: number;
  mediaBonus: number;
  ultimaAvaliacao?: Date;
  metasAtingidasPorcentagem: number;
}

export type StatusAvaliacao = 'pendente' | 'em_andamento' | 'concluida';

export interface ConfiguracaoSistema {
  versao: string;
  ultimaAtualizacao: Date;
  criterios: Criterio[];
  operadores: Operador[];
}