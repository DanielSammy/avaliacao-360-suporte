// src/pages/Ranking.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Award, ChevronLeft } from 'lucide-react';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { formatarMoeda, calcularResultadoFinal } from '@/utils/calculations';
import { Operador, valoresNivel } from '@/types/evaluation';

interface RankingData {
  operador: Operador;
  pontuacaoFinal: number;
  totalAvaliacoes: number;
  averageValorAlcancado: number; // New field
}

const RankingPage = () => {
  const { state } = useEvaluation();

  const ranking = useMemo((): RankingData[] => {
    const criteriosAtivos = state.criterios.filter(c => c.ativo);
    
    return state.operadores
      .filter(op => op.ativo && op.participaAvaliacao)
      .map(operador => {
        const avaliacoesDoOperador = state.avaliacoes.filter(av => av.operadorId === operador.id);

        const baseMetaValue = valoresNivel[operador.nivel] || 0;
        const totalPeso = criteriosAtivos.reduce((sum, c) => sum + c.peso, 0);

        if (avaliacoesDoOperador.length === 0) {
          return {
            operador,
            pontuacaoFinal: 0,
            totalAvaliacoes: 0,
            averageValorAlcancado: 0, // Initialize new field
          };
        }

        let sumOfAchievedValues = 0;
        const pontuacaoCriterios = criteriosAtivos.map(criterio => {
            const resultadoMedio = calcularResultadoFinal(criterio, avaliacoesDoOperador, state.operadores);
            sumOfAchievedValues += resultadoMedio;

            const metaParaComparacao = criterio.valorMeta !== undefined && criterio.valorMeta !== null
                ? criterio.valorMeta
                : (criterio.tipo === 'qualitativo' 
                    ? (criterio.tipoMeta === 'maior_melhor' ? 100 : 25) // Fallback para qualitativo
                    : baseMetaValue); // Fallback para quantitativo (ainda pode ser ajustado)

            const metaAtingidaStatus = criterio.tipoMeta === 'maior_melhor'
                ? resultadoMedio >= metaParaComparacao
                : resultadoMedio <= metaParaComparacao;

            const criterioValorBonus = totalPeso > 0 ? (criterio.peso / totalPeso) * baseMetaValue : 0;

            return metaAtingidaStatus ? criterioValorBonus : 0;
        });

        const pontuacaoFinal = pontuacaoCriterios.reduce((sum, bonus) => sum + bonus, 0);
        const averageValorAlcancado = criteriosAtivos.length > 0 ? sumOfAchievedValues / criteriosAtivos.length : 0;

        return {
          operador,
          pontuacaoFinal,
          totalAvaliacoes: avaliacoesDoOperador.length,
          averageValorAlcancado, // Assign calculated value
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
                  <th className="text-center p-4 font-semibold">Média Alcançada</th> {/* New Header */}
                </tr>
              </thead>
              <tbody>
                {ranking.map((item, index) => (
                  <tr key={item.operador.id} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-bold text-lg text-center">#{index + 1}</td>
                    <td className="p-4 font-medium">{item.operador.nome}</td>
                    <td className="p-4 text-center font-semibold text-primary text-lg">{formatarMoeda(item.pontuacaoFinal)}</td>
                    <td className="p-4 text-center">{item.totalAvaliacoes}</td>
                    <td className="p-4 text-center">{item.averageValorAlcancado.toFixed(1)}%</td> {/* New Cell */}
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