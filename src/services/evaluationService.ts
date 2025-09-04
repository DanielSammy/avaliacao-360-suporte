import { BASE_URL, API_ENDPOINTS, getAuthToken } from '../config/apiConfig';

// Request for the new bulk endpoint
export interface CreateBulkEvaluationsRequest {
  criterioId: number;
  avaliadorId: number;
  avaliacoes: Array<{
    operadorId: number;
    periodo: string;
    valorObjetivo: string;
    valorAlcancado: string;
    metaObjetivo : number;
    metaAlcancada : number;
  }>;
}

// Updated response for the bulk endpoint
export interface CreateBulkEvaluationsResponse {
  success: boolean;
  data?: {
    id: number;
  };
  message: string;
  error?: string;
}

const getHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export const createBulkEvaluations = async (bulkData: CreateBulkEvaluationsRequest): Promise<CreateBulkEvaluationsResponse> => {
  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.AVALIACOES}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(bulkData),
  });

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
  }

  // If response is OK, but the success field is missing, consider it a success.
  // Otherwise, trust the success field from the response.
  if (response.ok && typeof responseData.success === 'undefined') {
    return {
      ...responseData,
      success: true,
    };
  }

  return responseData;
};
