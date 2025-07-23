import React from 'react';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { Header } from '@/components/layout/Header';
import { NavigationTabs } from '@/components/navigation/NavigationTabs';

const Index = () => {
  const { state } = useEvaluation();
  
  // Calcular estatísticas para o header
  const hoje = new Date();
  const periodoAtual = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
  const totalOperadores = state.operadores.filter(op => op.ativo).length;
  
  // Avaliar quantos operadores ainda não têm avaliação no período atual
  const avaliacoesPendentes = state.operadores.filter(op => {
    if (!op.ativo) return false;
    return !state.avaliacoes.some(av => av.operadorId === op.id && av.periodo === periodoAtual);
  }).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Header 
          periodoAtual={periodoAtual}
          totalOperadores={totalOperadores}
          avaliacoesPendentes={avaliacoesPendentes} 
        />
        <NavigationTabs />
      </div>
    </div>
  );
};

export default Index;
