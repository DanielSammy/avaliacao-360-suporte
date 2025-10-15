import React from 'react';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { Header } from '@/components/layout/Header';
import { NavigationTabs } from '@/components/navigation/NavigationTabs';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Index = () => {
  const { state } = useEvaluation();

  const hoje = new Date();
  const periodoAtual = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
  const allActiveOperators = state.operadores.filter(op => op.ativo);
  const totalOperadores = allActiveOperators.length;

  // critérios aplicáveis: somente critérios ativos com idCriterio === 2 (mesma regra de EvaluationTracking)
  const applicableCriterios = state.criterios.filter(criterio => criterio.ativo && criterio.idCriterio === 2);
  const applicableCriterioIds = new Set(applicableCriterios.map(c => c.id));

  // calcular totalCompletedAcrossAll: para cada operador ativo, contar critérios aplicáveis que ele já avaliou
  let totalCompletedAcrossAll = 0;
  for (const op of allActiveOperators) {
    const evalsByOp = state.avaliacoes.filter(ev => {
      if (ev.periodo !== periodoAtual) return false;
      if (ev.avaliadorId === op.id) return true;
      if (!Array.isArray(ev.criterios)) return false;
      return ev.criterios.some((c: any) => Number(c.avaliadorId) === op.id);
    });

    const criteriaEvaluatedByOp = new Set<number>();
    for (const ev of evalsByOp) {
      if (!Array.isArray(ev.criterios)) continue;
      for (const c of ev.criterios) {
        const criterioAplicavel = applicableCriterioIds.has(c.criterioId);
        const criterioPorEsseAvaliador = (c.avaliadorId !== undefined && Number(c.avaliadorId) === op.id) || ev.avaliadorId === op.id;
        if (criterioAplicavel && criterioPorEsseAvaliador) criteriaEvaluatedByOp.add(c.criterioId);
      }
    }

    totalCompletedAcrossAll += criteriaEvaluatedByOp.size;
  }

  const totalPossible = allActiveOperators.length * applicableCriterios.length;
  const avaliacoesPendentes = Math.max(0, totalPossible - totalCompletedAcrossAll);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Header 
          periodoAtual={periodoAtual}
          totalOperadores={totalOperadores}
          avaliacoesPendentes={avaliacoesPendentes} 
        />
        <div className="flex gap-4 mb-6">
          <Link to="/evaluate-operators">
            <Button>Avaliar Operadores</Button>
          </Link>
          <Link to="/evaluation-tracking">
            <Button variant="outline">Acompanhamento de Avaliações</Button>
          </Link>
        </div>
        <NavigationTabs />
      </div>
    </div>
  );
};

export default Index;