import React, { useState, useEffect } from 'react';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { Header } from '@/components/layout/Header';
import { NavigationTabs } from '@/components/navigation/NavigationTabs';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { getCriterios } from '@/services/criteriaService';

const Index = () => {
  const { state } = useEvaluation();
  const [totalActiveCriteria, setTotalActiveCriteria] = useState(0);

  useEffect(() => {
    const fetchCriteria = async () => {
      try {
        const response = await getCriterios();
        if (response.success) {
          const activeCriteria = response.data.filter(c => c.ativo);
          setTotalActiveCriteria(activeCriteria.length);
        }
      } catch (error) {
        console.error("Failed to fetch criteria:", error);
      }
    };

    fetchCriteria();
  }, []);

  const hoje = new Date();
  const periodoAtual = `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
  const totalOperadores = state.operadores.filter(op => op.ativo).length;

  const avaliacoesPendentes = state.operadores.reduce((acc, op) => {
    if (!op.ativo || !op.participaAvaliacao) return acc;

    const avaliacoesFeitasPeloOperador = state.avaliacoes.filter(a => a.avaliadorId === op.id && a.periodo === periodoAtual);
    const criteriosAvaliados = new Set(avaliacoesFeitasPeloOperador.flatMap(a => a.criterios.map(c => c.criterioId)));
    const pendentes = totalActiveCriteria - criteriosAvaliados.size;
    
    return acc + (pendentes > 0 ? pendentes : 0);
  }, 0);

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