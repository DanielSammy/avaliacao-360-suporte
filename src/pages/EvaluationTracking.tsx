import React from 'react';
import { useEvaluation } from '../contexts/EvaluationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function EvaluationTracking() {
  const { state } = useEvaluation();

  const activeOperators = state.operadores.filter(op => op.ativo && op.participaAvaliacao);
  const totalOperatorsCount = activeOperators.length;

  const operatorEvaluationSummary = activeOperators.map(operator => {
    const evaluationsReceived = state.avaliacoes.filter(evalItem => evalItem.operadorId === operator.id);
    const evaluationsGiven = state.avaliacoes.filter(evalItem => evalItem.avaliadorId === operator.id);

    // An operator should evaluate all other active operators (total - 1)
    const evaluationsExpectedToGive = totalOperatorsCount > 1 ? totalOperatorsCount - 1 : 0;

    let statusGiven: 'Concluído' | 'Pendente' | 'Em Andamento';
    let variantGiven: 'default' | 'secondary' | 'destructive' | 'outline'; // Updated types

    if (evaluationsGiven.length === evaluationsExpectedToGive) {
      statusGiven = 'Concluído';
      variantGiven = 'default'; // Mapped to 'default'
    } else if (evaluationsGiven.length > 0) {
      statusGiven = 'Em Andamento';
      variantGiven = 'secondary'; // Mapped to 'secondary'
    } else {
      statusGiven = 'Pendente';
      variantGiven = 'destructive';
    }

    let statusReceived: 'Concluído' | 'Pendente' | 'Em Andamento';
    let variantReceived: 'default' | 'secondary' | 'destructive' | 'outline'; // Updated types

    // An operator should receive evaluations from all other active operators (total - 1)
    const evaluationsExpectedToReceive = totalOperatorsCount > 1 ? totalOperatorsCount - 1 : 0;

    if (evaluationsReceived.length === evaluationsExpectedToReceive) {
      statusReceived = 'Concluído';
      variantReceived = 'default'; // Mapped to 'default'
    } else if (evaluationsReceived.length > 0) {
      statusReceived = 'Em Andamento';
      variantReceived = 'secondary'; // Mapped to 'secondary'
    } else {
      statusReceived = 'Pendente';
      variantReceived = 'destructive';
    }

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

  return (
    <div className="container mx-auto p-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Acompanhamento de Avaliações 360</CardTitle>
        </CardHeader>
        <CardContent>
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
                evaluationsReceivedCount, 
                evaluationsExpectedToGive, 
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
