import { BASE_URL, API_ENDPOINTS, getAuthToken } from '../config/apiConfig';
import { Criterio, TipoCriterio } from '../types/evaluation';

const getHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export const getCriterios = async (): Promise<{ success: boolean, data: Criterio[] }> => {
  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.CRITERIOS}`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const createCriterio = async (criterio: Omit<Criterio, 'id' | 'totalAvaliacoes'>): Promise<{ success: boolean, data: Criterio }> => {
  // Montar payload conforme CriterioCreateRequest do backend
  const bodyPayload = {
    ativo: criterio.ativo ? 1 : 0,
    nome: criterio.nome,
    idCriterio: criterio.idCriterio,
    tipo: criterio.tipo,
    tipoMeta: criterio.tipoMeta,
    valorMeta: criterio.valorMeta,
    ordem: criterio.ordem ?? null,
    valorCriterio: (typeof criterio.valorBonus === 'number' ? criterio.valorBonus : parseFloat(String(criterio.valorBonus || 0))).toFixed(2),
  };

  // Log do payload para depuração
  console.debug('createCriterio - payload:', bodyPayload);

  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.CRITERIOS}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    // tenta ler corpo da resposta para entender o 500
    const text = await response.text().catch(() => '<no body>');
    console.error('createCriterio failed', response.status, text, 'payload:', bodyPayload);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const json = await response.json();
  console.debug('createCriterio - response:', json);
  return json;
};

export const updateCriterio = async (id: number, criterio: Partial<Omit<Criterio, 'id' | 'totalAvaliacoes'>>): Promise<{ success: boolean, data: Criterio }> => {
  // Mapear valorBonus (frontend) para valorCriterio (backend string) se presente
  const payload: any = { ...criterio };
  // converter ativo para int se fornecido
  if (payload.ativo !== undefined) {
    payload.ativo = payload.ativo ? 1 : 0;
  }

  // mapear valorBonus para valorCriterio string se presente
  if (criterio && (criterio as any).valorBonus !== undefined) {
    const vb = (criterio as any).valorBonus;
    payload.valorCriterio = (typeof vb === 'number' ? vb : parseFloat(String(vb || 0))).toFixed(2);
    delete payload.valorBonus;
  }

  console.debug('updateCriterio - payload:', payload);

  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.CRITERIOS}/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '<no body>');
    console.error('updateCriterio failed', response.status, text, 'payload:', payload);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const json = await response.json();
  console.debug('updateCriterio - response:', json);
  return json;
};

export const deleteCriterio = async (id: number): Promise<void> => {
  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.CRITERIOS}/${id}`,
    {
      method: 'DELETE',
      headers: getHeaders(),
    }
  );
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};

export const updateCriterioStatus = async (id: number, ativo: boolean): Promise<void> => {
  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.CRITERIOS}/${id}/status`,
    {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ ativo }),
    }
  );
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};

export const getTipoCriterios = async (): Promise<TipoCriterio[]> => {
    const response = await fetch(`${BASE_URL}/tipocriterio`, {
        headers: getHeaders(),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
};

export const updateTipoCriterio = async (id: number, tipoCriterio: TipoCriterio): Promise<void> => {
    const response = await fetch(`${BASE_URL}/tipocriterio/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(tipoCriterio),
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
};
