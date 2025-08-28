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
    if (criterio.tipo === 'quantitativo') {
      // valorMeta was removed. It now depends on operator level,
      // which is not available in this component.
      // Returning null will cause formatarValor to display 'N/A'.
      return null;
    }
    return criterio.tipoMeta === 'maior_melhor' ? 100 : 25;
  };

  const metaAtingidaLocal = (criterio: Criterio, valorAlcancado: number) => {
    const meta = getMeta(criterio);
    if (meta === undefined || meta === null) {
      return false; // Cannot determine, assume not met
    }
    if (criterio.tipoMeta === 'menor_melhor') {
      return valorAlcancado <= meta;
    }
    return valorAlcancado >= meta;
  };

  const getStatusIcon = (criterio: Criterio, valorAlcancado: number) => {
    const atingiu = metaAtingidaLocal(criterio, valorAlcancado);
    if (atingiu) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = (criterio: Criterio, valorAlcancado: number) => {
    const atingiu = metaAtingidaLocal(criterio, valorAlcancado);
    return (
      <Badge variant={atingiu ? "default" : "destructive"} className="font-medium">
        {atingiu ? "Meta Atingida" : "Meta Não Atingida"}
      </Badge>
    );
  };

  const formatarValor = (criterio: Criterio, valor?: number | null) => {
    if (valor === null || valor === undefined) {
      return 'N/A';
    }
    if (criterio.tipo === 'quantitativo') {
      return valor.toString();
    }
    return `${valor.toFixed(1)}%`;
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
                  const valorAlcancado = criterioAvaliacao?.valorAlcancado || 0;
                  
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
                            value={valorAlcancado}
                            onChange={(e) => onUpdateCriterio(criterio.id, parseFloat(e.target.value) || 0)}
                            className="w-24 text-center mx-auto"
                            step={criterio.tipo === 'quantitativo' ? '1' : '0.1'}
                            min="0"
                          />
                        ) : (
                          <span className="font-medium">
                            {formatarValor(criterio, valorAlcancado)}
                          </span>
                        )}
                      </td>
                      
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getStatusIcon(criterio, valorAlcancado)}
                          {getStatusBadge(criterio, valorAlcancado)}
                        </div>
                      </td>
                      
                      <td className="p-4 text-center font-semibold text-primary">
                        {formatarMoeda(criterio.valorBonus || 0)}
                      </td>
                      
                      <td className="p-4 text-center font-bold">
                        <span className={metaAtingidaLocal(criterio, valorAlcancado) ? 'text-green-500' : 'text-red-500'}>
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