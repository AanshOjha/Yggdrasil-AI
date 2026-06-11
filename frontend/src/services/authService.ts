const API_URL = 'http://localhost:8000/auth';

export interface User {
  id: string;
  email: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export const authService = {
  async register(email: string, password: string): Promise<User> {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Registration failed');
    }

    return response.json();
  },

  async login(email: string, password: string): Promise<Token> {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Login failed');
    }

    return response.json();
  },
};
