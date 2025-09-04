import React, { useState, useMemo, useEffect } from 'react';
import { useEvaluation } from '../contexts/EvaluationContext';
import { useAuth } from '../contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Criterio, valoresNivel, NivelOperador } from '@/types/evaluation';
import { createBulkEvaluations } from '../services/evaluationService';
import { calcularValorAlcancadoFinal } from '../utils/calculations';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2 } from 'lucide-react'; // Import check icon

export function EvaluateOperators() {
  const { state, dispatch } = useEvaluation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(null);
  const [evaluationValues, setEvaluationValues] = useState<{ [operatorId: string]: number | string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loggedInOperatorAsEvaluator = useMemo(() => {
    if (!user?.login) return null;
    return state.operadores.find(op => op.login === user.login) || null;
  }, [state.operadores, user?.login]);

  const avaliadorId = loggedInOperatorAsEvaluator?.id || null;

  const activeOperators = state.operadores.filter(op => op.ativo && op.participaAvaliacao);
  const currentPeriod = new Date().getFullYear().toString() + '-' + (new Date().getMonth() + 1).toString().padStart(2, '0');

  const filteredCriterios = useMemo(() => {
    return state.criterios.filter(criterio => {
      if (user?.grupo === 6) {
        return true; // Manager sees all criteria
      }
      return criterio.idCriterio !== 1;
    });
  }, [state.criterios, user?.grupo]);

  const totalPeso = useMemo(() => {
    return state.criterios
      .filter(c => c.ativo)
      .reduce((sum, criterio) => sum + (criterio.peso || 0), 0);
  }, [state.criterios]);

  // New: Memoize the set of evaluated criteria IDs for the current user
  const evaluatedCriteriaIds = useMemo(() => {
    if (!avaliadorId) return new Set<number>();
    const ids = new Set<number>();
    state.avaliacoes.forEach(avaliacao => {
      if (avaliacao.avaliadorId === avaliadorId) {
        avaliacao.criterios.forEach(c => ids.add(c.criterioId));
      }
    });
    return ids;
  }, [state.avaliacoes, avaliadorId]);

  // New: Effect to select the first unevaluated criterion on load
  useEffect(() => {
    const firstUnevaluated = filteredCriterios.find(c => !evaluatedCriteriaIds.has(c.id));
    if (firstUnevaluated) {
      setSelectedCriterionId(firstUnevaluated.id.toString());
    } else if (filteredCriterios.length > 0) {
      setSelectedCriterionId(filteredCriterios[0].id.toString());
    }
  }, [filteredCriterios, evaluatedCriteriaIds]);


  const selectedCriterion = useMemo(() => {
    if (!selectedCriterionId) return null;
    return state.criterios.find(c => c.id.toString() === selectedCriterionId) || null;
  }, [selectedCriterionId, state.criterios]);

  const handleCriterionSelect = (criterionId: string) => {
    setSelectedCriterionId(criterionId);
    setEvaluationValues({}); // Reset values when changing criterion
  };

  const handleEvaluationChange = (operatorId: string, value: string) => {
    const numericValue = selectedCriterion?.tipo === 'qualitativo' ? parseInt(value, 10) : parseFloat(value);
    setEvaluationValues(prev => ({
      ...prev,
      [operatorId]: isNaN(numericValue) ? '' : numericValue,
    }));
  };

  const handleSaveAndNext = async () => {
    if (!avaliadorId || !selectedCriterionId || !selectedCriterion) {
      toast({ title: "Erro", description: "Avaliador não encontrado ou dados de avaliação insuficientes.", variant: "destructive" });
      return;
    }

    if (!user?.login) {
      toast({ title: "Erro", description: "Email do usuário logado não disponível.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const evaluationData = Object.entries(evaluationValues)
      .filter(([, valorAlcancadoInput]) => valorAlcancadoInput !== '' && valorAlcancadoInput !== null)
      .map(([operadorId, valorAlcancadoInput]) => {
        const operator = state.operadores.find(op => op.id.toString() === operadorId);
        if (!operator) return null;

        const potentialBonus = totalPeso > 0
          ? (selectedCriterion.peso / totalPeso) * valoresNivel[operator.nivel]
          : 0;
        
        const calculatedValorBonus = calcularValorAlcancadoFinal(
          selectedCriterion,
          Number(valorAlcancadoInput),
          potentialBonus
        );

        return {
          operadorId: parseInt(operadorId, 10),
          avaliadorId: avaliadorId,
          periodo: currentPeriod,
          valorMeta: String(selectedCriterion.valorMeta),
          inputValue: String(valorAlcancadoInput),
          potentialBonus: potentialBonus,
          bonusValue: calculatedValorBonus,
        };
      })
      .filter(Boolean);

    if (evaluationData.length === 0) {
        toast({ title: "Atenção", description: "Nenhuma avaliação foi preenchida para este critério.", variant: "default" });
        setIsSubmitting(false);
        goToNextCriterion();
        return;
    }

    const avaliacoesParaApi = evaluationData.map(data => ({
      operadorId: data.operadorId,
      periodo: data.periodo,
      valorObjetivo: String(data.potentialBonus.toFixed(2)), 
      valorAlcancado: String(data.bonusValue.toFixed(2)),
      metaObjetivo: Number(data.valorMeta), 
      metaAlcancada: Number(data.inputValue),
    }));

    const avaliacoesParaDispatch = evaluationData.map(data => ({
      operadorId: data.operadorId,
      avaliadorId: data.avaliadorId,
      periodo: data.periodo,
      valorAlcancado: data.inputValue,
      valorBonusAlcancado: String(data.bonusValue.toFixed(2)),
    }));

    try {
      const payload = {
        criterioId: parseInt(selectedCriterionId, 10),
        avaliadorId: avaliadorId,
        avaliacoes: avaliacoesParaApi,
      };
      console.log("Enviando payload para API (corrigido):", JSON.stringify(payload, null, 2));

      const response = await createBulkEvaluations(payload);

      if (response.success) {
        toast({ title: "Sucesso!", description: `Avaliações para o critério "${selectedCriterion.nome}" foram salvas.` });
        dispatch({ type: 'ADD_AVALIACAO_BULK', payload: { criterioId: selectedCriterion.id, avaliacoes: avaliacoesParaDispatch } });
        goToNextCriterion();
      } else {
        toast({ title: "Erro", description: response.message || "Falha ao salvar avaliações.", variant: "destructive" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      toast({ title: "Erro de Rede", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Updated: Go to the next *unevaluated* criterion
  const goToNextCriterion = () => {
    const unevaluatedCriterios = filteredCriterios.filter(c => !evaluatedCriteriaIds.has(c.id));
    const currentInUnevaluatedIndex = unevaluatedCriterios.findIndex(c => c.id.toString() === selectedCriterionId);
    
    const nextIndex = currentInUnevaluatedIndex + 1;

    if (nextIndex < unevaluatedCriterios.length) {
      setSelectedCriterionId(unevaluatedCriterios[nextIndex].id.toString());
      setEvaluationValues({});
      window.scrollTo(0, 0);
    } else {
      toast({ title: "Fim das Avaliações", description: "Todos os critérios foram avaliados." });
      setSelectedCriterionId(null); // Or the last one, to show it's completed
    }
  };

  const allOperatorsEvaluated = activeOperators.length === Object.keys(evaluationValues).length;
  const isCurrentCriterionEvaluated = selectedCriterionId ? evaluatedCriteriaIds.has(parseInt(selectedCriterionId, 10)) : false;

  return (
    <div className="container mx-auto p-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Avaliar por Critério</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <label htmlFor="criterion-select" className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o Critério de Avaliação:
            </label>
            <Select onValueChange={handleCriterionSelect} value={selectedCriterionId || ''}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um critério" />
              </SelectTrigger>
              <SelectContent>
                {filteredCriterios.map(criterio => {
                  const isEvaluated = evaluatedCriteriaIds.has(criterio.id);
                  return (
                    <SelectItem key={criterio.id} value={criterio.id.toString()} disabled={isEvaluated}>
                      <div className="flex items-center justify-between w-full">
                        <span>{criterio.nome}</span>
                        {isEvaluated && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedCriterion && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">
                Avaliando Operadores para: <span className="font-bold">{selectedCriterion.nome}</span>
              </h3>
              {isCurrentCriterionEvaluated && (
                <div className="text-center text-green-600 font-semibold bg-green-50 p-3 rounded-md">
                  Este critério já foi avaliado.
                </div>
              )}
              {activeOperators.map(operator => (
                <div key={operator.id} className="flex items-center justify-between p-3 border rounded-md gap-4">
                  <div className="flex-1">
                    <span className="font-medium break-words">{operator.nome}</span>
                  </div>
                  {selectedCriterion.tipo === 'qualitativo' ? (
                    <RadioGroup
                      onValueChange={(value) => handleEvaluationChange(operator.id.toString(), value)}
                      value={evaluationValues[operator.id.toString()]?.toString() || ''}
                      className="flex gap-4"
                      disabled={isCurrentCriterionEvaluated}
                    >
                      <div className="flex items-center space-x-2"><RadioGroupItem value="25" id={`op-${operator.id}-r1`} /><label htmlFor={`op-${operator.id}-r1`}>1 Nunca</label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="50" id={`op-${operator.id}-r2`} /><label htmlFor={`op-${operator.id}-r2`}>2 Às Vezes</label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="75" id={`op-${operator.id}-r3`} /><label htmlFor={`op-${operator.id}-r3`}>3 Frequentemente</label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="100" id={`op-${operator.id}-r4`} /><label htmlFor={`op-${operator.id}-r4`}>4 Sempre</label></div>
                    </RadioGroup>
                  ) : (
                    <Input
                      type="number"
                      value={evaluationValues[operator.id.toString()]?.toString() || ''}
                      onChange={(e) => handleEvaluationChange(operator.id.toString(), e.target.value)}
                      placeholder={`Valor para ${selectedCriterion.nome}`}
                      className="w-40 text-center"
                      min="0"
                      disabled={isCurrentCriterionEvaluated}
                    />
                  )}
                </div>
              ))}
              <Button 
                onClick={handleSaveAndNext} 
                className="w-full mt-6" 
                disabled={isSubmitting || !allOperatorsEvaluated || isCurrentCriterionEvaluated}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar e Ir para Próximo Critério'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
