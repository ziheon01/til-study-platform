import client from './client'

export interface Stats {
  streak: {
    currentStreak: number
    longestStreak: number
    lastStudiedAt: string | null
  }
  today: {
    totalTasks: number
    completedTasks: number
    taskCompletionRate: number
  }
  weekly: {
    tilCount: number
    totalTasks: number
    completedTasks: number
    taskCompletionRate: number
  }
}

export const statsApi = {
  get: () => client.get<{ data: Stats }>('/stats'),
}
