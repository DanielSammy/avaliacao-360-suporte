import { Criterio, CriterioAvaliacao, Avaliacao, Operador } from '../types/evaluation';

// =================================================================================
// Funções de Cálculo de Avaliação
// =================================================================================

/**
 * Determina se a meta de um critério foi atingida com base no valor alcançado.
 * @param criterio O critério de avaliação.
 * @param valorAlcancado O valor alcançado pelo operador.
 * @returns `true` se a meta foi atingida, `false` caso contrário.
 */
export function metaAtingida(criterio: Criterio, valorAlcancado: number): boolean {
  if (criterio.tipoMeta === 'menor_melhor') {
    return valorAlcancado <= criterio.valorMeta;
  } else {
    return valorAlcancado >= criterio.valorMeta;
  }
}

/**
 * Calcula o valor do bônus alcançado para um critério específico.
 * Se a meta for atingida, retorna o valor total do bônus.
 * Se não, calcula um valor proporcional com base no tipo de meta.
 * @param criterio O critério de avaliação.
 * @param valorAlcancado O valor alcançado pelo operador.
 * @returns O valor do bônus calculado.
 */
export function calcularBonusAlcancado(criterio: Criterio, valorAlcancado: number): number {
  const atingiuMeta = metaAtingida(criterio, valorAlcancado);
  
  if (atingiuMeta) {
    return criterio.valorBonus;
  }
  
  // Cálculo proporcional para metas não atingidas
  if (criterio.tipoMeta === 'maior_melhor') {
    // Para metas 'maior é melhor', a proporção é direta
    const proporcao = Math.min(valorAlcancado / criterio.valorMeta, 1);
    return Math.max(0, criterio.valorBonus * proporcao);
  } else {
    // Para metas 'menor é melhor', a proporção é inversa
    if (valorAlcancado <= 0) return criterio.valorBonus; // Bônus máximo se o valor for zero ou negativo
    
    const distanciaMeta = Math.max(0, valorAlcancado - criterio.valorMeta);
    // O fator de redução penaliza o quão longe o valor está da meta
    const fatorReducao = Math.max(0, 1 - (distanciaMeta / criterio.valorMeta) * 0.5);
    return criterio.valorBonus * fatorReducao;
  }
}

/**
 * Calcula o valor final do bônus para um critério, considerando o valor de entrada e o bônus potencial.
 * Este cálculo é usado na interface de avaliação para dar feedback em tempo real.
 * @param criterio O critério de avaliação.
 * @param inputValue O valor de entrada (alcançado).
 * @param potentialBonus O bônus total possível para o critério.
 * @returns O valor do bônus final.
 */
export function calcularValorAlcancadoFinal(
  criterio: Criterio,
  inputValue: number,
  potentialBonus: number
): number {
  if (metaAtingida(criterio, inputValue)) {
    return potentialBonus;
  }

  const target = criterio.valorMeta;

  if (criterio.tipoMeta === 'maior_melhor') {
    if (target <= 0) return 0;
    const proportion = inputValue / target;
    return Math.max(0, potentialBonus * proportion);
  } else { // menor_melhor
    if (inputValue <= 0) return 0;
    const proportion = target / inputValue;
    return Math.max(0, potentialBonus * proportion);
  }
}

/**
 * Calcula os totais da avaliação, somando os valores de meta e os valores alcançados.
 * @param criterios A lista de todos os critérios ativos.
 * @param criteriosAvaliacao Os dados da avaliação atual.
 * @returns Um objeto com `valorTotalMeta` e `valorTotalAlcancado`.
 */
export function calcularTotaisAvaliacao(
  criterios: Criterio[], 
  criteriosAvaliacao: CriterioAvaliacao[]
): { valorTotalMeta: number; valorTotalAlcancado: number } {
  const valorTotalMeta = criterios.reduce((total, criterio) => {
    if (criterio.ativo) {
      return total + criterio.valorBonus;
    }
    return total;
  }, 0);

  const valorTotalAlcancado = criteriosAvaliacao.reduce((total, criterioAvaliacao) => {
    return total + criterioAvaliacao.valorBonusAlcancado;
  }, 0);

  return { valorTotalMeta, valorTotalAlcancado };
}

