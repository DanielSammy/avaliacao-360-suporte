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
  const { id, dataInclusao, ...operadorToUpdate } = operador; // Destructure to omit id and dataInclusao
  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.OPERADORES}/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(operadorToUpdate), // Send the new object
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
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
export const getMySuiteOperadores = async (): Promise<Array<any>> => {
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

  try {
    if (process.env.NODE_ENV !== 'production') console.log('[MySuite] POST ->', url, 'payload:', payload);
  } catch (e) {}

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
    return data.map((r: any) => ({
      codigo: Number(r.codigo ?? r.id ?? 0),
      codigoOperador: Number(r.codigoOperador ?? r.codigo_operador ?? r.operadorCodigo ?? 0),
    }));
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
  // Log minimal para auxiliar debug do intervalo de datas (somente em dev)
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[MySuite] POST ->', url, 'payload:', payload);
    }
  } catch (e) {
    // ignore logging errors
  }

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
    return data.map((r: any) => {
      // tentar extrair operadorCodigo de variações comuns
      const operadorCodigo = Number(r.operadorCodigo ?? r.operador_codigo ?? r.codigoOperador ?? r.operadorCod ?? r.operadorId ?? NaN);

      // possíveis campos/sintaxes para a média: strings com vírgula, número, ou nomes diferentes
      const mediaCandidates = [r.mediaAvaliacao, r.media, r.media_avaliacao, r.mediaAvaliacaoMedia, r.mediaAvaliacaoStr, r.mediaPercentual, r.media_percentual];
      let mediaRaw = undefined as any;
      for (const c of mediaCandidates) {
        if (c !== undefined && c !== null) { mediaRaw = c; break; }
      }

      let media = 0;
      if (mediaRaw !== undefined && mediaRaw !== null) {
        if (typeof mediaRaw === 'string') {
          // substituir vírgula por ponto e converter
          media = parseFloat(mediaRaw.replace(',', '.')) || 0;
        } else if (typeof mediaRaw === 'number') {
          media = mediaRaw;
        } else {
          media = Number(mediaRaw) || 0;
        }
      }

      return {
        ...r,
        operadorCodigo: Number.isNaN(operadorCodigo) ? undefined : operadorCodigo,
        mediaAvaliacao: media,
      } as any;
    });
  }

  return data;
};
