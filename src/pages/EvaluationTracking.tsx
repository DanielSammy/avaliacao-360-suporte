import React from 'react';
import { useEvaluation } from '../contexts/EvaluationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Operador } from '../types/evaluation';

export function EvaluationTracking() {
  const { state } = useEvaluation();

  const allActiveAndParticipatingOperators = state.operadores.filter(op => op.ativo && op.participaAvaliacao);

  const operatorEvaluationSummary = allActiveAndParticipatingOperators.map(operator => {
    const isManager = operator.grupo === 6 || operator.grupo === 7;

    // --- GIVEN: How many people should this operator evaluate? ---
    let peopleToEvaluate: Operador[];
    if (isManager) {
      // Managers/Admins evaluate all OTHER participating operators
      peopleToEvaluate = allActiveAndParticipatingOperators.filter(p => p.id !== operator.id);
    } else {
      // Peers evaluate all OTHER participating PEERS
      peopleToEvaluate = allActiveAndParticipatingOperators.filter(p => p.id !== operator.id && p.grupo !== 6 && p.grupo !== 7);
    }
    const evaluationsExpectedToGive = peopleToEvaluate.length;

    // How many have they actually evaluated?
    const evaluationsGivenByOperator = state.avaliacoes.filter(evalItem => evalItem.avaliadorId === operator.id);
    const distinctPeopleEvaluated = new Set(evaluationsGivenByOperator.map(e => e.operadorId));
    const evaluationsGivenCount = distinctPeopleEvaluated.size;


    // --- RECEIVED: How many people should evaluate this operator? ---
    let peopleWhoShouldEvaluateThisOperator: Operador[];

    // Everyone is evaluated by managers (except other managers)
    const managers = allActiveAndParticipatingOperators.filter(p => (p.grupo === 6 || p.grupo === 7) && p.id !== operator.id);

    if (isManager) {
      // A manager is evaluated by other managers only (if any)
      peopleWhoShouldEvaluateThisOperator = managers;
    } else {
      // A peer is evaluated by managers and other peers
      const peers = allActiveAndParticipatingOperators.filter(p => p.grupo !== 6 && p.grupo !== 7 && p.id !== operator.id);
      peopleWhoShouldEvaluateThisOperator = [...managers, ...peers];
    }
    const evaluationsExpectedToReceive = peopleWhoShouldEvaluateThisOperator.length;

    // How many have actually evaluated them?
    const evaluationsReceivedByOperator = state.avaliacoes.filter(evalItem => evalItem.operadorId === operator.id);
    const distinctEvaluators = new Set(evaluationsReceivedByOperator.map(e => e.avaliadorId));
    const evaluationsReceivedCount = distinctEvaluators.size;


    // --- Status Logic ---
    let statusGiven: 'Concluído' | 'Pendente' | 'Em Andamento';
    let variantGiven: 'default' | 'secondary' | 'destructive' | 'outline';

    if (evaluationsGivenCount >= evaluationsExpectedToGive) {
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

    if (!operator.participaAvaliacao) { // This check is a bit redundant now, but safe
      statusReceived = 'N/A';
      variantReceived = 'outline';
    } else if (evaluationsReceivedCount >= evaluationsExpectedToReceive) {
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
    const pendingGiven = Math.max(0, (summary.evaluationsExpectedToGive || 0) - (summary.evaluationsGivenCount || 0));
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