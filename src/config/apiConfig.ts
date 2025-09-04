export const BASE_URL = import.meta.env.VITE_API_BASE_URL;
export const API_ENDPOINTS = {
  OPERADORES: '/operadores',
  CRITERIOS: '/criterios',
  AVALIACOES: '/avaliacoes',
  RELATORIOS_DASHBOARD: '/relatorios/dashboard'
  // Add other endpoints here as needed
};

// Function to get the authentication token (replace with actual logic)
export const getAuthToken = (): string | null => {
  // This is a placeholder. In a real application, you would get the token
  // from localStorage, a global state management system (like Redux), or a secure cookie.
  // For now, let's assume it's stored in localStorage after login.
  return localStorage.getItem('authToken'); 
};
