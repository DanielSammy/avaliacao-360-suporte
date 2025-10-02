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
