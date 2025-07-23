import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatarMoeda, formatarPercentual } from '@/utils/calculations';
import { DollarSign, Target, TrendingUp, Award } from 'lucide-react';

interface EvaluationSummaryProps {
  valorTotalMeta: number;
  valorTotalAlcancado: number;
  metasAtingidas: number;
  totalMetas: number;
}

export function EvaluationSummary({ 
  valorTotalMeta, 
  valorTotalAlcancado, 
  metasAtingidas, 
  totalMetas 
}: EvaluationSummaryProps) {
  const percentualAlcancado = valorTotalMeta > 0 ? (valorTotalAlcancado / valorTotalMeta) * 100 : 0;
  const percentualMetasAtingidas = totalMetas > 0 ? (metasAtingidas / totalMetas) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="shadow-medium hover:shadow-large transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Total Possível</CardTitle>
          <Target className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{formatarMoeda(valorTotalMeta)}</div>
          <p className="text-xs text-muted-foreground">
            Máximo a ser alcançado
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-medium hover:shadow-large transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Alcançado</CardTitle>
          <DollarSign className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">{formatarMoeda(valorTotalAlcancado)}</div>
          <p className="text-xs text-muted-foreground">
            {formatarPercentual(percentualAlcancado)} do total
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-medium hover:shadow-large transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Performance</CardTitle>
          <TrendingUp className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-accent">
            {formatarPercentual(percentualAlcancado)}
          </div>
          <p className="text-xs text-muted-foreground">
            Eficiência geral
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-medium hover:shadow-large transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Metas Atingidas</CardTitle>
          <Award className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-warning">
            {metasAtingidas}/{totalMetas}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatarPercentual(percentualMetasAtingidas)} das metas
          </p>
        </CardContent>
      </Card>
    </div>
  );
}