import { BASE_URL, API_ENDPOINTS, getAuthToken } from '../config/apiConfig';
import { Avaliacao, CriterioAvaliacao } from '../types/evaluation';

interface CreateAvaliacaoRequest {
  operadorId: number;
  avaliadorId: number;
  periodo: string;
  criterios: Array<{
    criterioId: number;
    valorAlcancado: string;
    valorBonusAlcancado: string;
  }>;
}

interface CreateAvaliacaoResponse {
  success: boolean;
  data: {
    id: number;
  };
  message: string;
}

const getHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export const createAvaliacao = async (avaliacaoData: CreateAvaliacaoRequest): Promise<CreateAvaliacaoResponse> => {
  const response = await fetch(`${BASE_URL}${API_ENDPOINTS.AVALIACOES}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(avaliacaoData),
  });

  console.log(`API Response Status: ${response.status}, Status Text: ${response.statusText}`);

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      const errorText = await response.text();
      errorMessage = `Server error: ${response.status} - ${response.statusText}. Response: ${errorText}`;
    }
    throw new Error(errorMessage);
  }

  // If the response is OK, but might not have a body (e.g., 204)
  if (response.status === 204) {
    return {
        success: true,
        data: { id: 0 }, // No data to return, but it was successful.
        message: 'Operação bem-sucedida.'
    };
  }

  try {
    const responseData = await response.json();
    // Manually construct the success response to ensure it matches the expected interface.
    return {
      success: true,
      data: responseData, // Assuming the backend returns the evaluation object with an ID.
      message: 'Avaliação registrada com sucesso.'
    };
  } catch (e) {
    // This can happen if the response is successful (e.g., 201) but the body is empty.
    console.log("Response was successful but body could not be parsed as JSON. Treating as success.");
    return {
        success: true,
        data: { id: 0 }, // Placeholder ID
        message: 'Avaliação registrada com sucesso (sem dados de retorno).'
    };
  }
};
