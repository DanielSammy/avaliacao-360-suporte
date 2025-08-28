// src/types/evaluation.ts
export type NivelOperador = 'Nivel 1' | 'Nivel 2' | 'Nivel 3' | 'Sup Avançado';

export const valoresNivel: { [key in NivelOperador]: number } = {
  'Nivel 1': 799.50,
  'Nivel 2': 855.47,
  'Nivel 3': 941.01,
  'Sup Avançado': 979.00,
};

export interface Operador {
  id: string;
  nome: string;
  login: string; // Corresponde ao 'email' do frontend, mas 'login' da API
  ativo: boolean;
  grupo: number; // Adicionado para o campo 'grupo' da API
  dataInclusao: Date; // Manter para compatibilidade com dados locais
  participaAvaliacao: boolean;
  nivel: NivelOperador;
}

export interface Criterio {
  id: string;
  nome: string;
  tipo: 'qualitativo' | 'quantitativo';
  tipoMeta: 'maior_melhor' | 'menor_melhor';
  valorMeta?: number;
  valorBonus?: number;
  peso: number; // Peso do critério (1 a 5)
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