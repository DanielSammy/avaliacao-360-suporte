// Security utilities for data validation, sanitization, and integrity

import { Operador, Criterio, Avaliacao, ConfiguracaoSistema, DadosImportacao } from '../types/evaluation';

// Constants for security constraints
export const SECURITY_CONSTRAINTS = {
  MAX_STRING_LENGTH: 1000,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_IMPORT_ROWS: 1000,
  MAX_FILENAME_LENGTH: 255,
  ALLOWED_FILE_TYPES: ['.csv', '.xlsx', '.xls', '.json'],
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
export function sanitizeNumber(input: any): number {
  const num = parseFloat(input);
  if (isNaN(num) || !isFinite(num)) return 0;
  
  // Clamp to reasonable range for percentages and currency
  return Math.max(-999999, Math.min(999999, num));
}

// Validate and sanitize imported data
export function validateImportData(data: any[]): { valid: DadosImportacao[]; errors: string[] } {
  const valid: DadosImportacao[] = [];
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    errors.push('Dados de importação devem ser um array');
    return { valid, errors };
  }

  if (data.length > SECURITY_CONSTRAINTS.MAX_IMPORT_ROWS) {
    errors.push(`Máximo de ${SECURITY_CONSTRAINTS.MAX_IMPORT_ROWS} linhas permitidas`);
    return { valid, errors };
  }

  data.forEach((row, index) => {
    try {
      if (!row || typeof row !== 'object') {
        errors.push(`Linha ${index + 1}: Dados inválidos`);
        return;
      }

      const sanitizedData: DadosImportacao = {
        nome_operador: sanitizeString(row.nome_operador || ''),
        atraso_1_contato_percentual: sanitizeNumber(row.atraso_1_contato_percentual),
        preenchimento_incorreto_percentual: sanitizeNumber(row.preenchimento_incorreto_percentual),
        satisfacao_clientes_percentual: sanitizeNumber(row.satisfacao_clientes_percentual),
        solicitacao_apoio_indevida_percentual: sanitizeNumber(row.solicitacao_apoio_indevida_percentual),
        reabertura_tickets_percentual: sanitizeNumber(row.reabertura_tickets_percentual),
        periodo: sanitizeString(row.periodo || '')
      };

      // Additional validation
      if (!sanitizedData.nome_operador) {
        errors.push(`Linha ${index + 1}: Nome do operador é obrigatório`);
        return;
      }

      if (!sanitizedData.periodo.match(/^\d{4}-\d{2}$/)) {
        errors.push(`Linha ${index + 1}: Período deve estar no formato YYYY-MM`);
        return;
      }

      // Validate percentage ranges
      const percentageFields = [
        'atraso_1_contato_percentual',
        'preenchimento_incorreto_percentual', 
        'satisfacao_clientes_percentual',
        'solicitacao_apoio_indevida_percentual',
        'reabertura_tickets_percentual'
      ] as const;

      for (const field of percentageFields) {
        const value = sanitizedData[field];
        if (value < 0 || value > 100) {
          errors.push(`Linha ${index + 1}: ${field} deve estar entre 0 e 100`);
          return;
        }
      }

      valid.push(sanitizedData);
    } catch (error) {
      errors.push(`Linha ${index + 1}: Erro de processamento - ${error}`);
    }
  });

  return { valid, errors };
}

// Validate file before processing
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > SECURITY_CONSTRAINTS.MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `Arquivo muito grande. Máximo permitido: ${SECURITY_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB` 
    };
  }

  // Check filename length
  if (file.name.length > SECURITY_CONSTRAINTS.MAX_FILENAME_LENGTH) {
    return { 
      valid: false, 
      error: 'Nome do arquivo muito longo' 
    };
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!SECURITY_CONSTRAINTS.ALLOWED_FILE_TYPES.includes(extension as any)) {
    return { 
      valid: false, 
      error: `Tipo de arquivo não permitido. Permitidos: ${SECURITY_CONSTRAINTS.ALLOWED_FILE_TYPES.join(', ')}` 
    };
  }

  // Check for suspicious filenames
  const suspiciousPatterns = [
    /\.exe$/, /\.bat$/, /\.cmd$/, /\.scr$/,
    /\.js$/, /\.vbs$/, /\.ps1$/,
    /\.\./,  // Path traversal
    /[<>:"\\|?*]/  // Invalid filename characters
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      return { 
        valid: false, 
        error: 'Nome de arquivo suspeito detectado' 
      };
    }
  }

  return { valid: true };
}

// Serialize data with proper date handling
export function serializeData(data: any): string {
  return JSON.stringify(data, (key, value) => {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  });
}

// Deserialize data with proper date handling  
export function deserializeData(jsonString: string): any {
  return JSON.parse(jsonString, (key, value) => {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  });
}

