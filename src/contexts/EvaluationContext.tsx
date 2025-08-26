import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { Operador, Criterio, Avaliacao, ConfiguracaoSistema } from '../types/evaluation';
import { DEFAULT_OPERADORES, DEFAULT_CRITERIOS } from '../data/defaultData';

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
  | { type: 'SET_OPERADORES'; payload: Operador[] }
  | { type: 'ADD_OPERADOR'; payload: Operador }
  | { type: 'UPDATE_OPERADOR'; payload: Operador }
  | { type: 'DELETE_OPERADOR'; payload: string }
  | { type: 'SET_CRITERIOS'; payload: Criterio[] }
  | { type: 'ADD_CRITERIO'; payload: Criterio } // Added this line
  | { type: 'UPDATE_CRITERIO'; payload: Criterio }
  | { type: 'SET_AVALIACOES'; payload: Avaliacao[] }
  | { type: 'ADD_AVALIACAO'; payload: Avaliacao }
  | { type: 'UPDATE_AVALIACAO'; payload: Avaliacao }
  | { type: 'DELETE_AVALIACAO'; payload: string }
  | { type: 'SET_TOTAL_TEAM_TICKETS'; payload: number }; // Added

// Estado inicial
const initialState: EvaluationState = (() => {
  const storedTotalTeamTickets = localStorage.getItem('totalTeamTickets');
  const storedCriterios = localStorage.getItem('criterios');
  return {
    operadores: [],
    criterios: storedCriterios ? JSON.parse(storedCriterios) : DEFAULT_CRITERIOS,
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
    case 'SET_OPERADORES':
      return { ...state, operadores: action.payload };
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
} | null>(null);

// Provider
export function EvaluationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(evaluationReducer, initialState);

  useEffect(() => {
    const hydratedOperadores = DEFAULT_OPERADORES.map(op => ({
      ...op,
      login: op.login || '',
      dataInclusao: new Date(op.dataInclusao),
    }));

    dispatch({ type: 'SET_OPERADORES', payload: hydratedOperadores });
  }, []);

  useEffect(() => {
    localStorage.setItem('totalTeamTickets', state.totalTeamTickets.toString());
  }, [state.totalTeamTickets]);

  useEffect(() => {
    localStorage.setItem('criterios', JSON.stringify(state.criterios));
  }, [state.criterios]);

  return (
    <EvaluationContext.Provider value={{ state, dispatch }}>
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