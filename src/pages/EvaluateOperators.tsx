import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useEvaluation } from '../contexts/EvaluationContext';
import { useAuth } from '../contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Criterio } from '@/types/evaluation';
import { createBulkEvaluations, checkCriterionEvaluated } from '../services/evaluationService';
import { updateCriterio } from '@/services/criteriaService';
import { getMySuitePerformanceAvaliacoes, MySuitePerformanceRequest, getMySuiteConcluidosPorContato } from '@/services/operatorService';
import { calcularValorAlcancadoFinal } from '../utils/calculations';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, Loader2, ArrowLeft, Download } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate, Link } from 'react-router-dom';

export function EvaluateOperators() {
  const { state, dispatch } = useEvaluation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(null);
  const [evaluationValues, setEvaluationValues] = useState<{ [operatorId: string]: number | string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCriterion, setIsLoadingCriterion] = useState(true);
  const [isAllEvaluatedDialogOpen, setIsAllEvaluatedDialogOpen] = useState(false);
  const [sessionEvaluatedIds, setSessionEvaluatedIds] = useState<Set<number>>(new Set());

  const loggedInOperatorAsEvaluator = useMemo(() => {
    if (!user?.login) return null;
    return state.operadores.find(op => op.login === user.login) || null;
  }, [state.operadores, user?.login]);

  const avaliadorId = loggedInOperatorAsEvaluator?.id || null;
  const avaliadorEstaAtivo = loggedInOperatorAsEvaluator ? !!loggedInOperatorAsEvaluator.ativo : true;

  const activeOperators = state.operadores.filter(op => op.ativo && op.participaAvaliacao);
  const currentPeriod = new Date().getFullYear().toString() + '-' + (new Date().getMonth() + 1).toString().padStart(2, '0');

  const filteredCriterios = useMemo(() => {
    return state.criterios.filter(criterio => {
      if (user?.grupo === 6 || user?.grupo === 7) {
        return true;
      }
      return criterio.idCriterio === 2;
    });
  }, [state.criterios, user?.grupo]);

  // helper: mapear idCriterio para string legível
  const tipoCriterioLabel = useCallback((idCriterio: number) => {
    switch (idCriterio) {
      case 1: return 'GERENCIA';
      case 2: return 'AVALIACAO 360';
      case 3: return 'AVALIACAO METAS';
      default: return 'OUTRO';
    }
  }, []);

  

  const evaluatedCriteriaIds = useMemo(() => {
    if (!avaliadorId) return new Set<number>();
    const ids = new Set<number>();
    state.avaliacoes.forEach(avaliacao => {
      if (avaliacao.avaliadorId === avaliadorId) {
        avaliacao.criterios.forEach(c => ids.add(c.criterioId));
      }
    });
    return ids;
  }, [state.avaliacoes, avaliadorId]);

  const allEvaluatedIds = useMemo(() => 
    new Set([...evaluatedCriteriaIds, ...sessionEvaluatedIds]), 
    [evaluatedCriteriaIds, sessionEvaluatedIds]
  );

  const findNextCriterion = useCallback((startId: string | null = null) => {
    const availableCriterios = filteredCriterios.filter(c => !allEvaluatedIds.has(c.id));
    if (availableCriterios.length === 0) return null;

    if (!startId) return availableCriterios[0];

    const currentIndex = availableCriterios.findIndex(c => c.id.toString() === startId);
    const nextIndex = currentIndex + 1;

    return nextIndex < availableCriterios.length ? availableCriterios[nextIndex] : null;
  }, [filteredCriterios, allEvaluatedIds]);


  const checkAndSetCriterion = useCallback(async (criterion: Criterio | null) => {
    if (!criterion || !avaliadorId) {
      const allAvailableEvaluated = filteredCriterios.every(c => allEvaluatedIds.has(c.id));
      if (allAvailableEvaluated && filteredCriterios.length > 0) {
        setIsAllEvaluatedDialogOpen(true);
      }
      setIsLoadingCriterion(false);
      return;
    }

    setIsLoadingCriterion(true);
    setSelectedCriterionId(criterion.id.toString());

    try {
      const response = await checkCriterionEvaluated(currentPeriod, avaliadorId, criterion.id);
      if (response.avaliado) {
        setSessionEvaluatedIds(prev => {
          const s = new Set(prev);
          s.add(criterion.id);
          return s;
        });
        const nextCriterion = findNextCriterion(criterion.id.toString());
        // await next check to avoid unbounded recursion
        if (nextCriterion) await checkAndSetCriterion(nextCriterion);
      } else {
        setEvaluationValues({});
        setIsLoadingCriterion(false);
      }
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao verificar status do critério.", variant: "destructive" });
      setIsLoadingCriterion(false);
    }
  }, [avaliadorId, currentPeriod, findNextCriterion, toast, allEvaluatedIds, filteredCriterios]);

  // Pre-check seguro: verifica em lote quais critérios já estão avaliados e seleciona
  // o primeiro não avaliado sem chamar checkAndSetCriterion recursivamente (evita loops).
  const precheckDoneRef = useRef(false);
  useEffect(() => {
    if (precheckDoneRef.current) return;
    if (!avaliadorId || filteredCriterios.length === 0) {
      setIsLoadingCriterion(false);
      return;
    }

    precheckDoneRef.current = true;

    const preCheckAll = async () => {
      setIsLoadingCriterion(true);
      try {
        const results = await Promise.allSettled(
          filteredCriterios.map(async (c) => {
            try {
              const resp = await checkCriterionEvaluated(currentPeriod, avaliadorId, c.id);
              return resp.avaliado ? c.id : null;
            } catch (e) {
              return null;
            }
          })
        );

        const evaluatedFromApi = new Set<number>();
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value) evaluatedFromApi.add(r.value as number);
        }

        // unir com avaliações já existentes no estado global
        const unionIds = new Set<number>([...evaluatedCriteriaIds]);
        for (const id of evaluatedFromApi) unionIds.add(id);

        if (unionIds.size > 0) {
          setSessionEvaluatedIds(prev => {
            const s = new Set(prev);
            for (const id of unionIds) s.add(id);
            return s;
          });
        }

        // selecionar primeiro critério não avaliado
        const firstNotEvaluated = filteredCriterios.find(c => !unionIds.has(c.id));
        if (firstNotEvaluated) {
          setSelectedCriterionId(firstNotEvaluated.id.toString());
          setEvaluationValues({});
          setIsLoadingCriterion(false);
        } else {
          // todos avaliados
          setIsLoadingCriterion(false);
          if (filteredCriterios.length > 0) setIsAllEvaluatedDialogOpen(true);
        }
      } catch (err) {
        toast({ title: 'Erro', description: 'Falha ao verificar critérios avaliados.', variant: 'destructive' });
        setIsLoadingCriterion(false);
      }
    };

    void preCheckAll();
  }, [avaliadorId, filteredCriterios, currentPeriod, evaluatedCriteriaIds, toast]);


  const selectedCriterion = useMemo(() => {
    if (!selectedCriterionId) return null;
    return state.criterios.find(c => c.id.toString() === selectedCriterionId) || null;
  }, [selectedCriterionId, state.criterios]);

  const handleCriterionSelect = (criterionId: string) => {
    const criterion = filteredCriterios.find(c => c.id.toString() === criterionId);
    checkAndSetCriterion(criterion || null);
  };

  const handleEvaluationChange = (operatorId: string, value: string) => {
    const numericValue = selectedCriterion?.tipo === 'qualitativo' ? parseInt(value, 10) : parseFloat(value);
    setEvaluationValues(prev => ({
      ...prev,
      [operatorId]: isNaN(numericValue) ? '' : numericValue,
    }));
  };

  const handleSaveAndNext = async () => {
    // proteção adicional: garantir que o avaliador ainda esteja ativo antes de enviar
    if (loggedInOperatorAsEvaluator && !loggedInOperatorAsEvaluator.ativo) {
      toast({ title: 'Erro', description: 'Seu usuário está inativo e não pode submeter avaliações.', variant: 'destructive' });
      return;
    }

    if (!avaliadorId || !selectedCriterionId || !selectedCriterion) {
        toast({ title: "Erro", description: "Avaliador não encontrado ou dados de avaliação insuficientes.", variant: "destructive" });
        return;
      }
  
      if (!user?.login) {
        toast({ title: "Erro", description: "Email do usuário logado não disponível.", variant: "destructive" });
        return;
      }
  
      setIsSubmitting(true);
  
      const evaluationData = Object.entries(evaluationValues)
        .filter(([, valorAlcancadoInput]) => valorAlcancadoInput !== '' && valorAlcancadoInput !== null)
        .map(([operadorId, valorAlcancadoInput]) => {
          const operator = state.operadores.find(op => op.id.toString() === operadorId);
          if (!operator) return null;
  
          const potentialBonus = 0;
          
          const calculatedValorBonus = calcularValorAlcancadoFinal(
            selectedCriterion,
            Number(valorAlcancadoInput),
            potentialBonus
          );
  
          return {
            operadorId: parseInt(operadorId, 10),
            avaliadorId: avaliadorId,
            periodo: currentPeriod,
            valorMeta: String(selectedCriterion.valorMeta),
            inputValue: String(valorAlcancadoInput),
            potentialBonus: potentialBonus,
            bonusValue: calculatedValorBonus,
          };
        })
        .filter(Boolean);
  
      if (evaluationData.length === 0) {
          toast({ title: "Atenção", description: "Nenhuma avaliação foi preenchida para este critério.", variant: "default" });
          setIsSubmitting(false);
          const nextCriterion = findNextCriterion(selectedCriterionId);
          checkAndSetCriterion(nextCriterion);
          return;
      }
  
      const avaliacoesParaApi = evaluationData.map(data => ({
        operadorId: data.operadorId,
        periodo: data.periodo,
        valorObjetivo: String(data.potentialBonus.toFixed(2)), 
        valorAlcancado: String(data.bonusValue.toFixed(2)),
        metaObjetivo: Number(data.valorMeta), 
        // metaAlcancada deve ser enviada como string com 2 casas decimais
        metaAlcancada: String(Number(data.inputValue).toFixed(2)),
      }));
  
      const avaliacoesParaDispatch = evaluationData.map(data => ({
        operadorId: data.operadorId,
        avaliadorId: data.avaliadorId,
        periodo: data.periodo,
        // para o estado local, armazenamos valorAlcancado como string
        valorAlcancado: String(data.inputValue),
        valorBonusAlcancado: String(data.bonusValue.toFixed(2)),
      }));
  
      try {
        const payload = {
          criterioId: parseInt(selectedCriterionId, 10),
          avaliadorId: avaliadorId,
          avaliacoes: avaliacoesParaApi,
        };
  
        const response = await createBulkEvaluations(payload);
  
        if (response.success) {
          toast({ title: "Sucesso!", description: `Avaliações para o critério "${selectedCriterion.nome}" foram salvas.` });
          dispatch({ type: 'ADD_AVALIACAO_BULK', payload: { criterioId: selectedCriterion.id, avaliacoes: avaliacoesParaDispatch } });
          // Marcar no estado de sessão como avaliado imediatamente para atualizar UI (ícone e disabled)
          setSessionEvaluatedIds(prev => {
            const s = new Set(prev);
            s.add(selectedCriterion.id);
            return s;
          });
          const nextCriterion = findNextCriterion(selectedCriterionId);
          checkAndSetCriterion(nextCriterion);
        } else {
          toast({ title: "Erro", description: response.message || "Falha ao salvar avaliações.", variant: "destructive" });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
        toast({ title: "Erro de Rede", description: errorMessage, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
  };

  const handleImportMySuiteAndSave = async () => {
    if (!avaliadorId || !selectedCriterionId || !selectedCriterion) {
      toast({ title: 'Erro', description: 'Avaliador ou critério não encontrado.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // calcular datas: dataInicial 21 do mês anterior, dataFinal 20 do mês atual baseado em currentPeriod
      const [year, month] = currentPeriod.split('-').map(Number);
      const dataFinal = new Date(year, month - 1, 20);
      const prevMonth = new Date(year, month - 2, 1);
      const dataInicial = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 21);
      const formatDDMMYYYY = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

      const payload: MySuitePerformanceRequest = {
        dataInicial: formatDDMMYYYY(dataInicial),
        dataFinal: formatDDMMYYYY(dataFinal),
        consideraDtAbertura: true,
      };

      const results = await getMySuitePerformanceAvaliacoes(payload);
      if (!results || results.length === 0) {
        toast({ title: 'Nenhum dado', description: 'MySuite retornou vazio para o período selecionado.', variant: 'default' });
        return;
      }

  // índice por operadorCodigo
  const resultsByCodigo: Record<number, import('@/services/operatorService').MySuitePerformanceItem> = {};
  results.forEach((r: import('@/services/operatorService').MySuitePerformanceItem | unknown) => {
    const rr = r as import('@/services/operatorService').MySuitePerformanceItem;
    if (rr && typeof rr.operadorCodigo === 'number') resultsByCodigo[rr.operadorCodigo] = rr;
  });

      // escolher critérios do state que têm metaCalculo === 1 (tickets concluídos), 2 (quantitativo) ou 3 (metas)
      const criteriosToImport = state.criterios.filter(c => (c.metaCalculo === 1 || c.metaCalculo === 2 || c.metaCalculo === 3) && c.ativo);
      if (criteriosToImport.length === 0) {
        toast({ title: 'Nenhum critério', description: 'Não há critérios ativos com metaCalculo = 1, 2 ou 3.', variant: 'default' });
        return;
      }

      let totalAvaliacoesImportadas = 0;
      let criteriosProcessados = 0;

      for (const criterio of criteriosToImport) {
        // Se metaCalculo === 1, precisamos consultar outro endpoint que retorna tickets concluídos por contato
  let avaliacoesParaApi: Array<Record<string, unknown>> = [];

        if (criterio.metaCalculo === 1) {
          // buscar tickets concluidos por contato
          const tickets = await getMySuiteConcluidosPorContato(payload);
          // total de tickets concluídos no primeiro contato
          const totalConcluidosFirstContact = (tickets || []).length;

          // calcular quantidade total de tickets no período somando quantidadeTotalTicket de results (se existir)
          // quando não houver `results` (ou resultsByCodigo), consideramos soma 0
          const totalTicketsPeriodo = results && Array.isArray(results)
            ? results.reduce((acc, r) => acc + (Number(((r as import('@/services/operatorService').MySuitePerformanceItem).quantidadeTotalTicket) || 0)), 0)
            : 0;

          // evitar divisão por zero: percentual será 0 se totalTicketsPeriodo === 0
          const percentageForAll = totalTicketsPeriodo > 0
            ? (totalConcluidosFirstContact / totalTicketsPeriodo) * 100
            : 0;

          const potentialBonusFromCriterio = criterio.valorBonus || 0;

          // aplicar mesmo percentual para todos operadores que tenham codigoMysuite (mesmo valor para todos)
          avaliacoesParaApi = state.operadores
            .filter(op => op.codigoMysuite)
            .map(op => {
              // usar percentageForAll para cálculo de bônus
              const bonusValue = calcularValorAlcancadoFinal(criterio, percentageForAll, potentialBonusFromCriterio);
              return {
                operadorId: op.id,
                periodo: currentPeriod,
                valorObjetivo: String(potentialBonusFromCriterio.toFixed(2)),
                // usar o mesmo percentual para valorAlcancado/metaAlcancada
                valorAlcancado: String(percentageForAll.toFixed(2)),
                metaObjetivo: Math.round(Number(criterio.valorMeta)),
                metaAlcancada: String(percentageForAll.toFixed(2)),
              };
            });
        } else {
          // metaCalculo 2 ou 3 já cobertos pelo payload de performance
          avaliacoesParaApi = state.operadores
            .filter(op => op.codigoMysuite && resultsByCodigo[op.codigoMysuite])
            .map(op => {
              const mys = resultsByCodigo[op.codigoMysuite];
              // decidir o valor base conforme o tipo de meta
              // metaCalculo === 3 -> usar mediaAvaliacao
              // metaCalculo === 2 -> usar quantidadeTotalTicket
              const isQuantitativo = criterio.metaCalculo === 2;
              const baseValue = isQuantitativo ? Number(mys.quantidadeTotalTicket || 0) : Number(mys.mediaAvaliacao || 0);
              const potentialBonusFromCriterio = criterio.valorBonus || 0;
              const bonusValue = calcularValorAlcancadoFinal(criterio, baseValue, potentialBonusFromCriterio);

              // construir objeto: metaAlcancada sempre será o valor vindo do MySuite (string)
              return {
                operadorId: op.id,
                periodo: currentPeriod,
                valorObjetivo: String(potentialBonusFromCriterio.toFixed(2)),
                // enviar o valor base (média ou quantidade) como valorAlcancado para cálculo local
                valorAlcancado: String(baseValue.toFixed(2)),
                metaObjetivo: Math.round(Number(criterio.valorMeta)),
                // metaAlcancada agora é o valor base (string com 2 casas)
                metaAlcancada: String(baseValue.toFixed(2)),
              };
            });
        
        // Se for quantitativo (metaCalculo === 2), calcular a média dos valores base e gravar como valorMeta no critério
        if (criterio.metaCalculo === 2 && avaliacoesParaApi.length > 0) {
          try {
            const valores = avaliacoesParaApi.map(a => parseFloat(String((a as Record<string, unknown>).valorAlcancado).replace(',', '.')) || 0);
            const soma = valores.reduce((acc, v) => acc + v, 0);
            const media = valores.length > 0 ? soma / valores.length : 0;
            const mediaArredondada = Math.round(media);
            // tentar buscar critério atual no servidor para mesclar, evitando sobrescrever campos
            let payloadToUpdate: Record<string, unknown> = { valorMeta: mediaArredondada };
            try {
              const serverCriterio = await (await import('@/services/criteriaService')).getCriterio(criterio.id);
                payloadToUpdate = { ...(serverCriterio as unknown as Record<string, unknown>), valorMeta: mediaArredondada };
                delete (payloadToUpdate as Record<string, unknown>).id;
                delete (payloadToUpdate as Record<string, unknown>).totalAvaliacoes;
            } catch (getErr) {
              // fallback para usar estado local se GET falhar
              const existing = state.criterios.find(c => c.id === criterio.id) as import('@/types/evaluation').Criterio | undefined;
              payloadToUpdate = existing ? { ...existing, valorMeta: mediaArredondada } : { valorMeta: mediaArredondada };
              delete (payloadToUpdate as Record<string, unknown>).id;
              delete (payloadToUpdate as Record<string, unknown>).totalAvaliacoes;
            }

            // criar payload reduzido com apenas os campos esperados pelo backend
            const allowedPayload: Record<string, unknown> = {};
            // trabalhar com vista tipada
            const ptu = payloadToUpdate as Record<string, unknown>;
            // ativo: backend espera 0/1
            if (ptu.ativo !== undefined) allowedPayload.ativo = ptu.ativo ? 1 : 0;
            if (ptu.nome !== undefined) allowedPayload.nome = ptu.nome;
            if (ptu.idCriterio !== undefined) allowedPayload.idCriterio = Number(ptu.idCriterio);
            if (ptu.tipo !== undefined) allowedPayload.tipo = ptu.tipo;
            if (ptu.tipoMeta !== undefined) allowedPayload.tipoMeta = ptu.tipoMeta;
            // valorMeta deve ser número
            allowedPayload.valorMeta = Number(mediaArredondada);
            if (ptu.ordem !== undefined) allowedPayload.ordem = Number(ptu.ordem) || null;
            // valorCriterio: preferir se já existir como string; senão usar valorBonus formatado
            let valorCriterioStr = undefined as string | undefined;
            if (ptu.valorCriterio !== undefined && ptu.valorCriterio !== null) {
              valorCriterioStr = String(ptu.valorCriterio);
            } else if (ptu.valorBonus !== undefined) {
              const vb = typeof ptu.valorBonus === 'number' ? ptu.valorBonus : parseFloat(String(ptu.valorBonus) || '0');
              valorCriterioStr = vb.toFixed(2);
            }
            if (valorCriterioStr !== undefined) allowedPayload.valorCriterio = valorCriterioStr;

            try {
              const upd = await updateCriterio(criterio.id, allowedPayload as unknown as Record<string, unknown>);
              if (upd && (upd as Record<string, unknown>).success && (upd as Record<string, unknown>).data) {
                // atualizar estado local para refletir nova meta
                dispatch({ type: 'UPDATE_CRITERIO', payload: (upd as Record<string, unknown>).data as any });
              } else {
                // fallback: atualizar estado local apenas com valorMeta para não perder outros campos
                dispatch({ type: 'UPDATE_CRITERIO', payload: { ...criterio, valorMeta: mediaArredondada } });
              }
            } catch (errUpdate) {
              // tentar extrair mensagem de erro do corpo se possível
              let errMsg = errUpdate instanceof Error ? errUpdate.message : 'Erro desconhecido';
              try {
                // se for Response-like com text, tentar ler
                const maybeResp = (errUpdate as unknown as Record<string, unknown>).response;
                if (maybeResp && typeof (maybeResp as any).text === 'function') {
                  const txt = await (maybeResp as any).text();
                  errMsg = txt || errMsg;
                }
              } catch (_) {
                // ignore
              }
              toast({ title: 'Erro ao atualizar critério', description: `${criterio.nome}: ${errMsg}`, variant: 'destructive' });
              // fallback local
              dispatch({ type: 'UPDATE_CRITERIO', payload: { ...criterio, valorMeta: mediaArredondada } });
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro desconhecido ao atualizar critério';
            toast({ title: 'Aviso', description: `Falha ao atualizar média do critério ${criterio.nome}: ${message}`, variant: 'destructive' });
          }
        }
        }

        if (avaliacoesParaApi.length === 0) continue;

        // preparar payload sem campos temporários
        const payloadToSend = {
          criterioId: criterio.id,
          avaliadorId: avaliadorId,
          avaliacoes: avaliacoesParaApi.map((a) => {
            const operadorId = Number((a as Record<string, unknown>).operadorId);
            const periodo = String((a as Record<string, unknown>).periodo);
            const valorObjetivo = String((a as Record<string, unknown>).valorObjetivo ?? '0');
            const metaObjetivo = Number((a as Record<string, unknown>).metaObjetivo ?? 0);
            const media = parseFloat(String((a as Record<string, unknown>).valorAlcancado).replace(',', '.')) || 0;
            const potentialBonus = criterio.valorBonus || 0;
            const bonusValue = calcularValorAlcancadoFinal(criterio, media, potentialBonus);

            return {
              operadorId,
              periodo,
              valorObjetivo,
              // enviar o bônus calculado como valorAlcancado (string)
              valorAlcancado: String(bonusValue.toFixed(2)),
              metaObjetivo,
              // enviar a média como metaAlcancada (string com casas decimais)
              metaAlcancada: String(media.toFixed(2)),
            };
          }),
        };

  // debug logging removed for optimization

        const resp = await createBulkEvaluations(payloadToSend);
        if (resp && resp.success) {
          const avaliacoesParaDispatch = avaliacoesParaApi.map((a) => {
            const criterioAtual = criterio;
            const mediaNum = parseFloat(String((a as Record<string, unknown>).valorAlcancado).replace(',', '.')) || 0;
            const potentialBonus = criterioAtual.valorBonus || 0;
            const bonusCalc = calcularValorAlcancadoFinal(criterioAtual, mediaNum, potentialBonus);
            return {
              operadorId: Number((a as Record<string, unknown>).operadorId),
              avaliadorId: avaliadorId,
              periodo: String((a as Record<string, unknown>).periodo),
              // para o estado local, valorAlcancado deve ser a média (string)
              valorAlcancado: String((a as Record<string, unknown>).valorAlcancado),
              // valorBonusAlcancado será o bônus calculado (string)
              valorBonusAlcancado: String(bonusCalc.toFixed(2)),
            };
          });
          dispatch({ type: 'ADD_AVALIACAO_BULK', payload: { criterioId: criterio.id, avaliacoes: avaliacoesParaDispatch } });
          totalAvaliacoesImportadas += avaliacoesParaApi.length;
          criteriosProcessados += 1;
        }
      }

      if (criteriosProcessados > 0) {
        toast({ title: 'Importação concluída', description: `${criteriosProcessados} critérios processados e ${totalAvaliacoesImportadas} avaliações importadas.`, variant: 'default' });
      } else {
        toast({ title: 'Nenhuma correspondência', description: 'Nenhum operador com codigoMysuite correspondente foi encontrado para os critérios com metaCalculo = 2 ou 3.', variant: 'default' });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const allOperatorsEvaluated = activeOperators.length === Object.keys(evaluationValues).length;
  const isCurrentCriterionEvaluated = selectedCriterionId ? allEvaluatedIds.has(parseInt(selectedCriterionId, 10)) : false;

  // Se ainda estamos carregando o critério inicial, manter loader
  if (isLoadingCriterion && !selectedCriterionId) {
    return (
        <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  // Evita condição de race: se há um usuário logado e os operadores ainda
  // não foram carregados, bloquear a tela até sabermos se o avaliador está ativo.
  if (user && !state.operadoresLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // Se o avaliador logado existir e não estiver ativo, bloquear a tela de avaliação
  if (loggedInOperatorAsEvaluator && !avaliadorEstaAtivo) {
    return (
      <div className="container mx-auto p-6">
        <Card className="shadow-lg">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-6">
              <h2 className="text-xl font-semibold">Você não está ativo</h2>
              <p className="mt-2 text-muted-foreground">Operadores inativos não podem avaliar outros operadores.</p>
              {/* mostrar botão Voltar apenas para usuários com grupo 6 ou 7 */}
              {user && (user.grupo === 6 || user.grupo === 7) && (
                <div className="mt-6">
                  <Link to="/">
                    <Button variant="outline">Voltar</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
        <AlertDialog open={isAllEvaluatedDialogOpen} onOpenChange={setIsAllEvaluatedDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Avaliações Concluídas</AlertDialogTitle>
                    <AlertDialogDescription>
                        Todos os critérios disponíveis já foram avaliados por você.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    {(user && (user.grupo === 6 || user.grupo === 7)) ? (
                      <AlertDialogAction onClick={() => navigate('/')}>Voltar para o Início</AlertDialogAction>
                    ) : (
                      // para usuários sem permissão apenas fecha o diálogo
                      <AlertDialogAction onClick={() => setIsAllEvaluatedDialogOpen(false)}>Fechar</AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold">Avaliar por Critério</CardTitle>
            {(user && (user.grupo === 6 || user.grupo === 7)) && (
              <div className="flex items-center gap-2">
                <Link to="/">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                </Link>
                <Button onClick={handleImportMySuiteAndSave} disabled={isSubmitting} variant="default" size="sm">
                  Importar Mysuite
                </Button>
              </div>
            )}
          </CardHeader>
        <CardContent>
          <div className="mb-6">
            <label htmlFor="criterion-select" className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o Critério de Avaliação:
            </label>
            <Select onValueChange={handleCriterionSelect} value={selectedCriterionId || ''} disabled={isLoadingCriterion}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isLoadingCriterion ? "Verificando critérios..." : "Selecione um critério"} />
              </SelectTrigger>
              <SelectContent>
                {filteredCriterios.map(criterio => {
                  const isEvaluated = allEvaluatedIds.has(criterio.id);
                  // verificar se existe alguma avaliação para este critério no estado (inclui importações)
                  const isEvaluatedAny = state.avaliacoes.some(av => Array.isArray(av.criterios) && av.criterios.some((c: any) => c.criterioId === criterio.id));
                  const tipoLabel = tipoCriterioLabel(criterio.idCriterio);
                  const metaCalcNum = Number(criterio.metaCalculo ?? -1);
                  const isImportable = [1,2,3].includes(metaCalcNum) && !!criterio.ativo;
                  return (
                    <SelectItem key={criterio.id} value={criterio.id.toString()} disabled={isEvaluated || isImportable}>
                      <div className="flex items-center justify-between w-full">
                        <span>{`${criterio.nome} - ( ${tipoLabel} )`}</span>
                                <div className="flex items-center gap-2">
                                  {isEvaluated && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                          {isImportable && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div><Download className="h-4 w-4 text-muted-foreground" /></div>
                              </TooltipTrigger>
                              <TooltipContent>Este critério é avaliado por importação e não pode ser avaliado manualmente.</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {isLoadingCriterion && (
            <div className="text-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="mt-2">Verificando critério...</p>
            </div>
          )}

          {!isLoadingCriterion && selectedCriterion && (
            <div className="space-y-4">
              <div className="mb-4">
                <h1 className="text-2xl sm:text-3xl font-extrabold mb-1 bg-gradient-primary bg-clip-text text-transparent">
                  Avaliando Operadores para:
                </h1>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold">{selectedCriterion.nome}</h2>
                  <span className="inline-block px-2 py-1 text-sm font-semibold rounded-full bg-muted/60 text-muted-foreground">{tipoCriterioLabel(selectedCriterion.idCriterio)}</span>
                </div>
              </div>
              {isCurrentCriterionEvaluated && (
                <div className="text-center text-green-600 font-semibold bg-green-50 p-3 rounded-md">
                  Este critério já foi avaliado.
                </div>
              )}
              {(() => {
                const metaCalcNum = Number(selectedCriterion.metaCalculo ?? -1);
                const isImportableSelected = [1,2,3].includes(metaCalcNum) && !!selectedCriterion.ativo;
                if (isImportableSelected) {
                  return (
                    <div className="text-center text-yellow-800 font-semibold bg-yellow-50 p-3 rounded-md">
                      Este critério é avaliado automaticamente por importação e não pode ser avaliado manualmente.
                    </div>
                  );
                }
                return null;
              })()}
              {activeOperators.map(operator => (
                <div key={operator.id} className="flex items-center justify-between p-3 border rounded-md gap-4">
                  <div className="flex-1">
                    <span className="font-medium break-words">{operator.nome}</span>
                  </div>
                  {selectedCriterion.tipo === 'qualitativo' ? (
                    <RadioGroup
                      onValueChange={(value) => handleEvaluationChange(operator.id.toString(), value)}
                      value={evaluationValues[operator.id.toString()]?.toString() || ''}
                      className="flex gap-4"
                      disabled={isCurrentCriterionEvaluated || ([1,2,3].includes(Number(selectedCriterion.metaCalculo ?? -1)) && !!selectedCriterion.ativo)}
                    >
                      <div className="flex items-center space-x-2"><RadioGroupItem value="25" id={`op-${operator.id}-r1`} /><label htmlFor={`op-${operator.id}-r1`}>1 Nunca</label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="50" id={`op-${operator.id}-r2`} /><label htmlFor={`op-${operator.id}-r2`}>2 Às Vezes</label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="75" id={`op-${operator.id}-r3`} /><label htmlFor={`op-${operator.id}-r3`}>3 Frequentemente</label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="100" id={`op-${operator.id}-r4`} /><label htmlFor={`op-${operator.id}-r4`}>4 Sempre</label></div>
                    </RadioGroup>
                  ) : (
                    <Input
                      type="number"
                      value={evaluationValues[operator.id.toString()]?.toString() || ''}
                      onChange={(e) => handleEvaluationChange(operator.id.toString(), e.target.value)}
                      placeholder={`Valor para ${selectedCriterion.nome}`}
                      className="w-40 text-center"
                      min="0"
                      disabled={isCurrentCriterionEvaluated || ([1,2,3].includes(Number(selectedCriterion.metaCalculo ?? -1)) && !!selectedCriterion.ativo)}
                    />
                  )}
                </div>
              ))}
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleSaveAndNext} 
                  className="w-full mt-6" 
                  disabled={isSubmitting || !allOperatorsEvaluated || isCurrentCriterionEvaluated || ([1,2,3].includes(Number(selectedCriterion.metaCalculo ?? -1)) && !!selectedCriterion.ativo)}
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar e Ir para Próximo Critério'}
                </Button>
                {/* Import Mysuite moved to header for easier access */}
              </div>
            </div>
          )}

          {!isLoadingCriterion && !selectedCriterion && !isAllEvaluatedDialogOpen && (
             <div className="text-center p-8">
                <h3 className="text-lg font-semibold text-muted-foreground">Nenhum critério disponível para avaliação.</h3>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
