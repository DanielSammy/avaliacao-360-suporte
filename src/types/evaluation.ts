// src/types/evaluation.ts
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
  permiteImportacao: boolean;
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

// Interface unificada para todos os tipos de importação
export interface DadosImportacao {
  nome_operador: string;
  periodo: string;
  // Permite qualquer outra chave, que será o nome da coluna normalizado
  [key: string]: string | number | undefined;
}

export type StatusAvaliacao = 'pendente' | 'em_andamento' | 'concluida';

export interface ConfiguracaoSistema {
  versao: string;
  ultimaAtualizacao: Date;
  criterios: Criterio[];
  operadores: Operador[];
}