import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatarPeriodo } from '@/utils/calculations';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface PeriodSelectorProps {
  periodoAtual: string;
  onPeriodoChange: (periodo: string) => void;
}

export function PeriodSelector({ periodoAtual, onPeriodoChange }: PeriodSelectorProps) {
  // Gera lista de períodos (últimos 12 meses + próximos 3 meses)
  const gerarPeriodos = () => {
    const periodos: string[] = [];
    const hoje = new Date();
    
    // Últimos 12 meses
    for (let i = 12; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const periodo = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
      periodos.push(periodo);
    }
    
    // Próximos 3 meses
    for (let i = 1; i <= 3; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const periodo = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
      periodos.push(periodo);
    }
    
    return periodos;
  };

  const periodos = gerarPeriodos();

  const navegarPeriodo = (direcao: 'anterior' | 'proximo') => {
    const indiceAtual = periodos.indexOf(periodoAtual);
    if (indiceAtual === -1) return;
    
    if (direcao === 'anterior' && indiceAtual > 0) {
      onPeriodoChange(periodos[indiceAtual - 1]);
    } else if (direcao === 'proximo' && indiceAtual < periodos.length - 1) {
      onPeriodoChange(periodos[indiceAtual + 1]);
    }
  };

  const isPrimeiroPeriodo = periodos.indexOf(periodoAtual) === 0;
  const isUltimoPeriodo = periodos.indexOf(periodoAtual) === periodos.length - 1;

  return (
    <Card className="shadow-medium">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Período de Avaliação</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navegarPeriodo('anterior')}
              disabled={isPrimeiroPeriodo}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Select value={periodoAtual} onValueChange={onPeriodoChange}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {periodos.map((periodo) => (
                  <SelectItem key={periodo} value={periodo}>
                    {formatarPeriodo(periodo)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => navegarPeriodo('proximo')}
              disabled={isUltimoPeriodo}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Período Selecionado</div>
            <div className="text-xl font-bold text-primary">
              {formatarPeriodo(periodoAtual)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}