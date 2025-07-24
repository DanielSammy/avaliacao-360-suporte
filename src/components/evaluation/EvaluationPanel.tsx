// src/components/evaluation/EvaluationPanel.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { EvaluationTable } from './EvaluationTable';
import { EvaluationSummary } from './EvaluationSummary';
import { OperatorSelector } from './OperatorSelector';
import { PeriodSelector } from './PeriodSelector';
import { ImportDialog } from '../import/ImportDialog';
import { PDFGenerator } from '../reports/PDFGenerator';
import { Avaliacao, CriterioAvaliacao, DadosImportacao } from '@/types/evaluation';
import { calcularBonusAlcancado, calcularTotaisAvaliacao, metaAtingida, gerarId } from '@/utils/calculations';
import { Save, Upload, FileText, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

const normalizeText = (text: string = '') => {
  return text.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
};

export function EvaluationPanel() {
  const { state, dispatch } = useEvaluation();
  const [operadorSelecionado, setOperadorSelecionado] = useState<string>('');
  const [periodoAtual, setPeriodoAtual] = useState<string>(() => {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${(hoje.getMonth() + 1).toString().padStart(2, '0')}`;
  });
  const [criteriosAvaliacao, setCriteriosAvaliacao] = useState<CriterioAvaliacao[]>([]);
  const [avaliacaoAtual, setAvaliacaoAtual] = useState<Avaliacao | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (operadorSelecionado && periodoAtual) {
      const avaliacaoExistente = state.avaliacoes.find(
        av => av.operadorId === operadorSelecionado && av.periodo === periodoAtual
      );
      const criteriosAtivos = state.criterios.filter(c => c.ativo);

      if (avaliacaoExistente) {
        const criteriosCompletos = criteriosAtivos.map(criterio => {
          const criterioSalvo = avaliacaoExistente.criterios.find(ca => ca.criterioId === criterio.id);
          return criterioSalvo || {
            criterioId: criterio.id, valorAlcancado: 0, valorBonusAlcancado: 0, metaAtingida: false,
          };
        });
        setCriteriosAvaliacao(criteriosCompletos);
        setAvaliacaoAtual(avaliacaoExistente);
      } else {
        const novosCriterios = criteriosAtivos.map(criterio => ({
          criterioId: criterio.id, valorAlcancado: 0, valorBonusAlcancado: 0, metaAtingida: false,
        }));
        setCriteriosAvaliacao(novosCriterios);
        setAvaliacaoAtual(null);
      }
    } else {
      setCriteriosAvaliacao([]);
      setAvaliacaoAtual(null);
    }
  }, [operadorSelecionado, periodoAtual, state.avaliacoes, state.criterios]);

  const atualizarCriterio = (criterioId: string, valor: number) => {
    setCriteriosAvaliacao(prev =>
      prev.map(ca => {
        if (ca.criterioId === criterioId) {
          const criterio = state.criterios.find(c => c.id === criterioId);
          if (!criterio) return ca;
          const valorBonusAlcancado = calcularBonusAlcancado(criterio, valor);
          const metaAtingidaStatus = metaAtingida(criterio, valor);
          return { ...ca, valorAlcancado: valor, valorBonusAlcancado, metaAtingida: metaAtingidaStatus };
        }
        return ca;
      })
    );
  };

  const salvarAvaliacao = () => {
    if (!operadorSelecionado) {
      toast({ title: "Erro", description: "Selecione um operador.", variant: "destructive" });
      return;
    }
    const { valorTotalMeta, valorTotalAlcancado } = calcularTotaisAvaliacao(state.criterios.filter(c => c.ativo), criteriosAvaliacao);
    const novaAvaliacao: Avaliacao = {
      id: avaliacaoAtual?.id || gerarId(),
      operadorId: operadorSelecionado,
      periodo: periodoAtual,
      criterios: criteriosAvaliacao,
      valorTotalMeta,
      valorTotalAlcancado,
      dataCriacao: avaliacaoAtual?.dataCriacao || new Date(),
      dataUltimaEdicao: new Date()
    };
    dispatch({ type: avaliacaoAtual ? 'UPDATE_AVALIACAO' : 'ADD_AVALIACAO', payload: novaAvaliacao });
    setAvaliacaoAtual(novaAvaliacao);
    toast({ title: "Avaliação salva com sucesso." });
  };
  
  const converterAvaliacaoParaPercentual = (avaliacao: string | number | undefined): number => {
    if (typeof avaliacao === 'number') return avaliacao;
    if (typeof avaliacao !== 'string') return 0;
    const avaliacaoLimpa = avaliacao.trim().toLowerCase();
    if (avaliacaoLimpa.includes('timo') || avaliacaoLimpa.includes('excelente')) return 100.0;
    if (avaliacaoLimpa.includes('regular') || avaliacaoLimpa.includes('bom')) return 75.0;
    if (avaliacaoLimpa.includes('insatisfatorio')) return 50.0;
    return 0;
  };

  const processarImportacao = (dadosImportados: DadosImportacao[], tipo: '360' | 'gerencia') => {
      const updatedEvaluations: Avaliacao[] = [];
      dadosImportados.forEach(dados => {
        const operador = state.operadores.find(op => op.nome.toLowerCase() === dados.nome_operador.toLowerCase());
        if (!operador) {
            toast({ title: "Operador não encontrado", description: `"${dados.nome_operador}" não foi localizado.`, variant: "destructive" });
            return;
        }

        const periodoDaAvaliacao = tipo === 'gerencia' ? periodoAtual : dados.periodo;
        if(!periodoDaAvaliacao) {
            toast({ title: "Período não definido", description: `O período para "${dados.nome_operador}" não foi encontrado.`, variant: "destructive" });
            return;
        }

        const avaliacaoExistente = state.avaliacoes.find(av => av.operadorId === operador.id && av.periodo === periodoDaAvaliacao);
        
        const novosCriterios = state.criterios.filter(c => c.ativo).map(criterio => {
            const criterioExistente = avaliacaoExistente?.criterios.find(ca => ca.criterioId === criterio.id);
            let valorAlcancado = criterioExistente?.valorAlcancado ?? 0;

            const criterioIdPrefix = criterio.id.split('_')[0];
            const valorImportado = dados[normalizeText(criterio.nome)];
            
            if (criterio.permiteImportacao && criterioIdPrefix === tipo && valorImportado !== undefined) {
                valorAlcancado = tipo === '360' 
                    ? converterAvaliacaoParaPercentual(valorImportado)
                    : Number(valorImportado) || 0;
            }
            
            const valorBonusAlcancado = calcularBonusAlcancado(criterio, valorAlcancado);
            const metaAtingidaStatus = metaAtingida(criterio, valorAlcancado);

            return { criterioId: criterio.id, valorAlcancado, valorBonusAlcancado, metaAtingida: metaAtingidaStatus };
        });
        
        const { valorTotalMeta, valorTotalAlcancado } = calcularTotaisAvaliacao(state.criterios.filter(c => c.ativo), novosCriterios);
        const avaliacao: Avaliacao = {
            id: avaliacaoExistente?.id || gerarId(),
            operadorId: operador.id,
            periodo: periodoDaAvaliacao,
            criterios: novosCriterios,
            valorTotalMeta,
            valorTotalAlcancado,
            dataCriacao: avaliacaoExistente?.dataCriacao || new Date(),
            dataUltimaEdicao: new Date(),
        };
        dispatch({ type: avaliacaoExistente ? 'UPDATE_AVALIACAO' : 'ADD_AVALIACAO', payload: avaliacao });
        updatedEvaluations.push(avaliacao);
      });
      
      const currentOperatorEvaluation = updatedEvaluations.find(
          (ev) => ev.operadorId === operadorSelecionado && ev.periodo === periodoAtual
      );
      if (currentOperatorEvaluation) {
          setCriteriosAvaliacao(currentOperatorEvaluation.criterios);
          setAvaliacaoAtual(currentOperatorEvaluation);
      }
      
      toast({ title: `Importação (${tipo}) processada!`, description: "As avaliações foram atualizadas. Os dados já devem estar visíveis na tela." });
  };

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
              onUpdateCriterio={atualizarCriterio}
              isEditable={true}
          />
          <Card className="shadow-medium">
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Ações da Avaliação</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                  <Button onClick={salvarAvaliacao} className="flex-1 min-w-[200px]"><Save className="h-4 w-4 mr-2" />Salvar Avaliação</Button>
                  
                  <ImportDialog onImport={processarImportacao} importType="360" periodoAtual={periodoAtual}>
                      <Button variant="secondary" className="flex-1 min-w-[200px]"><Upload className="h-4 w-4 mr-2" />Importar Avaliação 360</Button>
                  </ImportDialog>

                  <ImportDialog onImport={processarImportacao} importType="gerencia" periodoAtual={periodoAtual}>
                      <Button variant="secondary" className="flex-1 min-w-[200px]"><Upload className="h-4 w-4 mr-2" />Importar Dados da Gerência</Button>
                  </ImportDialog>

                  {avaliacaoAtual && operadorAtual && (
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