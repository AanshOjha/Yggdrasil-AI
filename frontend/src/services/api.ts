export const API_BASE_URL = `http://${window.location.hostname}:8000`;

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');
  
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Optionally handle token expiration by clearing local storage and redirecting
    localStorage.removeItem('access_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response;
}
