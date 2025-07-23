import React, { useState } from 'react';
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
  const { toast } = useToast();

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
    if (criterioAtualizado.valorMeta <= 0) {
      toast({
        title: "Erro",
        description: "O valor da meta deve ser maior que zero.",
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
      if (criterio.valorMeta <= 0 || criterio.valorBonus <= 0) {
        hasErrors = true;
        return;
      }
      dispatch({ type: 'UPDATE_CRITERIO', payload: criterio });
    });

    if (hasErrors) {
      toast({
        title: "Erro",
        description: "Todos os valores devem ser maiores que zero.",
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
                  <th className="text-center p-4 font-semibold">Tipo de Meta</th>
                  <th className="text-center p-4 font-semibold">Valor da Meta</th>
                  <th className="text-center p-4 font-semibold">Valor do Bônus</th>
                  <th className="text-center p-4 font-semibold">Status</th>
                  <th className="text-center p-4 font-semibold">Importação</th>
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
                          <div className="font-medium">{criterio.nome}</div>
                          {hasChangesForCriterio && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Alterado
                            </Badge>
                          )}
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
                              valorMeta: parseFloat(e.target.value) || 0 
                            })}
                            className="w-24 text-center mx-auto"
                            step={criterio.nome === 'Quantitativo' ? '1' : '0.1'}
                            min="0"
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
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={criterio.permiteImportacao}
                              onCheckedChange={(checked) => 
                                updateCriterio(criterio.id, { permiteImportacao: checked })
                              }
                              disabled={criterio.nome === 'Quantitativo'}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {criterio.permiteImportacao ? 'Sim' : 'Manual'}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <div className="text-2xl font-bold text-accent">
                {state.criterios.filter(c => c.permiteImportacao).length}
              </div>
              <div className="text-sm text-muted-foreground">Importáveis</div>
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
    </div>
  );
}