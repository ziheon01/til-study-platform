import { AppError } from '../middlewares/errors';
import * as tilRepo from '../repositories/til.repository';
import * as streakRepo from '../repositories/streak.repository';
import { CreateTilInput, UpdateTilInput, TilResponse } from '../dtos/til.dto';
import { TilCategory } from '../generated/prisma';

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toTilResponse(til: {
  id: string;
  userId: string;
  date: Date;
  title: string;
  content: string;
  category: TilCategory;
  createdAt: Date;
  updatedAt: Date;
}): TilResponse {
  return { ...til, date: toDateString(til.date) };
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

async function recalculateStreak(userId: string, today: Date): Promise<void> {
  const streak = await streakRepo.findStreakByUserId(userId);

  if (!streak) {
    await streakRepo.upsertStreak(userId, {
      currentStreak: 1,
      longestStreak: 1,
      lastStudiedAt: today,
    });
    return;
  }

  const lastStudiedAt = streak.lastStudiedAt
    ? new Date(
        Date.UTC(
          streak.lastStudiedAt.getUTCFullYear(),
          streak.lastStudiedAt.getUTCMonth(),
          streak.lastStudiedAt.getUTCDate(),
        ),
      )
    : null;

  const diff = lastStudiedAt ? diffDays(today, lastStudiedAt) : -1;

  if (diff === 0) {
    // 오늘 이미 기록됨 — 변경 없음
    return;
  }

  const newCurrent = diff === 1 ? streak.currentStreak + 1 : 1;
  const newLongest = Math.max(streak.longestStreak, newCurrent);

  await streakRepo.upsertStreak(userId, {
    currentStreak: newCurrent,
    longestStreak: newLongest,
    lastStudiedAt: today,
  });
}

export async function createTil(userId: string, input: CreateTilInput): Promise<TilResponse> {
  const today = todayUTC();

  const existing = await tilRepo.findTilByUserIdAndDate(userId, today);
  if (existing) {
    throw new AppError(409, 'TIL_DUPLICATE', '오늘 날짜의 TIL이 이미 존재합니다');
  }

  const til = await tilRepo.createTil({
    userId,
    date: today,
    title: input.title,
    content: input.content,
    category: input.category as TilCategory,
  });

  await recalculateStreak(userId, today);

  return toTilResponse(til);
}

export async function getTils(userId: string): Promise<TilResponse[]> {
  const tils = await tilRepo.findTilsByUserId(userId);
  return tils.map(toTilResponse);
}

export async function getTilById(userId: string, id: string): Promise<TilResponse> {
  const til = await tilRepo.findTilById(id);
  if (!til) {
    throw new AppError(404, 'TIL_NOT_FOUND', 'TIL을 찾을 수 없습니다');
  }
  if (til.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', '접근 권한이 없습니다');
  }
  return toTilResponse(til);
}

export async function updateTil(
  userId: string,
  id: string,
  input: UpdateTilInput,
): Promise<TilResponse> {
  const til = await tilRepo.findTilById(id);
  if (!til) {
    throw new AppError(404, 'TIL_NOT_FOUND', 'TIL을 찾을 수 없습니다');
  }
  if (til.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', '접근 권한이 없습니다');
  }

  const updated = await tilRepo.updateTil(id, {
    title: input.title,
    content: input.content,
    category: input.category as TilCategory | undefined,
  });

  return toTilResponse(updated);
}

export async function deleteTil(userId: string, id: string): Promise<void> {
  const til = await tilRepo.findTilById(id);
  if (!til) {
    throw new AppError(404, 'TIL_NOT_FOUND', 'TIL을 찾을 수 없습니다');
  }
  if (til.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', '접근 권한이 없습니다');
  }

  await tilRepo.deleteTil(id);
}
