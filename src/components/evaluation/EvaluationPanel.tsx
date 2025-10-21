// src/components/evaluation/EvaluationPanel.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { useAuth } from '@/contexts/AuthContext';
import { OperatorSelector } from './OperatorSelector';
import { PeriodSelector } from './PeriodSelector';
import { PDFGenerator } from '../reports/PDFGenerator';
import { Avaliacao, Criterio, CriterioAvaliacao, TipoCriterio } from '@/types/evaluation';
import { FileText, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getEvaluationDashboard, EvaluationDashboardResponse, createBulkEvaluations } from '@/services/evaluationService';
import { useToast } from '@/hooks/use-toast';
import { getTipoCriterios } from '@/services/criteriaService';
import { calcularBonusAlcancado } from '@/utils/calculations';
import { BlockEvaluation } from './BlockEvaluation';

export function EvaluationPanel() {
  const SHOW_RANKING_BUTTON = false;
  const { state, dispatch } = useEvaluation();
  const { user } = useAuth();
  const [operadorSelecionado, setOperadorSelecionado] = useState<number | null>(null);
  const [periodoAtual, setPeriodoAtual] = useState<string>(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [dashboardData, setDashboardData] = useState<EvaluationDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [tiposCriterio, setTiposCriterio] = useState<TipoCriterio[]>([]);
  const { toast } = useToast();

  const activeOperators = useMemo(() => state.operadores.filter(op => op.ativo && op.participaAvaliacao), [state.operadores]);

  useEffect(() => {
    if (!operadorSelecionado && activeOperators.length > 0) {
      setOperadorSelecionado(activeOperators[0].id);
    }
  }, [activeOperators, operadorSelecionado]);

  useEffect(() => {
    getTipoCriterios()
      .then(setTiposCriterio)
      .catch(error => console.error("Failed to fetch tipos de critério:", error));
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!operadorSelecionado || !periodoAtual) {
        setDashboardData(null);
        return;
      }
      setLoading(true);
      try {
        const data = await getEvaluationDashboard(operadorSelecionado, periodoAtual);
        setDashboardData(data);
      } catch (error) {
        console.error("Failed to fetch evaluation dashboard:", error);
        setDashboardData(null);
      } finally {
        setLoading(false);
      }
    };

    // Se `state.avaliacoes` mudou, refetch explícito — útil para garantir atualização após dispatch
    fetchDashboard();
  }, [operadorSelecionado, periodoAtual, state.avaliacoes]);

  const operadorAtual = useMemo(() => 
    state.operadores.find(op => op.id === operadorSelecionado), 
    [state.operadores, operadorSelecionado]
  );

  // avaliador: usuário logado se estiver mapeado a um operador local
  const avaliadorLogado = useMemo(() => {
    if (!user?.login) return null;
    return state.operadores.find(op => String(op.login).toLowerCase() === String(user.login).toLowerCase()) || null;
  }, [state.operadores, user?.login]);

  const criteriosParaTabela: Criterio[] = useMemo(() => {
    if (!dashboardData?.data.criterios) return [];
    return dashboardData.data.criterios.map(c => {
      const originalCriterio = state.criterios.find(crit => crit.id === c.criterioId);
      return {
        id: c.criterioId,
        idCriterio: originalCriterio ? originalCriterio.idCriterio : 0,
        nome: c.criterioNome,
        tipo: c.criterioTipo as 'qualitativo' | 'quantitativo',
        tipoMeta: c.criterioTipoMeta as 'maior_melhor' | 'menor_melhor',
        valorMeta: c.metaObjetivo,
        ordem: originalCriterio ? originalCriterio.ordem : 0,
        ativo: originalCriterio ? originalCriterio.ativo : true,
        totalAvaliacoes: 0,
        // preservar valorCriterio original quando disponível para repassar ao PDF
        valorCriterio: originalCriterio ? originalCriterio.valorCriterio : undefined,
        valorBonus: parseFloat(c.valorMeta),
        mediaGeral: false,
        metaCalculo: originalCriterio ? originalCriterio.metaCalculo : undefined,
      };
    });
  }, [dashboardData, state.criterios]);

  const criteriosAvaliacao: CriterioAvaliacao[] = useMemo(() => {
    if (!dashboardData?.data.criterios) return [];
    return dashboardData.data.criterios.map(c => {
      const originalCriterio = state.criterios.find(crit => crit.id === c.criterioId);
      const criterioParaCalculo: Criterio = {
        id: c.criterioId,
        idCriterio: originalCriterio ? originalCriterio.idCriterio : 0,
        nome: c.criterioNome,
        tipo: c.criterioTipo as 'qualitativo' | 'quantitativo',
        tipoMeta: c.criterioTipoMeta as 'maior_melhor' | 'menor_melhor',
        valorMeta: c.metaObjetivo || 0,
        // incluir valorCriterio para consistência (pode ser usado pelo PDF)
        valorCriterio: originalCriterio ? originalCriterio.valorCriterio : undefined,
        valorBonus: parseFloat(c.valorMeta) || 0,
        ordem: originalCriterio ? originalCriterio.ordem : 0,
        ativo: originalCriterio ? originalCriterio.ativo : true,
        totalAvaliacoes: 0,
        mediaGeral: false,
      };
      
      const valorAlcancadoNumerico = parseFloat(c.metaAlcancada) || 0;
      const bonusCalculado = calcularBonusAlcancado(criterioParaCalculo, valorAlcancadoNumerico);

      return {
        criterioId: c.criterioId,
        // armazenar como string para preservar precisão (decimal)
        valorAlcancado: String(valorAlcancadoNumerico),
        valorBonusAlcancado: bonusCalculado,
        metaAtingida: c.metaAtingida,
        metaAlcancada: c.metaAlcancada,
      };
    });
  }, [dashboardData, state.criterios]);

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

  // função de import do MySuite removida desta tela; permanece apenas em EvaluateOperators

  const groupedCriteria = useMemo(() => {
    const groups: { [key: number]: Criterio[] } = {};
    criteriosParaTabela.forEach(criterio => {
      if (!groups[criterio.idCriterio]) {
        groups[criterio.idCriterio] = [];
      }
      groups[criterio.idCriterio].push(criterio);
    });
    return groups;
  }, [criteriosParaTabela]);

  const blockInfo = useMemo(() => {
    const info: { [key: number]: { title: string, totalValue: number } } = {};
    tiposCriterio.forEach(tc => {
      let totalValue = 0;
      if (tc.id === 1) totalValue = tc.valorNvl1;
      else if (tc.id === 2) totalValue = tc.valorNvl2;
      else if (tc.id === 3) totalValue = tc.valorNvl3;
      
      info[tc.id] = {
        title: tc.descricao,
        totalValue: totalValue,
      };
    });
    return info;
  }, [tiposCriterio]);

  // Helper: retorna totalValue do bloco ajustado ao nível do operador atual
  const getBlockTotalValue = (blockId: number) => {
    const tipo = tiposCriterio.find(tc => tc.id === blockId);
    if (!tipo) return blockInfo[blockId]?.totalValue || 0;
    const nivelStr = operadorAtual?.nivel || '';
    if (nivelStr && nivelStr.includes('2') && typeof tipo.valorNvl2 === 'number') return Number(tipo.valorNvl2);
    if (nivelStr && nivelStr.includes('3') && typeof tipo.valorNvl3 === 'number') return Number(tipo.valorNvl3);
    return Number(tipo.valorNvl1 ?? blockInfo[blockId]?.totalValue ?? 0);
  };

  if (loading) {
    return <div>Loading...</div>; 
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-primary">Dashboard de Apuração</h2>
        {SHOW_RANKING_BUTTON && (
        <Link to="/ranking">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Ranking de Operadores
          </Button>
        </Link>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OperatorSelector operadores={activeOperators} operadorSelecionado={operadorSelecionado} onOperadorChange={setOperadorSelecionado} avaliacoes={state.avaliacoes} periodoAtual={periodoAtual} />
        <PeriodSelector periodoAtual={periodoAtual} onPeriodoChange={setPeriodoAtual} />
      </div>

      {operadorSelecionado && dashboardData ? (
        <div className="space-y-6">
          {Object.keys(groupedCriteria).map(groupId => {
            const groupIdNum = Number(groupId);
            const block = blockInfo[groupIdNum];
            return (
              <BlockEvaluation
                key={groupId}
                title={block?.title || `Bloco ${groupId}`}
                criterios={groupedCriteria[groupIdNum]}
                criteriosAvaliacao={criteriosAvaliacao}
                totalValue={getBlockTotalValue(groupIdNum)}
              />
            )
          })}
          <Card className="shadow-medium">
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Ações da Avaliação</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                  {avaliacaoAtual && operadorAtual && (
                      <div className="flex-1 min-w-[200px]">
                          <PDFGenerator avaliacao={avaliacaoAtual} operador={operadorAtual} criterios={criteriosParaTabela} />
                      </div>
                  )}
                  <div className="flex items-center gap-2">
                    {/* Button removed to eliminate reference to the removed function */}
                  </div>
              </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="text-center py-12"><CardContent><h3 className="text-lg font-semibold text-muted-foreground">Selecione um operador e um período para ver os dados.</h3></CardContent></Card>
      )}
    </div>
  );
}

