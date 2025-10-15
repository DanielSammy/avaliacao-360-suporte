import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { useToast } from '@/hooks/use-toast';
import { getOperadores } from '@/services/operatorService';
import { getTipoCriterios } from '@/services/criteriaService';
import { Operador } from '@/types/evaluation';
import { getAuthToken } from '@/config/apiConfig';
import { PDFGenerator } from './PDFGenerator';
import { getEvaluationDashboard } from '@/services/evaluationService';
import { CalculationReportGenerator } from './CalculationReportGenerator';
import { formatarMoeda, formatarPeriodo, formatarPercentual, calcularBonusAlcancado, calcularResultadoBloco, calcularResultadoFinal } from '@/utils/calculations';
import { BarChart3, TrendingUp, Users, Award, Calendar, FileText } from 'lucide-react';

export function ReportsPanel() {
  const { state, fetchOperadores, fetchAvaliacoes } = useEvaluation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [periodoSelecionado, setPeriodoSelecionado] = useState<string>('todos');
  const [operadorSelecionado, setOperadorSelecionado] = useState<number | 'todos'>('todos');
  useEffect(() => {
    // Garantir que o estado global de operadores seja preenchido após reload da página
    // (o EvaluatePanel/EvaluateOperators também confia em state.operadores)
    void fetchOperadores().catch(() => {
      toast({ title: 'Erro', description: 'Falha ao carregar operadores (context).', variant: 'destructive' });
    });
    // carregar avaliações iniciais para popular períodos
    void fetchAvaliacoes().catch(() => {
      toast({ title: 'Erro', description: 'Falha ao carregar avaliações (context).', variant: 'destructive' });
    });
  }, []);

  // Quando o período selecionado mudar, refetch das avaliações para garantir que
  // os períodos e avaliações estejam sincronizados com o backend
  useEffect(() => {
    const periodo = periodoSelecionado === 'todos' ? undefined : periodoSelecionado;
    void fetchAvaliacoes(periodo).catch(() => {
      toast({ title: 'Erro', description: 'Falha ao carregar avaliações para o período.', variant: 'destructive' });
    });
  }, [periodoSelecionado]);

  // Helper robusto para converter valores numéricos vindos da API
  const parseNumeric = (v?: string | number | null): number => {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    // tratar strings: normalizar vírgula para ponto e remover espaços
    const s = String(v).trim().replace(/\s+/g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  // Gerar lista de períodos disponíveis
  const periodosDisponiveis = useMemo(() => {
    const periodos = new Set(state.avaliacoes.map(av => av.periodo));
    return Array.from(periodos).sort().reverse();
  }, [state.avaliacoes]);

  // Buscar tipos de critério (usados para escolher valores por nível conforme operador)
  const [tiposCriterio, setTiposCriterio] = React.useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tipos = await getTipoCriterios();
        if (!mounted) return;
        setTiposCriterio(tipos || []);
      } catch (err) {
        console.warn('Não foi possível carregar tipos de critério (ReportsPanel):', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Cache local de dashboards (por operador_periodo) — pre-carregado abaixo
  const [dashboardsMap, setDashboardsMap] = React.useState<Record<string, any>>({});

  // Helper: construir chave para o cache
  const dashboardKey = (operadorId: number | string, periodo: string) => `${String(operadorId)}_${periodo}`;

  // Constrói um objeto Avaliacao a partir do response do dashboard (mesma lógica usada ao gerar o PDF)
  const buildAvaliacaoFromDashboard = (dashboard: any) => {
    const criteriosResp = dashboard?.data?.criterios || [];
    const criteriosAvaliacao = criteriosResp.map((c: any) => {
      const original = (state.criterios.find((crit: any) => crit.id === c.criterioId) as any) || {};
      const valorAlcancadoNum = parseFloat(c.metaAlcancada) || 0;
      const criterioForCalc = {
        id: c.criterioId,
        idCriterio: original.idCriterio || 0,
        nome: c.criterioNome,
        tipo: c.criterioTipo,
        tipoMeta: c.criterioTipoMeta,
        valorMeta: c.metaObjetivo || 0,
        valorCriterio: original.valorCriterio,
        valorBonus: parseFloat(c.valorMeta) || 0,
      } as any;
      const bonusCalculado = calcularBonusAlcancado(criterioForCalc, valorAlcancadoNum);
      return {
        criterioId: c.criterioId,
        valorAlcancado: String(valorAlcancadoNum),
        valorBonusAlcancado: bonusCalculado,
        metaAtingida: c.metaAtingida,
        metaAlcancada: c.metaAlcancada,
      };
    });

    return {
      id: 0,
      operadorId: dashboard.data.operadorId || dashboard.data.operador || 0,
      avaliadorId: 0,
      periodo: dashboard.data.periodo,
      criterios: criteriosAvaliacao,
      valorTotalMeta: parseFloat(dashboard.data.valorTotalMeta) || 0,
      valorTotalAlcancado: parseFloat(dashboard.data.valorTotalAlcancado) || 0,
      dataCriacao: new Date(),
      dataUltimaEdicao: new Date(),
    } as any;
  };

  // Helper que replica o cálculo do resumo do PDF para uma avaliação específica
  const calcularResumoAvaliacao = (avaliacao: any) => {
    // se tivermos o dashboard cacheado, usar esse objeto (que é o mesmo passado pro PDF)
    const key = dashboardKey(avaliacao.operadorId, avaliacao.periodo);
    const dashboard = dashboardsMap[key];
    const avaliacaoUsar = dashboard ? buildAvaliacaoFromDashboard(dashboard) : avaliacao;
    // construir blocos a partir dos critérios globais (state.criterios)
  const criteriosAtivos = state.criterios.filter((c: any) => c.ativo).sort((a: any, b: any) => (a.idCriterio - b.idCriterio) || (a.ordem - b.ordem));
    const blocosMap: Record<number, any[]> = {};
    criteriosAtivos.forEach((c: any) => {
      if (!blocosMap[c.idCriterio]) blocosMap[c.idCriterio] = [];
      blocosMap[c.idCriterio].push(c);
    });

    let globalValorPossivel = 0;
    let globalTotalAlcancado = 0;

    const getValorCriterio = (c: any): number => {
      const raw = (c as any).valorCriterio;
      if (raw !== undefined && raw !== null) {
        if (typeof raw === 'string') return parseFloat(String(raw).replace(',', '.')) || 0;
        if (typeof raw === 'number') return raw;
      }
      return Number(c.valorBonus ?? 0);
    };

    for (const idBlocoStr of Object.keys(blocosMap)) {
      const idBloco = parseInt(idBlocoStr, 10);
      const criteriosDoBloco = blocosMap[idBloco];

      let valorPossivel = criteriosDoBloco.reduce((acc: number, c: any) => acc + getValorCriterio(c), 0);
      if (idBloco === 1 || idBloco === 2) {
        // escolher valor possível conforme o nível do operador (quando tiposCriterio estiver disponível)
        const operador = state.operadores.find((op: any) => String(op.id) === String(avaliacao.operadorId));
        const nivelStr = operador?.nivel || ''; // ex: 'Nivel 1'
        const tipoObj = tiposCriterio.find(t => t.id === idBloco);
        if (tipoObj) {
          if (nivelStr && nivelStr.includes('2') && typeof tipoObj.valorNvl2 === 'number') {
            valorPossivel = Number(tipoObj.valorNvl2 ?? valorPossivel);
          } else if (nivelStr && nivelStr.includes('3') && typeof tipoObj.valorNvl3 === 'number') {
            valorPossivel = Number(tipoObj.valorNvl3 ?? valorPossivel);
          } else {
            valorPossivel = Number(tipoObj.valorNvl1 ?? valorPossivel);
          }
        }
      }

      // mapear percentuais por criterio (0-100)
      const percentMap: Record<number, number> = {};
      criteriosDoBloco.forEach((c: any) => {
        const ca = avaliacaoUsar.criterios.find((x: any) => x.criterioId === c.id);
        const valorAlc = ca ? parseFloat(String(ca.valorAlcancado).replace(',', '.')) || 0 : 0;
        let rowPercent = NaN;
        if (c.tipo === 'qualitativo') {
          const metaAlc = ca?.metaAlcancada ?? '';
          rowPercent = metaAlc ? parseFloat(String(metaAlc).replace(',', '.')) || NaN : NaN;
        } else {
          const target = c.valorMeta || 0;
          if (!isNaN(valorAlc) && target > 0) {
            if (c.tipoMeta === 'menor_melhor') rowPercent = (target / valorAlc) * 100;
            else rowPercent = (valorAlc / target) * 100;
          }
        }
        percentMap[c.id] = rowPercent;
      });

      // calcular totalAlcancadoBlock
      let totalAlcancadoBlock = 0;
      if (idBloco === 1 || idBloco === 2) {
        const vals = Object.values(percentMap).filter(p => !isNaN(p)) as number[];
        const avgPercent = vals.length > 0 ? (vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
        totalAlcancadoBlock = (avgPercent / 100) * valorPossivel;
      } else {
        totalAlcancadoBlock = criteriosDoBloco.reduce((acc: number, c: any) => {
                const ca = avaliacaoUsar.criterios.find((x: any) => x.criterioId === c.id);
          return acc + (ca?.valorBonusAlcancado || 0);
        }, 0);
      }

      globalValorPossivel += valorPossivel;
      globalTotalAlcancado += totalAlcancadoBlock;
    }

    const percentualPerformance = globalValorPossivel > 0 ? (globalTotalAlcancado / globalValorPossivel) * 100 : 0;
    return { globalValorPossivel, globalTotalAlcancado, percentualPerformance };
  };

  // (O efeito de pré-carregamento de dashboards foi movido para depois da declaração de `avaliacoesFiltradas`)

  const avaliacoesFiltradas = useMemo(() => {
    return state.avaliacoes.filter(av => {
      const periodoMatch = periodoSelecionado === 'todos' || av.periodo === periodoSelecionado;
      const operadorMatch = operadorSelecionado === 'todos' || String(av.operadorId) === String(operadorSelecionado);
      return periodoMatch && operadorMatch;
    });
  }, [state.avaliacoes, periodoSelecionado, operadorSelecionado]);

  // Pré-carregar dashboards para as avaliações visíveis (cache) sempre que avaliacoesFiltradas mudar
  useEffect(() => {
    let mounted = true;
    const missing: Array<Promise<void>> = [];
    const newMap = { ...dashboardsMap };
    avaliacoesFiltradas.forEach(av => {
      const key = dashboardKey(av.operadorId, av.periodo);
      if (!newMap[key]) {
        const p = getEvaluationDashboard(av.operadorId, av.periodo)
          .then(d => {
            if (!mounted) return;
            newMap[key] = d;
          })
          .catch(err => {
            // não bloquear; manter sem cache
            console.warn('Falha ao carregar dashboard para cache:', av.operadorId, av.periodo, err);
          });
        missing.push(p.then(() => undefined));
      }
    });

    if (missing.length > 0) {
      void Promise.all(missing).then(() => {
        if (!mounted) return;
        setDashboardsMap(newMap);
      });
    }

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avaliacoesFiltradas]);

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

    const totalBonusPago = avaliacoesFiltradas.reduce((total, av) => total + parseNumeric(av.valorTotalAlcancado), 0);
    const mediaBonusAlcancado = avaliacoesFiltradas.length > 0 ? totalBonusPago / avaliacoesFiltradas.length : 0;

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
    const operadorStats = new Map<number, any>();
    const operadoresFonte = state.operadores;
    const operadoresAtivos = operadoresFonte.filter(op => op.ativo && op.participaAvaliacao);
    avaliacoesFiltradas.forEach(av => {
      const operador = operadoresFonte.find(op => op.id === av.operadorId);
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
      stats.totalBonus += parseNumeric(av.valorTotalAlcancado);
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
    const periodoStats = new Map<string, any>();
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
      stats.totalBonus += parseNumeric(av.valorTotalAlcancado);
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
  const operadoresFonte = state.operadores;
  const activeOperators = operadoresFonte.filter(op => op.ativo && op.participaAvaliacao);
    const totalOperatorsCount = activeOperators.length;

      return avaliacoesFiltradas
        .filter(avaliacao => {
          const operador = operadoresFonte.find(op => String(op.id) === String(avaliacao.operadorId));
          // Excluir operadores que não participam da avaliação
          return operador && operador.ativo && operador.participaAvaliacao;
        })
        .map(avaliacao => {
    const operador = operadoresFonte.find(op => String(op.id) === String(avaliacao.operadorId));
      const metasAtingidas = avaliacao.criterios.filter(c => c.metaAtingida).length;
      const totalMetas = avaliacao.criterios.length;
      const percentualMetas = totalMetas > 0 ? (metasAtingidas / totalMetas) * 100 : 0;
      const valorTotalAlc = parseNumeric(avaliacao.valorTotalAlcancado);
      const valorTotalMeta = parseNumeric(avaliacao.valorTotalMeta);
      const performance = valorTotalMeta > 0 ? (valorTotalAlc / valorTotalMeta) * 100 : 0;

  const evaluationsReceived = state.avaliacoes.filter(evalItem => String(evalItem.operadorId) === String(avaliacao.operadorId));
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
  }).sort((a, b) => parseNumeric(b.avaliacao.valorTotalAlcancado) - parseNumeric(a.avaliacao.valorTotalAlcancado));
  }, [avaliacoesFiltradas, state.operadores, state.avaliacoes]);

  // operadores avaliados no período selecionado (para lista de destinatários / filtros)
  const operadoresAvaliadosNoPeriodo = useMemo(() => {
    const avals = periodoSelecionado === 'todos' ? state.avaliacoes : state.avaliacoes.filter(av => av.periodo === periodoSelecionado);
    const ids = new Set(avals.map(a => a.operadorId));
    return state.operadores.filter(op => ids.has(op.id) && op.ativo && op.participaAvaliacao);
  }, [state.avaliacoes, state.operadores, periodoSelecionado]);

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div className="text-left">
                <h2 className="text-3xl font-bold text-primary mb-2">Relatórios e Análises</h2>
                <p className="text-muted-foreground">Acompanhe o desempenho e gere relatórios detalhados</p>
            </div>
            <div className="flex items-center gap-2">
                <CalculationReportGenerator />
                {/* Botão que calcula ranking a partir dos dados atuais e navega para /ranking com state */}
                <Button onClick={() => {
                  // calcular ranking reutilizando lógica similar à página /ranking
                  const todosCriteriosAtivos = state.criterios.filter((c: any) => c.ativo);
                  const blocos = todosCriteriosAtivos.reduce((acc: any, criterio: any) => {
                    const idBloco = criterio.idCriterio;
                    if (!acc[idBloco]) acc[idBloco] = [];
                    acc[idBloco].push(criterio);
                    return acc;
                  }, {});

                  const ranking = state.operadores
                    .filter((op: any) => op.ativo && op.participaAvaliacao)
                    .map((operador: any) => {
                      // usar avaliacoesFiltradas para respeitar período/operador filtrados na tela
                      // e, quando disponível no cache, usar a versão do dashboard (igual ao PDF)
                      const avaliacoesRaw = avaliacoesFiltradas.filter((av: any) => String(av.operadorId) === String(operador.id));
                      const avaliacoesDoOperador = avaliacoesRaw.map((av: any) => {
                        const key = dashboardKey(av.operadorId, av.periodo);
                        const dash = dashboardsMap[key];
                        return dash ? buildAvaliacaoFromDashboard(dash) : av;
                      });
                      if (avaliacoesDoOperador.length === 0) {
                        return { operador, pontuacaoFinal: 0, totalAvaliacoes: 0, averageValorAlcancado: 0 };
                      }

                      const pontuacaoDosBlocos = Object.keys(blocos).map(idBlocoStr => {
                        const idBloco = parseInt(idBlocoStr);
                        const criteriosDoBloco = blocos[idBloco];
                        const performanceDoBloco = calcularResultadoBloco(idBloco, todosCriteriosAtivos, avaliacoesDoOperador, state.operadores);
                        const bonusPotencialDoBloco = criteriosDoBloco.reduce((sum: number, c: any) => sum + (c.valorBonus ?? 0), 0);
                        return (performanceDoBloco / 100) * bonusPotencialDoBloco;
                      });

                      const pontuacaoFinal = pontuacaoDosBlocos.reduce((sum: number, bonus: number) => sum + bonus, 0);
                      const allAchievedScores = todosCriteriosAtivos.map(c => calcularResultadoFinal(c, avaliacoesDoOperador, state.operadores));
                      const averageValorAlcancado = allAchievedScores.length > 0 ? allAchievedScores.reduce((a: number, b: number) => a + b, 0) / allAchievedScores.length : 0;

                      return { operador, pontuacaoFinal, totalAvaliacoes: avaliacoesDoOperador.length, averageValorAlcancado };
                    })
                    .sort((a: any, b: any) => b.pontuacaoFinal - a.pontuacaoFinal);

                  navigate('/ranking', { state: { precomputedRanking: ranking } });
                }}>
                  <Award className="mr-2 h-4 w-4" /> Ver Ranking Geral
                </Button>
            </div>
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
              <Select value={operadorSelecionado.toString()} onValueChange={(value) => setOperadorSelecionado(value === 'todos' ? 'todos' : parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Operadores</SelectItem>
                  {state.operadores.filter(op => op.ativo && op.participaAvaliacao).map(operador => (
                    <SelectItem key={operador.id} value={operador.id.toString()}>
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
                    <th className="text-center p-4 font-semibold">Performance Geral</th>
                    <th className="text-center p-4 font-semibold">Valor Total Alcançado</th>
                    <th className="text-center p-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosTabela.map(({ avaliacao, operador, metasAtingidas, totalMetas, percentualMetas, performance, isCompleted }) => {
                    return (
                    <tr key={avaliacao.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="font-medium">{operador?.nome || 'Operador não encontrado'}</div>
                      </td>
                      <td className="p-4 text-center">
                        {formatarPeriodo(avaliacao.periodo)}
                      </td>
                      {(() => {
                        const resumo = calcularResumoAvaliacao(avaliacao);
                        return (
                          <>
                            <td className="p-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-medium">{formatarPercentual(resumo.percentualPerformance)}</span>
                                <div className="w-20 bg-muted rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full" 
                                    style={{ width: `${Math.min(resumo.percentualPerformance, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center font-bold text-success">
                              {formatarMoeda(resumo.globalTotalAlcancado)}
                            </td>
                          </>
                        );
                      })()}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Botão para gerar/baixar PDF usando dados do dashboard (mesma fonte do EvaluationPanel) */}
                          {operador && (
                            <button
                              className="px-3 py-1 rounded bg-muted text-muted-foreground text-sm"
                              onClick={async () => {
                                try {
                                  // buscar dados do dashboard para garantir mesma fonte que EvaluationPanel
                                  const dashboard = await getEvaluationDashboard(avaliacao.operadorId, avaliacao.periodo);
                                  const criteriosResp = dashboard.data.criterios || [];
                                  // Calcular valorBonusAlcancado usando a mesma lógica do EvaluationPanel
                                  const { calcularBonusAlcancado } = await import('@/utils/calculations');
                                  const criteriosAvaliacao = criteriosResp.map((c: any) => {
                                    const valorAlcancadoNum = parseFloat(c.metaAlcancada) || 0;
                                    // construir um objeto Criterio mínimo para o cálculo (preservar valorCriterio quando possível)
                                    const original = (state.criterios.find((crit: any) => crit.id === c.criterioId) as any) || {};
                                    const criterioForCalc = {
                                      id: c.criterioId,
                                      idCriterio: original.idCriterio || 0,
                                      nome: c.criterioNome,
                                      tipo: c.criterioTipo,
                                      tipoMeta: c.criterioTipoMeta,
                                      valorMeta: c.metaObjetivo || 0,
                                      valorCriterio: original.valorCriterio,
                                      valorBonus: parseFloat(c.valorMeta) || 0,
                                    } as any;

                                    const bonusCalculado = calcularBonusAlcancado(criterioForCalc, valorAlcancadoNum);

                                    return {
                                      criterioId: c.criterioId,
                                      valorAlcancado: String(valorAlcancadoNum),
                                      valorBonusAlcancado: bonusCalculado,
                                      metaAtingida: c.metaAtingida,
                                      metaAlcancada: c.metaAlcancada,
                                    };
                                  });

                                  const avaliacaoParaPdf = {
                                    id: 0,
                                    operadorId: avaliacao.operadorId,
                                    avaliadorId: 0,
                                    periodo: avaliacao.periodo,
                                    criterios: criteriosAvaliacao,
                                    valorTotalMeta: parseFloat(dashboard.data.valorTotalMeta) || 0,
                                    valorTotalAlcancado: parseFloat(dashboard.data.valorTotalAlcancado) || 0,
                                    dataCriacao: new Date(),
                                    dataUltimaEdicao: new Date(),
                                  } as any;

                                  const { generatePdfBlob } = await import('./PDFGenerator');
                                  // passar os critérios enriquecidos (com valorCriterio) para o PDF em vez do state.criterios cru
                                  const criteriosParaPdf = criteriosResp.map((c: any) => {
                                    const original = (state.criterios.find((crit: any) => crit.id === c.criterioId) as any) || {};
                                    return {
                                      id: c.criterioId,
                                      idCriterio: original.idCriterio || 0,
                                      nome: c.criterioNome,
                                      tipo: c.criterioTipo,
                                      tipoMeta: c.criterioTipoMeta,
                                      valorMeta: c.metaObjetivo,
                                      ordem: original.ordem || 0,
                                      ativo: original.ativo !== false,
                                      valorCriterio: original.valorCriterio,
                                      valorBonus: parseFloat(c.valorMeta) || 0,
                                    } as any;
                                  });

                                  const { fileName, blob } = await generatePdfBlob(avaliacaoParaPdf, operador as any, criteriosParaPdf);
                                  // download
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = fileName;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  URL.revokeObjectURL(url);
                                } catch (err) {
                                  console.error('Erro ao gerar PDF enriquecido:', err);
                                  toast({ title: 'Erro', description: 'Falha ao gerar o PDF enriquecido.', variant: 'destructive' });
                                }
                              }}
                            >Gerar PDF</button>
                          )}
                          {/* Botão enviar por email: tenta chamar /reports/send, senão apenas baixa o PDF via PDFGenerator */}
                          <button
                            className="px-3 py-1 rounded bg-primary text-white text-sm"
                            onClick={async () => {
                              try {
                                // Buscar dados do dashboard para montar a avaliação completa (mesma lógica do EvaluationPanel)
                                const dashboard = await getEvaluationDashboard(avaliacao.operadorId, avaliacao.periodo);
                                const criteriosResp = dashboard.data.criterios || [];
                                // Calcular valorBonusAlcancado usando utilitário de cálculos
                                const { calcularBonusAlcancado } = await import('@/utils/calculations');
                                const criteriosAvaliacao = criteriosResp.map((c: any) => {
                                  const valorAlcancadoNum = parseFloat(c.metaAlcancada) || 0;
                                  const original = (state.criterios.find((crit: any) => crit.id === c.criterioId) as any) || {};
                                  const criterioForCalc = {
                                    id: c.criterioId,
                                    idCriterio: original.idCriterio || 0,
                                    nome: c.criterioNome,
                                    tipo: c.criterioTipo,
                                    tipoMeta: c.criterioTipoMeta,
                                    valorMeta: c.metaObjetivo || 0,
                                    valorCriterio: original.valorCriterio,
                                    valorBonus: parseFloat(c.valorMeta) || 0,
                                  } as any;
                                  const bonusCalculado = calcularBonusAlcancado(criterioForCalc, valorAlcancadoNum);

                                  return {
                                    criterioId: c.criterioId,
                                    valorAlcancado: String(valorAlcancadoNum),
                                    valorBonusAlcancado: bonusCalculado,
                                    metaAtingida: c.metaAtingida,
                                    metaAlcancada: c.metaAlcancada,
                                  };
                                });

                                const avaliacaoParaPdf = {
                                  id: 0,
                                  operadorId: avaliacao.operadorId,
                                  avaliadorId: 0,
                                  periodo: avaliacao.periodo,
                                  criterios: criteriosAvaliacao,
                                  valorTotalMeta: parseFloat(dashboard.data.valorTotalMeta) || 0,
                                  valorTotalAlcancado: parseFloat(dashboard.data.valorTotalAlcancado) || 0,
                                  dataCriacao: new Date(),
                                  dataUltimaEdicao: new Date(),
                                } as any;

                                const { generatePdfBlob } = await import('./PDFGenerator');
                                const criteriosParaPdf = criteriosResp.map((c: any) => {
                                  const original = (state.criterios.find((crit: any) => crit.id === c.criterioId) as any) || {};
                                  return {
                                    id: c.criterioId,
                                    idCriterio: original.idCriterio || 0,
                                    nome: c.criterioNome,
                                    tipo: c.criterioTipo,
                                    tipoMeta: c.criterioTipoMeta,
                                    valorMeta: c.metaObjetivo,
                                    ordem: original.ordem || 0,
                                    ativo: original.ativo !== false,
                                    valorCriterio: original.valorCriterio,
                                    valorBonus: parseFloat(c.valorMeta) || 0,
                                  } as any;
                                });

                                const { fileName, blob } = await generatePdfBlob(avaliacaoParaPdf, operador as any, criteriosParaPdf);

                                const smtpHost = localStorage.getItem('smtpHost') || undefined;
                                const smtpPort = localStorage.getItem('smtpPort') ? Number(localStorage.getItem('smtpPort')) : undefined;
                                const smtpUser = localStorage.getItem('smtpUser') || undefined;
                                const smtpPassword = localStorage.getItem('smtpPassword') || undefined;

                                const to = String((operador as any)?.email ?? operador?.login ?? '');
                                const subject = `Avaliação do operador ${operador?.nome}`;
                                const content = `Olá ${operador?.nome},\n\nVocê está recebendo por e-mail sua avaliação referente ao período ${avaliacao.periodo}. Em anexo segue o relatório em PDF.\n\nAtenciosamente,\nEquipe Space Sistemas`;

                                const { sendEmailWithAttachment } = await import('@/services/reportService');
                                const resp = await sendEmailWithAttachment({ to, subject, content, isHtml: true, smtpHost, smtpPort, smtpUser, smtpPassword }, blob, fileName);

                                if (resp.ok) {
                                  toast({ title: 'Enviado', description: 'Relatório enviado por e-mail com sucesso.' });
                                } else {
                                  const text = await resp.text().catch(() => '<no body>');
                                  toast({ title: 'Erro', description: `Servidor rejeitou o envio: ${resp.status} - ${text}`, variant: 'destructive' });
                                }
                              } catch (err) {
                                console.error('Erro ao enviar relatório por email:', err);
                                toast({ title: 'Erro', description: 'Falha ao gerar ou enviar o PDF. Baixe o PDF manualmente.', variant: 'destructive' });
                              }
                            }}
                          >Enviar por e-mail</button>
                        </div>
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
