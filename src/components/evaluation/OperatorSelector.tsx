import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Operador, Avaliacao, StatusAvaliacao } from '@/types/evaluation';
import { User, Calendar } from 'lucide-react';

interface OperatorSelectorProps {
  operadores: Operador[];
  operadorSelecionado?: string;
  onOperadorChange: (operadorId: string) => void;
  avaliacoes: Avaliacao[];
  periodoAtual: string;
}

export function OperatorSelector({
  operadores,
  operadorSelecionado,
  onOperadorChange,
  avaliacoes,
  periodoAtual
}: OperatorSelectorProps) {
  
  const getStatusAvaliacao = (operadorId: string): StatusAvaliacao => {
    const avaliacao = avaliacoes.find(av => 
      av.operadorId === operadorId && av.periodo === periodoAtual
    );
    
    if (!avaliacao) return 'pendente';
    
    // Verifica se todos os critérios foram preenchidos
    const temTodosCriterios = avaliacao.criterios.length > 0;
    const temValores = avaliacao.criterios.every(c => c.valorAlcancado >= 0);
    
    if (temTodosCriterios && temValores) return 'concluida';
    if (avaliacao.criterios.length > 0) return 'em_andamento';
    return 'pendente';
  };

  const getStatusBadge = (status: StatusAvaliacao) => {
    switch (status) {
      case 'concluida':
        return <Badge variant="default" className="bg-success text-success-foreground">Concluída</Badge>;
      case 'em_andamento':
        return <Badge variant="secondary" className="bg-warning text-warning-foreground">Em Andamento</Badge>;
      case 'pendente':
        return <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>;
    }
  };

  const operadoresAtivos = operadores.filter(op => op.ativo && op.participaAvaliacao);

  return (
    <Card className="shadow-medium">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Selecionar Operador</h3>
          </div>
          
          <Select value={operadorSelecionado} onValueChange={onOperadorChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolha um operador para avaliar" />
            </SelectTrigger>
            <SelectContent className="bg-white z-50">
              {operadoresAtivos.map((operador) => {
                const status = getStatusAvaliacao(operador.id);
                return (
                  <SelectItem key={operador.id} value={operador.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{operador.nome}</span>
                      <div className="ml-4">
                        {getStatusBadge(status)}
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {operadorSelecionado && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Status da Avaliação:</span>
                </div>
                {getStatusBadge(getStatusAvaliacao(operadorSelecionado))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}