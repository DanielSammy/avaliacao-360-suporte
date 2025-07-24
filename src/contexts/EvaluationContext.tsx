import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Operador, Criterio, Avaliacao, ConfiguracaoSistema } from '../types/evaluation';
import { DEFAULT_OPERADORES, DEFAULT_CRITERIOS } from '../data/defaultData';
import { 
  serializeData, 
  deserializeData, 
  validateStorageData, 
  logSecurityEvent, 
  checkDataIntegrity,
  SECURITY_CONSTRAINTS 
} from '../utils/security';

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
      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        const savedData = localStorage.getItem('avalia-mais-data');
        if (savedData) {
          // Try new secure deserialization first
          let parsed;
          try {
            parsed = deserializeData(savedData);
          } catch {
            // Fallback to old format and migrate
            parsed = JSON.parse(savedData);
            logSecurityEvent('data_migration_required', { reason: 'old_format_detected' });
          }
          
          // Validate and sanitize data
          const validation = validateStorageData(parsed);
          if (!validation.valid) {
            logSecurityEvent('data_validation_failed', { errors: validation.errors });
            dispatch({ type: 'SET_ERROR', payload: 'Dados corrompidos detectados. Sistema será reinicializado.' });
            dispatch({ type: 'INITIALIZE_SYSTEM' });
            return;
          }
          
          const migratedData = validation.migrated || parsed;
          
          // Check data integrity
          const integrityCheck = checkDataIntegrity(migratedData);
          if (!integrityCheck.valid) {
            logSecurityEvent('data_integrity_failed', { issues: integrityCheck.issues });
            console.warn('Problemas de integridade detectados:', integrityCheck.issues);
          }
          
          // Load validated and migrated data
          dispatch({ type: 'SET_OPERADORES', payload: migratedData.operadores || DEFAULT_OPERADORES });
          dispatch({ type: 'SET_CRITERIOS', payload: migratedData.criterios || DEFAULT_CRITERIOS });
          dispatch({ type: 'SET_AVALIACOES', payload: migratedData.avaliacoes || [] });
        } else {
          dispatch({ type: 'INITIALIZE_SYSTEM' });
        }
      } catch (error) {
        logSecurityEvent('data_load_error', { error: error instanceof Error ? error.message : 'unknown' });
        console.error('Erro ao carregar dados:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Erro ao carregar dados. Sistema será reinicializado.' });
        dispatch({ type: 'INITIALIZE_SYSTEM' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadData();
  }, []);

  // Salvar dados no localStorage sempre que o estado mudar
  useEffect(() => {
    if (state.loading || state.error) return; // Don't save during loading or error states
    
    if (state.operadores.length > 0 || state.criterios.length > 0) {
      try {
        const dataToSave = {
          version: SECURITY_CONSTRAINTS.CURRENT_DATA_VERSION,
          timestamp: new Date().toISOString(),
          operadores: state.operadores,
          criterios: state.criterios,
          avaliacoes: state.avaliacoes,
          configuracao: {
            ...state.configuracao,
            ultimaAtualizacao: new Date(),
            versao: SECURITY_CONSTRAINTS.CURRENT_DATA_VERSION
          }
        };
        
        // Use secure serialization
        const serializedData = serializeData(dataToSave);
        localStorage.setItem('avalia-mais-data', serializedData);
      } catch (error) {
        logSecurityEvent('data_save_error', { error: error instanceof Error ? error.message : 'unknown' });
        console.error('Erro ao salvar dados:', error);
      }
    }
  }, [state.operadores, state.criterios, state.avaliacoes, state.configuracao, state.loading, state.error]);

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