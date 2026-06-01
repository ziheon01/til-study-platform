import client from './client'

export interface User {
  id: string
  email: string
  nickname: string
  createdAt: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export const authApi = {
  register: (email: string, password: string, nickname: string) =>
    client.post<{ data: User }>('/auth/register', { email, password, nickname }),

  login: (email: string, password: string) =>
    client.post<{ data: AuthTokens & { user: User } }>('/auth/login', { email, password }),

  logout: (refreshToken: string) =>
    client.post('/auth/logout', { refreshToken }),

  me: () =>
    client.get<{ data: User }>('/auth/me'),
}
