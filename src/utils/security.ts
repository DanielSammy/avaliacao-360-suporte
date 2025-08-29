// Security utilities for data validation, sanitization, and integrity

import { Operador, Criterio, Avaliacao, ConfiguracaoSistema, CriterioAvaliacao } from '../types/evaluation';

// Constants for security constraints
export const SECURITY_CONSTRAINTS = {
  MAX_STRING_LENGTH: 1000,
  CURRENT_DATA_VERSION: '1.1.0'
} as const;

// Data version for backward compatibility
export interface VersionedData {
  version: string;
  timestamp: string;
  data: {
    operadores: Operador[];
    criterios: Criterio[];
    avaliacoes: Avaliacao[];
    configuracao: ConfiguracaoSistema;
  };
  checksum?: string;
}

// Sanitize user input to prevent XSS and data corruption
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .substring(0, SECURITY_CONSTRAINTS.MAX_STRING_LENGTH)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/[<>]/g, ''); // Remove angle brackets
}

// Sanitize numeric values
export function sanitizeNumber(input: unknown): number {
  const num = parseFloat(input as string); // Cast to string for parseFloat
  if (isNaN(num) || !isFinite(num)) return 0;
  
  // Clamp to reasonable range for percentages and currency
  return Math.max(-999999, Math.min(999999, num));
}



// Serialize data with proper date handling
export function serializeData(data: unknown): string {
  return JSON.stringify(data, (key, value) => {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  });
}

// Deserialize data with proper date handling  
export function deserializeData(jsonString: string): unknown {
  return JSON.parse(jsonString, (key, value) => {
    if (value && typeof value === 'object' && (value as Record<string, unknown>).__type === 'Date') { // Cast value to Record
      return new Date((value as Record<string, unknown>).value as string); // Cast value.value to string
    }
    return value;
  });
}

// Validate localStorage data structure
export function validateStorageData(data: unknown): { valid: boolean; migrated?: unknown; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Estrutura de dados inválida');
    return { valid: false, errors };
  }

  const migrated = { ...data } as Record<string, unknown>; // Cast data to Record

  // Validate and migrate operadores
  if (!Array.isArray((data as Record<string, unknown>).operadores)) { // Cast data to Record
    errors.push('Lista de operadores inválida');
    migrated.operadores = [];
  } else {
    migrated.operadores = ((data as Record<string, unknown>).operadores as unknown[]).map((op: unknown) => ({
      ...(op as Operador),
      nome: sanitizeString((op as Operador).nome || ''),
      ativo: Boolean((op as Operador).ativo),
      dataInclusao: (op as Operador).dataInclusao instanceof Date ? (op as Operador).dataInclusao : 
                    typeof (op as Operador).dataInclusao === 'string' ? new Date((op as Operador).dataInclusao) : new Date()
    }));
  }

  // Validate and migrate criterios
  if (!Array.isArray((data as Record<string, unknown>).criterios)) { // Cast data to Record
    errors.push('Lista de critérios inválida');
    migrated.criterios = [];
  } else {
    migrated.criterios = ((data as Record<string, unknown>).criterios as unknown[]).map((cr: unknown) => ({
      ...(cr as Criterio),
      nome: sanitizeString((cr as Criterio).nome || ''),
      valorMeta: sanitizeNumber((cr as Criterio).valorMeta),
      valorBonus: sanitizeNumber((cr as Criterio).valorBonus),
      ordem: sanitizeNumber((cr as Criterio).ordem),
      ativo: Boolean((cr as Criterio).ativo),
      // permiteImportacao: Boolean((cr as Criterio).permiteImportacao)
    }));
  }

  // Validate and migrate avaliacoes
  if (!Array.isArray((data as Record<string, unknown>).avaliacoes)) { // Cast data to Record
    errors.push('Lista de avaliações inválida');
    migrated.avaliacoes = [];
  } else {
    migrated.avaliacoes = ((data as Record<string, unknown>).avaliacoes as unknown[]).map((av: unknown) => ({
      ...(av as Avaliacao),
      operadorId: sanitizeNumber((av as Avaliacao).operadorId), // Changed to sanitizeNumber
      periodo: sanitizeString((av as Avaliacao).periodo || ''),
      valorTotalMeta: sanitizeNumber((av as Avaliacao).valorTotalMeta),
      valorTotalAlcancado: sanitizeNumber((av as Avaliacao).valorTotalAlcancado),
      dataCriacao: (av as Avaliacao).dataCriacao instanceof Date ? (av as Avaliacao).dataCriacao : 
                   typeof (av as Avaliacao).dataCriacao === 'string' ? new Date((av as Avaliacao).dataCriacao) : new Date(),
      dataUltimaEdicao: (av as Avaliacao).dataUltimaEdicao instanceof Date ? (av as Avaliacao).dataUltimaEdicao : 
                        typeof (av as Avaliacao).dataUltimaEdicao === 'string' ? new Date((av as Avaliacao).dataUltimaEdicao) : new Date(),
      criterios: Array.isArray((av as Avaliacao).criterios) ? ((av as Avaliacao).criterios as unknown[]).map((cr: unknown) => ({
        criterioId: sanitizeNumber((cr as CriterioAvaliacao).criterioId),
        valorAlcancado: sanitizeNumber((cr as CriterioAvaliacao).valorAlcancado),
        valorBonusAlcancado: sanitizeNumber((cr as CriterioAvaliacao).valorBonusAlcancado),
        metaAtingida: Boolean((cr as CriterioAvaliacao).metaAtingida)
      })) : []
    }));
  }

  // Validate configuracao
  if (!(data as Record<string, unknown>).configuracao || typeof (data as Record<string, unknown>).configuracao !== 'object') { // Cast data to Record
    migrated.configuracao = {
      versao: SECURITY_CONSTRAINTS.CURRENT_DATA_VERSION,
      ultimaAtualizacao: new Date(),
      criterios: migrated.criterios as Criterio[],
      operadores: migrated.operadores as Operador[]
    };
  } else {
    migrated.configuracao = {
      ...((data as Record<string, unknown>).configuracao as ConfiguracaoSistema), // Cast data.configuracao
      versao: sanitizeString(((data as Record<string, unknown>).configuracao as ConfiguracaoSistema).versao || SECURITY_CONSTRAINTS.CURRENT_DATA_VERSION), // Cast data.configuracao
      ultimaAtualizacao: ((data as Record<string, unknown>).configuracao as ConfiguracaoSistema).ultimaAtualizacao instanceof Date ? 
                        ((data as Record<string, unknown>).configuracao as ConfiguracaoSistema).ultimaAtualizacao :
                        typeof ((data as Record<string, unknown>).configuracao as ConfiguracaoSistema).ultimaAtualizacao === 'string' ? 
                        new Date(((data as Record<string, unknown>).configuracao as ConfiguracaoSistema).ultimaAtualizacao) : new Date(),
      criterios: migrated.criterios as Criterio[],
      operadores: migrated.operadores as Operador[]
    };
  }

  return { valid: errors.length === 0, migrated, errors };
}

