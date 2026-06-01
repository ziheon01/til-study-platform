import client from './client'

export interface Task {
  id: string
  userId: string
  date: string
  title: string
  isCompleted: boolean
  createdAt: string
  updatedAt: string
}

export const tasksApi = {
  create: (body: { title: string; date?: string }) =>
    client.post<{ data: Task }>('/tasks', body),

  list: (date?: string) =>
    client.get<{ data: Task[] }>('/tasks', { params: date ? { date } : undefined }),

  update: (id: string, title: string) =>
    client.patch<{ data: Task }>(`/tasks/${id}`, { title }),

  toggle: (id: string) =>
    client.patch<{ data: Task }>(`/tasks/${id}/complete`),

  delete: (id: string) =>
    client.delete(`/tasks/${id}`),
}
