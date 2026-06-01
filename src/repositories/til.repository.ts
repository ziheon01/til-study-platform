import prisma from '../utils/prisma';
import { TilCategory } from '../generated/prisma';

interface CreateTilParams {
  userId: string;
  date: Date;
  title: string;
  content: string;
  category: TilCategory;
}

interface UpdateTilParams {
  title?: string;
  content?: string;
  category?: TilCategory;
}

export async function createTil(params: CreateTilParams) {
  return prisma.til.create({ data: params });
}

export async function findTilsByUserId(userId: string) {
  return prisma.til.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
  });
}

export async function findTilById(id: string) {
  return prisma.til.findUnique({ where: { id } });
}

export async function findTilByUserIdAndDate(userId: string, date: Date) {
  return prisma.til.findUnique({ where: { userId_date: { userId, date } } });
}

export async function updateTil(id: string, params: UpdateTilParams) {
  return prisma.til.update({ where: { id }, data: params });
}

export async function deleteTil(id: string) {
  return prisma.til.delete({ where: { id } });
}
