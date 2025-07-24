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
       const initializedOperadores = DEFAULT_OPERADORES.map(op => ({
        ...op,
        dataInclusao: new Date(op.dataInclusao),
      }));
      return {
        ...state,
        operadores: initializedOperadores,
        criterios: DEFAULT_CRITERIOS,
        configuracao: {
          ...state.configuracao,
          operadores: initializedOperadores,
          criterios: DEFAULT_CRITERIOS,
          ultimaAtualizacao: new Date(),
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
export function EvaluationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(evaluationReducer, initialState);

  // Inicialização do sistema e persistência no localStorage
  useEffect(() => {
    const loadData = () => {
      try {
        const savedData = localStorage.getItem('avalia-mais-data');
        if (savedData) {
          const parsed = JSON.parse(savedData);
          
          // CORREÇÃO: Hidratar as datas
          const hydratedOperadores = (parsed.operadores || []).map((op: Operador) => ({
            ...op,
            dataInclusao: new Date(op.dataInclusao),
          }));
          
          const hydratedAvaliacoes = (parsed.avaliacoes || []).map((av: Avaliacao) => ({
            ...av,
            dataCriacao: new Date(av.dataCriacao),
            dataUltimaEdicao: new Date(av.dataUltimaEdicao),
          }));

          dispatch({ type: 'SET_OPERADORES', payload: hydratedOperadores.length ? hydratedOperadores : DEFAULT_OPERADORES });
          dispatch({ type: 'SET_CRITERIOS', payload: parsed.criterios || DEFAULT_CRITERIOS });
          dispatch({ type: 'SET_AVALIACOES', payload: hydratedAvaliacoes });
        } else {
          dispatch({ type: 'INITIALIZE_SYSTEM' });
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        // Em caso de erro, reinicia com os dados padrão para evitar crash
        localStorage.removeItem('avalia-mais-data');
        dispatch({ type: 'INITIALIZE_SYSTEM' });
      }
    };

    loadData();
  }, []);

  // Salvar dados no localStorage sempre que o estado mudar
  useEffect(() => {
    // Evita salvar o estado inicial vazio
    if (state.operadores.length > 0 || state.criterios.length > 0 || state.avaliacoes.length > 0) {
      try {
        const dataToSave = {
          operadores: state.operadores,
          criterios: state.criterios,
          avaliacoes: state.avaliacoes,
          configuracao: {
            ...state.configuracao,
            ultimaAtualizacao: new Date(), // Atualiza a data de última modificação
          }
        };
        localStorage.setItem('avalia-mais-data', JSON.stringify(dataToSave));
      } catch (error) {
        console.error("Erro ao salvar dados no localStorage:", error)
      }
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