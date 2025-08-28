import { Criterio, CriterioAvaliacao, Avaliacao, Operador } from '../types/evaluation';

// Determina se a meta foi atingida
export function metaAtingida(criterio: Criterio, valorAlcancado: number): boolean {
  if (criterio.tipoMeta === 'menor_melhor') {
    return valorAlcancado <= criterio.valorMeta;
  } else {
    return valorAlcancado >= criterio.valorMeta;
  }
}

// Calcula o valor do bônus alcançado
export function calcularBonusAlcancado(criterio: Criterio, valorAlcancado: number): number {
  const atingiuMeta = metaAtingida(criterio, valorAlcancado);
  
  if (atingiuMeta) {
    return criterio.valorBonus;
  }
  
  // Cálculo proporcional para metas não atingidas
  if (criterio.tipoMeta === 'maior_melhor') {
    const proporcao = Math.min(valorAlcancado / criterio.valorMeta, 1);
    return Math.max(0, criterio.valorBonus * proporcao);
  } else {
    // Para "menor é melhor", o cálculo é decrescente baseado na distância da meta
    if (valorAlcancado <= 0) return criterio.valorBonus;
    
    const distanciaMeta = Math.max(0, valorAlcancado - criterio.valorMeta);
    const fatorReducao = Math.max(0, 1 - (distanciaMeta / criterio.valorMeta) * 0.5);
    return criterio.valorBonus * fatorReducao;
  }
}

// Calcula totais da avaliação
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

// Formata valores monetários
export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

// Formata percentuais
export function formatarPercentual(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(valor / 100);
}

// Formata período (YYYY-MM para formato legível)
export function formatarPeriodo(periodo: string): string {
  const [ano, mes] = periodo.split('-');
  const data = new Date(parseInt(ano), parseInt(mes) - 1);
  return data.toLocaleDateString('pt-BR', { 
    year: 'numeric', 
    month: 'long' 
  });
}

// Gera ID único
export function gerarId(): number {
  return Date.now();
}

export function calcularResultadoFinal(criterio: Criterio, avaliacoes: Avaliacao[], operadores: Operador[]): number {
  const isManagementCriterion = criterio.nome.endsWith('(Gerência)');

  const relevantEvaluations = avaliacoes.filter(av => av.criterios.some(c => c.criterioId === criterio.id));

  if (isManagementCriterion) {
    const managerEvaluation = relevantEvaluations.find(av => {
      const avaliador = operadores.find(op => op.id === av.avaliadorId);
      return avaliador?.grupo === 6;
    });

    if (managerEvaluation) {
      const criterioAvaliado = managerEvaluation.criterios.find(c => c.criterioId === criterio.id);
      return criterioAvaliado?.valorAlcancado || 0;
    }
    return 0; // Or some other default value if no manager evaluation is found
  } else {
    // Calculate the average of all evaluations for this criterion from non-managers
    const nonManagerEvaluations = relevantEvaluations.filter(av => {
        const avaliador = operadores.find(op => op.id === av.avaliadorId);
        return avaliador?.grupo !== 6;
    });

    const allValues = nonManagerEvaluations.map(av => {
      const criterioAvaliado = av.criterios.find(c => c.criterioId === criterio.id);
      return criterioAvaliado?.valorAlcancado || 0;
    });

    if (allValues.length === 0) {
        return 0;
    }

    const sum = allValues.reduce((a, b) => a + b, 0);
    return sum / allValues.length;
  }
}
