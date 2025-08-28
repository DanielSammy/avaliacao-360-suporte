import React, { useState, useMemo } from 'react';
import { useEvaluation } from '../contexts/EvaluationContext';
import { useAuth } from '../contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Criterio, Avaliacao, CriterioAvaliacao, valoresNivel } from '@/types/evaluation';
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
  
  const quantitativeMetaValue = useMemo(() => {
    if (selectedOperatorId) {
      const selectedOperator = state.operadores.find(op => op.id === selectedOperatorId);
      if (selectedOperator) {
        return valoresNivel[selectedOperator.nivel];
      }
    }
    return null;
  }, [selectedOperatorId, state.operadores]);

  const currentPeriod = new Date().getFullYear().toString() + '-' + (new Date().getMonth() + 1).toString().padStart(2, '0');

  const evaluationsByCurrentUser = state.avaliacoes.filter(
    (avaliacao) => avaliacao.avaliadorId === avaliadorId && avaliacao.periodo === currentPeriod
  );

  const hasEvaluated = (operatorId: string) => {
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
        initialValues[criterio.id] = 0;
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

  const handleSubmitEvaluation = () => {
    if (!avaliadorId) {
      toast({
        title: "Erro",
        description: "Nenhum avaliador logado. Por favor, faça login.",
        variant: "destructive",
      });
      return;
    }

    // New validation: Check if logged-in user's email exists among registered operators
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
    
    const selectedOperator = state.operadores.find(op => op.id === selectedOperatorId);
    if (!selectedOperator) {
      toast({
        title: "Erro",
        description: "Operador selecionado não encontrado.",
        variant: "destructive",
      });
      return;
    }

    if (avaliadorId === selectedOperatorId) {
      toast({
        title: "Erro",
        description: "Um operador não pode avaliar a si mesmo.",
        variant: "destructive",
      });
      return;
    }

    const criteriosAvaliacao: CriterioAvaliacao[] = filteredCriterios.map(criterio => {
      const valorAlcancado = evaluationValues[criterio.id] || 0;
      
      let metaParaComparacao: number;
      if (criterio.tipo === 'quantitativo') {
        metaParaComparacao = quantitativeMetaValue || 0;
      } else { // qualitativo
        metaParaComparacao = criterio.tipoMeta === 'maior_melhor' ? 100 : 25;
      }

      const metaAtingida = criterio.tipoMeta === 'maior_melhor'
        ? valorAlcancado >= metaParaComparacao
        : valorAlcancado <= metaParaComparacao;

      const valorBonusAlcancado = metaAtingida ? (criterio.valorBonus || 0) : 0;

      return {
        criterioId: criterio.id,
        valorAlcancado,
        valorBonusAlcancado,
        metaAtingida,
      };
    });

    const totalMeta = filteredCriterios.reduce((sum, c) => {
      if (c.tipo === 'quantitativo') {
        return sum + (quantitativeMetaValue || 0);
      }
      // For qualitative criteria, we are not summing them into the total meta for now.
      return sum;
    }, 0);
    const totalAlcancado = criteriosAvaliacao.reduce((sum, ca) => sum + ca.valorAlcancado, 0);

    const newEvaluation: Avaliacao = {
      id: `avaliacao-${Date.now()}`,
      operadorId: selectedOperatorId,
      avaliadorId: avaliadorId,
      periodo: currentPeriod,
      criterios: criteriosAvaliacao,
      valorTotalMeta: totalMeta,
      valorTotalAlcancado: totalAlcancado,
      dataCriacao: new Date(),
      dataUltimaEdicao: new Date(),
    };

    dispatch({ type: 'ADD_AVALIACAO', payload: newEvaluation });

    toast({
      title: "Avaliação Registrada",
      description: `Avaliação de ${user?.nome} para ${state.operadores.find(op => op.id === selectedOperatorId)?.nome} registrada com sucesso.`,
      variant: "default",
    });

    setSelectedOperatorId(null);
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
                {activeOperators.filter(op => op.id !== avaliadorId).map(operator => (
                  <SelectItem key={operator.id} value={operator.id} disabled={hasEvaluated(operator.id)} className={`${operator.participaAvaliacao ? '' : ''}`}>
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

          {user && selectedOperatorId && (user.id !== selectedOperatorId) && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                Critérios de Avaliação para
                <span className={`ml-2 ${isNameBlurred ? 'blur-sm' : ''}`}>
                  {state.operadores.find(op => op.id === selectedOperatorId)?.nome}
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
                <div key={criterio.id} className="flex items-center justify-between p-3 border rounded-md">
                  <span className="font-medium">
                    {criterio.nome}
                    {criterio.tipo === 'quantitativo' && criterio.nome === 'Quantitativo (Gerência)' && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        (Meta: {quantitativeMetaValue} tickets)
                      </span>
                    )}
                  </span>
                  {criterio.tipo === 'qualitativo' ? (
                    <RadioGroup
                      onValueChange={(value) => handleEvaluationChange(criterio.id, value)}
                      value={evaluationValues[criterio.id]?.toString() || ''}
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
                      value={evaluationValues[criterio.id]?.toString() || ''}
                      onChange={(e) => handleEvaluationChange(criterio.id, e.target.value)}
                      placeholder={criterio.id === 'gerencia_quantitativo' ? 'Tickets atendidos' : 'Valor alcançado'}
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