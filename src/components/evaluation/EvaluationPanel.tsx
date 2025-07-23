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
import { Save, Upload, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  // Carrega a avaliação existente quando o operador ou período mudam
  useEffect(() => {
    if (operadorSelecionado && periodoAtual) {
      const avaliacaoExistente = state.avaliacoes.find(
        av => av.operadorId === operadorSelecionado && av.periodo === periodoAtual
      );

      if (avaliacaoExistente) {
        setCriteriosAvaliacao(avaliacaoExistente.criterios);
        setAvaliacaoAtual(avaliacaoExistente);
      } else {
        // Criar nova avaliação
        const novosCriterios = state.criterios
          .filter(c => c.ativo)
          .map(criterio => ({
            criterioId: criterio.id,
            valorAlcancado: 0,
            valorBonusAlcancado: 0,
            metaAtingida: false
          }));
        
        setCriteriosAvaliacao(novosCriterios);
        setAvaliacaoAtual(null);
      }
    }
  }, [operadorSelecionado, periodoAtual, state.avaliacoes, state.criterios]);

  // Recalcula os valores quando os critérios de avaliação mudam
  useEffect(() => {
    const criteriosAtualizados = criteriosAvaliacao.map(ca => {
      const criterio = state.criterios.find(c => c.id === ca.criterioId);
      if (!criterio) return ca;

      const valorBonusAlcancado = calcularBonusAlcancado(criterio, ca.valorAlcancado);
      const metaAtingidaStatus = metaAtingida(criterio, ca.valorAlcancado);

      return {
        ...ca,
        valorBonusAlcancado,
        metaAtingida: metaAtingidaStatus
      };
    });

    setCriteriosAvaliacao(criteriosAtualizados);
  }, [state.criterios]);

  const atualizarCriterio = (criterioId: string, valor: number) => {
    setCriteriosAvaliacao(prev => 
      prev.map(ca => {
        if (ca.criterioId === criterioId) {
          const criterio = state.criterios.find(c => c.id === criterioId);
          if (!criterio) return ca;

          const valorBonusAlcancado = calcularBonusAlcancado(criterio, valor);
          const metaAtingidaStatus = metaAtingida(criterio, valor);

          return {
            ...ca,
            valorAlcancado: valor,
            valorBonusAlcancado,
            metaAtingida: metaAtingidaStatus
          };
        }
        return ca;
      })
    );
  };

  const salvarAvaliacao = () => {
    if (!operadorSelecionado) {
      toast({
        title: "Erro",
        description: "Selecione um operador para salvar a avaliação.",
        variant: "destructive"
      });
      return;
    }

    const { valorTotalMeta, valorTotalAlcancado } = calcularTotaisAvaliacao(
      state.criterios.filter(c => c.ativo),
      criteriosAvaliacao
    );

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

    if (avaliacaoAtual) {
      dispatch({ type: 'UPDATE_AVALIACAO', payload: novaAvaliacao });
    } else {
      dispatch({ type: 'ADD_AVALIACAO', payload: novaAvaliacao });
    }

    setAvaliacaoAtual(novaAvaliacao);

    toast({
      title: "Avaliação salva",
      description: "A avaliação foi salva com sucesso.",
      variant: "default"
    });
  };

  const processarImportacao = (dadosImportacao: DadosImportacao[]) => {
    const avaliacoesImportadas: Avaliacao[] = [];

    dadosImportacao.forEach(dados => {
      // Encontrar operador pelo nome
      const operador = state.operadores.find(op => 
        op.nome.toLowerCase().includes(dados.nome_operador.toLowerCase()) ||
        dados.nome_operador.toLowerCase().includes(op.nome.toLowerCase())
      );

      if (!operador) {
        toast({
          title: "Operador não encontrado",
          description: `Operador "${dados.nome_operador}" não foi encontrado no sistema.`,
          variant: "destructive"
        });
        return;
      }

      // Verificar se já existe avaliação para este operador/período
      const avaliacaoExistente = state.avaliacoes.find(
        av => av.operadorId === operador.id && av.periodo === dados.periodo
      );

      // Mapear critérios
      const criteriosImportados: CriterioAvaliacao[] = [];
      
      state.criterios.forEach(criterio => {
        if (!criterio.ativo || !criterio.permiteImportacao) return;

        let valorAlcancado = 0;

        switch (criterio.nome) {
          case 'Atraso no 1º contato':
            valorAlcancado = dados.atraso_1_contato_percentual;
            break;
          case 'Preenchimento Incorreto':
            valorAlcancado = dados.preenchimento_incorreto_percentual;
            break;
          case 'Satisfação dos clientes':
            valorAlcancado = dados.satisfacao_clientes_percentual;
            break;
          case 'Solicitação de apoio indevida':
            valorAlcancado = dados.solicitacao_apoio_indevida_percentual;
            break;
          case 'Reabertura de tickets':
            valorAlcancado = dados.reabertura_tickets_percentual;
            break;
        }

        const valorBonusAlcancado = calcularBonusAlcancado(criterio, valorAlcancado);
        const metaAtingidaStatus = metaAtingida(criterio, valorAlcancado);

        criteriosImportados.push({
          criterioId: criterio.id,
          valorAlcancado,
          valorBonusAlcancado,
          metaAtingida: metaAtingidaStatus
        });
      });

      // Preservar critério "Quantitativo" se existir
      if (avaliacaoExistente) {
        const quantitativo = avaliacaoExistente.criterios.find(ca => {
          const criterio = state.criterios.find(c => c.id === ca.criterioId);
          return criterio?.nome === 'Quantitativo';
        });
        
        if (quantitativo) {
          criteriosImportados.push(quantitativo);
        }
      }

      const { valorTotalMeta, valorTotalAlcancado } = calcularTotaisAvaliacao(
        state.criterios.filter(c => c.ativo),
        criteriosImportados
      );

      const avaliacao: Avaliacao = {
        id: avaliacaoExistente?.id || gerarId(),
        operadorId: operador.id,
        periodo: dados.periodo,
        criterios: criteriosImportados,
        valorTotalMeta,
        valorTotalAlcancado,
        dataCriacao: avaliacaoExistente?.dataCriacao || new Date(),
        dataUltimaEdicao: new Date()
      };

      avaliacoesImportadas.push(avaliacao);
    });

    // Atualizar avaliações no estado
    avaliacoesImportadas.forEach(avaliacao => {
      const existe = state.avaliacoes.find(av => av.id === avaliacao.id);
      if (existe) {
        dispatch({ type: 'UPDATE_AVALIACAO', payload: avaliacao });
      } else {
        dispatch({ type: 'ADD_AVALIACAO', payload: avaliacao });
      }
    });

    // Recarregar avaliação atual se necessário
    if (operadorSelecionado && periodoAtual) {
      const avaliacaoAtualizada = avaliacoesImportadas.find(
        av => av.operadorId === operadorSelecionado && av.periodo === periodoAtual
      );
      
      if (avaliacaoAtualizada) {
        setCriteriosAvaliacao(avaliacaoAtualizada.criterios);
        setAvaliacaoAtual(avaliacaoAtualizada);
      }
    }
  };

  const { valorTotalMeta, valorTotalAlcancado } = calcularTotaisAvaliacao(
    state.criterios.filter(c => c.ativo),
    criteriosAvaliacao
  );

  const metasAtingidas = criteriosAvaliacao.filter(ca => ca.metaAtingida).length;
  const totalMetas = state.criterios.filter(c => c.ativo).length;

  const operadorAtual = state.operadores.find(op => op.id === operadorSelecionado);

  return (
    <div className="space-y-6">
      {/* Controles superiores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OperatorSelector
          operadores={state.operadores}
          operadorSelecionado={operadorSelecionado}
          onOperadorChange={setOperadorSelecionado}
          avaliacoes={state.avaliacoes}
          periodoAtual={periodoAtual}
        />
        
        <PeriodSelector
          periodoAtual={periodoAtual}
          onPeriodoChange={setPeriodoAtual}
        />
      </div>

      {/* Resumo da avaliação */}
      <EvaluationSummary
        valorTotalMeta={valorTotalMeta}
        valorTotalAlcancado={valorTotalAlcancado}
        metasAtingidas={metasAtingidas}
        totalMetas={totalMetas}
      />

      {/* Tabela de avaliação */}
      <EvaluationTable
        criterios={state.criterios}
        criteriosAvaliacao={criteriosAvaliacao}
        onUpdateCriterio={atualizarCriterio}
        isEditable={!!operadorSelecionado}
      />

      {/* Ações */}
      {operadorSelecionado && (
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Ações da Avaliação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button onClick={salvarAvaliacao} className="flex-1 min-w-[200px]">
                <Save className="h-4 w-4 mr-2" />
                Salvar Avaliação
              </Button>

              <ImportDialog onImport={processarImportacao}>
                <Button variant="secondary" className="flex-1 min-w-[200px]">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar Dados
                </Button>
              </ImportDialog>

              {avaliacaoAtual && operadorAtual && (
                <div className="flex-1 min-w-[200px]">
                  <PDFGenerator
                    avaliacao={avaliacaoAtual}
                    operador={operadorAtual}
                    criterios={state.criterios}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}