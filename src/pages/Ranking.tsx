// src/pages/Ranking.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Award, ChevronLeft } from 'lucide-react';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { formatarMoeda, calcularResultadoFinal, calcularResultadoBloco } from '@/utils/calculations';
import { Operador, Criterio } from '@/types/evaluation';

interface RankingData {
  operador: Operador;
  pontuacaoFinal: number;
  totalAvaliacoes: number;
  averageValorAlcancado: number;
}

const RankingPage = () => {
  const { state } = useEvaluation();

  const ranking = useMemo((): RankingData[] => {
    const todosCriteriosAtivos = state.criterios.filter(c => c.ativo);

    const blocos = todosCriteriosAtivos.reduce((acc, criterio) => {
      const idBloco = criterio.idCriterio;
      if (!acc[idBloco]) {
        acc[idBloco] = [];
      }
      acc[idBloco].push(criterio);
      return acc;
    }, {} as { [key: number]: Criterio[] });

    return state.operadores
      .filter(op => op.ativo && op.participaAvaliacao)
      .map(operador => {
        const avaliacoesDoOperador = state.avaliacoes.filter(av => av.operadorId === operador.id);

        if (avaliacoesDoOperador.length === 0) {
          return {
            operador,
            pontuacaoFinal: 0,
            totalAvaliacoes: 0,
            averageValorAlcancado: 0,
          };
        }

        const pontuacaoDosBlocos = Object.keys(blocos).map(idBlocoStr => {
          const idBloco = parseInt(idBlocoStr);
          const criteriosDoBloco = blocos[idBloco];

          const performanceDoBloco = calcularResultadoBloco(idBloco, todosCriteriosAtivos, avaliacoesDoOperador, state.operadores);

          const bonusPotencialDoBloco = criteriosDoBloco.reduce((sum, c) => sum + c.valorBonus, 0);

          return (performanceDoBloco / 100) * bonusPotencialDoBloco;
        });

        const pontuacaoFinal = pontuacaoDosBlocos.reduce((sum, bonus) => sum + bonus, 0);

        const allAchievedScores = todosCriteriosAtivos.map(c => calcularResultadoFinal(c, avaliacoesDoOperador, state.operadores));
        const averageValorAlcancado = allAchievedScores.length > 0 ? allAchievedScores.reduce((a, b) => a + b, 0) / allAchievedScores.length : 0;

        return {
          operador,
          pontuacaoFinal,
          totalAvaliacoes: avaliacoesDoOperador.length,
          averageValorAlcancado,
        };
      })
      .sort((a, b) => b.pontuacaoFinal - a.pontuacaoFinal);
  }, [state.avaliacoes, state.operadores, state.criterios]);

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
                  <th className="text-center p-4 font-semibold">Pontuação Final</th>
                  <th className="text-center p-4 font-semibold">Avaliações Recebidas</th>
                  <th className="text-center p-4 font-semibold">Média Alcançada</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((item, index) => (
                  <tr key={item.operador.id} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-bold text-lg text-center">#{index + 1}</td>
                    <td className="p-4 font-medium">{item.operador.nome}</td>
                    <td className="p-4 text-center font-semibold text-primary text-lg">{formatarMoeda(item.pontuacaoFinal)}</td>
                    <td className="p-4 text-center">{item.totalAvaliacoes}</td>
                    <td className="p-4 text-center">{item.averageValorAlcancado.toFixed(1)}%</td>
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