// Validate localStorage data structure
export function validateStorageData(data: any): { valid: boolean; migrated?: any; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Estrutura de dados inválida');
    return { valid: false, errors };
  }

  const migrated = { ...data };

  // Validate and migrate operadores
  if (!Array.isArray(data.operadores)) {
    errors.push('Lista de operadores inválida');
    migrated.operadores = [];
  } else {
    migrated.operadores = data.operadores.map((op: any) => ({
      ...op,
      nome: sanitizeString(op.nome || ''),
      ativo: Boolean(op.ativo),
      dataInclusao: op.dataInclusao instanceof Date ? op.dataInclusao : 
                    typeof op.dataInclusao === 'string' ? new Date(op.dataInclusao) : new Date()
    }));
  }

  // Validate and migrate criterios
  if (!Array.isArray(data.criterios)) {
    errors.push('Lista de critérios inválida');
    migrated.criterios = [];
  } else {
    migrated.criterios = data.criterios.map((cr: any) => ({
      ...cr,
      nome: sanitizeString(cr.nome || ''),
      valorMeta: sanitizeNumber(cr.valorMeta),
      valorBonus: sanitizeNumber(cr.valorBonus),
      ordem: sanitizeNumber(cr.ordem),
      ativo: Boolean(cr.ativo),
      permiteImportacao: Boolean(cr.permiteImportacao)
    }));
  }

  // Validate and migrate avaliacoes
  if (!Array.isArray(data.avaliacoes)) {
    errors.push('Lista de avaliações inválida');
    migrated.avaliacoes = [];
  } else {
    migrated.avaliacoes = data.avaliacoes.map((av: any) => ({
      ...av,
      operadorId: sanitizeString(av.operadorId || ''),
      periodo: sanitizeString(av.periodo || ''),
      valorTotalMeta: sanitizeNumber(av.valorTotalMeta),
      valorTotalAlcancado: sanitizeNumber(av.valorTotalAlcancado),
      dataCriacao: av.dataCriacao instanceof Date ? av.dataCriacao : 
                   typeof av.dataCriacao === 'string' ? new Date(av.dataCriacao) : new Date(),
      dataUltimaEdicao: av.dataUltimaEdicao instanceof Date ? av.dataUltimaEdicao : 
                        typeof av.dataUltimaEdicao === 'string' ? new Date(av.dataUltimaEdicao) : new Date(),
      criterios: Array.isArray(av.criterios) ? av.criterios.map((cr: any) => ({
        criterioId: sanitizeString(cr.criterioId || ''),
        valorAlcancado: sanitizeNumber(cr.valorAlcancado),
        valorBonusAlcancado: sanitizeNumber(cr.valorBonusAlcancado),
        metaAtingida: Boolean(cr.metaAtingida)
      })) : []
    }));
  }

  // Validate configuracao
  if (!data.configuracao || typeof data.configuracao !== 'object') {
    migrated.configuracao = {
      versao: SECURITY_CONSTRAINTS.CURRENT_DATA_VERSION,
      ultimaAtualizacao: new Date(),
      criterios: migrated.criterios,
      operadores: migrated.operadores
    };
  } else {
    migrated.configuracao = {
      ...data.configuracao,
      versao: sanitizeString(data.configuracao.versao || SECURITY_CONSTRAINTS.CURRENT_DATA_VERSION),
      ultimaAtualizacao: data.configuracao.ultimaAtualizacao instanceof Date ? 
                        data.configuracao.ultimaAtualizacao :
                        typeof data.configuracao.ultimaAtualizacao === 'string' ? 
                        new Date(data.configuracao.ultimaAtualizacao) : new Date(),
      criterios: migrated.criterios,
      operadores: migrated.operadores
    };
  }

  return { valid: errors.length === 0, migrated, errors };
}

// Generate checksum for data integrity
export function generateChecksum(data: any): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Validate backup file structure
export function validateBackupData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Arquivo de backup inválido');
    return { valid: false, errors };
  }

  // Check required fields
  const requiredFields = ['operadores', 'criterios', 'avaliacoes'];
  for (const field of requiredFields) {
    if (!Array.isArray(data[field])) {
      errors.push(`Campo obrigatório ausente ou inválido: ${field}`);
    }
  }

  // Validate version if present
  if (data.version && typeof data.version !== 'string') {
    errors.push('Versão dos dados inválida');
  }

  // Check data size limits
  const totalRecords = (data.operadores?.length || 0) + 
                      (data.criterios?.length || 0) + 
                      (data.avaliacoes?.length || 0);
  
  if (totalRecords > 10000) {
    errors.push('Arquivo de backup muito grande');
  }

  return { valid: errors.length === 0, errors };
}

// Security logging utility
export function logSecurityEvent(event: string, details?: any): void {
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
export function checkDataIntegrity(data: any): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  try {
    // Check for circular references
    JSON.stringify(data);
    
    // Check data structure consistency
    if (data.operadores && data.avaliacoes) {
      const operadorIds = new Set(data.operadores.map((op: any) => op.id));
      data.avaliacoes.forEach((av: any, index: number) => {
        if (!operadorIds.has(av.operadorId)) {
          issues.push(`Avaliação ${index + 1}: Referência inválida ao operador ${av.operadorId}`);
        }
      });
    }
    
    if (data.criterios && data.avaliacoes) {
      const criterioIds = new Set(data.criterios.map((cr: any) => cr.id));
      data.avaliacoes.forEach((av: any, avIndex: number) => {
        if (av.criterios) {
          av.criterios.forEach((cr: any, crIndex: number) => {
            if (!criterioIds.has(cr.criterioId)) {
              issues.push(`Avaliação ${avIndex + 1}, Critério ${crIndex + 1}: Referência inválida ao critério ${cr.criterioId}`);
            }
          });
        }
      });
    }
    
  } catch (error) {
    issues.push('Estrutura de dados corrompida');
  }
  
  return { valid: issues.length === 0, issues };
}