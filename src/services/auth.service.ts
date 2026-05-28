import { AppError } from '../middlewares/errors';
import * as userRepo from '../repositories/user.repository';
import * as rtRepo from '../repositories/refreshToken.repository';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyToken, hashToken } from '../utils/jwt';
import {
  RegisterInput,
  LoginInput,
  UserResponse,
  LoginResponse,
  RefreshResponse,
} from '../dtos/auth.dto';

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일

function toUserResponse(user: {
  id: string;
  email: string;
  nickname: string;
  createdAt: Date;
}): UserResponse {
  return { id: user.id, email: user.email, nickname: user.nickname, createdAt: user.createdAt };
}

export async function register(input: RegisterInput): Promise<UserResponse> {
  const existing = await userRepo.findUserByEmail(input.email);
  if (existing) {
    throw new AppError(409, 'EMAIL_CONFLICT', '이미 사용 중인 이메일입니다');
  }

  const hashedPassword = await hashPassword(input.password);
  const user = await userRepo.createUser({
    email: input.email,
    password: hashedPassword,
    nickname: input.nickname,
  });

  return toUserResponse(user);
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  const user = await userRepo.findUserByEmail(input.email);
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다');
  }

  const isValid = await comparePassword(input.password, user.password);
  if (!isValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다');
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await rtRepo.createRefreshToken({ userId: user.id, tokenHash, expiresAt });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, nickname: user.nickname },
  };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  const stored = await rtRepo.findRefreshTokenByHash(tokenHash);
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', '유효하지 않은 Refresh Token입니다');
  }
  await rtRepo.deleteRefreshTokenByHash(tokenHash);
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  // JWT 자체 서명·만료 검증
  let payload: { sub: string };
  try {
    payload = verifyToken(refreshToken);
  } catch {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', '유효하지 않은 Refresh Token입니다');
  }

  // DB에 저장된 토큰 존재 여부 확인 (로테이션 검사 포함)
  const tokenHash = hashToken(refreshToken);
  const stored = await rtRepo.findRefreshTokenByHash(tokenHash);
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', '유효하지 않은 Refresh Token입니다');
  }

  // 기존 토큰 삭제 후 신규 발급 (로테이션)
  await rtRepo.deleteRefreshTokenByHash(tokenHash);

  const newAccessToken = signAccessToken(payload.sub);
  const newRefreshToken = signRefreshToken(payload.sub);
  const newHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await rtRepo.createRefreshToken({ userId: payload.sub, tokenHash: newHash, expiresAt });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function getMe(userId: string): Promise<UserResponse> {
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', '인증 정보가 유효하지 않습니다');
  }
  return toUserResponse(user);
}
