import request from 'supertest';
import app from '../../src/index';
import { clearDatabase, disconnectDatabase } from '../helpers/db';

beforeEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

const AUTH_BASE = '/api/auth';
const TILS_BASE = '/api/tils';
const TASKS_BASE = '/api/tasks';
const BASE = '/api/stats';

const validUser = {
  email: 'stats@example.com',
  password: 'password123',
  nickname: 'statsuser',
};

async function registerAndLogin(): Promise<string> {
  await request(app).post(`${AUTH_BASE}/register`).send(validUser);
  const res = await request(app)
    .post(`${AUTH_BASE}/login`)
    .send({ email: validUser.email, password: validUser.password });
  return res.body.data.accessToken;
}

// ──────────────────────────────────────────────
// GET /api/stats
// ──────────────────────────────────────────────
describe('GET /api/stats', () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndLogin();
  });

  it('401: 인증 없음', async () => {
    const res = await request(app).get(BASE);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('200: 데이터 없을 때 모든 값이 기본값(0/null)', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      streak: {
        currentStreak: 0,
        longestStreak: 0,
        lastStudiedAt: null,
      },
      today: {
        totalTasks: 0,
        completedTasks: 0,
        taskCompletionRate: 0,
      },
      weekly: {
        tilCount: 0,
        totalTasks: 0,
        completedTasks: 0,
        taskCompletionRate: 0,
      },
    });
  });

  it('200: TIL 작성 후 streak 및 이번 주 TIL 수 반영', async () => {
    await request(app)
      .post(TILS_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '오늘의 TIL', content: '내용' });

    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.streak.currentStreak).toBe(1);
    expect(res.body.data.streak.longestStreak).toBe(1);
    expect(res.body.data.streak.lastStudiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body.data.weekly.tilCount).toBe(1);
  });

  it('200: 오늘 태스크 완료율 계산 (2개 중 1개 완료 → 0.5)', async () => {
    const res1 = await request(app)
      .post(TASKS_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '태스크 1' });
    const res2 = await request(app)
      .post(TASKS_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '태스크 2' });

    await request(app)
      .patch(`${TASKS_BASE}/${res1.body.data.id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    const statsRes = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.today).toMatchObject({
      totalTasks: 2,
      completedTasks: 1,
      taskCompletionRate: 0.5,
    });
  });

  it('200: 오늘 태스크 전부 완료 → taskCompletionRate: 1', async () => {
    const res1 = await request(app)
      .post(TASKS_BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '태스크 1' });

    await request(app)
      .patch(`${TASKS_BASE}/${res1.body.data.id}/complete`)
      .set('Authorization', `Bearer ${token}`);

    const statsRes = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(statsRes.body.data.today.taskCompletionRate).toBe(1);
  });

  it('200: 태스크 0개일 때 0으로 나누기 버그 없음 → taskCompletionRate: 0', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.today.taskCompletionRate).toBe(0);
    expect(res.body.data.weekly.taskCompletionRate).toBe(0);
  });

  it('200: 이번 주 태스크 완료율 계산 (4개 중 3개 완료 → 0.75)', async () => {
    const taskIds: string[] = [];
    for (let i = 1; i <= 4; i++) {
      const res = await request(app)
        .post(TASKS_BASE)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: `태스크 ${i}` });
      taskIds.push(res.body.data.id);
    }

    // 3개 완료
    for (const id of taskIds.slice(0, 3)) {
      await request(app)
        .patch(`${TASKS_BASE}/${id}/complete`)
        .set('Authorization', `Bearer ${token}`);
    }

    const statsRes = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.weekly).toMatchObject({
      totalTasks: 4,
      completedTasks: 3,
      taskCompletionRate: 0.75,
    });
  });

  it('200: 응답 구조가 스펙과 일치', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data).toHaveProperty('streak');
    expect(data).toHaveProperty('today');
    expect(data).toHaveProperty('weekly');
    expect(data.streak).toHaveProperty('currentStreak');
    expect(data.streak).toHaveProperty('longestStreak');
    expect(data.streak).toHaveProperty('lastStudiedAt');
    expect(data.today).toHaveProperty('totalTasks');
    expect(data.today).toHaveProperty('completedTasks');
    expect(data.today).toHaveProperty('taskCompletionRate');
    expect(data.weekly).toHaveProperty('tilCount');
    expect(data.weekly).toHaveProperty('totalTasks');
    expect(data.weekly).toHaveProperty('completedTasks');
    expect(data.weekly).toHaveProperty('taskCompletionRate');
  });
});
