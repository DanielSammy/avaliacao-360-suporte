import React, { useMemo } from 'react';
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

  const calculatedValues = useMemo(() => {
    const activeCriteria = criterios.filter(c => c.ativo);
    if (activeCriteria.length === 0) {
      return { achievedValue: 0, percentage: 0 };
    }

    const sumValorAlcancado = activeCriteria.reduce((acc, criterio) => {
      const ca = getCriterioAvaliacao(criterio.id);
      return acc + (ca?.valorAlcancado || 0);
    }, 0);

    const avgValorAlcancado = sumValorAlcancado / activeCriteria.length;
    const achievedValue = (avgValorAlcancado / 100) * totalValue;
    const percentage = totalValue > 0 ? (achievedValue / totalValue) * 100 : 0;

    return { achievedValue, percentage };
  }, [criterios, criteriosAvaliacao, totalValue, getCriterioAvaliacao]);

  const isAvaliacao360 = criterios[0]?.idCriterio === 2;

  return (
    <Card className="shadow-medium">
      <CardHeader className="bg-gradient-card">
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <div className="text-right">
            <span className="text-lg font-semibold">Valor Total do Bloco: {formatarMoeda(totalValue)}</span>
            {isAvaliacao360 && (
              <div className="text-sm font-normal">
                <span>Atingido: {formatarMoeda(calculatedValues.achievedValue)}</span>
                <span className="ml-2 font-semibold">({calculatedValues.percentage.toFixed(2)}%)</span>
              </div>
            )}
          </div>
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
