import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { Criterio } from '@/types/evaluation';
import { formatarMoeda } from '@/utils/calculations';
import { Target, TrendingUp, TrendingDown, Save, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CriteriaManagement() {
  const { state, dispatch } = useEvaluation();
  const [editedCriteria, setEditedCriteria] = useState<{ [key: string]: Criterio }>({});
  const [newCriterionName, setNewCriterionName] = useState<string>('');
  const [totalTeamTickets, setTotalTeamTickets] = useState<number>(state.totalTeamTickets);
  const { toast } = useToast();

  useEffect(() => {
    setTotalTeamTickets(state.totalTeamTickets);
  }, [state.totalTeamTickets]);

  useEffect(() => {
    const quantitativoGerenciaCriterio = state.criterios.find(
      (c) => c.id === 'gerencia_quantitativo' && c.tipo === 'quantitativo'
    );

    if (quantitativoGerenciaCriterio) {
      const activeOperatorsCount = state.operadores.filter(
        (op) => op.participaAvaliacao
      ).length;

      let newValorMeta = 0;
      if (activeOperatorsCount > 0) {
        newValorMeta = Math.round((state.totalTeamTickets / activeOperatorsCount) * 0.80);
      }

      // Only dispatch if the value has actually changed to avoid unnecessary re-renders
      if (newValorMeta !== quantitativoGerenciaCriterio.valorMeta) {
        dispatch({
          type: 'UPDATE_CRITERIO',
          payload: {
            ...quantitativoGerenciaCriterio,
            valorMeta: newValorMeta,
          },
        });
      }
    }
  }, [state.totalTeamTickets, state.operadores, state.criterios, dispatch]);

  const addNewCriterion = () => {
    if (!newCriterionName.trim()) {
      toast({
        title: "Erro",
        description: "O nome do critério não pode ser vazio.",
        variant: "destructive"
      });
      return;
    }

    const newId = `criterio-${Date.now()}`; // Simple unique ID for now
    const newCriterion: Criterio = {
      id: newId,
      nome: newCriterionName.trim(),
      tipoMeta: 'maior_melhor',
      valorMeta: 1,
      valorBonus: 0.01,
      ordem: state.criterios.length + 1, // Place at the end
      ativo: true,
      tipo: 'qualitativo',
    };

    dispatch({ type: 'ADD_CRITERIO', payload: newCriterion });
    setNewCriterionName('');
    toast({
      title: "Critério adicionado",
      description: `"${newCriterion.nome}" foi adicionado com sucesso.`,
      variant: "default"
    });
  };

  const updateCriterio = (criterioId: string, updates: Partial<Criterio>) => {
    const criterioOriginal = state.criterios.find(c => c.id === criterioId);
    if (!criterioOriginal) return;

    const criterioAtualizado = {
      ...criterioOriginal,
      ...updates
    };

    setEditedCriteria(prev => ({
      ...prev,
      [criterioId]: criterioAtualizado
    }));
  };

  const hasChanges = (criterioId: string) => {
    return criterioId in editedCriteria;
  };

  const getCriterio = (criterioId: string): Criterio => {
    return editedCriteria[criterioId] || state.criterios.find(c => c.id === criterioId)!;
  };

  const salvarCriterio = (criterioId: string) => {
    const criterioAtualizado = editedCriteria[criterioId];
    if (!criterioAtualizado) return;

    // Validações
    if (criterioAtualizado.tipo === 'qualitativo' && (criterioAtualizado.valorMeta < 0 || criterioAtualizado.valorMeta > 100 || !Number.isInteger(criterioAtualizado.valorMeta))) {
      toast({
        title: "Erro",
        description: "O valor da meta deve ser um número inteiro entre 0 e 100.",
        variant: "destructive"
      });
      return;
    }

    if (criterioAtualizado.valorBonus <= 0) {
      toast({
        title: "Erro",
        description: "O valor do bônus deve ser maior que zero.",
        variant: "destructive"
      });
      return;
    }

    dispatch({ type: 'UPDATE_CRITERIO', payload: criterioAtualizado });

    // Remove do estado de edição
    const newEditedCriteria = { ...editedCriteria };
    delete newEditedCriteria[criterioId];
    setEditedCriteria(newEditedCriteria);

    toast({
      title: "Critério atualizado",
      description: `${criterioAtualizado.nome} foi atualizado com sucesso.`,
      variant: "default"
    });
  };

  const resetarCriterio = (criterioId: string) => {
    const newEditedCriteria = { ...editedCriteria };
    delete newEditedCriteria[criterioId];
    setEditedCriteria(newEditedCriteria);
  };

  const salvarTodos = () => {
    let hasErrors = false;
    
    Object.values(editedCriteria).forEach(criterio => {
      if (criterio.tipo === 'qualitativo' && (criterio.valorMeta < 0 || criterio.valorMeta > 100 || !Number.isInteger(criterio.valorMeta))) {
        hasErrors = true;
        return;
      }
      if (criterio.valorBonus <= 0) {
        hasErrors = true;
        return;
      }
      dispatch({ type: 'UPDATE_CRITERIO', payload: criterio });
    });

    if (hasErrors) {
      toast({
        title: "Erro",
        description: "Todos os valores devem ser um número inteiro entre 0 e 100 para a meta e maior que zero para o bônus.",
        variant: "destructive"
      });
      return;
    }

    setEditedCriteria({});
    toast({
      title: "Critérios atualizados",
      description: "Todas as alterações foram salvas com sucesso.",
      variant: "default"
    });
  };

  const resetarTodos = () => {
    setEditedCriteria({});
    toast({
      title: "Alterações descartadas",
      description: "Todas as alterações foram descartadas.",
      variant: "default"
    });
  };

  const totalChanges = Object.keys(editedCriteria).length;

  return (
    <div className="space-y-6">
      <Card className="shadow-medium">
        <CardHeader className="bg-gradient-card">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Gerenciar Critérios de Avaliação
            </div>
            {totalChanges > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetarTodos}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Descartar ({totalChanges})
                </Button>
                <Button onClick={salvarTodos}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Tudo ({totalChanges})
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold">Critério</th>
                  <th className="text-center p-4 font-semibold">Tipo</th>
                  <th className="text-center p-4 font-semibold">Tipo de Meta</th>
                  <th className="text-center p-4 font-semibold">Valor da Meta</th>
                  <th className="text-center p-4 font-semibold">Valor do Bônus</th>
                  <th className="text-center p-4 font-semibold">Status</th>
                  <th className="text-center p-4 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {state.criterios
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((criterioOriginal) => {
                    const criterio = getCriterio(criterioOriginal.id);
                    const hasChangesForCriterio = hasChanges(criterioOriginal.id);
                    
                    return (
                      <tr 
                        key={criterio.id} 
                        className={`border-b hover:bg-muted/30 transition-colors ${
                          hasChangesForCriterio ? 'bg-primary-light' : ''
                        }`}
                      >
                        <td className="p-4">
                          <Input
                            value={criterio.nome}
                            onChange={(e) => updateCriterio(criterio.id, { nome: e.target.value })}
                            className="font-medium"
                          />
                          {hasChangesForCriterio && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Alterado
                            </Badge>
                          )}
                        </td>
                        
                        <td className="p-4 text-center">
                          <Select
                            value={criterio.tipo}
                            onValueChange={(value: 'qualitativo' | 'quantitativo') =>
                              updateCriterio(criterio.id, { tipo: value })
                            }
                          >
                            <SelectTrigger className="w-40 mx-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="qualitativo">
                                Qualitativo
                              </SelectItem>
                              <SelectItem value="quantitativo">
                                Quantitativo
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        
                        <td className="p-4 text-center">
                          <Select
                            value={criterio.tipoMeta}
                            onValueChange={(value: 'maior_melhor' | 'menor_melhor') =>
                              updateCriterio(criterio.id, { tipoMeta: value })
                            }
                          >
                            <SelectTrigger className="w-40 mx-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="maior_melhor">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-success" />
                                  Maior é Melhor
                                </div>
                              </SelectItem>
                              <SelectItem value="menor_melhor">
                                <div className="flex items-center gap-2">
                                  <TrendingDown className="h-4 w-4 text-warning" />
                                  Menor é Melhor
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        
                        <td className="p-4 text-center">
                          <Input
                            type="number"
                            value={criterio.valorMeta}
                            onChange={(e) => updateCriterio(criterio.id, { 
                              valorMeta: parseInt(e.target.value) || 0 
                            })}
                            className="w-24 text-center mx-auto"
                            step="1"
                            min="0"
                            max="100"
                            disabled={criterio.tipo === 'quantitativo' && criterio.id === 'gerencia_quantitativo'}
                          />
                        </td>
                        
                        <td className="p-4 text-center">
                          <Input
                            type="number"
                            value={criterio.valorBonus}
                            onChange={(e) => updateCriterio(criterio.id, { 
                              valorBonus: parseFloat(e.target.value) || 0 
                            })}
                            className="w-28 text-center mx-auto"
                            step="0.01"
                            min="0"
                          />
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatarMoeda(criterio.valorBonus)}
                          </div>
                        </td>
                        
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={criterio.ativo}
                              onCheckedChange={(checked) => 
                                updateCriterio(criterio.id, { ativo: checked })
                              }
                            />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {criterio.ativo ? 'Ativo' : 'Inativo'}
                          </div>
                        </td>
                        
                        <td className="p-4 text-center">
                          <div className="flex gap-2 justify-center">
                            {hasChangesForCriterio && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resetarCriterio(criterio.id)}
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => salvarCriterio(criterio.id)}
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Resumo dos Critérios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {state.criterios.length}
              </div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {state.criterios.filter(c => c.ativo).length}
              </div>
              <div className="text-sm text-muted-foreground">Ativos</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">
                {formatarMoeda(state.criterios.filter(c => c.ativo).reduce((total, c) => total + c.valorBonus, 0))}
              </div>
              <div className="text-sm text-muted-foreground">Bônus Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Configuração de Tickets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <label htmlFor="total-team-tickets" className="block text-sm font-medium text-gray-700 mb-2">
              Total de Tickets Atendidos pela Equipe:
            </label>
            <Input
              id="total-team-tickets"
              type="number"
              value={totalTeamTickets}
              onChange={(e) => setTotalTeamTickets(parseInt(e.target.value) || 0)}
              placeholder="Digite a quantidade total de tickets"
              min="0"
            />
          </div>
          <Button onClick={() => dispatch({ type: 'SET_TOTAL_TEAM_TICKETS', payload: totalTeamTickets })}>
            Salvar Configuração de Tickets
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Adicionar Novo Critério</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Nome do novo critério"
            value={newCriterionName}
            onChange={(e) => setNewCriterionName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addNewCriterion();
              }
            }}
          />
          <Button onClick={addNewCriterion}>Adicionar</Button>
        </CardContent>
      </Card>
    </div>
  );
}