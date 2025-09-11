import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Criterio, CriterioAvaliacao } from '@/types/evaluation';
import { formatarMoeda } from '@/utils/calculations';

interface BlockEvaluationProps {
  title: string;
  criterios: Criterio[];
  criteriosAvaliacao: CriterioAvaliacao[];
  totalValue: number;
}

export function BlockEvaluation({ title, criterios, criteriosAvaliacao, totalValue }: BlockEvaluationProps) {
  if (!criterios || criterios.length === 0) {
    return null;
  }

  const getCriterioAvaliacao = (criterioId: number) => {
    return criteriosAvaliacao.find(ca => ca.criterioId === criterioId);
  };

  const getStatusBadge = (atingiu: boolean) => {
    return (
      <Badge variant={atingiu ? 'default' : 'destructive'} className="font-medium">
        {atingiu ? 'Atingida' : 'Não Atingida'}
      </Badge>
    );
  };

  const formatarValor = (criterio: Criterio, valor?: string | number | null) => {
    if (valor === null || valor === undefined) {
      return 'N/A';
    }
    if (criterio.tipo === 'quantitativo') {
      return parseInt(valor.toString(), 10).toString();
    }
    return `${parseFloat(valor.toString()).toFixed(1)}%`;
  };

  return (
    <Card className="shadow-medium">
      <CardHeader className="bg-gradient-card">
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <span className="text-lg font-semibold">Valor Total do Bloco: {formatarMoeda(totalValue)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-semibold">Critério</th>
                <th className="text-center p-4 font-semibold">Alcançado</th>
                <th className="text-center p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {criterios
                .filter(criterio => criterio.ativo)
                .sort((a, b) => a.ordem - b.ordem)
                .map((criterio) => {
                  const criterioAvaliacao = getCriterioAvaliacao(criterio.id);
                  return (
                    <tr key={criterio.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="font-medium">{criterio.nome}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-medium">
                          {formatarValor(criterio, criterioAvaliacao?.metaAlcancada)}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusBadge(criterioAvaliacao?.metaAtingida || false)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
