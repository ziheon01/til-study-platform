import { PrismaClient } from '../../src/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

export async function clearDatabase(): Promise<void> {
  // 외래키 의존 순서대로 삭제
  await prisma.refreshToken.deleteMany();
  await prisma.streak.deleteMany();
  await prisma.task.deleteMany();
  await prisma.til.deleteMany();
  await prisma.user.deleteMany();
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}

export { prisma };
