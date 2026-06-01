import client from './client'

export type TilCategory = 'CS' | 'ALGORITHM' | 'BACKEND' | 'FRONTEND' | 'ETC'

export interface Til {
  id: string
  userId: string
  date: string
  title: string
  content: string
  category: TilCategory
  createdAt: string
  updatedAt: string
}

export const tilsApi = {
  create: (body: { title: string; content: string; category: TilCategory; date?: string }) =>
    client.post<{ data: Til }>('/tils', body),

  list: () =>
    client.get<{ data: Til[] }>('/tils'),

  get: (id: string) =>
    client.get<{ data: Til }>(`/tils/${id}`),

  update: (id: string, body: { title?: string; content?: string; category?: TilCategory }) =>
    client.patch<{ data: Til }>(`/tils/${id}`, body),

  delete: (id: string) =>
    client.delete(`/tils/${id}`),
}
