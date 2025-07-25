import { Criterio, CriterioAvaliacao } from '../types/evaluation';

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
export function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}