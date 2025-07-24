// src/data/defaultData.ts
import { Operador, Criterio } from '../types/evaluation';

export const DEFAULT_OPERADORES: Operador[] = [
    { id: '1', nome: 'Ana Carolina Ribeiro', ativo: true, dataInclusao: new Date() },
    { id: '2', nome: 'Erick Douglas', ativo: true, dataInclusao: new Date() },
    { id: '3', nome: 'Evandro Pereira', ativo: true, dataInclusao: new Date() },
    { id: '4', nome: 'Gabriel Medeiros', ativo: true, dataInclusao: new Date() },
    { id: '5', nome: 'Jonathan Nascimento', ativo: true, dataInclusao: new Date() },
    { id: '6', nome: 'João Pedro Costa', ativo: true, dataInclusao: new Date() },
    { id: '7', nome: 'Luciano Augusto', ativo: true, dataInclusao: new Date() },
    { id: '8', nome: 'Luís Romero', ativo: true, dataInclusao: new Date() },
    { id: '9', nome: 'Mayara Duarte', ativo: true, dataInclusao: new Date() },
    { id: '10', nome: 'Paulo Silva', ativo: true, dataInclusao: new Date() },
    { id: '11', nome: 'Samuel Ivens', ativo: true, dataInclusao: new Date() },
    { id: '12', nome: 'Wesley Fagundes', ativo: true, dataInclusao: new Date() },
];

export const DEFAULT_CRITERIOS: Criterio[] = [
    // --- Critérios da Gerência (Valor Total: R$ 440,00) ---
    {
        id: 'gerencia_pontualidade', nome: 'Pontualidade (Gerência)',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 100.00, ordem: 1, ativo: true, permiteImportacao: true
    },
    {
        id: 'gerencia_preenchimento_tkt', nome: 'Preenchimento Tkt (Gerência)',
        tipoMeta: 'maior_melhor', valorMeta: 98, valorBonus: 140.00, ordem: 2, ativo: true, permiteImportacao: true
    },
    {
        id: 'gerencia_satisfacao_clientes', nome: 'Satisfação Clientes (Gerência)',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 50.00, ordem: 3, ativo: true, permiteImportacao: true
    },
    {
        id: 'gerencia_apoio_indevido', nome: 'Apoio Indevido (Gerência)',
        tipoMeta: 'menor_melhor', valorMeta: 5, valorBonus: 20.00, ordem: 4, ativo: true, permiteImportacao: true
    },
    {
        id: 'gerencia_reabertura_tkt', nome: 'Reabertura Tkt (Gerência)',
        tipoMeta: 'menor_melhor', valorMeta: 5, valorBonus: 20.00, ordem: 5, ativo: true, permiteImportacao: true
    },
    {
        id: 'gerencia_quantitativo', nome: 'Quantitativo (Gerência)',
        tipoMeta: 'maior_melhor', valorMeta: 190, valorBonus: 110.00, ordem: 6, ativo: true, permiteImportacao: true
    },
    // --- Critérios 360 (Valor Total: R$ 340,00) ---
    {
        id: '360_pontualidade', nome: 'Pontualidade e Compromisso com Horários',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 26.00, ordem: 7, ativo: true, permiteImportacao: true
    },
    {
        id: '360_solucoes_eficazes', nome: 'Fornece Soluções Precisas e Eficazes',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 26.00, ordem: 8, ativo: true, permiteImportacao: true
    },
    {
        id: '360_comunicacao_clara', nome: 'Comunicação Clara, Objetiva e Eficaz',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 26.00, ordem: 9, ativo: true, permiteImportacao: true
    },
    {
        id: '360_lida_clientes_dificeis', nome: 'Lida bem com clientes difíceis ou situações estressantes',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 26.00, ordem: 10, ativo: true, permiteImportacao: true
    },
    {
        id: '360_resposta_rapida', nome: 'Responde aos problemas dos clientes de forma rápida e eficiente',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 26.00, ordem: 11, ativo: true, permiteImportacao: true
    },
    {
        id: '360_atitude_proativa', nome: 'Tem atitudes proativas',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 26.00, ordem: 12, ativo: true, permiteImportacao: true
    },
    {
        id: '360_respeito_simpatia', nome: 'Trata a todos com respeito, simpatia, presteza e educação',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 26.00, ordem: 13, ativo: true, permiteImportacao: true
    },
    {
        id: '360_alinhamento_equipe', nome: 'Mantém unido(a) e alinhado(a) em relação aos objetivos e metas',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 26.00, ordem: 14, ativo: true, permiteImportacao: true
    },
    {
        id: '360_responsabilidade', nome: 'É responsável, priorizando os atendimentos a serem realizados',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 26.00, ordem: 15, ativo: true, permiteImportacao: true
    },
    {
        id: '360_iniciativa_aprendizado', nome: 'Tem iniciativa para buscar novos aprendizados e evoluir',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 26.00, ordem: 16, ativo: true, permiteImportacao: true
    },
    {
        id: '360_compreensao_processos', nome: 'Procura compreender os processos dos clientes em sua totalidade',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 26.00, ordem: 17, ativo: true, permiteImportacao: true
    },
    {
        id: '360_evita_distracoes', nome: 'Evita distrações excessivas com uso pessoal de celular e redes sociais',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 26.00, ordem: 18, ativo: true, permiteImportacao: true
    },
    {
        id: '360_trabalho_conjunto', nome: 'Trabalha em conjunto para encontrar soluções e compartilhar conhecimentos',
        tipoMeta: 'maior_melhor', valorMeta: 95, valorBonus: 28.00, ordem: 19, ativo: true, permiteImportacao: true // Bônus ajustado para fechar em R$ 780
    },
];