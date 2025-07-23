import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { Operador } from '@/types/evaluation';
import { gerarId } from '@/utils/calculations';
import { UserPlus, Edit, Trash2, Users, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function OperatorManagement() {
  const { state, dispatch } = useEvaluation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operador | null>(null);
  const [newOperatorName, setNewOperatorName] = useState('');
  const { toast } = useToast();

  const handleAddOperator = () => {
    if (!newOperatorName.trim()) {
      toast({
        title: "Erro",
        description: "Digite um nome para o operador.",
        variant: "destructive"
      });
      return;
    }

    // Verificar se já existe operador com esse nome
    const exists = state.operadores.some(op => 
      op.nome.toLowerCase() === newOperatorName.trim().toLowerCase()
    );

    if (exists) {
      toast({
        title: "Erro",
        description: "Já existe um operador com esse nome.",
        variant: "destructive"
      });
      return;
    }

    const novoOperador: Operador = {
      id: gerarId(),
      nome: newOperatorName.trim(),
      ativo: true,
      dataInclusao: new Date()
    };

    dispatch({ type: 'ADD_OPERADOR', payload: novoOperador });
    setNewOperatorName('');
    setIsAddDialogOpen(false);

    toast({
      title: "Operador adicionado",
      description: `${novoOperador.nome} foi adicionado com sucesso.`,
      variant: "default"
    });
  };

  const handleEditOperator = () => {
    if (!editingOperator || !newOperatorName.trim()) return;

    // Verificar se já existe outro operador com esse nome
    const exists = state.operadores.some(op => 
      op.id !== editingOperator.id && 
      op.nome.toLowerCase() === newOperatorName.trim().toLowerCase()
    );

    if (exists) {
      toast({
        title: "Erro",
        description: "Já existe um operador com esse nome.",
        variant: "destructive"
      });
      return;
    }

    const operadorAtualizado: Operador = {
      ...editingOperator,
      nome: newOperatorName.trim()
    };

    dispatch({ type: 'UPDATE_OPERADOR', payload: operadorAtualizado });
    setEditingOperator(null);
    setNewOperatorName('');

    toast({
      title: "Operador atualizado",
      description: `${operadorAtualizado.nome} foi atualizado com sucesso.`,
      variant: "default"
    });
  };

  const toggleOperatorStatus = (operador: Operador) => {
    const operadorAtualizado: Operador = {
      ...operador,
      ativo: !operador.ativo
    };

    dispatch({ type: 'UPDATE_OPERADOR', payload: operadorAtualizado });

    toast({
      title: operador.ativo ? "Operador desativado" : "Operador ativado",
      description: `${operador.nome} foi ${operador.ativo ? 'desativado' : 'ativado'} com sucesso.`,
      variant: "default"
    });
  };

  const getOperatorStats = (operadorId: string) => {
    const avaliacoes = state.avaliacoes.filter(av => av.operadorId === operadorId);
    return {
      totalAvaliacoes: avaliacoes.length,
      ultimaAvaliacao: avaliacoes.length > 0 
        ? new Date(Math.max(...avaliacoes.map(av => av.dataUltimaEdicao.getTime())))
        : null
    };
  };

  const openEditDialog = (operador: Operador) => {
    setEditingOperator(operador);
    setNewOperatorName(operador.nome);
  };

  const cancelEdit = () => {
    setEditingOperator(null);
    setNewOperatorName('');
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-medium">
        <CardHeader className="bg-gradient-card">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Gerenciar Operadores
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Adicionar Operador
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Operador</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Nome do Operador</label>
                    <Input
                      value={newOperatorName}
                      onChange={(e) => setNewOperatorName(e.target.value)}
                      placeholder="Digite o nome completo do operador"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddOperator()}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddOperator}>
                      Adicionar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {state.operadores.map((operador) => {
              const stats = getOperatorStats(operador.id);
              
              return (
                <Card key={operador.id} className="hover:shadow-medium transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{operador.nome}</h3>
                        <Badge variant={operador.ativo ? "default" : "secondary"}>
                          {operador.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Cadastrado em {operador.dataInclusao.toLocaleDateString('pt-BR')}
                        </div>
                        <div>Avaliações: {stats.totalAvaliacoes}</div>
                        {stats.ultimaAvaliacao && (
                          <div>
                            Última avaliação: {stats.ultimaAvaliacao.toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Dialog 
                          open={editingOperator?.id === operador.id} 
                          onOpenChange={(open) => !open && cancelEdit()}
                        >
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => openEditDialog(operador)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Operador</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Nome do Operador</label>
                                <Input
                                  value={newOperatorName}
                                  onChange={(e) => setNewOperatorName(e.target.value)}
                                  placeholder="Digite o nome completo do operador"
                                  onKeyDown={(e) => e.key === 'Enter' && handleEditOperator()}
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={cancelEdit}>
                                  Cancelar
                                </Button>
                                <Button onClick={handleEditOperator}>
                                  Salvar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant={operador.ativo ? "outline" : "success"}
                          size="sm"
                          onClick={() => toggleOperatorStatus(operador)}
                          className="flex-1"
                        >
                          {operador.ativo ? "Desativar" : "Ativar"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {state.operadores.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                Nenhum operador cadastrado
              </h3>
              <p className="text-muted-foreground">
                Comece adicionando operadores ao sistema
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Estatísticas dos Operadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {state.operadores.length}
              </div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {state.operadores.filter(op => op.ativo).length}
              </div>
              <div className="text-sm text-muted-foreground">Ativos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {state.operadores.filter(op => !op.ativo).length}
              </div>
              <div className="text-sm text-muted-foreground">Inativos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {state.avaliacoes.length}
              </div>
              <div className="text-sm text-muted-foreground">Avaliações</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}