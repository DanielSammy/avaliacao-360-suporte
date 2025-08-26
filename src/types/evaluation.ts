// src/types/evaluation.ts
export interface Operador {
  id: string;
  nome: string;
  login: string; // Corresponde ao 'email' do frontend, mas 'login' da API
  ativo: boolean;
  grupo: number; // Adicionado para o campo 'grupo' da API
  dataInclusao: Date; // Manter para compatibilidade com dados locais
  participaAvaliacao: boolean;
}

export interface Criterio {
  id: string;
  nome: string;
  tipo: 'qualitativo' | 'quantitativo'; // Added new property
  tipoMeta: 'maior_melhor' | 'menor_melhor';
  valorMeta: number;
  valorBonus: number;
  ordem: number;
  ativo: boolean;
}

export interface CriterioAvaliacao {
  criterioId: string;
  valorAlcancado: number;
  valorBonusAlcancado: number;
  metaAtingida: boolean;
}

export interface Avaliacao {
  id: string;
  operadorId: string; // ID do operador avaliado
  avaliadorId: string; // ID do operador que realizou a avaliação
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