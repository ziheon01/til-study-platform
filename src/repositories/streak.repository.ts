import prisma from '../utils/prisma';

export async function findStreakByUserId(userId: string) {
  return prisma.streak.findUnique({ where: { userId } });
}

export async function upsertStreak(
  userId: string,
  data: { currentStreak: number; longestStreak: number; lastStudiedAt: Date },
) {
  return prisma.streak.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}
