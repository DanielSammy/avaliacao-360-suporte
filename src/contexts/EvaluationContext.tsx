import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback } from 'react';
import { Operador, Criterio, Avaliacao, ConfiguracaoSistema } from '../types/evaluation';
import { getOperadores, createOperador, updateOperador, deleteOperador } from '../services/operatorService';
import { getCriterios } from '../services/criteriaService';
import { useAuth } from './AuthContext';

// Estado global do sistema
interface EvaluationState {
  operadores: Operador[];
  criterios: Criterio[];
  avaliacoes: Avaliacao[];
  configuracao: ConfiguracaoSistema;
  loading: boolean;
  error: string | null;
  totalTeamTickets: number; // Added
}

// Ações do sistema
type EvaluationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'FETCH_OPERADORES_REQUEST' }
  | { type: 'FETCH_OPERADORES_SUCCESS'; payload: Operador[] }
  | { type: 'FETCH_OPERADORES_FAILURE'; payload: string }
  | { type: 'ADD_OPERADOR'; payload: Operador }
  | { type: 'UPDATE_OPERADOR'; payload: Operador }
  | { type: 'DELETE_OPERADOR'; payload: number }
  | { type: 'SET_CRITERIOS'; payload: Criterio[] }
  | { type: 'ADD_CRITERIO'; payload: Criterio } // Added this line
  | { type: 'UPDATE_CRITERIO'; payload: Criterio }
  | { type: 'DELETE_CRITERIO'; payload: number }
  | { type: 'SET_AVALIACOES'; payload: Avaliacao[] }
  | { type: 'ADD_AVALIACAO'; payload: Avaliacao }
  | { type: 'UPDATE_AVALIACAO'; payload: Avaliacao }
  | { type: 'DELETE_AVALIACAO'; payload: number }
  | { type: 'SET_TOTAL_TEAM_TICKETS'; payload: number }; // Added

// Estado inicial
const initialState: EvaluationState = (() => {
  const storedTotalTeamTickets = localStorage.getItem('totalTeamTickets');
  return {
    operadores: [],
    criterios: [],
    avaliacoes: [],
    configuracao: {
      versao: '1.0.0',
      ultimaAtualizacao: new Date(),
      criterios: [],
      operadores: []
    },
    loading: false,
    error: null,
    totalTeamTickets: storedTotalTeamTickets ? parseInt(storedTotalTeamTickets, 10) : 0,
  };
})();

// Reducer (sem alterações)
function evaluationReducer(state: EvaluationState, action: EvaluationAction): EvaluationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'FETCH_OPERADORES_REQUEST':
      return { ...state, loading: true, error: null };
    case 'FETCH_OPERADORES_SUCCESS':
      return { ...state, loading: false, error: null, operadores: action.payload };
    case 'FETCH_OPERADORES_FAILURE':
      return { ...state, loading: false, error: action.payload, operadores: [] };
    case 'ADD_OPERADOR':
      return { 
        ...state, 
        operadores: [...state.operadores, action.payload] 
      };
    case 'UPDATE_OPERADOR':
      return {
        ...state,
        operadores: state.operadores.map(op => 
          op.id === action.payload.id ? action.payload : op
        )
      };
    case 'DELETE_OPERADOR': {
      const operadorId = action.payload;
      return {
        ...state,
        operadores: state.operadores.filter(op => op.id !== operadorId),
        avaliacoes: state.avaliacoes.filter(av => av.operadorId !== operadorId)
      };
    }
    case 'SET_CRITERIOS':
      return { ...state, criterios: action.payload };
    case 'ADD_CRITERIO':
      return { 
        ...state, 
        criterios: [...state.criterios, action.payload] 
      };
    case 'UPDATE_CRITERIO':
      return {
        ...state,
        criterios: state.criterios.map(cr => 
          cr.id === action.payload.id ? action.payload : cr
        )
      };
    case 'DELETE_CRITERIO':
      return {
        ...state,
        criterios: state.criterios.filter(cr => cr.id !== action.payload)
      };
    case 'SET_AVALIACOES':
      return { ...state, avaliacoes: action.payload };
    case 'ADD_AVALIACAO':
      return {
        ...state,
        avaliacoes: [...state.avaliacoes, action.payload]
      };
    case 'UPDATE_AVALIACAO':
      return {
        ...state,
        avaliacoes: state.avaliacoes.map(av => 
          av.id === action.payload.id ? action.payload : av
        )
      };
    case 'DELETE_AVALIACAO':
      return {
        ...state,
        avaliacoes: state.avaliacoes.filter(av => av.id !== action.payload)
      };
    case 'SET_TOTAL_TEAM_TICKETS': // Added
      return { ...state, totalTeamTickets: action.payload };
    default:
      return state;
  }
}


// Contexto
const EvaluationContext = createContext<{
  state: EvaluationState;
  dispatch: React.Dispatch<EvaluationAction>;
  fetchOperadores: () => Promise<void>;
  addOperator: (operator: Operador) => Promise<void>;
  updateOperator: (operator: Operador) => Promise<void>;
  deleteOperator: (id: number) => Promise<void>;
} | null>(null);

// Provider
export function EvaluationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(evaluationReducer, initialState);
  const { user } = useAuth();

  const fetchOperadores = useCallback(async () => {
    dispatch({ type: 'FETCH_OPERADORES_REQUEST' });
    try {
      const response = await getOperadores();
      dispatch({ type: 'FETCH_OPERADORES_SUCCESS', payload: response.data });
    } catch (err) {
      console.error("Failed to fetch operators:", err);
      dispatch({ type: 'FETCH_OPERADORES_FAILURE', payload: 'Failed to load operators.' });
    }
  }, [dispatch]);

  const addOperator = useCallback(async (operator: Operador) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await createOperador(operator);
      await fetchOperadores();
    } catch (err) {
      console.error("Failed to create operator:", err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create operator.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch, fetchOperadores]);

  const updateOperator = useCallback(async (operator: Operador) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await updateOperador(operator);
      await fetchOperadores();
    } catch (err) {
      console.error("Failed to update operator:", err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update operator.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch, fetchOperadores]);

  const deleteOperator = useCallback(async (id: number) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await deleteOperador(id);
      await fetchOperadores();
    } catch (err) {
      console.error("Failed to delete operator:", err);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete operator.' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [dispatch, fetchOperadores]);

  useEffect(() => {
    const fetchCriterios = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const response = await getCriterios();
        dispatch({ type: 'SET_CRITERIOS', payload: response.data });
      } catch (err) {
        console.error("Failed to fetch criterios:", err);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load criterios.' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    if (user) {
      fetchOperadores();
      fetchCriterios();
    } else {
      // Limpa os operadores e criterios se o usuário não estiver logado
      dispatch({ type: 'FETCH_OPERADORES_SUCCESS', payload: [] }); // Use FETCH_OPERADORES_SUCCESS
      dispatch({ type: 'SET_CRITERIOS', payload: [] });
    }
  }, [user, fetchOperadores]); // Add fetchOperadores to dependency array

  useEffect(() => {
    localStorage.setItem('totalTeamTickets', state.totalTeamTickets.toString());
  }, [state.totalTeamTickets]);

  return (
    <EvaluationContext.Provider value={{ state, dispatch, fetchOperadores, addOperator, updateOperator, deleteOperator }}>
      {children}
    </EvaluationContext.Provider>
  );
}

// Hook personalizado
export function useEvaluation() {
  const context = useContext(EvaluationContext);
  if (!context) {
    throw new Error('useEvaluation deve ser usado dentro de um EvaluationProvider');
  }
  return context;
}