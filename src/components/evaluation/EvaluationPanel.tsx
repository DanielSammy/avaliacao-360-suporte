// src/components/evaluation/EvaluationPanel.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { EvaluationTable } from './EvaluationTable';
import { EvaluationSummary } from './EvaluationSummary';
import { OperatorSelector } from './OperatorSelector';
import { PeriodSelector } from './PeriodSelector';
import { PDFGenerator } from '../reports/PDFGenerator';
import { Avaliacao, Criterio, CriterioAvaliacao } from '@/types/evaluation';
import { FileText, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getEvaluationDashboard, EvaluationDashboardResponse } from '@/services/evaluationService';
import { getCriterios } from '@/services/criteriaService';
import { calcularBonusAlcancado } from '@/utils/calculations';

export function EvaluationPanel() {
  const { state } = useEvaluation();
  const [operadorSelecionado, setOperadorSelecionado] = useState<number | null>(null);
  const [periodoAtual, setPeriodoAtual] = useState<string>(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [dashboardData, setDashboardData] = useState<EvaluationDashboardResponse | null>(null);
  const [activeCriteriaCount, setActiveCriteriaCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const activeOperators = useMemo(() => state.operadores.filter(op => op.ativo && op.participaAvaliacao), [state.operadores]);

  useEffect(() => {
    if (!operadorSelecionado && activeOperators.length > 0) {
      setOperadorSelecionado(activeOperators[0].id);
    }
  }, [activeOperators, operadorSelecionado]);

  useEffect(() => {
    getCriterios().then(response => {
      if (response.success) {
        const active = response.data.filter(c => c.ativo);
        setActiveCriteriaCount(active.length);
      }
    });

    if (operadorSelecionado && periodoAtual) {
      setLoading(true);
      getEvaluationDashboard(operadorSelecionado, periodoAtual)
        .then(data => {
          setDashboardData(data);
        })
        .catch(error => {
          console.error("Failed to fetch evaluation dashboard:", error);
          setDashboardData(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setDashboardData(null);
    }
  }, [operadorSelecionado, periodoAtual]);

  const operadorAtual = useMemo(() => 
    state.operadores.find(op => op.id === operadorSelecionado), 
    [state.operadores, operadorSelecionado]
  );

  const criteriosParaTabela: Criterio[] = useMemo(() => {
    if (!dashboardData?.data.criterios) return [];
    return dashboardData.data.criterios.map(c => ({
      id: c.criterioId,
      idCriterio: c.criterioId,
      nome: c.criterioNome,
      tipo: c.criterioTipo as 'qualitativo' | 'quantitativo',
      tipoMeta: c.criterioTipoMeta as 'maior_melhor' | 'menor_melhor',
      valorMeta: c.metaObjetivo, // Using metaObjetivo for the 'meta' column
      peso: c.peso,
      ordem: 0, 
      ativo: true, 
      totalAvaliacoes: 0,
      valorBonus: parseFloat(c.valorMeta), // Using valorMeta for 'R$: Meta'
      mediaGeral: false,
    }));
  }, [dashboardData]);

  const criteriosAvaliacao: CriterioAvaliacao[] = useMemo(() => {
    if (!dashboardData?.data.criterios) return [];
    return dashboardData.data.criterios.map(c => {
      const criterioParaCalculo: Criterio = {
        id: c.criterioId,
        idCriterio: c.criterioId,
        nome: c.criterioNome,
        tipo: c.criterioTipo as 'qualitativo' | 'quantitativo',
        tipoMeta: c.criterioTipoMeta as 'maior_melhor' | 'menor_melhor',
        valorMeta: parseFloat(c.metaObjetivo) || 0,
        valorBonus: parseFloat(c.valorMeta) || 0,
        peso: c.peso,
        ordem: 0, 
        ativo: true, 
        totalAvaliacoes: 0,
        mediaGeral: false,
      };
      
      const valorAlcancadoNumerico = parseFloat(c.metaAlcancada) || 0;
      const bonusCalculado = calcularBonusAlcancado(criterioParaCalculo, valorAlcancadoNumerico);

      return {
        criterioId: c.criterioId,
        valorAlcancado: valorAlcancadoNumerico,
        valorBonusAlcancado: bonusCalculado,
        metaAtingida: c.metaAtingida,
        metaAlcancada: c.metaAlcancada,
      };
    });
  }, [dashboardData]);

  const avaliacaoAtual: Avaliacao | null = useMemo(() => {
    if (!dashboardData || !operadorSelecionado) return null;
    return {
      id: 0, 
      operadorId: operadorSelecionado,
      avaliadorId: 0, 
      periodo: periodoAtual,
      criterios: criteriosAvaliacao,
      valorTotalMeta: parseFloat(dashboardData.data.valorTotalMeta),
      valorTotalAlcancado: parseFloat(dashboardData.data.valorTotalAlcancado),
      dataCriacao: new Date(),
      dataUltimaEdicao: new Date(),
    };
  }, [dashboardData, operadorSelecionado, periodoAtual, criteriosAvaliacao]);

  if (loading) {
    return <div>Loading...</div>; 
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-primary">Dashboard de Apuração</h2>
        <Link to="/ranking">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Ranking de Operadores
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OperatorSelector operadores={activeOperators} operadorSelecionado={operadorSelecionado} onOperadorChange={setOperadorSelecionado} avaliacoes={state.avaliacoes} periodoAtual={periodoAtual} />
        <PeriodSelector periodoAtual={periodoAtual} onPeriodoChange={setPeriodoAtual} />
      </div>

      {dashboardData && (
        <EvaluationSummary 
          valorTotalMeta={parseFloat(dashboardData.data.valorTotalMeta)}
          valorTotalAlcancado={parseFloat(dashboardData.data.valorTotalAlcancado)}
          metasAtingidas={dashboardData.data.metasAtingidas}
          totalMetas={activeCriteriaCount} 
        />
      )}

      {operadorSelecionado && dashboardData ? (
        <>
          <EvaluationTable
              criterios={criteriosParaTabela}
              criteriosAvaliacao={criteriosAvaliacao}
              isEditable={false}
          />
          <Card className="shadow-medium">
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Ações da Avaliação</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                  {avaliacaoAtual && operadorAtual && (
                      <div className="flex-1 min-w-[200px]">
                          <PDFGenerator avaliacao={avaliacaoAtual} operador={operadorAtual} criterios={criteriosParaTabela} />
                      </div>
                  )}
              </CardContent>
          </Card>
        </>
      ) : (
        <Card className="text-center py-12"><CardContent><h3 className="text-lg font-semibold text-muted-foreground">Selecione um operador e um período para ver os dados.</h3></CardContent></Card>
      )}
    </div>
  );
}
