import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { Operador } from '@/types/evaluation';
import { gerarId } from '@/utils/calculations'; // This might not be needed if API handles IDs
import { UserPlus, Edit, Trash2, Users, Calendar, Mail, Star, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getOperadores,
  createOperador,
  updateOperador,
  deleteOperador,
  updateOperadorStatus
} from '@/services/operatorService'; // Import API functions

export function OperatorManagement() {
  const { state, dispatch, fetchOperadores } = useEvaluation();
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // New state for edit dialog
  const [editingOperator, setEditingOperator] = useState<Operador | null>(null);
  const [newOperatorName, setNewOperatorName] = useState('');
  const [newOperatorEmail, setNewOperatorEmail] = useState('');
  
  const [newOperatorParticipatesInEvaluation, setNewOperatorParticipatesInEvaluation] = useState(true);

  const handleAddOperator = async () => {
    if (!newOperatorName.trim() || !newOperatorEmail.trim()) {
      toast({
        title: "Erro",
        description: "Preencha o nome e o e-mail do operador.",
        variant: "destructive"
      });
      return;
    }

    if (!newOperatorEmail.trim().toLowerCase().endsWith('@spaceinformatica.com.br')) {
      toast({
        title: "Erro",
        description: "O e-mail deve ser do domínio @spaceinformatica.com.br",
        variant: "destructive"
      });
      return;
    }

    const exists = state.operadores.some(op =>
      (op.nome && op.nome.toLowerCase() === newOperatorName.trim().toLowerCase()) ||
      (op.login && op.login.toLowerCase() === newOperatorEmail.trim().toLowerCase())
    );

    if (exists) {
      toast({
        title: "Erro",
        description: "Já existe um operador com este nome ou e-mail.",
        variant: "destructive"
      });
      return;
    }

    try {
      const novoOperador: Omit<Operador, 'id' | 'dataInclusao'> = { // Omit id and dataInclusao as API generates them
        nome: newOperatorName.trim(),
        login: newOperatorEmail.trim(),
        ativo: true,
        grupo: 0, // Definir um grupo padrão
        participaAvaliacao: newOperatorParticipatesInEvaluation,
        
      };

      const createdOperator = await createOperador(novoOperador);
      fetchOperadores(); // Re-fetch all operators to ensure the list is up-to-date

      setNewOperatorName('');
      setNewOperatorEmail('');
      
      setEditingOperator(null); // Ensure no operator is being edited
      setIsAddDialogOpen(false);

      toast({
        title: "Operador adicionado",
        description: `${newOperatorName} foi adicionado com sucesso.`,
        variant: "default"
      });
    } catch (err: unknown) {
      toast({
        title: "Erro ao adicionar operador",
        description: `Não foi possível adicionar o operador: ${(err as Error).message}`,
        variant: "destructive"
      });
    }
  };

  const handleEditOperator = async () => {
    if (!editingOperator || !newOperatorName.trim() || !newOperatorEmail.trim()) return;

    if (!newOperatorEmail.trim().toLowerCase().endsWith('@spaceinformatica.com.br')) {
      toast({
        title: "Erro",
        description: "O e-mail deve ser do domínio @spaceinformatica.com.br",
        variant: "destructive"
      });
      return;
    }

    const exists = state.operadores.some(op =>
      op.id !== editingOperator.id &&
      ((op.nome && op.nome.toLowerCase() === newOperatorName.trim().toLowerCase()) ||
       (op.login && op.login.toLowerCase() === newOperatorEmail.trim().toLowerCase()))
    );

    if (exists) {
      toast({
        title: "Erro",
        description: "Já existe um operador com este nome ou e-mail.",
        variant: "destructive"
      });
      return;
    }

    try {
      const operadorAtualizado: Operador = {
        ...editingOperator,
        nome: newOperatorName.trim(),
        login: newOperatorEmail.trim(),
        participaAvaliacao: newOperatorParticipatesInEvaluation,
        
      };

      const updatedOp = await updateOperador(operadorAtualizado);
      fetchOperadores(); // Re-fetch all operators to ensure the list is up-to-date

      setEditingOperator(null);
      setNewOperatorName('');
      setNewOperatorEmail('');
      

      toast({
        title: "Operador atualizado",
        description: `${newOperatorName} foi atualizado com sucesso.`,
        variant: "default"
      });
    } catch (err: unknown) {
      toast({
        title: "Erro ao atualizar operador",
        description: `Não foi possível atualizar o operador: ${(err as Error).message}`,
        variant: "destructive"
      });
    }
  };

  const handleDeleteOperator = async (operadorId: number) => { // Change type to number
    try {
      await deleteOperador(operadorId);
      dispatch({ type: 'DELETE_OPERADOR', payload: operadorId });

      toast({
        title: "Operador excluído",
        description: "O operador e suas avaliações foram excluídos com sucesso.",
        variant: "default"
      });
    } catch (err: unknown) {
      toast({
        title: "Erro ao excluir operador",
        description: `Não foi possível excluir o operador: ${(err as Error).message}`,
        variant: "destructive"
      });
    }
  };

  const toggleOperatorStatus = async (operador: Operador) => {
    try {
      const newStatus = !operador.ativo;
      await updateOperadorStatus(operador.id, newStatus);
      dispatch({ type: 'UPDATE_OPERADOR', payload: { ...operador, ativo: newStatus } });

      toast({
        title: newStatus ? "Operador ativado" : "Operador desativado",
        description: `${operador.nome} foi ${newStatus ? 'ativado' : 'desativado'} com sucesso.`,
        variant: "default"
      });
    } catch (err: unknown) {
      toast({
        title: "Erro ao alterar status",
        description: `Não foi possível alterar o status do operador: ${(err as Error).message}`,
        variant: "destructive"
      });
    }
  };

  const getOperatorStats = (operadorId: number) => { // Change type to number
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
    setNewOperatorEmail(operador.login);
    
    setNewOperatorParticipatesInEvaluation(operador.participaAvaliacao);
  };

  const cancelEdit = () => {
    setEditingOperator(null);
    setNewOperatorName('');
    setNewOperatorEmail('');
    
  };

  if (state.loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando operadores...</span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="text-center text-destructive p-8">
        <p>Ocorreu um erro: {state.error}</p>
        <p>Por favor, tente novamente mais tarde.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-medium">
        <CardHeader className="bg-gradient-card">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Gerenciar Operadores
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              if (!open) {
                setNewOperatorName('');
                setNewOperatorEmail('');
                 // Reset level on close
                setNewOperatorParticipatesInEvaluation(true); // Reset participates on close
              }
              setIsAddDialogOpen(open);
            }}>
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
                      placeholder="Digite o nome completo"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">E-mail do Operador</label>
                    <Input
                      type="email"
                      value={newOperatorEmail}
                      onChange={(e) => setNewOperatorEmail(e.target.value)}
                      placeholder="exemplo@spaceinformatica.com.br"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddOperator()}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="participates-evaluation"
                      checked={newOperatorParticipatesInEvaluation}
                      onCheckedChange={setNewOperatorParticipatesInEvaluation}
                    />
                    <Label htmlFor="participates-evaluation">Participa da Avaliação</Label>
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
            {state.operadores.map((operador) => { // Use 'operators' state
              const stats = getOperatorStats(operador.id);

              return (
                <Card key={operador.id} className="hover:shadow-medium transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{operador.nome}</h3>
                        <Badge variant={operador.ativo ? "success" : "destructive"}>
                          {operador.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-2 truncate">
                          <Mail className="h-3 w-3" />
                          <span>{operador.login || 'E-mail não cadastrado'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          Cadastrado em {new Date(operador.dataInclusao).toLocaleDateString('pt-BR')}
                        </div>
                        
                        <div>Avaliações: {stats.totalAvaliacoes}</div>
                        {stats.ultimaAvaliacao && (
                          <div>
                            Última avaliação: {stats.ultimaAvaliacao.toLocaleDateString('pt-BR')}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge className={`${operador.participaAvaliacao ? 'bg-white border-2 border-emerald-500 text-emerald-500' : 'bg-white border-2 border-red-600 text-red-600'}`}>
                            {operador.participaAvaliacao ? "Participa da Avaliação" : "Não Participa da Avaliação"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Dialog
                          open={editingOperator?.id === operador.id && isEditDialogOpen}
                          onOpenChange={(open) => {
                            if (!open) {
                              cancelEdit();
                            }
                            setIsEditDialogOpen(open);
                          }}
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
                                  placeholder="Digite o nome completo"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">E-mail do Operador</label>
                                <Input
                                  type="email"
                                  value={newOperatorEmail}
                                  onChange={(e) => setNewOperatorEmail(e.target.value)}
                                  placeholder="exemplo@spaceinformatica.com.br"
                                  onKeyDown={(e) => e.key === 'Enter' && handleEditOperator()}
                                />
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="edit-participates-evaluation"
                                  checked={newOperatorParticipatesInEvaluation}
                                  onCheckedChange={setNewOperatorParticipatesInEvaluation}
                                />
                                <Label htmlFor="edit-participates-evaluation">Participa da Avaliação</Label>
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

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o operador {operador.nome}? Esta ação não pode ser desfeita e removerá todas as avaliações associadas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteOperator(operador.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {state.operadores.length === 0 && !state.loading && !state.error && ( // Use 'operators' state
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
                {state.operadores.length} {/* Use 'operators' state */}
              </div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {state.operadores.filter(op => op.ativo).length} {/* Use 'operators' state */}
              </div>
              <div className="text-sm text-muted-foreground">Ativos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {state.operadores.filter(op => !op.ativo).length} {/* Use 'operators' state */}
              </div>
              <div className="text-sm text-muted-foreground">Inativos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {state.avaliacoes.length} {/* This still uses context, assuming evaluations are not managed by this component */}
              </div>
              <div className="text-sm text-muted-foreground">Avaliações</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}