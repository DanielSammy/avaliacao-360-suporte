// src/components/evaluation/EvaluationPanel.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { EvaluationTable } from './EvaluationTable';
import { EvaluationSummary } from './EvaluationSummary';
import { OperatorSelector } from './OperatorSelector';
import { PeriodSelector } from './PeriodSelector';
import { PDFGenerator } from '../reports/PDFGenerator';
import { Avaliacao, CriterioAvaliacao } from '@/types/evaluation';
import { calcularBonusAlcancado, calcularTotaisAvaliacao, metaAtingida } from '@/utils/calculations';
import { FileText, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';

const converterAvaliacaoParaPercentual = (avaliacao: string | number | undefined): number => {
  if (typeof avaliacao === 'number') return avaliacao;
  if (typeof avaliacao !== 'string') return 0;
  const avaliacaoLimpa = avaliacao.trim().toLowerCase();
  if (avaliacaoLimpa.includes('timo') || avaliacaoLimpa.includes('excelente')) return 100.0;
  if (avaliacaoLimpa.includes('bom')) return 75.0;
  if (avaliacaoLimpa.includes('regular')) return 50.0;
  if (avaliacaoLimpa.includes('insatisfatorio')) return 25.0;
  return 0;
};

export function EvaluationPanel() {
  const { state } = useEvaluation();
  const [operadorSelecionado, setOperadorSelecionado] = useState<string>('');
  const [periodoAtual, setPeriodoAtual] = useState<string>(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [criteriosAvaliacao, setCriteriosAvaliacao] = useState<CriterioAvaliacao[]>([]);
  const [avaliacaoAtual, setAvaliacaoAtual] = useState<Avaliacao | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  useEffect(() => {
    if (operadorSelecionado && periodoAtual) {
      const criteriosAtivos = state.criterios.filter(c => c.ativo);
      
      const avaliacoesDoOperadorNoPeriodo = state.avaliacoes.filter(
        av => av.operadorId === operadorSelecionado && av.periodo === periodoAtual
      );

      const activeOperators = state.operadores.filter(op => op.ativo);
      const totalOperatorsCount = activeOperators.length;
      const evaluationsExpectedToReceive = totalOperatorsCount > 1 ? totalOperatorsCount - 1 : 0;
      const isCompleted = avaliacoesDoOperadorNoPeriodo.length === evaluationsExpectedToReceive;
      setIsCompleted(isCompleted);

      const novosCriteriosAvaliacao = criteriosAtivos.map(criterio => {
        let valorAlcancado = 0;

        if (criterio.id.startsWith('gerencia_')) {
          const avaliacaoGerencia = avaliacoesDoOperadorNoPeriodo[0];
          if (avaliacaoGerencia) {
            const criterioAvaliado = avaliacaoGerencia.criterios.find(c => c.criterioId === criterio.id);
            if (criterioAvaliado) {
              valorAlcancado = criterioAvaliado.valorAlcancado;
            }
          }
        } else if (criterio.id.startsWith('360_')) {
          let total = 0;
          let count = 0;
          for (const avaliacao of avaliacoesDoOperadorNoPeriodo) {
            const criterioAvaliado = avaliacao.criterios.find(c => c.criterioId === criterio.id);
            if (criterioAvaliado) {
              total += converterAvaliacaoParaPercentual(criterioAvaliado.valorAlcancado);
              count++;
            }
          }
          valorAlcancado = count > 0 ? total / count : 0;
        }

        const valorBonusAlcancado = calcularBonusAlcancado(criterio, valorAlcancado);
        const metaAtingidaStatus = metaAtingida(criterio, valorAlcancado);

        return {
          criterioId: criterio.id,
          valorAlcancado,
          valorBonusAlcancado,
          metaAtingida: metaAtingidaStatus,
        };
      });

      setCriteriosAvaliacao(novosCriteriosAvaliacao);

      const { valorTotalMeta, valorTotalAlcancado } = calcularTotaisAvaliacao(criteriosAtivos, novosCriteriosAvaliacao);
      const avaliacaoSintetica: Avaliacao = {
        id: 'sintetica',
        operadorId: operadorSelecionado,
        avaliadorId: '', // Synthetic evaluation does not have a single evaluator
        periodo: periodoAtual,
        criterios: novosCriteriosAvaliacao,
        valorTotalMeta,
        valorTotalAlcancado,
        dataCriacao: new Date(),
        dataUltimaEdicao: new Date(),
      };
      setAvaliacaoAtual(avaliacaoSintetica);

    } else {
      setCriteriosAvaliacao([]);
      setAvaliacaoAtual(null);
      setIsCompleted(false);
    }
  }, [operadorSelecionado, periodoAtual, state.avaliacoes, state.criterios, state.operadores]);

  const { valorTotalMeta, valorTotalAlcancado } = calcularTotaisAvaliacao(state.criterios.filter(c => c.ativo), criteriosAvaliacao);
  const metasAtingidas = criteriosAvaliacao.filter(ca => ca.metaAtingida).length;
  const totalMetas = state.criterios.filter(c => c.ativo).length;
  const operadorAtual = state.operadores.find(op => op.id === operadorSelecionado);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-primary">Dashboard de Apuração</h2>
        <Link to="/ranking">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Ranking de Operadores
          </Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OperatorSelector operadores={state.operadores} operadorSelecionado={operadorSelecionado} onOperadorChange={setOperadorSelecionado} avaliacoes={state.avaliacoes} periodoAtual={periodoAtual} />
        <PeriodSelector periodoAtual={periodoAtual} onPeriodoChange={setPeriodoAtual} />
      </div>

      <EvaluationSummary valorTotalMeta={valorTotalMeta} valorTotalAlcancado={valorTotalAlcancado} metasAtingidas={metasAtingidas} totalMetas={totalMetas} />

      {operadorSelecionado ? (
        <>
          <EvaluationTable
              criterios={state.criterios.filter(c => c.ativo)}
              criteriosAvaliacao={criteriosAvaliacao}
              isEditable={false}
          />
          <Card className="shadow-medium">
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Ações da Avaliação</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                  {avaliacaoAtual && operadorAtual && isCompleted && (
                      <div className="flex-1 min-w-[200px]">
                          <PDFGenerator avaliacao={avaliacaoAtual} operador={operadorAtual} criterios={state.criterios} />
                      </div>
                  )}
              </CardContent>
          </Card>
        </>
      ) : (
        <Card className="text-center py-12"><CardContent><h3 className="text-lg font-semibold text-muted-foreground">Selecione um operador e um período para começar.</h3></CardContent></Card>
      )}
    </div>
  );
}