/**
 * Consolida os resultados de múltiplas avaliações para um critério específico.
 * Se o critério for de gestão (idCriterio === 1), usa apenas a avaliação do gestor.
 * Caso contrário, calcula a média das avaliações dos demais operadores.
 * @param criterio O critério a ser consolidado.
 * @param avaliacoes Todas as avaliações do período.
 * @param operadores A lista de todos os operadores.
 * @returns O valor consolidado para o critério.
 */
export function calcularResultadoFinal(criterio: Criterio, avaliacoes: Avaliacao[], operadores: Operador[]): number {
  const isManagementCriterion = criterio.idCriterio === 1;

  const relevantEvaluations = avaliacoes.filter(av => av.criterios.some(c => c.criterioId === criterio.id));

  if (isManagementCriterion) {
    const managerEvaluation = relevantEvaluations.find(av => {
      const avaliador = operadores.find(op => op.id === av.avaliadorId);
      return avaliador?.grupo === 6; // Grupo 6 = Gestor
    });

    if (managerEvaluation) {
      const criterioAvaliado = managerEvaluation.criterios.find(c => c.criterioId === criterio.id);
      return criterioAvaliado?.valorAlcancado || 0;
    }
    return 0;
  } else {
    const nonManagerEvaluations = relevantEvaluations.filter(av => {
        const avaliador = operadores.find(op => op.id === av.avaliadorId);
        return avaliador?.grupo !== 6;
    });

    const allScores = nonManagerEvaluations.flatMap(av => {
      const criterioAvaliado = av.criterios.find(c => c.criterioId === criterio.id);
      return criterioAvaliado ? [criterioAvaliado.valorAlcancado] : [];
    });

    if (allScores.length === 0) {
        return 0;
    }

    const sum = allScores.reduce((a, b) => a + b, 0);
    return sum / allScores.length;
  }
}

// =================================================================================
// Funções de Formatação e Utilitários
// =================================================================================

/**
 * Formata um número para o padrão monetário brasileiro (BRL).
 * @param valor O número a ser formatado.
 * @returns A string formatada (ex: "R$ 1.234,56").
 */
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

/**
 * Formata um número como um percentual.
 * @param valor O número a ser formatado (ex: 85.5 para 85,5%).
 * @returns A string formatada (ex: "85,5%").
 */
export function formatarPercentual(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(valor / 100);
}

/**
 * Formata uma string de período (formato "YYYY-MM") para um formato legível.
 * @param periodo A string de período (ex: "2025-01").
 * @returns A string formatada (ex: "janeiro de 2025").
 */
export function formatarPeriodo(periodo: string): string {
  if (!periodo || !periodo.includes('-')) return "Período inválido";
  const [ano, mes] = periodo.split('-');
  const data = new Date(parseInt(ano), parseInt(mes) - 1);
  return data.toLocaleDateString('pt-BR', { 
    year: 'numeric', 
    month: 'long' 
  });
}

/**
 * Gera um ID numérico único baseado no timestamp atual.
 * @returns Um ID numérico.
 */
export function gerarId(): number {
  return Date.now();
}

// =================================================================================
// Fórmulas para Exibição no Relatório
// =================================================================================

export const formulas = {
  metaAtingida: {
    titulo: "Verificação de Meta",
    maiorMelhor: "Se (Valor Alcançado >= Meta), a meta é considerada 'Atingida'.",
    menorMelhor: "Se (Valor Alcançado <= Meta), a meta é considerada 'Atingida'.",
  },
  calculoBonus: {
    titulo: "Cálculo do Bônus",
    metaAtingida: "Se a meta for 'Atingida', o Bônus Alcançado é igual ao Bônus do Critério.",
    proporcionalMaior: "Se não atingida (Maior/Melhor): Bônus Alcançado = (Valor Alcançado / Meta) * Bônus do Critério.",
    proporcionalMenor: "Se não atingida (Menor/Melhor): Bônus Alcançado = (Meta / Valor Alcançado) * Bônus do Critério.",
  },
  consolidacao: {
    titulo: "Consolidação de Resultados",
    gestor: "Para critérios de gestão, o resultado é a nota atribuída pelo gestor.",
    media: "Para outros critérios, o resultado é a média das notas de todas as avaliações recebidas.",
  },
  performanceGeral: {
    titulo: "Performance Geral",
    formula: "Performance (%) = (Valor Total Alcançado / Valor Total da Meta) * 100",
  }
};
