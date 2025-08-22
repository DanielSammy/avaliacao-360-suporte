// src/pages/Ranking.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Award, ChevronLeft } from 'lucide-react';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { formatarMoeda } from '@/utils/calculations';
import { Operador } from '@/types/evaluation';

interface RankingData {
  operador: Operador;
  pontuacaoMedia: number;
  totalAvaliacoes: number;
  bonusTotal: number;
}

const RankingPage = () => {
  const { state } = useEvaluation();

  const ranking = useMemo((): RankingData[] => {
    const stats: { [key: string]: { totalBonus: number; count: number } } = {};

    state.avaliacoes.forEach(av => {
      if (!stats[av.operadorId]) {
        stats[av.operadorId] = { totalBonus: 0, count: 0 };
      }
      stats[av.operadorId].totalBonus += av.valorTotalAlcancado;
      stats[av.operadorId].count++;
    });

    return Object.entries(stats)
      .map(([operadorId, data]) => {
        const operador = state.operadores.find(op => op.id === operadorId);
        if (!operador) return null;

        return {
          operador,
          pontuacaoMedia: data.totalBonus / data.count,
          totalAvaliacoes: data.count,
          bonusTotal: data.totalBonus,
        };
      })
      .filter((item): item is RankingData => item !== null)
      .sort((a, b) => b.pontuacaoMedia - a.pontuacaoMedia);
  }, [state.avaliacoes, state.operadores]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center mb-6">
        <Link to="/">
          <Button variant="outline" size="icon" className="mr-4">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-primary">Ranking de Operadores</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Ranking de Performance por Bônus Médio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-center p-4 font-semibold">Pos.</th>
                  <th className="text-left p-4 font-semibold">Operador</th>
                  <th className="text-center p-4 font-semibold">Bônus Médio</th>
                  <th className="text-center p-4 font-semibold">Bônus Total</th>
                  <th className="text-center p-4 font-semibold">Avaliações</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((item, index) => (
                  <tr key={item.operador.id} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-bold text-lg text-center">#{index + 1}</td>
                    <td className="p-4 font-medium">{item.operador.nome}</td>
                    <td className="p-4 text-center font-semibold text-primary text-lg">{formatarMoeda(item.pontuacaoMedia)}</td>
                    <td className="p-4 text-center">{formatarMoeda(item.bonusTotal)}</td>
                    <td className="p-4 text-center">{item.totalAvaliacoes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RankingPage;