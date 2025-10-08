// src/types/evaluation.ts

export interface Operador {
  id: number;
  nome: string;
  login: string; // Corresponde ao 'email' do frontend, mas 'login' da API
  ativo: boolean;
  grupo: number; // Adicionado para o campo 'grupo' da API
  dataInclusao: Date; // Manter para compatibilidade com dados locais
  participaAvaliacao: boolean;
  nivel?: string;
  codigoMysuite?: number;
}

export interface Criterio {
  id: number;
  idCriterio: number;
  nome: string;
  tipo: 'qualitativo' | 'quantitativo';
  tipoMeta: 'maior_melhor' | 'menor_melhor';
  valorMeta: number;
  ordem: number;
  ativo: boolean;
  totalAvaliacoes?: number; // pode vir ausente quando for 0
  valorBonus: number;
  mediaGeral: boolean;
  metaCalculo?: number;
}

export interface TipoCriterio {
  id: number;
  descricao: string;
  valorNvl1: number;
  valorNvl2: number;
  valorNvl3: number;
  valorSpa: number;
}

export interface CriterioAvaliacao {
  criterioId: number;
  // agora armazenamos o valor alcançado como string (decimal) para preservar precisão
  valorAlcancado?: string;
  // valorMeta pode vir como string na API (ex: "85.75")
  valorMeta?: string;
  // alguns responses colocam o avaliadorId no próprio critério
  avaliadorId?: number;
  valorBonusAlcancado?: number;
  metaAtingida?: boolean;
  metaAlcancada?: string;
}

export interface Avaliacao {
  id: number;
  operadorId: number; // ID do operador avaliado
  // em alguns endpoints o avaliadorId fica no nível superior, em outros dentro de cada criterio
  avaliadorId?: number; // ID do operador que realizou a avaliação (opcional)
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
