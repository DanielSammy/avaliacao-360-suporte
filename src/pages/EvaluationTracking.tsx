import React, { useState, useEffect } from 'react';
import { useEvaluation } from '../contexts/EvaluationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getCriterios } from '../services/criteriaService';
import { Criterio } from '../types/evaluation';

export function EvaluationTracking() {
  const { state } = useEvaluation();
  const [activeCriteriaList, setActiveCriteriaList] = useState<Criterio[]>([]);

  useEffect(() => {
    const fetchCriteria = async () => {
      try {
        const response = await getCriterios();
        if (response.success) {
          const active = response.data.filter(c => c.ativo);
          setActiveCriteriaList(active);
        }
      } catch (error) {
        console.error("Failed to fetch criteria:", error);
      }
    };

    fetchCriteria();
  }, []);

  const allActiveOperators = state.operadores.filter(op => op.ativo);

  const operatorEvaluationSummary = allActiveOperators.map(operator => {
    const evaluationsGivenByOperator = state.avaliacoes.filter(evalItem => evalItem.avaliadorId === operator.id);
    const distinctCriteriaGiven = new Set(evaluationsGivenByOperator.map(e => e.criterios).flat().map(c => c.criterioId));
    const evaluationsGivenCount = distinctCriteriaGiven.size;

    const evaluationsReceivedByOperator = state.avaliacoes.filter(evalItem => evalItem.operadorId === operator.id);
    const distinctCriteriaReceived = new Set(evaluationsReceivedByOperator.map(e => e.criterios).flat().map(c => c.criterioId));
    const evaluationsReceivedCount = distinctCriteriaReceived.size;

    const expectedCriteriaForOperator = (operator.grupo === 6 || operator.grupo === 7)
      ? activeCriteriaList.length
      : activeCriteriaList.filter(c => c.idCriterio === 2).length;

    const evaluationsExpectedToGive = expectedCriteriaForOperator;
    const evaluationsExpectedToReceive = operator.participaAvaliacao ? activeCriteriaList.length : 0;

    let statusGiven: 'Concluído' | 'Pendente' | 'Em Andamento';
    let variantGiven: 'default' | 'secondary' | 'destructive' | 'outline';

    if (evaluationsGivenCount === evaluationsExpectedToGive) {
      statusGiven = 'Concluído';
      variantGiven = 'default';
    } else if (evaluationsGivenCount > 0) {
      statusGiven = 'Em Andamento';
      variantGiven = 'secondary';
    } else {
      statusGiven = 'Pendente';
      variantGiven = 'destructive';
    }

    let statusReceived: 'Concluído' | 'Pendente' | 'Em Andamento' | 'N/A';
    let variantReceived: 'default' | 'secondary' | 'destructive' | 'outline';

    if (!operator.participaAvaliacao) {
      statusReceived = 'N/A';
      variantReceived = 'outline';
    } else if (evaluationsReceivedCount === evaluationsExpectedToReceive) {
      statusReceived = 'Concluído';
      variantReceived = 'default';
    } else if (evaluationsReceivedCount > 0) {
      statusReceived = 'Em Andamento';
      variantReceived = 'secondary';
    } else {
      statusReceived = 'Pendente';
      variantReceived = 'destructive';
    }

    return {
      operator,
      evaluationsReceivedCount,
      evaluationsGivenCount,
      evaluationsExpectedToGive,
      evaluationsExpectedToReceive,
      statusGiven,
      variantGiven,
      statusReceived,
      variantReceived,
    };
  });

  const totalPendingEvaluations = operatorEvaluationSummary.reduce((total, summary) => {
    const pendingGiven = (summary.evaluationsExpectedToGive || 0) - (summary.evaluationsGivenCount || 0);
    return total + pendingGiven;
  }, 0);

  return (
    <div className="container mx-auto p-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Acompanhamento de Avaliações 360</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-lg font-semibold">
            Total de Avaliações Pendentes: <span className={totalPendingEvaluations === 0 ? 'text-green-600' : 'text-red-600'}>{totalPendingEvaluations}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operador</TableHead>
                <TableHead className="text-center">Avaliações Dadas</TableHead>
                <TableHead className="text-center">Status (Dadas)</TableHead>
                <TableHead className="text-center">Avaliações Recebidas</TableHead>
                <TableHead className="text-center">Status (Recebidas)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operatorEvaluationSummary.map(({ 
                operator, 
                evaluationsGivenCount, 
                evaluationsExpectedToGive, 
                evaluationsReceivedCount, 
                evaluationsExpectedToReceive, 
                statusGiven, 
                variantGiven, 
                statusReceived, 
                variantReceived 
              }) => (
                <TableRow key={operator.id}>
                  <TableCell className="font-medium">{operator.nome}</TableCell>
                  <TableCell className="text-center">{evaluationsGivenCount} / {evaluationsExpectedToGive}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={variantGiven}>{statusGiven}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{evaluationsReceivedCount} / {evaluationsExpectedToReceive}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={variantReceived}>{statusReceived}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}