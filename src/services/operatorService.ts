import { BASE_URL, API_ENDPOINTS, getAuthToken } from '../config/apiConfig';
import { Operador } from '../types/evaluation';

const getHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export const getOperadores = async (): Promise<{ success: boolean, data: Operador[] }> => {
  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.OPERADORES}`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const getOperadorById = async (id: number): Promise<Operador> => {
  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.OPERADORES}/${id}`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const createOperador = async (operador: Omit<Operador, 'id' | 'dataInclusao'>): Promise<Operador> => {
  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.OPERADORES}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(operador),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const updateOperador = async (operador: Operador): Promise<Operador> => {
  const { id } = operador;

  // Montar payload explícito com os campos aceitos pelo backend
  const payload: {
    nome: string;
    login: string;
    ativo: boolean;
    grupo: number;
    participaAvaliacao: boolean;
    nivel?: string | null;
  } = {
    nome: String(operador.nome ?? ''),
    login: String(operador.login ?? ''),
    ativo: Boolean(operador.ativo),
    grupo: Number(operador.grupo ?? 0),
    participaAvaliacao: Boolean(operador.participaAvaliacao ?? false),
    nivel: operador.nivel ?? null,
  };

  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.OPERADORES}/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '<no body>');
    throw new Error(`HTTP error! status: ${response.status} body: ${text}`);
  }
  return response.json();
};

export const deleteOperador = async (id: number): Promise<void> => {
  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.OPERADORES}/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};

export const updateOperadorStatus = async (id: number, ativo: boolean): Promise<void> => {
  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.OPERADORES}/${id}/status`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ ativo }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};

// ===== MySuite integration =====
// Busca operadores no MySuite (não requer token)
export const getMySuiteOperadores = async (): Promise<Array<Record<string, unknown>>> => {
  const base = import.meta.env.VITE_API_MYSUITE_URL;
  if (!base) {
    throw new Error('VITE_API_MYSUITE_URL não configurado');
  }
  // Garantir que o sufixo /apimysuite esteja presente (se a variável não incluir)
  let normalized = base.replace(/\/$/, '');
  if (!/apimysuite$/i.test(normalized)) {
    normalized = `${normalized}/apimysuite`;
  }
  const url = `${normalized}/dados/operador`;
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`MySuite HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Busca de performance/avaliação por período (MySuite)
export interface MySuitePerformanceRequest {
  dataInicial: string; // DD/MM/YYYY
  dataFinal: string; // DD/MM/YYYY
  consideraDtAbertura: boolean;
}

export interface MySuitePerformanceItem {
  operadorSobrenome: string;
  mediaAvaliacao: number;
  quantidadeAvaliacoes: number;
  operadorCodigo: number;
  proporcaoAvaliadosPercentual: number;
  quantidadeTotalTicket: number;
  operadorNome: string;
}

export interface MySuiteConcluidoItem {
  codigo: number;
  codigoOperador: number;
  // outros campos do response do MySuite omitted
}

/**
 * Busca tickets concluídos por contato no MySuite para o intervalo informado.
 * Endpoint: /dashboard/suporte/ticket/concluido/contato
 */
export const getMySuiteConcluidosPorContato = async (payload: MySuitePerformanceRequest): Promise<MySuiteConcluidoItem[]> => {
  const base = import.meta.env.VITE_API_MYSUITE_URL;
  if (!base) {
    throw new Error('VITE_API_MYSUITE_URL não configurado');
  }
  let normalized = base.replace(/\/$/, '');
  if (!/apimysuite$/i.test(normalized)) {
    normalized = `${normalized}/apimysuite`;
  }

  const url = `${normalized}/dashboard/suporte/ticket/concluido/contato`;

  // debug log removed for production optimization

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '<no body>');
    throw new Error(`MySuite concluidos HTTP error! status: ${response.status} body: ${text}`);
  }

  const data = await response.json();
  // Espera-se um array de tickets; normalizar apenas codigoOperador
  if (Array.isArray(data)) {
    return data.map((r: unknown) => {
      const rr = r as Record<string, unknown>;
      const codigo = Number(rr.codigo ?? rr.id ?? 0);
      const codigoOperador = Number(rr.codigoOperador ?? rr.codigo_operador ?? rr.operadorCodigo ?? 0);
      return { codigo, codigoOperador };
    });
  }

  return [];
};

export const getMySuitePerformanceAvaliacoes = async (payload: MySuitePerformanceRequest): Promise<MySuitePerformanceItem[]> => {
  const base = import.meta.env.VITE_API_MYSUITE_URL;
  if (!base) {
    throw new Error('VITE_API_MYSUITE_URL não configurado');
  }
  let normalized = base.replace(/\/$/, '');
  if (!/apimysuite$/i.test(normalized)) {
    normalized = `${normalized}/apimysuite`;
  }

  const url = `${normalized}/dashboard/suporte/performace/time/avaliacao`;
  // debug log removed for production optimization

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '<no body>');
    throw new Error(`MySuite performance HTTP error! status: ${response.status} body: ${text}`);
  }
  const data = await response.json();

  // Normalizar possíveis formatos/nomes vindos do MySuite para facilitar consumo no frontend
  if (Array.isArray(data)) {
    return data.map((r: unknown) => {
      const rr = r as Record<string, unknown>;
      // tentar extrair operadorCodigo de variações comuns
      const operadorCodigoRaw = rr.operadorCodigo ?? rr.operador_codigo ?? rr.codigoOperador ?? rr.operadorCod ?? rr.operadorId ?? NaN;
      const operadorCodigo = Number(operadorCodigoRaw);

      // possíveis campos/sintaxes para a média: strings com vírgula, número, ou nomes diferentes
      const mediaCandidates = [rr.mediaAvaliacao, rr.media, rr.media_avaliacao, rr.mediaAvaliacaoMedia, rr.mediaAvaliacaoStr, rr.mediaPercentual, rr.media_percentual];
      let mediaRaw: unknown = undefined;
      for (const c of mediaCandidates) {
        if (c !== undefined && c !== null) { mediaRaw = c; break; }
      }

      let media = 0;
      if (mediaRaw !== undefined && mediaRaw !== null) {
        if (typeof mediaRaw === 'string') {
          // substituir vírgula por ponto e converter
          media = parseFloat(mediaRaw.replace(',', '.')) || 0;
        } else if (typeof mediaRaw === 'number') {
          media = mediaRaw as number;
        } else {
          media = Number(mediaRaw) || 0;
        }
      }

      // reconstruir objeto original com as normalizações
      const out = { ...(rr as Record<string, unknown>) } as Record<string, unknown>;
      return {
        ...out,
        operadorCodigo: Number.isNaN(operadorCodigo) ? undefined : operadorCodigo,
        mediaAvaliacao: media,
      } as MySuitePerformanceItem;
    });
  }

  return data;
};
