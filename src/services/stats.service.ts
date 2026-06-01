import { findStreakByUserId } from '../repositories/streak.repository';
import { countTilsInRange, findTasksInRange } from '../repositories/stats.repository';
import { StatsResponse } from '../dtos/stats.dto';

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// (dayOfWeek + 6) % 7 → 월=0, 화=1, … 일=6 (일요일=0 버그 방지)
function weekStartUTC(): Date {
  const today = todayUTC();
  const daysFromMonday = (today.getUTCDay() + 6) % 7;
  return new Date(today.getTime() - daysFromMonday * 24 * 60 * 60 * 1000);
}

function calcCompletionRate(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100) / 100;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getStats(userId: string): Promise<StatsResponse> {
  const today = todayUTC();
  const weekStart = weekStartUTC();

  const [streak, todayTasks, weeklyTilCount, weeklyTasks] = await Promise.all([
    findStreakByUserId(userId),
    findTasksInRange(userId, today, today),
    countTilsInRange(userId, weekStart, today),
    findTasksInRange(userId, weekStart, today),
  ]);

  const todayCompleted = todayTasks.filter((t) => t.isCompleted).length;
  const weeklyCompleted = weeklyTasks.filter((t) => t.isCompleted).length;

  return {
    streak: {
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      lastStudiedAt: streak?.lastStudiedAt ? toDateString(streak.lastStudiedAt) : null,
    },
    today: {
      totalTasks: todayTasks.length,
      completedTasks: todayCompleted,
      taskCompletionRate: calcCompletionRate(todayCompleted, todayTasks.length),
    },
    weekly: {
      tilCount: weeklyTilCount,
      totalTasks: weeklyTasks.length,
      completedTasks: weeklyCompleted,
      taskCompletionRate: calcCompletionRate(weeklyCompleted, weeklyTasks.length),
    },
  };
}
