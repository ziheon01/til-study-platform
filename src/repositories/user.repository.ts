import prisma from '../utils/prisma';
import { User } from '../generated/prisma';

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: {
  email: string;
  password: string;
  nickname: string;
}): Promise<User> {
  return prisma.user.create({ data });
}
