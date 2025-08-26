import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { PDFGenerator } from './PDFGenerator';
import { formatarMoeda, formatarPeriodo, formatarPercentual } from '@/utils/calculations';
import { BarChart3, TrendingUp, Users, Award, Calendar, FileText } from 'lucide-react';

export function ReportsPanel() {
  const { state } = useEvaluation();
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>('todos');
  const [operadorSelecionado, setOperadorSelecionado] = useState<string>('todos');

  // Gerar lista de períodos disponíveis
  const periodosDisponiveis = useMemo(() => {
    const periodos = new Set(state.avaliacoes.map(av => av.periodo));
    return Array.from(periodos).sort().reverse();
  }, [state.avaliacoes]);

  // Filtrar avaliações
  const avaliacoesFiltradas = useMemo(() => {
    return state.avaliacoes.filter(av => {
      const periodoMatch = periodoSelecionado === 'todos' || av.periodo === periodoSelecionado;
      const operadorMatch = operadorSelecionado === 'todos' || av.operadorId === operadorSelecionado;
      return periodoMatch && operadorMatch;
    });
  }, [state.avaliacoes, periodoSelecionado, operadorSelecionado]);

  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    if (avaliacoesFiltradas.length === 0) {
      return {
        totalAvaliacoes: 0,
        mediaBonusAlcancado: 0,
        totalBonusPago: 0,
        percentualMetasAtingidas: 0,
        melhorOperador: null,
        melhorPeriodo: null
      };
    }

    const totalBonusPago = avaliacoesFiltradas.reduce((total, av) => total + av.valorTotalAlcancado, 0);
    const mediaBonusAlcancado = totalBonusPago / avaliacoesFiltradas.length;

    // Calcular percentual de metas atingidas
    let totalMetas = 0;
    let metasAtingidas = 0;
    
    avaliacoesFiltradas.forEach(av => {
      av.criterios.forEach(c => {
        totalMetas++;
        if (c.metaAtingida) metasAtingidas++;
      });
    });

    const percentualMetasAtingidas = totalMetas > 0 ? (metasAtingidas / totalMetas) * 100 : 0;

    // Encontrar melhor operador
    const operadorStats = new Map();
    avaliacoesFiltradas.forEach(av => {
      const operador = state.operadores.find(op => op.id === av.operadorId);
      if (!operador) return;

      if (!operadorStats.has(av.operadorId)) {
        operadorStats.set(av.operadorId, {
          nome: operador.nome,
          totalBonus: 0,
          totalAvaliacoes: 0,
          metasAtingidas: 0,
          totalMetas: 0
        });
      }

      const stats = operadorStats.get(av.operadorId);
      stats.totalBonus += av.valorTotalAlcancado;
      stats.totalAvaliacoes++;
      stats.metasAtingidas += av.criterios.filter(c => c.metaAtingida).length;
      stats.totalMetas += av.criterios.length;
    });

    let melhorOperador = null;
    let melhorMedia = 0;

    operadorStats.forEach((stats, operadorId) => {
      const media = stats.totalBonus / stats.totalAvaliacoes;
      if (media > melhorMedia) {
        melhorMedia = media;
        melhorOperador = stats;
      }
    });

    // Encontrar melhor período
    const periodoStats = new Map();
    avaliacoesFiltradas.forEach(av => {
      if (!periodoStats.has(av.periodo)) {
        periodoStats.set(av.periodo, {
          periodo: av.periodo,
          totalBonus: 0,
          totalAvaliacoes: 0,
          metasAtingidas: 0,
          totalMetas: 0
        });
      }

      const stats = periodoStats.get(av.periodo);
      stats.totalBonus += av.valorTotalAlcancado;
      stats.totalAvaliacoes++;
      stats.metasAtingidas += av.criterios.filter(c => c.metaAtingida).length;
      stats.totalMetas += av.criterios.length;
    });

    let melhorPeriodo = null;
    let melhorMediaPeriodo = 0;

    periodoStats.forEach((stats) => {
      const media = stats.totalBonus / stats.totalAvaliacoes;
      if (media > melhorMediaPeriodo) {
        melhorMediaPeriodo = media;
        melhorPeriodo = stats;
      }
    });

    return {
      totalAvaliacoes: avaliacoesFiltradas.length,
      mediaBonusAlcancado,
      totalBonusPago,
      percentualMetasAtingidas,
      melhorOperador,
      melhorPeriodo
    };
  }, [avaliacoesFiltradas, state.operadores]);

  // Dados para tabela de resultados
  const dadosTabela = useMemo(() => {
    const activeOperators = state.operadores.filter(op => op.ativo);
    const totalOperatorsCount = activeOperators.length;

    return avaliacoesFiltradas.map(avaliacao => {
      const operador = state.operadores.find(op => op.id === avaliacao.operadorId);
      const metasAtingidas = avaliacao.criterios.filter(c => c.metaAtingida).length;
      const totalMetas = avaliacao.criterios.length;
      const percentualMetas = totalMetas > 0 ? (metasAtingidas / totalMetas) * 100 : 0;
      const performance = avaliacao.valorTotalMeta > 0
        ? (avaliacao.valorTotalAlcancado / avaliacao.valorTotalMeta) * 100
        : 0;

      const evaluationsReceived = state.avaliacoes.filter(evalItem => evalItem.operadorId === avaliacao.operadorId);
      const evaluationsExpectedToReceive = totalOperatorsCount > 1 ? totalOperatorsCount - 1 : 0;
      const isCompleted = evaluationsReceived.length === evaluationsExpectedToReceive;

      return {
        avaliacao,
        operador,
        metasAtingidas,
        totalMetas,
        percentualMetas,
        performance,
        isCompleted
      };
    }).sort((a, b) => b.avaliacao.valorTotalAlcancado - a.avaliacao.valorTotalAlcancado);
  }, [avaliacoesFiltradas, state.operadores, state.avaliacoes]);

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div className="text-left">
                <h2 className="text-3xl font-bold text-primary mb-2">Relatórios e Análises</h2>
                <p className="text-muted-foreground">Acompanhe o desempenho e gere relatórios detalhados</p>
            </div>
            <Link to="/ranking">
                <Button>
                    <Award className="mr-2 h-4 w-4" /> Ver Ranking Geral
                </Button>
            </Link>
      </div>

      {/* Filtros */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Filtros do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Períodos</SelectItem>
                  {periodosDisponiveis.map(periodo => (
                    <SelectItem key={periodo} value={periodo}>
                      {formatarPeriodo(periodo)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Operador</label>
              <Select value={operadorSelecionado} onValueChange={setOperadorSelecionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Operadores</SelectItem>
                  {state.operadores.filter(op => op.ativo).map(operador => (
                    <SelectItem key={operador.id} value={operador.id}>
                      {operador.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-medium hover:shadow-large transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{estatisticas.totalAvaliacoes}</div>
            <p className="text-xs text-muted-foreground">
              Avaliações processadas
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-medium hover:shadow-large transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média de Bônus</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatarMoeda(estatisticas.mediaBonusAlcancado)}
            </div>
            <p className="text-xs text-muted-foreground">
              Por avaliação
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-medium hover:shadow-large transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
            <Award className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {formatarMoeda(estatisticas.totalBonusPago)}
            </div>
            <p className="text-xs text-muted-foreground">
              Em bônus
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-medium hover:shadow-large transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Atingidas</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {formatarPercentual(estatisticas.percentualMetasAtingidas)}
            </div>
            <p className="text-xs text-muted-foreground">
              Taxa de sucesso
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Destaques */}
      {estatisticas.melhorOperador && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="text-lg">Melhor Operador</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-xl font-bold text-primary">
                  {estatisticas.melhorOperador.nome}
                </div>
                <div className="text-sm text-muted-foreground">
                  Média: {formatarMoeda(estatisticas.melhorOperador.totalBonus / estatisticas.melhorOperador.totalAvaliacoes)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Metas: {estatisticas.melhorOperador.metasAtingidas}/{estatisticas.melhorOperador.totalMetas}
                </div>
              </div>
            </CardContent>
          </Card>

          {estatisticas.melhorPeriodo && (
            <Card className="shadow-medium">
              <CardHeader>
                <CardTitle className="text-lg">Melhor Período</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-xl font-bold text-success">
                    {formatarPeriodo(estatisticas.melhorPeriodo.periodo)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Média: {formatarMoeda(estatisticas.melhorPeriodo.totalBonus / estatisticas.melhorPeriodo.totalAvaliacoes)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Avaliações: {estatisticas.melhorPeriodo.totalAvaliacoes}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabela de Resultados */}
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle>Resultados Detalhados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {dadosTabela.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Operador</th>
                    <th className="text-center p-4 font-semibold">Período</th>
                    <th className="text-center p-4 font-semibold">Performance</th>
                    <th className="text-center p-4 font-semibold">Metas</th>
                    <th className="text-center p-4 font-semibold">Bônus</th>
                    <th className="text-center p-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosTabela.map(({ avaliacao, operador, metasAtingidas, totalMetas, percentualMetas, performance, isCompleted }) => {
                    console.log(`Operador: ${operador?.nome}, isCompleted: ${isCompleted}`);
                    return (
                    <tr key={avaliacao.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="font-medium">{operador?.nome || 'Operador não encontrado'}</div>
                      </td>
                      <td className="p-4 text-center">
                        {formatarPeriodo(avaliacao.periodo)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium">{formatarPercentual(performance)}</span>
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${Math.min(performance, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium">{metasAtingidas}/{totalMetas}</span>
                          <Badge 
                            variant={percentualMetas >= 80 ? "default" : percentualMetas >= 60 ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {formatarPercentual(percentualMetas)}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold text-success">
                        {formatarMoeda(avaliacao.valorTotalAlcancado)}
                      </td>
                      <td className="p-4 text-center">
                        {operador && isCompleted && (
                          <PDFGenerator
                            avaliacao={avaliacao}
                            operador={operador}
                            criterios={state.criterios}
                          />
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                Nenhuma avaliação encontrada
              </h3>
              <p className="text-muted-foreground">
                Ajuste os filtros ou realize algumas avaliações primeiro
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}