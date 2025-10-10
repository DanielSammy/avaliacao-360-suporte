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
    // Faixas: 0-25 (vermelho), 26-50 (laranja), 51-75 (amarelo), 76-100 (verde)
    if (p <= 25) return 'text-red-600';
    if (p <= 50) return 'text-orange-600';
    if (p <= 75) return 'text-amber-400';
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
    // aplicar as mesmas faixas definidas: se atingiu é verde, senão mapear pctAgainstMeta
    if (isNaN(pctAgainstMeta)) return 'text-muted-foreground';
    if (pctAgainstMeta <= 25) return 'text-red-600';
    if (pctAgainstMeta <= 50) return 'text-orange-600';
    if (pctAgainstMeta <= 75) return 'text-amber-400';
    return 'text-green-600';
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

  // Garantir que a classificação use o percentual final baseado no valor atingido / valor total
  const finalPercent = totalValue > 0 ? (calculatedValues.achievedValue / totalValue) * 100 : 0;

  const isAvaliacao360 = criterios[0]?.idCriterio === 2;
  const isGerencia = criterios[0]?.idCriterio === 1;

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
              <div className="text-sm font-normal">
                  <span>Atingido: {formatarMoeda(calculatedValues.achievedValue)}</span>
                  <span className={`ml-2 font-semibold ${getColorForPercentage(finalPercent)}`}>{`(${finalPercent.toFixed(2)}%)`}</span>
              </div>
              {/* Classificação para Gerencia e Avaliação 360 */}
                {(isGerencia || isAvaliacao360) && (
                <div className="mt-1">
                <span className={`font-semibold ${getColorForPercentage(finalPercent)}`}> {(() => {
                  const p = finalPercent;
                    if (isNaN(p)) return 'N/A';
                    if (p <= 25) return 'Insatisfatório';
                    if (p <= 50) return 'Regular';
                    if (p <= 75) return 'Bom';
                    return 'Ótimo';
                  })()}</span>
                </div>
              )}
            </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '60%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
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
                        <div className="font-medium whitespace-normal" title={criterio.nome}>{criterio.nome}</div>
                      </td>
                      <td className="p-4 text-center">
                        {(() => {
                          // calcular rowPercent para uso tanto no percentual quanto no label
                          const raw = criterioAvaliacao?.metaAlcancada ?? criterioAvaliacao?.valorAlcancado ?? null;
                          const num = raw !== null && raw !== undefined ? parseFloat(String(raw).replace(',', '.')) || 0 : NaN;
                          let rowPercent = NaN;
                          if (criterio.tipo === 'qualitativo') {
                            rowPercent = num;
                          } else {
                            const target = criterio.valorMeta || 0;
                            if (!isNaN(num) && target > 0) {
                              if (criterio.tipoMeta === 'menor_melhor') {
                                rowPercent = (target / num) * 100;
                              } else {
                                rowPercent = (num / target) * 100;
                              }
                            }
                          }

                          // calcular se a meta foi atingida (binário) para casos não Gerência/360
                          let atingiu = false;
                          if (criterioAvaliacao?.metaAtingida !== undefined && criterioAvaliacao?.metaAtingida !== null) {
                            atingiu = !!criterioAvaliacao.metaAtingida;
                          } else {
                            const metaAlcRaw = criterioAvaliacao?.metaAlcancada ?? criterioAvaliacao?.valorAlcancado ?? null;
                            const metaAlc = metaAlcRaw !== null && metaAlcRaw !== undefined ? parseFloat(String(metaAlcRaw).replace(',', '.')) || NaN : NaN;
                            const target = criterio.valorMeta || 0;
                            if (!isNaN(metaAlc) && target > 0) {
                              if (criterio.tipoMeta === 'menor_melhor') {
                                atingiu = metaAlc <= target;
                              } else {
                                atingiu = metaAlc >= target;
                              }
                            }
                          }

                          // decidir cor: se bloco não for Gerência/360, usar binário; caso contrário usar faixas
                          const colorClass = (!isGerencia && !isAvaliacao360) ? (atingiu ? 'text-green-600' : 'text-red-600') : getColorForPercentage(rowPercent);

                          if (criterio.tipo === 'qualitativo') {
                            const text = isNaN(rowPercent) ? 'N/A' : `${rowPercent.toFixed(1)}%`;
                            return <span className={`font-medium ${colorClass}`}>{text}</span>;
                          }

                          // quantitativo: mostrar valor (não percentual) mas colorir com base na decisão acima
                          const valorText = formatarValor(criterio, criterioAvaliacao?.metaAlcancada);
                          return <span className={`font-medium ${colorClass}`}>{valorText}</span>;
                        })()}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          { (isGerencia || isAvaliacao360) ? (
                              // mostrar classificação baseada no percentual do próprio critério (por linha)
                              (() => {
                                // obter valor alcançado para o critério (metaAlcancada ou valorAlcancado)
                                const raw = criterioAvaliacao?.metaAlcancada ?? criterioAvaliacao?.valorAlcancado ?? null;
                                const num = raw !== null && raw !== undefined ? parseFloat(String(raw).replace(',', '.')) || 0 : NaN;
                                // para criterios quantitativos, se valorAlcancado representa uma quantidade absoluta, precisamos normalizar
                                // aqui assumimos que metaAlcancada (para qualitativos) já está em percentual; para quantitativos, usamos valorAlcancado / criterio.valorMeta * 100
                                let rowPercent = NaN;
                                if (criterio.tipo === 'qualitativo') {
                                  rowPercent = num; // já é percentual
                                } else {
                                  const target = criterio.valorMeta || 0;
                                  if (!isNaN(num) && target > 0) {
                                    if (criterio.tipoMeta === 'menor_melhor') {
                                      // menor é melhor: inverter a lógica para percentual comparável
                                      rowPercent = (target / num) * 100;
                                    } else {
                                      rowPercent = (num / target) * 100;
                                    }
                                  }
                                }

                                const colorClass = getColorForPercentage(rowPercent);
                                const label = (() => {
                                  const p = rowPercent;
                                  if (isNaN(p)) return 'N/A';
                                  if (p <= 25) return 'Insatisfatório';
                                  if (p <= 50) return 'Regular';
                                  if (p <= 75) return 'Bom';
                                  return 'Ótimo';
                                })();

                                return (
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}>
                                    {label}
                                  </span>
                                );
                              })()
                            ) : (
                              getStatusBadge(criterio, criterioAvaliacao)
                            )}
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
