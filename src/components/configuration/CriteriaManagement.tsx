import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { Criterio, TipoCriterio } from '@/types/evaluation';
import { formatarMoeda } from '@/utils/calculations';
import { Target, Save, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { createCriterio, updateCriterio, deleteCriterio, getTipoCriterios, getCriterios } from '@/services/criteriaService';
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function CriteriaManagement() {
  const { state, dispatch } = useEvaluation();
  const [editedCriteria, setEditedCriteria] = useState<{ [key: number]: Partial<Criterio> }>({});
  
  const [isAddCriterionDialogOpen, setIsAddCriterionDialogOpen] = useState(false);
  const [newCriterionName, setNewCriterionName] = useState('');
  const [newCriterionBlock, setNewCriterionBlock] = useState<number>(2);
  const [newCriterionTipo, setNewCriterionTipo] = useState<'qualitativo' | 'quantitativo'>('qualitativo');
  const [newCriterionTipoMeta, setNewCriterionTipoMeta] = useState<'maior_melhor' | 'menor_melhor'>('maior_melhor');
  const [newCriterionValorMeta, setNewCriterionValorMeta] = useState<number>(100);
  const [newCriterionValorBonus, setNewCriterionValorBonus] = useState<number>(0);
  const [newCriterionOrdem, setNewCriterionOrdem] = useState<number>(0);

  // Nota: não usamos mais totalTeamTickets neste componente.
  const [criterionToDelete, setCriterionToDelete] = useState<number | null>(null);
  const [tiposCriterio, setTiposCriterio] = useState<TipoCriterio[]>([]);
  const { toast } = useToast();

  // Valida a soma dos valorBonus para critérios do bloco 3 (Avaliação Metas)
  const validateMetasCriteriaTotals = (override?: { id: number; valorBonus: number; ativo?: boolean }) => {
    const tipoMetas = tiposCriterio.find(t => t.id === 3);
    if (!tipoMetas) {
      toast({ title: 'Configuração incompleta', description: 'Valores por nível não carregados. Aguarde e tente novamente.', variant: 'destructive' });
      return false;
    }

    const limite = tipoMetas.valorNvl3 || 0;

    let sum = state.criterios
      .filter(c => Number(c.idCriterio) === 3)
      .reduce((acc, c) => {
        const edited = editedCriteria[c.id];
        const currentValorBonus = (edited && typeof edited.valorBonus === 'number') ? edited.valorBonus : (c.valorBonus || 0);
        // determine active state considering pending edits
        const currentAtivo = (edited && typeof edited.ativo === 'boolean') ? edited.ativo : !!c.ativo;
        // apply override if matches existing criterion
        const finalValor = (override && override.id === c.id) ? override.valorBonus : currentValorBonus;
        // only add if active
        return acc + ((currentAtivo && !isNaN(finalValor)) ? finalValor : 0);
      }, 0);

    // If override id === -1, it represents a new criterion to add — consider its ativo flag (default true)
    if (override && override.id === -1) {
      const novoAtivo = typeof override.ativo === 'boolean' ? override.ativo : true;
      if (novoAtivo) sum += (isNaN(override.valorBonus) ? 0 : override.valorBonus);
    }

    if (sum > limite) {
      toast({
        title: 'Limite excedido',
        description: `Soma dos valores de 'Avaliação Metas' é ${formatarMoeda(sum)} e excede o limite de ${formatarMoeda(limite)} para este bloco.`,
        variant: 'destructive'
      });
      return false;
    }
    return true;
  };

  useEffect(() => {
    const fetchTiposCriterio = async () => {
      try {
        const data = await getTipoCriterios();
        setTiposCriterio(data);
      } catch (error) {
        console.error("Failed to fetch tipos de critério:", error);
        toast({ title: "Erro", description: "Não foi possível buscar os tipos de critério.", variant: "destructive" });
      }
    };
    fetchTiposCriterio();
  }, [toast]);

  // O cálculo automático de valorMeta baseado em `totalTeamTickets` foi removido.
  // Os critérios agora utilizam o valor vindo da API (`criterio.valorMeta`) como os demais.

  const addNewCriterion = async () => {
    if (!newCriterionName.trim()) {
      toast({ title: "Erro", description: "O nome do critério não pode ser vazio.", variant: "destructive" });
      return;
    }

    const newCriterionData = {
      idCriterio: newCriterionBlock,
      nome: newCriterionName.trim(),
      tipo: newCriterionTipo,
      tipoMeta: newCriterionTipoMeta,
      valorMeta: newCriterionValorMeta,
      ordem: newCriterionOrdem || state.criterios.length + 1,
      // defaults required by Omit<Criterio, 'id' | 'totalAvaliacoes'>
      ativo: true,
      valorBonus: newCriterionValorBonus || 0,
      mediaGeral: false,
    };

    // Validação: se for bloco 3 (Avaliação Metas), verificar soma não exceder limite
    if (Number(newCriterionBlock) === 3) {
      const ok = validateMetasCriteriaTotals({ id: -1, valorBonus: newCriterionValorBonus || 0, ativo: true });
      if (!ok) return;
    }

    try {
      console.debug('Creating criterion payload:', newCriterionData);
      const created = await createCriterio(newCriterionData);

      // Tentar obter nome retornado pela API (varias formas possíveis)
      // Extrair nome retornado pela API com cuidados de tipagem
      let createdName = newCriterionName;
      if (created) {
        const rc = created as unknown as Record<string, unknown>;
        if (rc.data && typeof rc.data === 'object' && (rc.data as Record<string, unknown>).nome) createdName = String((rc.data as Record<string, unknown>).nome);
        else if (rc.nome) createdName = String(rc.nome);
        else if (rc.data && typeof rc.data === 'object' && (rc.data as Record<string, unknown>).name) createdName = String((rc.data as Record<string, unknown>).name);
      }

      // Recarregar lista de critérios do backend para garantir dados consistentes
      try {
        const all = await getCriterios();
        const transformedCriterios = all.data.map((criterio: unknown) => {
          const rc = criterio as Record<string, unknown>;
          return {
            ...(rc as Record<string, unknown>),
            idCriterio: parseInt(String(rc.idCriterio ?? rc['idCriterio']), 10),
            valorMeta: parseFloat(String(rc.valorMeta ?? rc['valorMeta'] ?? 0)),
          } as Criterio;
        });
        dispatch({ type: 'SET_CRITERIOS', payload: transformedCriterios });
      } catch (reloadErr) {
        // Fallback: se reload falhar, tentar adicionar o objeto retornado pela API
        if (created && created.data) {
          dispatch({ type: 'ADD_CRITERIO', payload: created.data });
        } else {
          // fallback local: use newCriterionData com id temporário
          dispatch({ type: 'ADD_CRITERIO', payload: { id: Date.now(), ...newCriterionData, totalAvaliacoes: 0 } as unknown as Criterio });
        }
      }

      setNewCriterionName('');
      setNewCriterionValorBonus(0);
      setIsAddCriterionDialogOpen(false);
      toast({ title: "Critério adicionado", description: `${createdName} foi adicionado.` });
    } catch (error) {
      console.error("Failed to create criterion:", error);
      toast({ title: "Erro", description: "Não foi possível adicionar o critério.", variant: "destructive" });
    }
  };

  const handleInputChange = (id: number, field: keyof Criterio, value: string | number | boolean) => {
    const originalCriterio = state.criterios.find(c => c.id === id);
    if (!originalCriterio) return;

    setEditedCriteria(prev => {
      const newEdited = { ...prev };
      const criterionChanges: Partial<Criterio> = { ...newEdited[id] };

      if (value === originalCriterio[field]) {
        // remove change if equal to original
        Reflect.deleteProperty(criterionChanges, field as keyof Criterio);
      } else {
        // assign with indexed access to preserve typings
        (criterionChanges as unknown as Record<string, unknown>)[String(field)] = value as unknown;
      }

      if (Object.keys(criterionChanges).length === 0) {
        delete newEdited[id];
      } else {
        newEdited[id] = criterionChanges;
      }

      return newEdited;
    });
  };

  const saveCriterio = async (id: number) => {
    const originalCriterio = state.criterios.find(c => c.id === id);
    if (!originalCriterio) return;

    const changes = editedCriteria[id];
    if (!changes) return;

    const updatedCriterio = { ...originalCriterio, ...changes };
    
  const { id: originalId, totalAvaliacoes: originalTotalAvaliacoes, ...originalCriterioWithoutIdAndTotalAvaliacoes } = originalCriterio;
    const dataToSend = { ...originalCriterioWithoutIdAndTotalAvaliacoes, ...changes };
    
    if ('mediaGeral' in dataToSend) {
      // delete with a looser cast to avoid TypeScript any usage
      delete (dataToSend as Partial<Record<string, unknown>>).mediaGeral;
    }

    // Se o critério pertence ao bloco 3 (Avaliação Metas), validar soma dos valores antes de salvar
    if (Number(updatedCriterio.idCriterio) === 3) {
      const updatedValorBonus = typeof changes.valorBonus === 'number' ? changes.valorBonus : originalCriterio.valorBonus;
      const ok = validateMetasCriteriaTotals({ id, valorBonus: updatedValorBonus });
      if (!ok) return;
    }

    try {
      const updated = await updateCriterio(id, dataToSend);
      if (updated && updated.success) {
        dispatch({ type: 'UPDATE_CRITERIO', payload: updatedCriterio });
        setEditedCriteria(prev => {
          const newEdited = { ...prev };
          delete newEdited[id];
          return newEdited;
        });
        toast({ title: "Critério atualizado", description: `${originalCriterio.nome} foi atualizado.` });
      } else {
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

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Total de tickets agora é calculado automaticamente pela importação do MySuite
            e armazenado em `state.totalTeamTickets`. Removemos a UI de configuração manual. */}

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
              <table className="w-full min-w-[1200px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold w-1/4">Critério</th>
                    <th className="text-center p-4 font-semibold">Valor R$</th>
                    <th className="text-center p-4 font-semibold">Ações</th>
                    <th className="text-center p-4 font-semibold">Status</th>
                    <th className="text-center p-4 font-semibold">Bloco</th>
                    <th className="text-center p-4 font-semibold">Tipo</th>
                    <th className="text-center p-4 font-semibold">Tipo de Meta</th>
                    <th className="text-center p-4 font-semibold">Valor da Meta</th>
                  </tr>
                </thead>
                <tbody>
                  {state.criterios
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((criterio) => {
                      const edited = editedCriteria[criterio.id] || {};
                      const currentCriterio = { ...criterio, ...edited };
                      const getCriterioDisplayName = () => {
                        let displayName = currentCriterio.nome;
                        if (currentCriterio.idCriterio === 1) {
                          displayName += ' - Avaliação Gerencial';
                        } else if (currentCriterio.idCriterio === 3) {
                          displayName += ' - Meta';
                        }
                        return displayName;
                      };

                      return (
                        <tr key={criterio.id} className={`border-b hover:bg-muted/30 transition-colors`}>
                          <td className="p-4">
                            <Input
                              value={getCriterioDisplayName()}
                              disabled
                              className="font-medium"
                            />
                          </td>
                              <td className="p-4 text-center">
                                {Number(currentCriterio.idCriterio) === 3 ? (
                                  <Input
                                    type="number"
                                    value={currentCriterio.valorBonus ?? 0}
                                    onChange={(e) => {
                                      const v = parseFloat(e.target.value) || 0;
                                      handleInputChange(criterio.id, 'valorBonus', v);
                                    }}
                                    className="w-28 text-center mx-auto"
                                    step="0.01"
                                    min="0"
                                  />
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                          <td className="p-4 text-center">
                              <div className="flex gap-2 justify-center">
                                {/* Botão de excluir (desabilitado por padrão). Para habilitar, remova o comentário abaixo. */}
                                {/* <Button variant="destructive" size="sm" onClick={() => setCriterionToDelete(criterio.id)}><Trash2 className="h-3 w-3" /></Button> */}
                                {editedCriteria[criterio.id] && (
                                  <Button size="sm" onClick={() => saveCriterio(criterio.id)}><Save className="h-3 w-3" /></Button>
                                )}
                              </div>
                          </td>
                          <td className="p-4 text-center">
                            <Switch checked={currentCriterio.ativo} onCheckedChange={(c) => handleInputChange(criterio.id, 'ativo', c)} />
                          </td>
                          <td className="p-4 text-center">
                            <Select value={String(currentCriterio.idCriterio)} onValueChange={(v) => handleInputChange(criterio.id, 'idCriterio', Number(v))}>
                              <SelectTrigger className="w-32 mx-auto text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {tiposCriterio.map(tipo => (
                                  <SelectItem key={tipo.id} value={String(tipo.id)}>{tipo.descricao}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4 text-center">
                            <Select value={currentCriterio.tipo} onValueChange={(v: 'qualitativo' | 'quantitativo') => handleInputChange(criterio.id, 'tipo', v)}>
                              <SelectTrigger className="w-32 mx-auto text-xs"><SelectValue /></SelectTrigger>
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
                              <SelectTrigger className="w-40 mx-auto text-xs">
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
                              disabled={
                                currentCriterio.mediaGeral ||
                                (Number(currentCriterio.idCriterio) === 3 && currentCriterio.tipo === 'quantitativo' && currentCriterio.metaCalculo === 2)
                              }
                            />
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
            <CardTitle>Adicionar Novo Critério</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsAddCriterionDialogOpen(true)} className="w-full md:w-auto">Adicionar Novo Critério</Button>
          </CardContent>
        </Card>

        <Dialog open={isAddCriterionDialogOpen} onOpenChange={setIsAddCriterionDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Critério</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nome
                </Label>
                <Input id="name" value={newCriterionName} onChange={(e) => setNewCriterionName(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="block" className="text-right">
                  Bloco
                </Label>
                <Select value={String(newCriterionBlock)} onValueChange={(value) => setNewCriterionBlock(Number(value))}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o Bloco" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposCriterio.map(tipo => (
                      <SelectItem key={tipo.id} value={String(tipo.id)}>{tipo.descricao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Tipo
                </Label>
                <Select value={newCriterionTipo} onValueChange={(v: 'qualitativo' | 'quantitativo') => setNewCriterionTipo(v)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qualitativo">Qualitativo</SelectItem>
                    <SelectItem value="quantitativo">Quantitativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="goal-type" className="text-right">
                  Tipo de Meta
                </Label>
                <Select value={newCriterionTipoMeta} onValueChange={(v: 'maior_melhor' | 'menor_melhor') => setNewCriterionTipoMeta(v)}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maior_melhor">Maior é Melhor</SelectItem>
                    <SelectItem value="menor_melhor">Menor é Melhor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="goal-value" className="text-right">
                  Valor da Meta
                </Label>
                <Input id="goal-value" type="number" value={newCriterionValorMeta} onChange={(e) => setNewCriterionValorMeta(Number(e.target.value))} className="col-span-3" />
              </div>
              {Number(newCriterionBlock) === 3 && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="bonus-value" className="text-right">
                    Valor do Bônus (R$)
                  </Label>
                  <Input id="bonus-value" type="number" value={newCriterionValorBonus} onChange={(e) => setNewCriterionValorBonus(Number(e.target.value))} className="col-span-3" step="0.01" min="0" />
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="order" className="text-right">
                  Ordem
                </Label>
                <Input id="order" type="number" value={newCriterionOrdem} onChange={(e) => setNewCriterionOrdem(Number(e.target.value))} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={addNewCriterion}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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