import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useEvaluation } from '@/contexts/EvaluationContext';
import { getAvaliacoes } from '@/services/evaluationService';
import { getCriterios } from '@/services/criteriaService';
import { getOperadores } from '@/services/operatorService';
import { Operador, Criterio } from '@/types/evaluation';

// Hook que conecta ao WebSocket da API e dispatchea atualizações ao EvaluationContext
// Atenção: a conexão permanece aberta, mas apenas executamos fetch/dispatch quando
// a rota atual for uma das permitidas (EvaluationPanel ou EvaluationTracking)
export function useRealtime() {
  const { user } = useAuth();
  const { dispatch } = useEvaluation();
  const location = useLocation();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user) return;

    // montar URL do websocket com token JWT (aprovado pelo servidor)
    const token = localStorage.getItem('authToken') || '';
  // prefer env var VITE_API_WS_URL ou padrão ws://localhost:8081/ws
  const wsUrl = (import.meta.env.VITE_API_WS_URL as string) || 'ws://localhost:8081/ws';
  const url = `${wsUrl}?token=${encodeURIComponent(token)}`;

    let ws: WebSocket;
    // Conectar usando token na query string — mais compatível com navegadores e a maioria dos servidores
    const urlWithToken = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;
    try {
      console.info('[useRealtime] conectando WebSocket ->', wsUrl, token ? `(token length ${token.length})` : '(no token)');
      ws = new WebSocket(urlWithToken);
      wsRef.current = ws;
    } catch (err) {
      console.warn('[useRealtime] Falha ao conectar WebSocket (construtor):', err);
      // O construtor raramente lança — erros de handshake aparecem em eventos 'error'
      return;
    }

    ws.addEventListener('open', () => {
      console.info('WebSocket conectado');
    });

    ws.addEventListener('message', async (ev) => {
      try {
        const msg = JSON.parse(ev.data);

        // Normalizar diferentes formatos de mensagem do servidor
        // Exemplo antigo: { action, table }
        // Exemplo newCDC: { type: 'DATABASE_CHANGE', entity: 'cliente', action: 'CREATE', data: '...'}
        let action = (msg.action || '').toString().toLowerCase();
        let table = (msg.table || '').toString().toLowerCase();

        if (msg.type && msg.type === 'DATABASE_CHANGE') {
          const entity = (msg.entity || '').toString().toLowerCase();
          // mapear algumas entidades compostas para as tabelas que o cliente espera
          const mapEntity = (ent: string) => {
            if (!ent) return ent;
            if (ent.includes('avaliacao')) return 'avaliacao';
            if (ent.includes('criterio')) return 'criterio';
            if (ent.includes('operador')) return 'operador';
            return ent;
          };
          table = mapEntity(entity) || table;
          action = (msg.action || '').toString().toLowerCase();
        }

        // Se ainda vier com campo entity sem type, também aceitamos
        if (!table && msg.entity) {
          const ent = (msg.entity || '').toString().toLowerCase();
          if (ent) {
            if (ent.includes('avaliacao')) table = 'avaliacao';
            else if (ent.includes('criterio')) table = 'criterio';
            else if (ent.includes('operador')) table = 'operador';
            else table = ent;
          }
        }

  // mensagem parseada e normalizada

        // Só atualizamos o estado local automaticamente quando estivermos nas rotas desejadas
        const pathname = location.pathname || '';
        const hash = (location.hash || '').toString();
        const pathToCheck = (pathname + hash).toLowerCase();
        const allowed = ['/evaluation', '/evaluation-tracking', '/evaluationtracking', '/evaluationpanel', '/evaluate-operators', '/'].some(p => pathToCheck.includes(p));
        if (!allowed) {
          console.debug('[useRealtime] rota atual não permitida para refetch, ignorando mensagem', { pathname, action, table });
          return;
        }

        // Disparar fetchs conforme a tabela afetada
        if (table === 'avaliacao') {
          // Recarrega todas avaliações
          console.info('[useRealtime] evento de avaliacao recebido — fazendo getAvaliacoes()');
          const avals = await getAvaliacoes();
          console.info('[useRealtime] getAvaliacoes retornou', Array.isArray(avals) ? avals.length : 'not-array');
          dispatch({ type: 'SET_AVALIACOES', payload: avals });
          console.info('[useRealtime] dispatch SET_AVALIACOES executado');
        } else if (table === 'criterio') {
          const res = await getCriterios();
          const criteriosArray = (Array.isArray(res) ? res : (res && (res as unknown as { data?: Criterio[] }).data) ? (res as unknown as { data?: Criterio[] }).data : [] ) as Criterio[];
          dispatch({ type: 'SET_CRITERIOS', payload: criteriosArray });
        } else if (table === 'operador') {
          const ops = await getOperadores();
          const operadores = (Array.isArray(ops) ? ops : (ops && (ops as unknown as { data?: Operador[] }).data) ? (ops as unknown as { data?: Operador[] }).data : []) as Operador[];
          dispatch({ type: 'FETCH_OPERADORES_SUCCESS', payload: operadores });
        } else {
          // outras tabelas podem exigir refetch genérico
          // por enquanto, ignore
        }
      } catch (e) {
        console.warn('Erro tratando mensagem websocket:', e);
      }
    });

    ws.addEventListener('error', (ev) => {
      console.error('[useRealtime] erro no websocket:', ev);
    });

    ws.addEventListener('close', () => {
      console.info('WebSocket desconectado');
      wsRef.current = null;
    });

    return () => {
      try { ws.close(); } catch (e) { /* ignore */ }
      wsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
}

export default useRealtime;
