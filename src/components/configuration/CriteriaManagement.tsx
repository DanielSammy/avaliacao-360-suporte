import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { Criterio, NivelOperador, valoresNivel } from '@/types/evaluation';
import { formatarMoeda } from '@/utils/calculations';
import { Target, Save, Trash2, Info, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createCriterio, updateCriterio, deleteCriterio } from '@/services/criteriaService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function CriteriaManagement() {
  const { state, dispatch } = useEvaluation();
  const [editedCriteria, setEditedCriteria] = useState<{ [key: number]: Partial<Criterio> }>({});
  const [newCriterionName, setNewCriterionName] = useState<string>('');
  const [totalTeamTickets, setTotalTeamTickets] = useState<number>(state.totalTeamTickets);
  const [isTicketsConfigLocked, setIsTicketsConfigLocked] = useState<boolean>(true);
  const [criterionToDelete, setCriterionToDelete] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const activeOperatorsCount = state.operadores.filter(op => op.participaAvaliacao).length;
    let calculatedValorMeta = 0;

    if (activeOperatorsCount > 0) {
      calculatedValorMeta = Math.round((totalTeamTickets / activeOperatorsCount) * 0.80);
    }

    state.criterios.forEach(criterio => {
      if (criterio.mediaGeral) { // Check the new mediaGeral flag
        // Only update if the value has actually changed to avoid unnecessary re-renders
        // Use the value from editedCriteria if it exists, otherwise use the original criterio.valorMeta
        const currentValorMeta = editedCriteria[criterio.id]?.valorMeta ?? criterio.valorMeta;
        if (currentValorMeta !== calculatedValorMeta) {
          setEditedCriteria((prev) => ({
            ...prev,
            [criterio.id]: {
              ...prev[criterio.id],
              valorMeta: calculatedValorMeta,
            },
          }));
        }
      }
    });
  }, [totalTeamTickets, state.criterios, state.operadores, editedCriteria]); // Add editedCriteria to dependencies

  const activeCriteria = useMemo(() => {
    return state.criterios.filter(c => c.ativo);
  }, [state.criterios]);

  const totalPeso = useMemo(() => {
    return activeCriteria.reduce((sum, criterio) => sum + (criterio.peso || 0), 0);
  }, [activeCriteria]);

  const addNewCriterion = async () => {
    if (!newCriterionName.trim()) {
      toast({ title: "Erro", description: "O nome do critério não pode ser vazio.", variant: "destructive" });
      return;
    }

    const newCriterionData = {
      idCriterio: `criterio-${Date.now()}`,
      nome: newCriterionName.trim(),
      tipo: 'qualitativo' as 'qualitativo' | 'quantitativo',
      tipoMeta: 'maior_melhor' as 'maior_melhor' | 'menor_melhor',
      valorMeta: 100,
      peso: 1,
      ordem: state.criterios.length + 1,
      ativo: true,
    };

    try {
      const created = await createCriterio(newCriterionData);
      dispatch({ type: 'ADD_CRITERIO', payload: created.data });
      setNewCriterionName('');
      toast({ title: "Critério adicionado", description: `"${created.data.nome}" foi adicionado.` });
    } catch (error) {
      console.error("Failed to create criterion:", error);
      toast({ title: "Erro", description: "Não foi possível adicionar o critério.", variant: "destructive" });
    }
  };

  const handleInputChange = (id: number, field: keyof Criterio, value: string | number | boolean) => {
    setEditedCriteria(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveCriterio = async (id: number) => {
    const originalCriterio = state.criterios.find(c => c.id === id);
    if (!originalCriterio) return;

    const changes = editedCriteria[id];
    if (!changes) return;

    const updatedCriterio = { ...originalCriterio, ...changes };
    const { id: originalId, totalAvaliacoes: originalTotalAvaliacoes, ...originalCriterioWithoutIdAndTotalAvaliacoes } = originalCriterio;
    const dataToSend = { ...originalCriterioWithoutIdAndTotalAvaliacoes, ...changes };
    // Explicitly remove mediaGeral if it's present, as the backend does not expect it
    if ('mediaGeral' in dataToSend) {
      delete dataToSend.mediaGeral;
    }

    try {
      const updated = await updateCriterio(id, dataToSend);
      if (updated && updated.success) { // Check for success property
        dispatch({ type: 'UPDATE_CRITERIO', payload: updatedCriterio }); // Use locally constructed updatedCriterio
        // Remove from edited state after successful save
        setEditedCriteria(prev => {
          const newEdited = { ...prev };
          delete newEdited[id];
          return newEdited;
        });
        toast({ title: "Critério atualizado", description: `${originalCriterio.nome} foi atualizado.` }); // Use originalCriterio.nome
      } else {
        // Handle cases where updated.success is false or updated is null
        console.error("Failed to update criterion: Server response indicates failure or missing success property.", updated);
        toast({ title: "Erro", description: "Não foi possível atualizar o critério: Resposta do servidor inválida ou falha na atualização.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Failed to update criterion:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar o critério.", variant: "destructive" });
    }
  };

  const handleDeleteCriterio = async () => {
    if (!criterionToDelete) return;
    try {
      await deleteCriterio(criterionToDelete);
      dispatch({ type: 'DELETE_CRITERIO', payload: criterionToDelete });
      toast({ title: "Critério removido", description: "O critério foi removido com sucesso." });
    } catch (error) {
      console.error("Failed to delete criterion:", error);
      toast({ title: "Erro", description: "Não foi possível remover o critério.", variant: "destructive" });
    } finally {
      setCriterionToDelete(null);
    }
  };

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
                disabled={isTicketsConfigLocked}
              />
            </div>
            <Button
              variant={isTicketsConfigLocked ? "secondary" : "default"}
              onClick={() => {
                if (isTicketsConfigLocked) {
                  setIsTicketsConfigLocked(false);
                } else {
                  dispatch({ type: 'SET_TOTAL_TEAM_TICKETS', payload: totalTeamTickets });
                  setIsTicketsConfigLocked(true);
                  toast({ title: "Configuração Salva", description: "O total de tickets da equipe foi salvo." });
                }
              }}
            >
              {isTicketsConfigLocked ? 'Alterar Configuração de Tickets' : 'Salvar Configuração de Tickets'}
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
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold w-1/4">Critério</th>
                    <th className="text-center p-4 font-semibold">Ações</th>
                    <th className="text-center p-4 font-semibold">Status</th>
                    <th className="text-center p-4 font-semibold">Tipo</th>
                    <th className="text-center p-4 font-semibold">Tipo de Meta</th>
                    <th className="text-center p-4 font-semibold">Valor da Meta</th>
                    <th className="text-center p-4 font-semibold">Peso</th>
                    {niveis.map(nivel => (
                      <th key={nivel} className="text-center p-4 font-semibold">
                        Valor ({nivel})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.criterios
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((criterio) => {
                      const edited = editedCriteria[criterio.id] || {};
                      const currentCriterio = { ...criterio, ...edited };
                      return (
                        <tr key={criterio.id} className={`border-b hover:bg-muted/30 transition-colors`}>
                          <td className="p-4">
                            <Input
                              value={currentCriterio.nome}
                              onChange={(e) => handleInputChange(criterio.id, 'nome', e.target.value)}
                              className="font-medium"
                            />
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex gap-2 justify-center">
                              <Button variant="destructive" size="sm" onClick={() => setCriterionToDelete(criterio.id)}><Trash2 className="h-3 w-3" /></Button>
                              {editedCriteria[criterio.id] && (
                                <Button size="sm" onClick={() => saveCriterio(criterio.id)}><Save className="h-3 w-3" /></Button>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <Switch checked={currentCriterio.ativo} onCheckedChange={(c) => handleInputChange(criterio.id, 'ativo', c)} />
                          </td>
                          <td className="p-4 text-center">
                            <Select value={currentCriterio.tipo} onValueChange={(v: 'qualitativo' | 'quantitativo') => handleInputChange(criterio.id, 'tipo', v)}>
                              <SelectTrigger className="w-32 mx-auto"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="qualitativo">Qualitativo</SelectItem>
                                <SelectItem value="quantitativo">Quantitativo</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4 text-center">
                            <Select
                              value={currentCriterio.tipoMeta}
                              onValueChange={(value: 'maior_melhor' | 'menor_melhor') =>
                                handleInputChange(criterio.id, 'tipoMeta', value)
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
                              value={currentCriterio.valorMeta}
                              onChange={(e) => handleInputChange(criterio.id, 'valorMeta', parseInt(e.target.value) || 0)}
                              className="w-24 text-center mx-auto"
                              step="1"
                              min="0"
                              max="100"
                              disabled={currentCriterio.mediaGeral}
                            />
                          </td>
                          <td className="p-4 text-center">
                            <Input
                              type="number"
                              value={currentCriterio.peso}
                              onChange={(e) => handleInputChange(criterio.id, 'peso', parseInt(e.target.value) || 0)}
                              className="w-20 text-center mx-auto"
                              step="1" min="1" max="5"
                            />
                          </td>
                          {niveis.map(nivel => {
                            const valorCalculado = totalPeso > 0 ? (currentCriterio.peso / totalPeso) * valoresNivel[nivel] : 0;
                            return (
                              <td key={nivel} className="p-4 text-center font-mono text-sm">
                                {formatarMoeda(valorCalculado)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  }
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

        <AlertDialog open={criterionToDelete !== null} onOpenChange={(open) => !open && setCriterionToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso excluirá permanentemente o critério e todas as avaliações associadas a ele.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCriterionToDelete(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteCriterio}>Continuar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}