// src/pages/Ranking.tsx
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Award, ChevronLeft } from 'lucide-react';

// Dados simulados da planilha helpdesk.avaliacaocrosstab.xlsx
const mockRankingData = [
    { nome: 'Jonathan Nascimento', excelente: 35, muitoBom: 7, bom: 7, regular: 2, ruim: 0, total: 51 },
    { nome: 'João Pedro Costa', excelente: 34, muitoBom: 5, bom: 4, regular: 0, ruim: 0, total: 43 },
    { nome: 'Paulo Silva', excelente: 17, muitoBom: 8, bom: 10, regular: 0, ruim: 0, total: 35 },
    { nome: 'Samuel Ivens', excelente: 15, muitoBom: 12, bom: 5, regular: 3, ruim: 1, total: 36 },
    { nome: 'Ana Carolina Ribeiro', excelente: 28, muitoBom: 10, bom: 2, regular: 1, ruim: 0, total: 41 },
];

const calcularPontuacao = (operador: typeof mockRankingData[0]) => {
    const pontuacaoTotal = (operador.excelente * 5 + operador.muitoBom * 4 + operador.bom * 3 + operador.regular * 2 + operador.ruim * 1);
    return operador.total > 0 ? pontuacaoTotal / operador.total : 0;
};

const RankingPage = () => {
  const ranking = useMemo(() => {
    return mockRankingData
      .map(op => ({ ...op, pontuacao: calcularPontuacao(op) }))
      .sort((a, b) => b.pontuacao - a.pontuacao);
  }, []);

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
            Melhores Avaliações (Helpdesk Crosstab)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-center p-4 font-semibold">Pos.</th>
                  <th className="text-left p-4 font-semibold">Operador</th>
                  <th className="text-center p-4 font-semibold">Pontuação Média</th>
                  <th className="text-center p-4 font-semibold">Avaliações</th>
                  <th className="text-center p-4 font-semibold">Excelente</th>
                  <th className="text-center p-4 font-semibold">Muito Bom</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((operador, index) => (
                  <tr key={operador.nome} className="border-b hover:bg-muted/50">
                    <td className="p-4 font-bold text-lg text-center">#{index + 1}</td>
                    <td className="p-4 font-medium">{operador.nome}</td>
                    <td className="p-4 text-center font-semibold text-primary text-lg">{operador.pontuacao.toFixed(2)}</td>
                    <td className="p-4 text-center">{operador.total}</td>
                    <td className="p-4 text-center text-green-600 font-medium">{operador.excelente}</td>
                    <td className="p-4 text-center text-blue-500 font-medium">{operador.muitoBom}</td>
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