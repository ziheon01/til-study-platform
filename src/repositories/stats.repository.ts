import prisma from '../utils/prisma';

export async function countTilsInRange(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  return prisma.til.count({
    where: { userId, date: { gte: startDate, lte: endDate } },
  });
}

export async function findTasksInRange(
  userId: string,
  startDate: Date,
  endDate: Date,
): Promise<{ isCompleted: boolean }[]> {
  return prisma.task.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    select: { isCompleted: true },
  });
}
