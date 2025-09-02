import React, { useState, useMemo } from 'react';
import { useEvaluation } from '../contexts/EvaluationContext';
import { useAuth } from '../contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Criterio, Avaliacao, CriterioAvaliacao, valoresNivel } from '@/types/evaluation';
import { createAvaliacao } from '../services/evaluationService';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Check, Eye, EyeOff } from 'lucide-react';

export function EvaluateOperators() {
  const { state, dispatch } = useEvaluation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [evaluationValues, setEvaluationValues] = useState<{ [key: string]: number }>({});
  const [isNameBlurred, setIsNameBlurred] = useState<boolean>(true); // Start blurred

  const avaliadorId = user?.id || null;

  const activeOperators = state.operadores.filter(op => op.ativo && op.participaAvaliacao);
  
  const currentPeriod = new Date().getFullYear().toString() + '-' + (new Date().getMonth() + 1).toString().padStart(2, '0');

  const evaluationsByCurrentUser = state.avaliacoes.filter(
    (avaliacao) => avaliadorId !== null && avaliacao.avaliadorId === avaliadorId && avaliacao.periodo === currentPeriod
  );

  const hasEvaluated = (operatorId: number) => {
    return evaluationsByCurrentUser.some(evalu => evalu.operadorId === operatorId);
  };

  const handleEvaluationChange = (criterioId: string, value: string) => {
    setEvaluationValues(prev => ({
      ...prev,
      [criterioId]: parseFloat(value) || 0,
    }));
  };

  const handleOperatorSelect = (operatorId: string) => {
    setSelectedOperatorId(operatorId);
    const initialValues: { [key: string]: number } = {};
    filteredCriterios.forEach(criterio => {
      if (criterio.tipo === 'quantitativo') {
        initialValues[criterio.id.toString()] = 0;
      }
    });
    setEvaluationValues(initialValues);
  };

  const filteredCriterios = useMemo(() => {
    return state.criterios.filter(criterio => {
      if (user?.grupo === 6) {
        return true; // Manager sees all criteria
      }
      return !criterio.nome.endsWith('(Gerência)');
    });
  }, [state.criterios, user?.grupo]);

  const isAllCriteriaEvaluated = useMemo(() => {
    const evaluatedCriterias = Object.keys(evaluationValues);
    return filteredCriterios.length === evaluatedCriterias.length;
  }, [filteredCriterios, evaluationValues]);

  const handleSubmitEvaluation = async () => {
    if (!avaliadorId) {
      toast({
        title: "Erro",
        description: "Nenhum avaliador logado. Por favor, faça login.",
        variant: "destructive",
      });
      return;
    }

    const loggedInUserEmail = user?.login;
    const isUserRegisteredOperator = state.operadores.some(
      (op) => op.login === loggedInUserEmail
    );

    if (!isUserRegisteredOperator) {
      toast({
        title: "Erro",
        description: "Seu usuário não está cadastrado como operador para realizar avaliações.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedOperatorId) {
      toast({
        title: "Erro",
        description: "Selecione o operador a ser avaliado.",
        variant: "destructive",
      });
      return;
    }
    
    const selectedOperator = state.operadores.find(op => op.id === parseInt(selectedOperatorId, 10));
    if (!selectedOperator) {
      toast({
        title: "Erro",
        description: "Operador selecionado não encontrado.",
        variant: "destructive",
      });
      return;
    }

    if (avaliadorId === parseInt(selectedOperatorId, 10)) {
      // Check if the operator participates in evaluation to allow self-evaluation
      if (!selectedOperator.participaAvaliacao) {
        toast({
          title: "Erro",
          description: "Um operador não pode avaliar a si mesmo, a menos que participe da avaliação.",
          variant: "destructive",
        });
        return;
      }
    }

    const criteriosAvaliacao: CriterioAvaliacao[] = filteredCriterios.map(criterio => {
      const valorAlcancado = evaluationValues[criterio.id.toString()] || 0;
      
      let metaParaComparacao: number;
      if (criterio.tipo === 'quantitativo') {
        metaParaComparacao = criterio.valorMeta;
      } else { // qualitativo
        metaParaComparacao = criterio.tipoMeta === 'maior_melhor' ? 100 : 25;
      }

      const metaAtingida = criterio.tipoMeta === 'maior_melhor'
        ? valorAlcancado >= metaParaComparacao
        : valorAlcancado <= metaParaComparacao;

      const valorBonusAlcancado = 0; // Removido criterio.valorBonus

      return {
        criterioId: criterio.id,
        valorAlcancado,
        valorBonusAlcancado,
        metaAtingida,
      };
    });

    const totalMeta = filteredCriterios.reduce((sum, c) => {
      if (c.tipo === 'quantitativo') {
        return sum + c.valorMeta;
      }
      return sum;
    }, 0);
    const totalAlcancado = criteriosAvaliacao.reduce((sum, ca) => sum + ca.valorAlcancado, 0);

    const newEvaluation: Avaliacao = {
      id: Date.now(),
      operadorId: parseInt(selectedOperatorId, 10),
      avaliadorId: avaliadorId,
      periodo: currentPeriod,
      criterios: criteriosAvaliacao,
      valorTotalMeta: totalMeta,
      valorTotalAlcancado: totalAlcancado,
      dataCriacao: new Date(),
      dataUltimaEdicao: new Date(),
    };

    console.log("Submitting evaluation with:", { avaliadorId, userLogin: user?.login });

    try {
      const response = await createAvaliacao({
        operadorId: parseInt(selectedOperatorId, 10),
        avaliadorId: avaliadorId,
        periodo: currentPeriod,
        criterios: criteriosAvaliacao.map(c => ({
          criterioId: c.criterioId,
          valorAlcancado: (c.valorAlcancado || 0).toFixed(2),
          valorBonusAlcancado: (c.valorBonusAlcancado || 0).toFixed(2),
        })),
      });

      if (response.success) {
        // Assuming the backend returns the full evaluation object, or we reconstruct it
        const createdEvaluation: Avaliacao = {
          ...newEvaluation, // Use the locally constructed evaluation for now
          id: response.data.id, // Use the ID from the backend
        };
        dispatch({ type: 'ADD_AVALIACAO', payload: createdEvaluation });

        toast({
          title: "Avaliação Registrada",
          description: `Avaliação de ${user?.nome} para ${state.operadores.find(op => op.id === parseInt(selectedOperatorId, 10))?.nome} registrada com sucesso.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Erro ao Registrar Avaliação",
          description: response.message || "Ocorreu um erro desconhecido.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao registrar avaliação:", error);
      toast({
        title: "Erro ao Registrar Avaliação",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao tentar registrar a avaliação.",
        variant: "destructive",
      });
    }

    window.scrollTo(0, 0); // Scroll to top of the page

    setSelectedOperatorId(null);
    setEvaluationValues({});

    const currentOperatorIndex = activeOperators.findIndex(op => op.id === parseInt(selectedOperatorId, 10));
    const nextOperatorIndex = currentOperatorIndex + 1;

    if (nextOperatorIndex < activeOperators.length) {
      setSelectedOperatorId(activeOperators[nextOperatorIndex].id.toString());
    } else {
      setSelectedOperatorId(null);
    }
    setEvaluationValues({});
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Avaliar Operadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <label htmlFor="operator-select" className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o Operador a ser Avaliado:
            </label>
            <Select
              onValueChange={handleOperatorSelect}
              value={selectedOperatorId || ''}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um operador" />
              </SelectTrigger>
              <SelectContent>
                {activeOperators.map(operator => (
                  <SelectItem key={operator.id} value={operator.id.toString()} disabled={hasEvaluated(operator.id)} className={`${operator.participaAvaliacao ? '' : ''}`}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{operator.nome}</span>
                      {hasEvaluated(operator.id) && (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {user && selectedOperatorId && (avaliadorId !== parseInt(selectedOperatorId, 10)) && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                Critérios de Avaliação para
                <span className={`ml-2 ${isNameBlurred ? 'blur-sm' : ''}`}>
                  {state.operadores.find(op => op.id === parseInt(selectedOperatorId, 10))?.nome}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsNameBlurred(!isNameBlurred)}
                  className="ml-2"
                >
                  {isNameBlurred ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </h3>
              {filteredCriterios.map(criterio => (
                <div key={criterio.id} className="flex items-center justify-between p-3 border rounded-md gap-4">
                  <div className="flex-1">
                    <span className="font-medium break-words">
                      {criterio.nome}
                      {criterio.tipo === 'quantitativo' && criterio.nome === 'Quantitativo (Gerência)' && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          (Meta: {criterio.valorMeta} tickets)
                        </span>
                      )}
                    </span>
                  </div>
                  {criterio.tipo === 'qualitativo' ? (
                    <RadioGroup
                      onValueChange={(value) => handleEvaluationChange(criterio.id.toString(), value)}
                      value={evaluationValues[criterio.id.toString()]?.toString() || ''}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="25" id={`r1-${criterio.id}`} />
                        <label htmlFor={`r1-${criterio.id}`}>1 Nunca</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="50" id={`r2-${criterio.id}`} />
                        <label htmlFor={`r2-${criterio.id}`}>2 Às Vezes</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="75" id={`r3-${criterio.id}`} />
                        <label htmlFor={`r3-${criterio.id}`}>3 Frequentemente</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="100" id={`r4-${criterio.id}`} />
                        <label htmlFor={`r4-${criterio.id}`}>4 Sempre</label>
                      </div>
                    </RadioGroup>
                  ) : (
                    <Input
                      type="number"
                      value={evaluationValues[criterio.id.toString()]?.toString() || ''}
                      onChange={(e) => handleEvaluationChange(criterio.id.toString(), e.target.value)}
                      placeholder={criterio.id.toString() === 'gerencia_quantitativo' ? 'Tickets atendidos' : 'Valor alcançado'}
                      className="w-32 text-center"
                      min="0"
                    />
                  )}
                </div>
              ))}
              <Button onClick={handleSubmitEvaluation} className="w-full mt-6" disabled={!isAllCriteriaEvaluated}>
                Registrar Avaliação
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}