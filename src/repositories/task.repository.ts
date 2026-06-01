import prisma from '../utils/prisma';

interface CreateTaskParams {
  userId: string;
  date: Date;
  title: string;
}

export async function createTask(params: CreateTaskParams) {
  return prisma.task.create({ data: params });
}

export async function findTasksByUserIdAndDate(userId: string, date: Date) {
  return prisma.task.findMany({
    where: { userId, date },
    orderBy: { createdAt: 'asc' },
  });
}

export async function findTaskById(id: string) {
  return prisma.task.findUnique({ where: { id } });
}

export async function updateTask(id: string, data: { title?: string; isCompleted?: boolean }) {
  return prisma.task.update({ where: { id }, data });
}

export async function deleteTask(id: string) {
  return prisma.task.delete({ where: { id } });
}
