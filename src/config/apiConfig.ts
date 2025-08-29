export const BASE_URL = 'http://192.168.0.26:8080';
export const API_ENDPOINTS = {
  OPERADORES: '/operadores',
  // Add other endpoints here as needed
};

// Function to get the authentication token (replace with actual logic)
export const getAuthToken = (): string | null => {
  // This is a placeholder. In a real application, you would get the token
  // from localStorage, a global state management system (like Redux), or a secure cookie.
  // For now, let's assume it's stored in localStorage after login.
  return localStorage.getItem('authToken'); 
};
