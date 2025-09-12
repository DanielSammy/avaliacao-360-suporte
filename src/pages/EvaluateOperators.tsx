import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useEvaluation } from '../contexts/EvaluationContext';
import { useAuth } from '../contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Criterio } from '@/types/evaluation';
import { createBulkEvaluations, checkCriterionEvaluated } from '../services/evaluationService';
import { calcularValorAlcancadoFinal } from '../utils/calculations';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate, Link } from 'react-router-dom';

export function EvaluateOperators() {
  const { state, dispatch } = useEvaluation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(null);
  const [evaluationValues, setEvaluationValues] = useState<{ [operatorId: string]: number | string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCriterion, setIsLoadingCriterion] = useState(true);
  const [isAllEvaluatedDialogOpen, setIsAllEvaluatedDialogOpen] = useState(false);
  const [sessionEvaluatedIds, setSessionEvaluatedIds] = useState<Set<number>>(new Set());

  const loggedInOperatorAsEvaluator = useMemo(() => {
    if (!user?.login) return null;
    return state.operadores.find(op => op.login === user.login) || null;
  }, [state.operadores, user?.login]);

  const avaliadorId = loggedInOperatorAsEvaluator?.id || null;

  const activeOperators = state.operadores.filter(op => op.ativo && op.participaAvaliacao);
  const currentPeriod = new Date().getFullYear().toString() + '-' + (new Date().getMonth() + 1).toString().padStart(2, '0');

  const filteredCriterios = useMemo(() => {
    return state.criterios.filter(criterio => {
      if (user?.grupo === 6 || user?.grupo === 7) {
        return true;
      }
      return criterio.idCriterio === 2;
    });
  }, [state.criterios, user?.grupo]);

  

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

  const allEvaluatedIds = useMemo(() => 
    new Set([...evaluatedCriteriaIds, ...sessionEvaluatedIds]), 
    [evaluatedCriteriaIds, sessionEvaluatedIds]
  );

  const findNextCriterion = useCallback((startId: string | null = null) => {
    const availableCriterios = filteredCriterios.filter(c => !allEvaluatedIds.has(c.id));
    if (availableCriterios.length === 0) return null;

    if (!startId) return availableCriterios[0];

    const currentIndex = availableCriterios.findIndex(c => c.id.toString() === startId);
    const nextIndex = currentIndex + 1;

    return nextIndex < availableCriterios.length ? availableCriterios[nextIndex] : null;
  }, [filteredCriterios, allEvaluatedIds]);


  const checkAndSetCriterion = useCallback(async (criterion: Criterio | null) => {
    if (!criterion || !avaliadorId) {
      const allAvailableEvaluated = filteredCriterios.every(c => allEvaluatedIds.has(c.id));
      if (allAvailableEvaluated && filteredCriterios.length > 0) {
        setIsAllEvaluatedDialogOpen(true);
      }
      setIsLoadingCriterion(false);
      return;
    }

    setIsLoadingCriterion(true);
    setSelectedCriterionId(criterion.id.toString());

    try {
      const response = await checkCriterionEvaluated(currentPeriod, avaliadorId, criterion.id);
      if (response.avaliado) {
        setSessionEvaluatedIds(prev => new Set(prev).add(criterion.id));
        const nextCriterion = findNextCriterion(criterion.id.toString());
        checkAndSetCriterion(nextCriterion);
      } else {
        setEvaluationValues({});
        setIsLoadingCriterion(false);
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao verificar status do critério.", variant: "destructive" });
      setIsLoadingCriterion(false);
    }
  }, [avaliadorId, currentPeriod, findNextCriterion, toast, allEvaluatedIds, filteredCriterios]);

  useEffect(() => {
    if (state.criterios.length > 0 && avaliadorId) {
      const firstUnevaluated = findNextCriterion();
      checkAndSetCriterion(firstUnevaluated);
    }
  }, [state.criterios, avaliadorId]);


  const selectedCriterion = useMemo(() => {
    if (!selectedCriterionId) return null;
    return state.criterios.find(c => c.id.toString() === selectedCriterionId) || null;
  }, [selectedCriterionId, state.criterios]);

  const handleCriterionSelect = (criterionId: string) => {
    const criterion = filteredCriterios.find(c => c.id.toString() === criterionId);
    checkAndSetCriterion(criterion || null);
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
  
          const potentialBonus = 0;
          
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
          const nextCriterion = findNextCriterion(selectedCriterionId);
          checkAndSetCriterion(nextCriterion);
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
  
        const response = await createBulkEvaluations(payload);
  
        if (response.success) {
          toast({ title: "Sucesso!", description: `Avaliações para o critério \"${selectedCriterion.nome}\" foram salvas.` });
          dispatch({ type: 'ADD_AVALIACAO_BULK', payload: { criterioId: selectedCriterion.id, avaliacoes: avaliacoesParaDispatch } });
          const nextCriterion = findNextCriterion(selectedCriterionId);
          checkAndSetCriterion(nextCriterion);
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

  const allOperatorsEvaluated = activeOperators.length === Object.keys(evaluationValues).length;
  const isCurrentCriterionEvaluated = selectedCriterionId ? allEvaluatedIds.has(parseInt(selectedCriterionId, 10)) : false;

  if (isLoadingCriterion && !selectedCriterionId) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
        <AlertDialog open={isAllEvaluatedDialogOpen} onOpenChange={setIsAllEvaluatedDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Avaliações Concluídas</AlertDialogTitle>
                    <AlertDialogDescription>
                        Todos os critérios disponíveis já foram avaliados por você.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => navigate('/')}>Voltar para o Início</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">Avaliar por Critério</CardTitle>
          {(user && (user.grupo === 6 || user.grupo === 7)) && (
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <label htmlFor="criterion-select" className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o Critério de Avaliação:
            </label>
            <Select onValueChange={handleCriterionSelect} value={selectedCriterionId || ''} disabled={isLoadingCriterion}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isLoadingCriterion ? "Verificando critérios..." : "Selecione um critério"} />
              </SelectTrigger>
              <SelectContent>
                {filteredCriterios.map(criterio => {
                  const isEvaluated = allEvaluatedIds.has(criterio.id);
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

          {isLoadingCriterion && (
            <div className="text-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="mt-2">Verificando critério...</p>
            </div>
          )}

          {!isLoadingCriterion && selectedCriterion && (
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

          {!isLoadingCriterion && !selectedCriterion && !isAllEvaluatedDialogOpen && (
             <div className="text-center p-8">
                <h3 className="text-lg font-semibold text-muted-foreground">Nenhum critério disponível para avaliação.</h3>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
