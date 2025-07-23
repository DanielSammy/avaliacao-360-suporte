import React, { createContext, useContext, useReducer, useEffect } from 'react';
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
  | { type: 'UPDATE_CRITERIO'; payload: Criterio }
  | { type: 'SET_AVALIACOES'; payload: Avaliacao[] }
  | { type: 'ADD_AVALIACAO'; payload: Avaliacao }
  | { type: 'UPDATE_AVALIACAO'; payload: Avaliacao }
  | { type: 'DELETE_AVALIACAO'; payload: string }
  | { type: 'INITIALIZE_SYSTEM' };

// Estado inicial
const initialState: EvaluationState = {
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
  error: null
};

// Reducer
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
    
    case 'DELETE_OPERADOR':
      return {
        ...state,
        operadores: state.operadores.filter(op => op.id !== action.payload)
      };
    
    case 'SET_CRITERIOS':
      return { ...state, criterios: action.payload };
    
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
    
    case 'INITIALIZE_SYSTEM':
      return {
        ...state,
        operadores: DEFAULT_OPERADORES,
        criterios: DEFAULT_CRITERIOS,
        configuracao: {
          ...state.configuracao,
          operadores: DEFAULT_OPERADORES,
          criterios: DEFAULT_CRITERIOS
        }
      };
    
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
export function EvaluationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(evaluationReducer, initialState);

  // Inicialização do sistema e persistência no localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        const savedData = localStorage.getItem('avalia-mais-data');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          dispatch({ type: 'SET_OPERADORES', payload: parsed.operadores || DEFAULT_OPERADORES });
          dispatch({ type: 'SET_CRITERIOS', payload: parsed.criterios || DEFAULT_CRITERIOS });
          dispatch({ type: 'SET_AVALIACOES', payload: parsed.avaliacoes || [] });
        } else {
          dispatch({ type: 'INITIALIZE_SYSTEM' });
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        dispatch({ type: 'INITIALIZE_SYSTEM' });
      }
    };

    loadData();
  }, []);

  // Salvar dados no localStorage sempre que o estado mudar
  useEffect(() => {
    if (state.operadores.length > 0 || state.criterios.length > 0) {
      const dataToSave = {
        operadores: state.operadores,
        criterios: state.criterios,
        avaliacoes: state.avaliacoes,
        configuracao: state.configuracao
      };
      localStorage.setItem('avalia-mais-data', JSON.stringify(dataToSave));
    }
  }, [state.operadores, state.criterios, state.avaliacoes, state.configuracao]);

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