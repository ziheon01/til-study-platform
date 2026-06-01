export interface StatsResponse {
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastStudiedAt: string | null; // 'YYYY-MM-DD' or null
  };
  today: {
    totalTasks: number;
    completedTasks: number;
    taskCompletionRate: number; // 0.0 ~ 1.0, 소수점 둘째 자리 반올림
  };
  weekly: {
    tilCount: number; // 이번 주 TIL 작성 일수 (0~7)
    totalTasks: number;
    completedTasks: number;
    taskCompletionRate: number; // 0.0 ~ 1.0, 소수점 둘째 자리 반올림
  };
}