// Generate checksum for data integrity
export function generateChecksum(data: unknown): string {
  const str = JSON.stringify(data, Object.keys(data as Record<string, unknown>).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Validate backup file structure
export function validateBackupData(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Arquivo de backup inválido');
    return { valid: false, errors };
  }

  // Check required fields
  const requiredFields = ['operadores', 'criterios', 'avaliacoes'];
  for (const field of requiredFields) {
    if (!Array.isArray((data as Record<string, unknown>)[field])) { // Cast data to Record
      errors.push(`Campo obrigatório ausente ou inválido: ${field}`);
    }
  }

  // Validate version if present
  if ((data as Record<string, unknown>).version && typeof (data as Record<string, unknown>).version !== 'string') { // Cast data to Record
    errors.push('Versão dos dados inválida');
  }

  // Check data size limits
  const totalRecords = (((data as Record<string, unknown>).operadores as unknown[])?.length || 0) + 
                      (((data as Record<string, unknown>).criterios as unknown[])?.length || 0) + 
                      (((data as Record<string, unknown>).avaliacoes as unknown[])?.length || 0);
  
  if (totalRecords > 10000) {
    errors.push('Arquivo de backup muito grande');
  }

  return { valid: errors.length === 0, errors };
}

// Security logging utility
export function logSecurityEvent(event: string, details?: unknown): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    details: details ? sanitizeString(JSON.stringify(details)) : undefined,
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // In production, this would send to a logging service
  console.warn('[SECURITY]', logEntry);
}

// Data integrity check
export function checkDataIntegrity(data: unknown): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  try {
    // Check for circular references
    JSON.stringify(data);
    
    // Check data structure consistency
    if ((data as Record<string, unknown>).operadores && (data as Record<string, unknown>).avaliacoes) { // Cast data
      const operadorIds = new Set(((data as Record<string, unknown>).operadores as Operador[]).map((op: unknown) => (op as Operador).id)); // Cast data.operadores
      ((data as Record<string, unknown>).avaliacoes as Avaliacao[]).forEach((av: unknown, index: number) => { // Cast data.avaliacoes
        if (!operadorIds.has((av as Avaliacao).operadorId)) {
          issues.push(`Avaliação ${index + 1}: Referência inválida ao operador ${(av as Avaliacao).operadorId}`);
        }
      });
    }
    
    if ((data as Record<string, unknown>).criterios && (data as Record<string, unknown>).avaliacoes) { // Cast data
      const criterioIds = new Set(((data as Record<string, unknown>).criterios as Criterio[]).map((cr: unknown) => (cr as Criterio).id)); // Cast data.criterios
      ((data as Record<string, unknown>).avaliacoes as Avaliacao[]).forEach((av: unknown, avIndex: number) => { // Cast data.avaliacoes
        if ((av as Avaliacao).criterios) {
          ((av as Avaliacao).criterios as CriterioAvaliacao[]).forEach((cr: unknown, crIndex: number) => { // Cast av.criterios
            if (!criterioIds.has((cr as CriterioAvaliacao).criterioId)) {
              issues.push(`Avaliação ${avIndex + 1}, Critério ${crIndex + 1}: Referência inválida ao critério ${(cr as CriterioAvaliacao).criterioId}`);
            }
          });
        }
      });
    }
    
  } catch (error: unknown) { // Cast error to unknown
    issues.push(`Estrutura de dados corrompida: ${(error as Error).message}`); // Cast to Error
  }
  
  return { valid: issues.length === 0, issues };
}
