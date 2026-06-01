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
const BASE = '/api/tasks';

const validUser = {
  email: 'task@example.com',
  password: 'password123',
  nickname: 'taskuser',
};

const otherUser = {
  email: 'other@example.com',
  password: 'password123',
  nickname: 'otheruser',
};

async function registerAndLogin(user = validUser): Promise<string> {
  await request(app).post(`${AUTH_BASE}/register`).send(user);
  const res = await request(app)
    .post(`${AUTH_BASE}/login`)
    .send({ email: user.email, password: user.password });
  return res.body.data.accessToken;
}

// ──────────────────────────────────────────────
// POST /api/tasks
// ──────────────────────────────────────────────
describe('POST /api/tasks', () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndLogin();
  });

  it('201: 정상 태스크 등록 (date 생략 → 오늘)', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '오늘 할 일' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: '오늘 할 일',
      isCompleted: false,
    });
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('201: date 명시 시 해당 날짜로 등록', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '내일 할 일', date: '2026-06-02' });

    expect(res.status).toBe(201);
    expect(res.body.data.date).toBe('2026-06-02');
  });

  it('201: 같은 날짜에 여러 태스크 등록 가능', async () => {
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '첫 번째 할 일' });

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '두 번째 할 일' });

    expect(res.status).toBe(201);
  });

  it('401: 인증 없음', async () => {
    const res = await request(app).post(BASE).send({ title: '할 일' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('400: title 누락', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400: date 형식 오류', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '할 일', date: '20260602' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ──────────────────────────────────────────────
// GET /api/tasks?date=YYYY-MM-DD
// ──────────────────────────────────────────────
describe('GET /api/tasks', () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndLogin();
  });

  it('200: 해당 날짜 태스크 목록 반환', async () => {
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '할 일', date: '2026-06-01' });

    const res = await request(app)
      .get(`${BASE}?date=2026-06-01`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('할 일');
    expect(res.body.data[0].date).toBe('2026-06-01');
  });

  it('200: 해당 날짜 태스크 없으면 빈 배열', async () => {
    const res = await request(app)
      .get(`${BASE}?date=2026-06-01`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('본인 태스크만 반환 (타 유저 태스크 불포함)', async () => {
    const otherToken = await registerAndLogin(otherUser);
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: '타 유저 할 일', date: '2026-06-01' });

    const res = await request(app)
      .get(`${BASE}?date=2026-06-01`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('401: 인증 없음', async () => {
    const res = await request(app).get(`${BASE}?date=2026-06-01`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('400: date 파라미터 누락', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400: date 형식 오류', async () => {
    const res = await request(app)
      .get(`${BASE}?date=06-01-2026`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ──────────────────────────────────────────────
// PATCH /api/tasks/:id
// ──────────────────────────────────────────────
describe('PATCH /api/tasks/:id', () => {
  let token: string;
  let taskId: string;

  beforeEach(async () => {
    token = await registerAndLogin();
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '수정 전 제목' });
    taskId = createRes.body.data.id;
  });

  it('200: title 수정', async () => {
    const res = await request(app)
      .patch(`${BASE}/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '수정된 제목' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('수정된 제목');
    expect(res.body.data.isCompleted).toBe(false);
  });

  it('400: 빈 바디', async () => {
    const res = await request(app)
      .patch(`${BASE}/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('401: 인증 없음', async () => {
    const res = await request(app)
      .patch(`${BASE}/${taskId}`)
      .send({ title: '수정' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('404: 존재하지 않는 id', async () => {
    const res = await request(app)
      .patch(`${BASE}/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '수정' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TASK_NOT_FOUND');
  });

  it('403: 타 유저 태스크 수정', async () => {
    const otherToken = await registerAndLogin(otherUser);
    const res = await request(app)
      .patch(`${BASE}/${taskId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: '탈취 수정' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

// ──────────────────────────────────────────────
// PATCH /api/tasks/:id/complete
// ──────────────────────────────────────────────
describe('PATCH /api/tasks/:id/complete', () => {
  let token: string;
  let taskId: string;

  beforeEach(async () => {
    token = await registerAndLogin();
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '완료 토글 테스트' });
    taskId = createRes.body.data.id;
  });

  it('200: 완료 토글 (false → true)', async () => {
    const res = await request(app)
      .patch(`${BASE}/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isCompleted).toBe(true);
  });

  it('200: 두 번 토글 시 원복 (true → false)', async () => {
    await request(app)
      .patch(`${BASE}/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .patch(`${BASE}/${taskId}/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isCompleted).toBe(false);
  });

  it('401: 인증 없음', async () => {
    const res = await request(app).patch(`${BASE}/${taskId}/complete`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('404: 존재하지 않는 id', async () => {
    const res = await request(app)
      .patch(`${BASE}/00000000-0000-0000-0000-000000000000/complete`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TASK_NOT_FOUND');
  });

  it('403: 타 유저 태스크 완료 토글', async () => {
    const otherToken = await registerAndLogin(otherUser);
    const res = await request(app)
      .patch(`${BASE}/${taskId}/complete`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

// ──────────────────────────────────────────────
// DELETE /api/tasks/:id
// ──────────────────────────────────────────────
describe('DELETE /api/tasks/:id', () => {
  let token: string;
  let taskId: string;

  beforeEach(async () => {
    token = await registerAndLogin();
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '삭제할 태스크' });
    taskId = createRes.body.data.id;
  });

  it('200: 삭제 성공', async () => {
    const res = await request(app)
      .delete(`${BASE}/${taskId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBeDefined();
  });

  it('401: 인증 없음', async () => {
    const res = await request(app).delete(`${BASE}/${taskId}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('404: 존재하지 않는 id', async () => {
    const res = await request(app)
      .delete(`${BASE}/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TASK_NOT_FOUND');
  });

  it('403: 타 유저 태스크 삭제', async () => {
    const otherToken = await registerAndLogin(otherUser);
    const res = await request(app)
      .delete(`${BASE}/${taskId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
