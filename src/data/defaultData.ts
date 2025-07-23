import { Operador, Criterio } from '../types/evaluation';

// Operadores pré-configurados
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

// Critérios pré-configurados
export const DEFAULT_CRITERIOS: Criterio[] = [
  {
    id: '1',
    nome: 'Atraso no 1º contato',
    tipoMeta: 'menor_melhor',
    valorMeta: 10,
    valorBonus: 60.00,
    ordem: 1,
    ativo: true,
    permiteImportacao: true
  },
  {
    id: '2',
    nome: 'Preenchimento Incorreto',
    tipoMeta: 'menor_melhor',
    valorMeta: 5,
    valorBonus: 50.00,
    ordem: 2,
    ativo: true,
    permiteImportacao: true
  },
  {
    id: '3',
    nome: 'Satisfação dos clientes',
    tipoMeta: 'menor_melhor',
    valorMeta: 15,
    valorBonus: 60.00,
    ordem: 3,
    ativo: true,
    permiteImportacao: true
  },
  {
    id: '4',
    nome: 'Solicitação de apoio indevida',
    tipoMeta: 'menor_melhor',
    valorMeta: 8,
    valorBonus: 50.00,
    ordem: 4,
    ativo: true,
    permiteImportacao: true
  },
  {
    id: '5',
    nome: 'Reabertura de tickets',
    tipoMeta: 'menor_melhor',
    valorMeta: 12,
    valorBonus: 50.00,
    ordem: 5,
    ativo: true,
    permiteImportacao: true
  },
  {
    id: '6',
    nome: 'Quantitativo',
    tipoMeta: 'maior_melhor',
    valorMeta: 190,
    valorBonus: 110.00,
    ordem: 6,
    ativo: true,
    permiteImportacao: false
  }
];