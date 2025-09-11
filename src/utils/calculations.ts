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
  const target = criterio.valorMeta;
  const bonus = criterio.valorBonus;

  if (criterio.tipoMeta === 'maior_melhor') {
    const atingiuMeta = valorAlcancado >= target;
    if (atingiuMeta) {
      return bonus;
    }
    // Cálculo proporcional para metas não atingidas
    if (target <= 0) return 0;
    const proporcao = Math.min(valorAlcancado / target, 1);
    return Math.max(0, bonus * proporcao);
  } else { // menor_melhor
    if (valorAlcancado < 0) return 0; // Valor negativo não deve contar

    if (valorAlcancado > target) {
      // Se alcançado passar do objetivo, multiplica o bônus por 1%.
      return bonus * 0.01;
    }
    
    // Cálculo principal: (1 - (alcançado / meta)) * bônus
    const proportion = 1 - (valorAlcancado / target);
    return Math.max(0, bonus * proportion);
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
  const target = criterio.valorMeta;

  if (criterio.tipoMeta === 'maior_melhor') {
    // Atingiu ou superou a meta
    if (inputValue >= target) {
      return potentialBonus;
    }
    // Cálculo proporcional se não atingiu a meta
    if (target <= 0) return 0;
    const proportion = inputValue / target;
    return Math.max(0, potentialBonus * proportion);
  } else { // menor_melhor
    if (inputValue < 0) return 0; // Não permitir valores negativos

    if (inputValue > target) {
      // Se o valor alcançado for maior que a meta, o bônus é de 1%
      return potentialBonus * 0.01;
    }
    
    // A meta é ser menor, então a proporção é inversa.
    // Se inputValue é 0, proportion é 1 (bônus máximo).
    // Se inputValue é igual a target, proportion é 0.
    const proportion = 1 - (inputValue / target);
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

/**
 * Calcula o resultado final de um bloco de critérios.
 * A lógica é: a soma das médias de todos os critérios do bloco, dividida pela quantidade de critérios no bloco.
 * @param idCriterioBloco O ID do bloco de critérios (e.g., 1 para gestão, 2 para pares).
 * @param todosCriterios A lista de todos os critérios disponíveis na aplicação.
 * @param todasAvaliacoes A lista de todas as avaliações do período.
 * @param todosOperadores A lista de todos os operadores.
 * @returns A média final para o bloco.
 */
export function calcularResultadoBloco(
  idCriterioBloco: number,
  todosCriterios: Criterio[],
  todasAvaliacoes: Avaliacao[],
  todosOperadores: Operador[]
): number {
  // 1. Filtrar os critérios ativos que pertencem a este bloco
  const criteriosDoBloco = todosCriterios.filter(
    c => c.idCriterio === idCriterioBloco && c.ativo
  );

  if (criteriosDoBloco.length === 0) {
    return 0;
  }

  // 2. Para cada critério do bloco, calcular sua média final.
  // A função `calcularResultadoFinal` já calcula a média de um critério com base em múltiplas avaliações.
  const mediasDosCriterios = criteriosDoBloco.map(criterio =>
    calcularResultadoFinal(criterio, todasAvaliacoes, todosOperadores)
  );

  // 3. Somar as médias calculadas.
  const somaDasMedias = mediasDosCriterios.reduce((acc, media) => acc + media, 0);

  // 4. Dividir pela quantidade de critérios no bloco para obter a média do bloco.
  return somaDasMedias / criteriosDoBloco.length;
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
