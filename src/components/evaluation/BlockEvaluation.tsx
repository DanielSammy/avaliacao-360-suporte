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

  const getCriterioAvaliacao = (criterioId: number) => criteriosAvaliacao.find(ca => ca.criterioId === criterioId);

  const getColorForPercentage = (p: number) => {
    if (isNaN(p)) return 'text-muted-foreground';
    if (p < 50) return 'text-red-600'; // fallback
    if (p < 80) return 'text-amber-600';
    return 'text-green-600';
  };

  const getColorForCriterion = (criterio: Criterio, rawValue?: string | number | null) => {
    const raw = rawValue ?? null;
    const value = raw !== null && raw !== undefined ? parseFloat(String(raw).replace(',', '.')) || 0 : NaN;
    const target = criterio.valorMeta || 0;
    if (isNaN(value) || target === 0) return 'text-muted-foreground';

    // determinar se atingiu
    let atingiu = false;
    let pctAgainstMeta = 0;
    if (criterio.tipoMeta === 'menor_melhor') {
      // menor é melhor: atingir se value <= target
      atingiu = value <= target;
      pctAgainstMeta = value > 0 ? (target / value) * 100 : 0; // quanto mais alto, pior; usamos inverso como 'proporcao'
    } else {
      // maior é melhor
      atingiu = value >= target;
      pctAgainstMeta = (value / target) * 100;
    }

    if (atingiu) return 'text-green-600';
    // margem: se >= 90% considerar amarelo
    if (pctAgainstMeta >= 90) return 'text-amber-600';
    return 'text-red-600';
  };

  const getStatusBadge = (criterio: Criterio, criterioAvaliacao?: CriterioAvaliacao) => {
    // Badge binário: Atingida (verde) ou Não Atingida (vermelho)
    let atingiu = false;
    if (criterioAvaliacao?.metaAtingida !== undefined && criterioAvaliacao?.metaAtingida !== null) {
      atingiu = !!criterioAvaliacao.metaAtingida;
    } else {
      const metaAlcancadaRaw = criterioAvaliacao?.metaAlcancada ?? criterioAvaliacao?.valorAlcancado ?? null;
      const metaAlcancada = metaAlcancadaRaw !== null && metaAlcancadaRaw !== undefined
        ? parseFloat(String(metaAlcancadaRaw).replace(',', '.')) || 0
        : NaN;
      const target = criterio.valorMeta || 0;
      if (!isNaN(metaAlcancada) && target > 0) {
        if (criterio.tipoMeta === 'menor_melhor') {
          // menor é melhor: considera atingida se metaAlcancada <= target
          atingiu = metaAlcancada <= target;
        } else {
          // maior é melhor: considera atingida se metaAlcancada >= target
          atingiu = metaAlcancada >= target;
        }
      }
    }

    return (
      <Badge variant={atingiu ? 'success' : 'destructive'} className="font-medium">
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
    if (activeCriteria.length === 0) return { achievedValue: 0, percentage: 0 };

    const sumValorAlcancado = activeCriteria.reduce((acc, criterio) => {
      const ca = criteriosAvaliacao.find(ca => ca.criterioId === criterio.id);
      const v = ca ? parseFloat(String(ca.valorAlcancado).replace(',', '.')) || 0 : 0;
      return acc + v;
    }, 0);

    const avgValorAlcancado = sumValorAlcancado / activeCriteria.length;
    const achievedValue = (avgValorAlcancado / 100) * totalValue;
    const percentage = totalValue > 0 ? (achievedValue / totalValue) * 100 : 0;

    return { achievedValue, percentage };
  }, [criterios, criteriosAvaliacao, totalValue]);

  const isAvaliacao360 = criterios[0]?.idCriterio === 2;

  if (!criterios || criterios.length === 0) {
    return null;
  }

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
                  <span className={`ml-2 font-semibold ${getColorForPercentage(calculatedValues.percentage)}`}>{`(${calculatedValues.percentage.toFixed(2)}%)`}</span>
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
                        {criterio.tipo === 'qualitativo' ? (
                          // exibir percentual colorido para qualitativos com base na meta do critério
                          (() => {
                            const raw = criterioAvaliacao?.metaAlcancada;
                            const num = raw ? parseFloat(String(raw).replace(',', '.')) || 0 : NaN;
                            const cls = getColorForCriterion(criterio, raw);
                            const text = isNaN(num) ? 'N/A' : `${num.toFixed(1)}%`;
                            return <span className={`font-medium ${cls}`}>{text}</span>;
                          })()
                        ) : (
                          <span className="font-medium">{formatarValor(criterio, criterioAvaliacao?.metaAlcancada)}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusBadge(criterio, criterioAvaliacao)}
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
