import { Operador, Criterio } from '../types/evaluation';



export const DEFAULT_CRITERIOS: Criterio[] = [
  // --- Critérios da Gerência ---
  {
    id: 1,
    id_criterio: 'gerencia_pontualidade',
    nome: 'Pontualidade (Gerência)',
    tipoMeta: 'maior_melhor',
    peso: 3,
    ordem: 1,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 2,
    id_criterio: 'gerencia_preenchimento_tkt',
    nome: 'Preenchimento Tkt (Gerência)',
    tipoMeta: 'maior_melhor',
    peso: 5,
    ordem: 2,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 3,
    id_criterio: 'gerencia_satisfacao_clientes',
    nome: 'Satisfação Clientes (Gerência)',
    tipoMeta: 'maior_melhor',
    peso: 2,
    ordem: 3,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 4,
    id_criterio: 'gerencia_apoio_indevido',
    nome: 'Apoio Indevido (Gerência)',
    tipoMeta: 'menor_melhor',
    peso: 1,
    ordem: 4,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 5,
    id_criterio: 'gerencia_reabertura_tkt',
    nome: 'Reabertura Tkt (Gerência)',
    tipoMeta: 'menor_melhor',
    peso: 1,
    ordem: 5,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 6,
    id_criterio: 'gerencia_quantitativo',
    nome: 'Quantitativo (Gerência)',
    tipoMeta: 'maior_melhor',
    peso: 4,
    ordem: 6,
    ativo: true,
    tipo: 'quantitativo'
  },

  // --- Critérios 360 ---
  {
    id: 7,
    id_criterio: '360_solucoes_eficazes',
    nome: 'Fornece Soluções Precisas e Eficazes',
    tipoMeta: 'maior_melhor',
    peso: 3,
    ordem: 8,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 8,
    id_criterio: '360_comunicacao_clara',
    nome: 'Comunicação Clara, Objetiva e Eficaz',
    tipoMeta: 'maior_melhor',
    peso: 3,
    ordem: 9,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 9,
    id_criterio: '360_lida_clientes_dificeis',
    nome: 'Lida bem com clientes difíceis ou situações estressantes',
    tipoMeta: 'maior_melhor',
    peso: 3,
    ordem: 10,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 10,
    id_criterio: '360_resposta_rapida',
    nome: 'Responde aos problemas dos clientes de forma rápida e eficiente',
    tipoMeta: 'maior_melhor',
    peso: 3,
    ordem: 11,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 11,
    id_criterio: '360_atitude_proativa',
    nome: 'Tem atitudes proativas',
    tipoMeta: 'maior_melhor',
    peso: 3,
    ordem: 12,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 12,
    id_criterio: '360_respeito_simpatia',
    nome: 'Trata a todos com respeito, simpatia, presteza e educação',
    tipoMeta: 'maior_melhor',
    peso: 3,
    ordem: 13,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 13,
    id_criterio: '360_alinhamento_equipe',
    nome: 'Mantém unido(a) e alinhado(a) em relação aos objetivos e metas',
    tipoMeta: 'maior_melhor',
    peso: 3,
    ordem: 14,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 14,
    id_criterio: '360_responsabilidade',
    nome: 'É responsável, priorizando os atendimentos a serem realizados',
    tipoMeta: 'maior_melhor',
    peso: 3,
    ordem: 15,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 15,
    id_criterio: '360_iniciativa_aprendizado',
    nome: 'Tem iniciativa para buscar novos aprendizados e evoluir',
    tipoMeta: 'maior_melhor',
    peso: 3,
    ordem: 16,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 16,
    id_criterio: '360_compreensao_processos',
    nome: 'Procura compreender os processos dos clientes em sua totalidade',
    tipoMeta: 'maior_melhor',
    peso: 3,
    ordem: 17,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 17,
    id_criterio: '360_evita_distracoes',
    nome: 'Evita distrações excessivas com uso pessoal de celular e redes sociais',
    tipoMeta: 'maior_melhor',
    peso: 3,
    ordem: 18,
    ativo: true,
    tipo: 'qualitativo'
  },
  {
    id: 18,
    id_criterio: '360_trabalho_conjunto',
    nome: 'Trabalha em conjunto para encontrar soluções e compartilhar conhecimentos',
    tipoMeta: 'maior_melhor',
    peso: 3,
    ordem: 19,
    ativo: true,
    tipo: 'qualitativo'
  },
];