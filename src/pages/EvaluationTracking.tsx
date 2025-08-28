import React from 'react';
import { useEvaluation } from '../contexts/EvaluationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function EvaluationTracking() {
  const { state } = useEvaluation();

  const allActiveOperators = state.operadores.filter(op => op.ativo);
  const participatingOperators = state.operadores.filter(op => op.ativo && op.participaAvaliacao);
  const totalParticipatingOperatorsCount = participatingOperators.length;

  const operatorEvaluationSummary = allActiveOperators.map(operator => {
    const evaluationsReceived = state.avaliacoes.filter(evalItem => evalItem.operadorId === operator.id);
    const evaluationsGiven = state.avaliacoes.filter(evalItem => evalItem.avaliadorId === operator.id);

    // An operator should evaluate all participating operators (including themselves if self-evaluation is desired)
    const evaluationsExpectedToGive = totalParticipatingOperatorsCount;

    let statusGiven: 'Concluído' | 'Pendente' | 'Em Andamento';
    let variantGiven: 'default' | 'secondary' | 'destructive' | 'outline';

    if (evaluationsGiven.length === evaluationsExpectedToGive) {
      statusGiven = 'Concluído';
      variantGiven = 'default';
    } else if (evaluationsGiven.length > 0) {
      statusGiven = 'Em Andamento';
      variantGiven = 'secondary';
    } else {
      statusGiven = 'Pendente';
      variantGiven = 'destructive';
    }

    // An operator should receive evaluations from all participating operators (including themselves if self-evaluation is desired)
    const evaluationsExpectedToReceive = operator.participaAvaliacao ? totalParticipatingOperatorsCount : 0;

    let statusReceived: 'Concluído' | 'Pendente' | 'Em Andamento';
    let variantReceived: 'default' | 'secondary' | 'destructive' | 'outline';

    if (evaluationsReceived.length === evaluationsExpectedToReceive) {
      statusReceived = 'Concluído';
      variantReceived = 'default';
    } else if (evaluationsReceived.length > 0) {
      statusReceived = 'Em Andamento';
      variantReceived = 'secondary';
    } else {
      statusReceived = 'Pendente';
      variantReceived = 'destructive';
    }

    console.log(`Operator: ${operator.nome}`);
    console.log(`  participaAvaliacao: ${operator.participaAvaliacao}`);
    console.log(`  evaluationsGivenCount: ${evaluationsGiven.length}, evaluationsExpectedToGive: ${evaluationsExpectedToGive}`);
    console.log(`  evaluationsReceivedCount: ${evaluationsReceived.length}, evaluationsExpectedToReceive: ${evaluationsExpectedToReceive}`);

    return {
      operator,
      evaluationsReceivedCount: evaluationsReceived.length,
      evaluationsGivenCount: evaluationsGiven.length,
      evaluationsExpectedToGive,
      evaluationsExpectedToReceive,
      statusGiven,
      variantGiven,
      statusReceived,
      variantReceived,
    };
  });

  const totalPendingEvaluations = operatorEvaluationSummary.reduce((total, summary) => {
    const pendingGiven = summary.evaluationsExpectedToGive - summary.evaluationsGivenCount;
    const pendingReceived = summary.evaluationsExpectedToReceive - summary.evaluationsReceivedCount;
    console.log(`  Pending for ${summary.operator.nome}: Given=${pendingGiven}, Received=${pendingReceived}`);
    return total + pendingGiven + pendingReceived;
  }, 0);

  console.log(`Total Active Operators: ${allActiveOperators.length}`);
  console.log(`Total Participating Operators: ${totalParticipatingOperatorsCount}`);
  console.log(`Total Evaluations in State: ${state.avaliacoes.length}`);
  console.log(`Final Total Pending Evaluations: ${totalPendingEvaluations}`);

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