import prisma from '../utils/prisma';
import { RefreshToken } from '../generated/prisma';

export async function createRefreshToken(data: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<RefreshToken> {
  return prisma.refreshToken.create({
    data: {
      userId: data.userId,
      token: data.tokenHash,
      expiresAt: data.expiresAt,
    },
  });
}

export async function findRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
  return prisma.refreshToken.findUnique({ where: { token: tokenHash } });
}

export async function deleteRefreshTokenByHash(tokenHash: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token: tokenHash } });
}
