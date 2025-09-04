import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Criterio, CriterioAvaliacao } from '@/types/evaluation';
import { formatarMoeda } from '@/utils/calculations';
import { CheckCircle, XCircle, Target, TrendingUp, TrendingDown } from 'lucide-react';

interface EvaluationTableProps {
  criterios: Criterio[];
  criteriosAvaliacao: CriterioAvaliacao[];
  onUpdateCriterio?: (criterioId: number, valor: number) => void;
  isEditable?: boolean;
}

export function EvaluationTable({
  criterios,
  criteriosAvaliacao,
  onUpdateCriterio,
  isEditable = true
}: EvaluationTableProps) {
  const getCriterioAvaliacao = (criterioId: number) => {
    return criteriosAvaliacao.find(ca => ca.criterioId === criterioId);
  };

  const getMeta = (criterio: Criterio) => {
    return criterio.valorMeta;
  };

  const getStatusIcon = (atingiu: boolean) => {
    if (atingiu) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = (atingiu: boolean) => {
    return (
      <Badge variant={atingiu ? "default" : "destructive"} className="font-medium">
        {atingiu ? "Meta Atingida" : "Meta Não Atingida"}
      </Badge>
    );
  };

  const formatarValor = (criterio: Criterio, valor?: string | number | null) => {
    if (valor === null || valor === undefined) {
      return 'N/A';
    }
    if (criterio.tipo === 'quantitativo') {
      return parseInt(valor.toString(), 10).toString();
    }
    return `${parseFloat(valor.toString()).toFixed(1)}%`;
  };

  return (
    <Card className="shadow-medium">
      <CardHeader className="bg-gradient-card">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Avaliação de Critérios
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-semibold">Critério</th>
                <th className="text-center p-4 font-semibold">Tipo</th>
                <th className="text-center p-4 font-semibold">Meta</th>
                <th className="text-center p-4 font-semibold">Alcançado</th>
                <th className="text-center p-4 font-semibold">Status</th>
                <th className="text-center p-4 font-semibold">R$ Meta</th>
                <th className="text-center p-4 font-semibold">R$ Alcançado</th>
              </tr>
            </thead>
            <tbody>
              {criterios
                .filter(criterio => criterio.ativo)
                .sort((a, b) => a.ordem - b.ordem)
                .map((criterio) => {
                  const criterioAvaliacao = getCriterioAvaliacao(criterio.id);
                  
                  return (
                    <tr key={criterio.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="font-medium">{criterio.nome}</div>
                        
                      </td>
                      
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {criterio.tipoMeta === 'maior_melhor' ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-yellow-500" />
                          )}
                          <span className="text-sm text-muted-foreground">
                            {criterio.tipoMeta === 'maior_melhor' ? 'Maior' : 'Menor'}
                          </span>
                        </div>
                      </td>
                      
                      <td className="p-4 text-center font-medium">
                        {formatarValor(criterio, getMeta(criterio))}
                      </td>
                      
                      <td className="p-4 text-center">
                        {isEditable && onUpdateCriterio ? (
                          <Input
                            type="number"
                            value={criterioAvaliacao?.valorAlcancado || 0}
                            onChange={(e) => onUpdateCriterio(criterio.id, parseFloat(e.target.value) || 0)}
                            className="w-24 text-center mx-auto"
                            step={criterio.tipo === 'quantitativo' ? '1' : '0.1'}
                            min="0"
                          />
                        ) : (
                          <span className="font-medium">
                            {formatarValor(criterio, criterioAvaliacao?.metaAlcancada)}
                          </span>
                        )}
                      </td>
                      
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(criterioAvaliacao?.metaAtingida || false)}
                          {getStatusBadge(criterioAvaliacao?.metaAtingida || false)}
                        </div>
                      </td>
                      
                      <td className="p-4 text-center font-semibold text-primary">
                        {formatarMoeda(criterio.valorBonus || 0)}
                      </td>
                      
                      <td className="p-4 text-center font-bold">
                        <span className={(criterioAvaliacao?.valorBonusAlcancado || 0) >= (criterio.valorBonus || 0) ? 'text-green-500' : 'text-red-500'}>
                          {formatarMoeda(criterioAvaliacao?.valorBonusAlcancado || 0)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}