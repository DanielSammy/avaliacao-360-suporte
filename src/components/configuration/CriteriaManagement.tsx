import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { Criterio, NivelOperador, valoresNivel } from '@/types/evaluation';
import { formatarMoeda } from '@/utils/calculations';
import { Target, Save, RotateCcw, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function CriteriaManagement() {
  const { state, dispatch } = useEvaluation();
  const [editedCriteria, setEditedCriteria] = useState<{ [key: number]: Criterio }>({});
  const [newCriterionName, setNewCriterionName] = useState<string>('');
  const [totalTeamTickets, setTotalTeamTickets] = useState<number>(state.totalTeamTickets);
  const { toast } = useToast();

  useEffect(() => {
    setTotalTeamTickets(state.totalTeamTickets);
  }, [state.totalTeamTickets]);

  useEffect(() => {
    const quantitativoGerenciaCriterio = state.criterios.find(
      (c) => c.id_criterio === 'gerencia_quantitativo' && c.tipo === 'quantitativo'
    );

    if (quantitativoGerenciaCriterio) {
      const activeOperatorsCount = state.operadores.filter(
        (op) => op.participaAvaliacao
      ).length;

      let newValorMeta = 0;
      if (activeOperatorsCount > 0) {
        newValorMeta = Math.round((state.totalTeamTickets / activeOperatorsCount) * 0.80);
      }

      if (newValorMeta !== (quantitativoGerenciaCriterio.valorMeta || 0)) {
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

  const activeCriteria = useMemo(() => {
    const allCriteria = state.criterios.map(c => editedCriteria[c.id] || c);
    return allCriteria.filter(c => c.ativo);
  }, [state.criterios, editedCriteria]);

  const totalPeso = useMemo(() => {
    return activeCriteria.reduce((sum, criterio) => sum + (criterio.peso || 0), 0);
  }, [activeCriteria]);

  const addNewCriterion = () => {
    if (!newCriterionName.trim()) {
      toast({ title: "Erro", description: "O nome do critério não pode ser vazio.", variant: "destructive" });
      return;
    }

    const newId = Date.now();
    const newCriterion: Criterio = {
      id: newId,
      id_criterio: `criterio-${newId}`,
      nome: newCriterionName.trim(),
      tipoMeta: 'maior_melhor',
      valorMeta: 100,
      peso: 1,
      ordem: state.criterios.length + 1,
      ativo: true,
      tipo: 'qualitativo',
    };

    dispatch({ type: 'ADD_CRITERIO', payload: newCriterion });
    setNewCriterionName('');
    toast({ title: "Critério adicionado", description: `"${newCriterion.nome}" foi adicionado.` });
  };

  const updateCriterio = (criterioId: number, updates: Partial<Criterio>) => {
    const criterioOriginal = state.criterios.find(c => c.id === criterioId);
    if (!criterioOriginal) return;

    const criterioAtualizado = { ...getCriterio(criterioId), ...updates };
    setEditedCriteria(prev => ({ ...prev, [criterioId]: criterioAtualizado }));
  };

  const hasChanges = (criterioId: number) => criterioId in editedCriteria;

  const getCriterio = (criterioId: number): Criterio => {
    return editedCriteria[criterioId] || state.criterios.find(c => c.id === criterioId)!;
  };

  const salvarCriterio = (criterioId: number) => {
    const criterioAtualizado = editedCriteria[criterioId];
    if (!criterioAtualizado) return;

    if (criterioAtualizado.tipo === 'qualitativo' && (criterioAtualizado.valorMeta < 0 || criterioAtualizado.valorMeta > 100 || !Number.isInteger(criterioAtualizado.valorMeta))) {
      toast({ title: "Erro", description: "O valor da meta deve ser um número inteiro entre 0 e 100.", variant: "destructive" });
      return;
    }

    if (criterioAtualizado.peso < 1 || criterioAtualizado.peso > 5 || !Number.isInteger(criterioAtualizado.peso)) {
      toast({ title: "Erro", description: "O peso deve ser um número inteiro entre 1 e 5.", variant: "destructive" });
      return;
    }

    dispatch({ type: 'UPDATE_CRITERIO', payload: criterioAtualizado });

    const newEditedCriteria = { ...editedCriteria };
    delete newEditedCriteria[criterioId];
    setEditedCriteria(newEditedCriteria);

    toast({ title: "Critério atualizado", description: `${criterioAtualizado.nome} foi atualizado.` });
  };

  const resetarCriterio = (criterioId: number) => {
    const newEditedCriteria = { ...editedCriteria };
    delete newEditedCriteria[criterioId];
    setEditedCriteria(newEditedCriteria);
  };

  const salvarTodos = () => {
    let hasErrors = false;
    Object.values(editedCriteria).forEach(criterio => {
        if (criterio.tipo === 'qualitativo' && (criterio.valorMeta < 0 || criterio.valorMeta > 100 || !Number.isInteger(criterio.valorMeta))) {
            toast({ title: "Erro em um critério", description: `O valor da meta para "${criterio.nome}" é inválido.`, variant: "destructive" });
            hasErrors = true;
            return;
        }
        if (criterio.peso < 1 || criterio.peso > 5 || !Number.isInteger(criterio.peso)) {
            toast({ title: "Erro em um critério", description: `O peso para "${criterio.nome}" é inválido.`, variant: "destructive" });
            hasErrors = true;
            return;
        }
        dispatch({ type: 'UPDATE_CRITERIO', payload: criterio });
    });

    if (hasErrors) {
        toast({ title: "Erro", description: "Verifique os erros nos critérios antes de salvar tudo.", variant: "destructive" });
        return;
    }

    setEditedCriteria({});
    toast({ title: "Critérios atualizados", description: "Todas as alterações foram salvas." });
  };

  const resetarTodos = () => setEditedCriteria({});

  const totalChanges = Object.keys(editedCriteria).length;
  const niveis = Object.keys(valoresNivel) as NivelOperador[];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Configuração de Tickets Card */}
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
          <CardHeader className="bg-gradient-card">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Gerenciar Critérios de Avaliação
              </div>
              {totalChanges > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetarTodos}><RotateCcw className="h-4 w-4 mr-2" />Descartar ({totalChanges})</Button>
                  <Button onClick={salvarTodos}><Save className="h-4 w-4 mr-2" />Salvar Tudo ({totalChanges})</Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold w-1/4">Critério</th>
                    <th className="text-center p-4 font-semibold">Status</th> {/* Moved Status to here */}
                    <th className="text-center p-4 font-semibold">Tipo</th>
                    <th className="text-center p-4 font-semibold">Tipo de Meta</th>
                    <th className="text-center p-4 font-semibold">Valor da Meta</th>
                    <th className="text-center p-4 font-semibold">Peso</th>
                    {niveis.map(nivel => (
                      <th key={nivel} className="text-center p-4 font-semibold">
                        Valor ({nivel})
                      </th>
                    ))}
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
                        <tr key={criterio.id} className={`border-b hover:bg-muted/30 transition-colors ${hasChangesForCriterio ? 'bg-blue-100' : ''}`}>
                          <td className="p-4">
                            <Input
                              value={criterio.nome}
                              onChange={(e) => updateCriterio(criterio.id, { nome: e.target.value })}
                              className="font-medium"
                            />
                          </td>
                          <td className="p-4 text-center"> {/* Moved Status to here */}
                            <Switch checked={criterio.ativo} onCheckedChange={(c) => updateCriterio(criterio.id, { ativo: c })} />
                          </td>
                          <td className="p-4 text-center">
                            <Select value={criterio.tipo} onValueChange={(v: 'qualitativo' | 'quantitativo') => updateCriterio(criterio.id, { tipo: v })}>
                              <SelectTrigger className="w-32 mx-auto"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="qualitativo">Qualitativo</SelectItem>
                                <SelectItem value="quantitativo">Quantitativo</SelectItem>
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
                              disabled={criterio.tipo === 'quantitativo' && criterio.id_criterio === 'gerencia_quantitativo'}
                            />
                          </td>
                          <td className="p-4 text-center">
                            <Input
                              type="number"
                              value={criterio.peso}
                              onChange={(e) => updateCriterio(criterio.id, { peso: parseInt(e.target.value) || 0 })}
                              className="w-20 text-center mx-auto"
                              step="1" min="1" max="5"
                            />
                          </td>
                          {niveis.map(nivel => {
                            const valorCalculado = totalPeso > 0 ? (criterio.peso / totalPeso) * valoresNivel[nivel] : 0;
                            return (
                              <td key={nivel} className="p-4 text-center font-mono text-sm">
                                {formatarMoeda(valorCalculado)}
                              </td>
                            );
                          })}
                          <td className="p-4 text-center">
                            {hasChangesForCriterio && (
                              <div className="flex gap-2 justify-center">
                                <Button variant="outline" size="sm" onClick={() => resetarCriterio(criterio.id)}><RotateCcw className="h-3 w-3" /></Button>
                                <Button size="sm" onClick={() => salvarCriterio(criterio.id)}><Save className="h-3 w-3" /></Button>
                              </div>
                            )}
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
            <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Resumo de Bônus por Nível (Baseado nos Critérios Ativos)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid grid-cols-1 md:grid-cols-${niveis.length} gap-4`}>
                {niveis.map(nivel => (
                    <div key={nivel} className="text-center p-4 rounded-lg bg-muted/50">
                        <div className="text-lg font-semibold text-primary">{nivel}</div>
                        <div className="text-2xl font-bold text-foreground">
                            {formatarMoeda(valoresNivel[nivel])}
                        </div>
                        <div className="text-sm text-muted-foreground">Bônus Total Potencial</div>
                    </div>
                ))}
            </div>
            {totalPeso === 0 && <p className="text-center text-destructive mt-4">A soma dos pesos dos critérios ativos é zero. Os valores de bônus não podem ser calculados.</p>}
          </CardContent>
        </Card>

        <Card className="shadow-medium">
          <CardHeader><CardTitle>Adicionar Novo Critério</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Input
              placeholder="Nome do novo critério"
              value={newCriterionName}
              onChange={(e) => setNewCriterionName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addNewCriterion()}
            />
            <Button onClick={addNewCriterion}>Adicionar</Button>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}