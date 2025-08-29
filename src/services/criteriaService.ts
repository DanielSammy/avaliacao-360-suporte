import { BASE_URL, API_ENDPOINTS, getAuthToken } from '../config/apiConfig';
import { Criterio } from '../types/evaluation';

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
  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.CRITERIOS}`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(criterio),
    }
  );
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const updateCriterio = async (id: number, criterio: Partial<Omit<Criterio, 'id' | 'totalAvaliacoes'>>): Promise<{ success: boolean, data: Criterio }> => {
  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.CRITERIOS}/${id}`,
    {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(criterio),
    }
  );
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
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
