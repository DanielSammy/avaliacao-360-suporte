import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEvaluation } from '../contexts/EvaluationContext';
import { getAvaliacoes } from '@/services/evaluationService';
import { getOperadores } from '@/services/operatorService';
import { getCriterios } from '@/services/criteriaService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Operador } from '../types/evaluation';
import { getCurrentPeriod } from '@/lib/period';

export function EvaluationTracking() {
  const { state } = useEvaluation();
  const { user } = useAuth();

  const { dispatch } = useEvaluation();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const currentPeriod = getCurrentPeriod();

  const fetchAllData = React.useCallback(async () => {
    let mounted = true; // local guard for this invocation
    setAuthError(null);
    setLoading(true);
    try {
      // operadores
      try {
        const resp = await getOperadores();
        const ops = resp.data || [];
        if (mounted) dispatch({ type: 'FETCH_OPERADORES_SUCCESS', payload: ops });
      } catch (opErr) {
        console.error('Failed to fetch operadores for EvaluationTracking:', opErr);
        if (String(opErr).includes('401')) {
          if (mounted) setAuthError('Sessão inválida ou expirada. Por favor, faça login novamente.');
          throw opErr;
        }
      }

      // criterios
      try {
        const resp = await getCriterios();
        const raw = (resp && resp.data) ? resp.data : [];
        const transformed = raw.map((criterio: unknown) => {
          const rc = criterio as Record<string, unknown>;
          return {
            ...rc,
            id: rc.id as number,
            idCriterio: parseInt(String(rc.idCriterio ?? rc['idCriterio'] ?? 0), 10),
            nome: String(rc.nome ?? ''),
            tipo: (rc.tipo as 'qualitativo' | 'quantitativo') ?? 'qualitativo',
            tipoMeta: (rc.tipoMeta as 'maior_melhor' | 'menor_melhor') ?? 'maior_melhor',
            valorMeta: parseFloat(String(rc.valorMeta ?? 0)),
            ordem: Number(rc.ordem ?? 0),
            ativo: !!rc.ativo,
            mediaGeral: !!rc.mediaGeral,
            totalAvaliacoes: rc.totalAvaliacoes !== undefined ? parseInt(String(rc.totalAvaliacoes), 10) : undefined,
            valorBonus: rc.valorCriterio ? parseFloat(String(rc.valorCriterio)) : 0,
            metaCalculo: rc.metaCalculo !== undefined ? parseInt(String(rc.metaCalculo), 10) : undefined,
          };
        });
        if (mounted) dispatch({ type: 'SET_CRITERIOS', payload: transformed });
      } catch (crErr) {
        console.error('Failed to fetch criterios for EvaluationTracking:', crErr);
        if (String(crErr).includes('401')) {
          if (mounted) setAuthError('Sessão inválida ou expirada. Por favor, faça login novamente.');
          throw crErr;
        }
      }

      // avaliacoes
      const data = await getAvaliacoes(currentPeriod);
      const normalized = (data || []).map((d: any) => ({
        ...d,
        dataCriacao: d.dataCriacao ? new Date(d.dataCriacao) : new Date(),
        dataUltimaEdicao: d.dataUltimaEdicao ? new Date(d.dataUltimaEdicao) : new Date(),
      }));
      if (mounted) dispatch({ type: 'SET_AVALIACOES', payload: normalized });
    } catch (err) {
      console.error('Failed to fetch all data for EvaluationTracking:', err);
    } finally {
      setLoading(false);
    }
    return () => { mounted = false; };
  }, [currentPeriod, dispatch]);


  // operadores ativos (podem avaliar) e operadores exibidos (participam da avaliação, são avaliados)
  const allActiveOperators = state.operadores.filter(op => op.ativo);
  const displayedOperators = state.operadores.filter(op => op.ativo && op.participaAvaliacao);
  // critérios aplicáveis: somente critérios ativos com idCriterio === 2
  const applicableCriterios = state.criterios.filter(criterio => criterio.ativo && criterio.idCriterio === 2);
  const applicableCriterioIds = new Set(applicableCriterios.map(c => c.id));

  React.useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // ...existing code...


  const operatorEvaluationSummary = displayedOperators.map(operator => {
    const isManager = operator.grupo === 6 || operator.grupo === 7;

    // --- GIVEN: How many people should this operator evaluate? ---
    let peopleToEvaluate: Operador[];
    if (isManager) {
      // Managers/Admins evaluate all OTHER participating operators (displayed)
      peopleToEvaluate = displayedOperators.filter(p => p.id !== operator.id);
    } else {
      // Peers evaluate all OTHER participating PEERS (displayed peers)
      peopleToEvaluate = displayedOperators.filter(p => p.id !== operator.id && p.grupo !== 6 && p.grupo !== 7);
    }
    // Expected criteria count (meta) is number of applicable criterios
    const evaluationsExpectedToGive = applicableCriterios.length;

    // For 'Avaliações Dadas' conte critérios completos onde este operador, como avaliador,
    // avaliou TODOS os alvos esperados (peopleToEvaluate) para aquele critério no período atual.
    const evaluationsGivenByOperator = state.avaliacoes.filter(ev => {
      if (ev.periodo !== currentPeriod) return false;
      if (ev.avaliadorId === operator.id) return true;
      if (!Array.isArray(ev.criterios)) return false;
      return ev.criterios.some((c: any) => Number(c.avaliadorId) === operator.id);
    });
    let completedGivenCriteria = 0;
    for (const criterio of applicableCriterios) {
      const targetsEvaluated = new Set<number>();
      for (const ev of evaluationsGivenByOperator) {
        if (!Array.isArray(ev.criterios)) continue;
        for (const c of ev.criterios) {
          if (c.criterioId === criterio.id) {
            // cada criterio traz o avaliadorId agora; para 'dados' precisamos do operador alvo
            targetsEvaluated.add(ev.operadorId);
          }
        }
      }
      if (targetsEvaluated.size >= peopleToEvaluate.length) completedGivenCriteria += 1;
    }
    const evaluationsGivenCount = completedGivenCriteria;


    // --- RECEIVED: How many people should evaluate this operator? ---
    let peopleWhoShouldEvaluateThisOperator: Operador[];

    // Determine expected evaluators using ALL active operators (they may not be displayed)
    const managers = allActiveOperators.filter(p => (p.grupo === 6 || p.grupo === 7) && p.id !== operator.id);

    if (isManager) {
      // A manager is evaluated by other managers only (if any)
      peopleWhoShouldEvaluateThisOperator = managers;
    } else {
      // A peer is evaluated by managers and other peers (including peers who don't participate as evaluated)
      const peers = allActiveOperators.filter(p => p.grupo !== 6 && p.grupo !== 7 && p.id !== operator.id);
      peopleWhoShouldEvaluateThisOperator = [...managers, ...peers];
    }
    const evaluationsExpectedToReceive = applicableCriterios.length;

    // For 'Avaliações Recebidas' conte critérios completos onde, para este operador avaliado,
    // já existem avaliações de TODOS os avaliadores esperados para aquele critério no período atual.
    const evaluationsReceivedByOperator = state.avaliacoes.filter(ev => ev.operadorId === operator.id && ev.periodo === currentPeriod);
    let completedReceivedCriteria = 0;
    for (const criterio of applicableCriterios) {
      const evaluatorsWhoRated = new Set<number>();
      for (const ev of evaluationsReceivedByOperator) {
        if (!Array.isArray(ev.criterios)) continue;
        for (const c of ev.criterios) {
          if (c.criterioId === criterio.id) {
            // preferir o avaliadorId por critério, mas aceitar o avaliador no topo caso exista
            if (c.avaliadorId !== undefined && c.avaliadorId !== null) {
              evaluatorsWhoRated.add(Number(c.avaliadorId));
            } else if (ev.avaliadorId !== undefined && ev.avaliadorId !== null) {
              evaluatorsWhoRated.add(Number(ev.avaliadorId));
            }
          }
        }
      }
  // exigir avaliações de TODOS os operadores ATIVOS
  const expectedEvaluatorsCount = allActiveOperators.length;
  if (evaluatorsWhoRated.size >= expectedEvaluatorsCount) completedReceivedCriteria += 1;
    }
    const evaluationsReceivedCount = completedReceivedCriteria;


    // --- Status Logic ---
    let statusGiven: 'Concluído' | 'Pendente' | 'Em Andamento';
  let variantGiven: 'default' | 'secondary' | 'destructive' | 'outline' | 'outline-success' | 'success';

    if (evaluationsGivenCount >= evaluationsExpectedToGive) {
      statusGiven = 'Concluído';
  variantGiven = 'success';
    } else if (evaluationsGivenCount > 0) {
      statusGiven = 'Em Andamento';
      variantGiven = 'secondary';
    } else {
      statusGiven = 'Pendente';
      variantGiven = 'destructive';
    }

    let statusReceived: 'Concluído' | 'Pendente' | 'Em Andamento' | 'N/A';
  let variantReceived: 'default' | 'secondary' | 'destructive' | 'outline' | 'outline-success' | 'success';

    if (!operator.participaAvaliacao) { // This check is a bit redundant now, but safe
      statusReceived = 'N/A';
      variantReceived = 'outline';
    } else if (evaluationsReceivedCount >= evaluationsExpectedToReceive) {
      statusReceived = 'Concluído';
  variantReceived = 'success';
    } else if (evaluationsReceivedCount > 0) {
      statusReceived = 'Em Andamento';
      variantReceived = 'secondary';
    } else {
      statusReceived = 'Pendente';
      variantReceived = 'destructive';
    }

    return {
      operator,
      evaluationsReceivedCount,
      evaluationsGivenCount,
      evaluationsExpectedToGive,
      evaluationsExpectedToReceive,
      statusGiven,
      variantGiven,
      statusReceived,
      variantReceived,
    };
  });

  // Total pendente: calcular sobre TODOS os operadores ativos (inclui aqueles não exibidos)
  // Fórmula: totalPossible = allActiveOperators.length * numeroDeCriterios
  // totalCompleted = soma de criterios completos recebidos por cada operador ativo
  // Somar exatamente os "avaliou: X" exibidos no popover (cada operador: quantos critérios aplicáveis ele avaliou)
  let totalCompletedAcrossAll = 0;
  for (const op of allActiveOperators) {
    // critérios que este operador avaliou (como avaliador) no período atual
    const evalsByOp = state.avaliacoes.filter(ev => {
      if (ev.periodo !== currentPeriod) return false;
      if (ev.avaliadorId === op.id) return true;
      if (!Array.isArray(ev.criterios)) return false;
      return ev.criterios.some((c: any) => Number(c.avaliadorId) === op.id);
    });
    const criteriaEvaluatedByOp = new Set<number>();
    for (const ev of evalsByOp) {
      if (!Array.isArray(ev.criterios)) continue;
      for (const c of ev.criterios) {
        const criterioAplicavel = applicableCriterioIds.has(c.criterioId);
        const criterioPorEsseAvaliador = (c.avaliadorId !== undefined && Number(c.avaliadorId) === op.id) || ev.avaliadorId === op.id;
        if (criterioAplicavel && criterioPorEsseAvaliador) criteriaEvaluatedByOp.add(c.criterioId);
      }
    }
    totalCompletedAcrossAll += criteriaEvaluatedByOp.size;
  }

  const totalPossible = allActiveOperators.length * applicableCriterios.length;
  const totalPendingEvaluations = Math.max(0, totalPossible - totalCompletedAcrossAll);
  const showTable = !loading && state.operadores.length > 0 && state.criterios.length > 0;

  return (
    <div className="container mx-auto p-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Acompanhamento de Avaliações 360</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-lg font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
              <div>
                Total de Avaliações Pendentes: <span className={totalPendingEvaluations === 0 ? 'text-green-600' : 'text-red-600'}>{totalPendingEvaluations}</span>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <div className="text-sm text-muted-foreground cursor-pointer px-2 py-1 rounded-md border flex items-center">
                    <Info className="h-4 w-4" />
                  </div>
                </PopoverTrigger>
                <PopoverContent>
                  <div className="space-y-2">
                    <div className="font-semibold">Resumo de Cálculo</div>
                    <div>Avaliadores considerados: <strong>{allActiveOperators.length}</strong></div>
                    <div>Operadores exibidos (avaliados): <strong>{displayedOperators.length}</strong></div>
                    <div>Total possível (avaliadores × critérios): <strong>{totalPossible}</strong></div>
                    <div>Total completado: <strong>{totalCompletedAcrossAll}</strong></div>

                    {/* (Secao pessoal removida conforme solicitado) */}

                    <div className="pt-2 font-semibold">Detalhe por operador (completos / {applicableCriterios.length})</div>
                    <div className="max-h-40 overflow-auto">
                      {allActiveOperators.map(op => {
                        const rec = operatorEvaluationSummary.find(r => r.operator.id === op.id);
                        const completed = rec ? rec.evaluationsReceivedCount : 0;
                        // calcular quantos critérios este operador já avaliou como avaliador
                        const evalsByOp = state.avaliacoes.filter(ev => {
                          if (ev.periodo !== currentPeriod) return false;
                          if (ev.avaliadorId === op.id) return true;
                          if (!Array.isArray(ev.criterios)) return false;
                          return ev.criterios.some((c: any) => Number(c.avaliadorId) === op.id);
                        });
                        const criteriaEvaluatedByOp = new Set<number>();
                        for (const ev of evalsByOp) {
                          if (!Array.isArray(ev.criterios)) continue;
                          for (const c of ev.criterios) {
                            // Conte este criterio apenas se for aplicavel E se foi avaliado por este operador
                            const criterioAplicavel = applicableCriterioIds.has(c.criterioId);
                            const criterioPorEsseAvaliador = (c.avaliadorId !== undefined && Number(c.avaliadorId) === op.id) || ev.avaliadorId === op.id;
                            if (criterioAplicavel && criterioPorEsseAvaliador) criteriaEvaluatedByOp.add(c.criterioId);
                          }
                        }

                        const evaluatedCount = criteriaEvaluatedByOp.size;
                        const totalC = applicableCriterios.length;
                        const isNone = evaluatedCount === 0;
                        const isComplete = evaluatedCount >= totalC && totalC > 0;
                        const isInProgress = !isNone && !isComplete;

                        const nameClass = isNone ? 'text-red-600 font-semibold' : isComplete ? 'text-green-600 font-semibold' : 'text-sky-600 font-semibold';
                        const badgeClass = isNone ? 'text-red-600 font-semibold' : isComplete ? 'text-green-600 font-semibold' : 'text-sky-600 font-semibold';

                        return (
                          <div key={op.id} className="text-sm flex justify-between items-center">
                            <span className={`truncate max-w-[160px] ${nameClass}`}>{op.nome}</span>
                            <div className="flex gap-4 items-center">
                              <span className={badgeClass}>avaliou: {evaluatedCount} / {totalC}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {(user && (user.grupo === 6 || user.grupo === 7)) && (
              <div>
                <Link to="/">
                  <Button variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                </Link>
              </div>
            )}
            {/* botão Recarregar removido conforme solicitado */}
          </div>
          {loading && (
            <div className="p-6 text-center text-sm text-muted-foreground">Carregando avaliações...</div>
          )}

          {authError && (
            <div className="p-6 text-center text-sm text-destructive">
              {authError} {' '}
              <Link to="/login" className="underline">Ir para Login</Link>
            </div>
          )}

          {!loading && !showTable && (
            <div className="p-6 text-center text-sm text-muted-foreground">Aguardando operadores e critérios carregarem. Se você limpou a memória local, carregue novamente a página ou faça login para buscar os dados do servidor.</div>
          )}

          {showTable && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operador</TableHead>
                  <TableHead className="text-center">Avaliações Dadas</TableHead>
                  <TableHead className="text-center">Status (Dadas)</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span>Avaliações Recebidas</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="text-sm text-muted-foreground cursor-pointer px-1 py-0.5 rounded-md"><Info className="h-4 w-4" /></div>
                        </PopoverTrigger>
                        <PopoverContent>
                          <div className="text-sm">
                            Esse contador só será considerado quando TODOS os operadores ativos tiverem avaliado o critério (ou seja, completa quando atingir {allActiveOperators.length} avaliações para o critério).
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Status (Recebidas)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operatorEvaluationSummary.map(({ 
                  operator, 
                  evaluationsGivenCount, 
                  evaluationsExpectedToGive, 
                  evaluationsReceivedCount, 
                  evaluationsExpectedToReceive, 
                  statusGiven, 
                  variantGiven, 
                  statusReceived, 
                  variantReceived 
                }) => (
                  <TableRow key={operator.id}>
                    <TableCell className="font-medium">{operator.nome}</TableCell>
                    <TableCell className="text-center">{evaluationsGivenCount} / {evaluationsExpectedToGive}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={variantGiven}>{statusGiven}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{evaluationsReceivedCount} / {evaluationsExpectedToReceive}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={variantReceived}>{statusReceived}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}