import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatarPeriodo } from '@/utils/calculations';
import { TrendingUp, Users, Target } from 'lucide-react';
import logo from '@/assets/Logo.png';

interface HeaderProps {
  periodoAtual: string;
  totalOperadores: number;
  avaliacoesPendentes: number;
}

export function Header({ periodoAtual, totalOperadores, avaliacoesPendentes }: HeaderProps) {
  return (
    <Card className="mb-6 p-6 bg-gradient-card shadow-large border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo Space" className="h-14 w-auto" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Space Informática
              </h1>
              <p className="text-muted-foreground">Sistema de Avaliação de Desempenho</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Operadores:</span>
            <Badge variant="outline" className="font-semibold">
              {totalOperadores}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-warning" />
            <span className="text-sm text-muted-foreground">Pendentes:</span>
            <Badge variant={avaliacoesPendentes > 0 ? "destructive" : "secondary"} className="font-semibold">
              {avaliacoesPendentes}
            </Badge>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Período Atual</div>
            <div className="font-semibold text-lg">
              {formatarPeriodo(periodoAtual)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}