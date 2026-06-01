import request from 'supertest';
import app from '../../src/index';
import { clearDatabase, disconnectDatabase, prisma } from '../helpers/db';

beforeEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

const AUTH_BASE = '/api/auth';
const BASE = '/api/tils';

const validUser = {
  email: 'til@example.com',
  password: 'password123',
  nickname: 'tiluser',
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
// POST /api/tils
// ──────────────────────────────────────────────
describe('POST /api/tils', () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndLogin();
  });

  it('201: 정상 TIL 작성', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '오늘의 TIL', content: '## 배운 것\n- Express', category: 'BACKEND' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: '오늘의 TIL',
      content: '## 배운 것\n- Express',
      category: 'BACKEND',
    });
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('201: category 생략 시 ETC 기본값', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '기본 카테고리', content: '내용' });

    expect(res.status).toBe(201);
    expect(res.body.data.category).toBe('ETC');
  });

  it('401: 인증 없음', async () => {
    const res = await request(app)
      .post(BASE)
      .send({ title: '제목', content: '내용' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('400: title 누락', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '내용' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400: content 누락', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '제목' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400: 유효하지 않은 category', async () => {
    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '제목', content: '내용', category: 'INVALID' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('409: 오늘 날짜 TIL 중복 작성', async () => {
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '첫 TIL', content: '내용' });

    const res = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '중복 TIL', content: '내용' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TIL_DUPLICATE');
  });

  it('TIL 작성 시 Streak 생성 (최초)', async () => {
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '스트릭 테스트', content: '내용' });

    const user = await prisma.user.findFirst({ where: { email: validUser.email } });
    const streak = await prisma.streak.findUnique({ where: { userId: user!.id } });

    expect(streak).not.toBeNull();
    expect(streak!.currentStreak).toBe(1);
    expect(streak!.longestStreak).toBe(1);
    expect(streak!.lastStudiedAt).not.toBeNull();
  });

  it('오늘 TIL이 이미 있으면 Streak 변경 없음', async () => {
    const user = await prisma.user.findFirst({ where: { email: validUser.email } });

    // 최초 작성
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '첫 TIL', content: '내용' });

    const streakBefore = await prisma.streak.findUnique({ where: { userId: user!.id } });

    // 같은 날 중복 시도 (409)
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '중복 TIL', content: '내용' });

    const streakAfter = await prisma.streak.findUnique({ where: { userId: user!.id } });
    expect(streakAfter!.currentStreak).toBe(streakBefore!.currentStreak);
  });
});

// ──────────────────────────────────────────────
// GET /api/tils
// ──────────────────────────────────────────────
describe('GET /api/tils', () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndLogin();
  });

  it('200: 빈 목록 반환', async () => {
    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('200: 본인 TIL 목록 최신순 반환', async () => {
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '첫 TIL', content: '내용' });

    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('첫 TIL');
  });

  it('본인 TIL만 반환 (타 유저 TIL 불포함)', async () => {
    const otherToken = await registerAndLogin(otherUser);
    await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: '타 유저 TIL', content: '내용' });

    const res = await request(app).get(BASE).set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('401: 인증 없음', async () => {
    const res = await request(app).get(BASE);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

// ──────────────────────────────────────────────
// GET /api/tils/:id
// ──────────────────────────────────────────────
describe('GET /api/tils/:id', () => {
  let token: string;
  let tilId: string;

  beforeEach(async () => {
    token = await registerAndLogin();
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '단건 조회 TIL', content: '내용', category: 'CS' });
    tilId = createRes.body.data.id;
  });

  it('200: 단건 조회 성공', async () => {
    const res = await request(app)
      .get(`${BASE}/${tilId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(tilId);
    expect(res.body.data.title).toBe('단건 조회 TIL');
    expect(res.body.data.category).toBe('CS');
  });

  it('401: 인증 없음', async () => {
    const res = await request(app).get(`${BASE}/${tilId}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('404: 존재하지 않는 id', async () => {
    const res = await request(app)
      .get(`${BASE}/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TIL_NOT_FOUND');
  });

  it('403: 타 유저 TIL 조회', async () => {
    const otherToken = await registerAndLogin(otherUser);
    const res = await request(app)
      .get(`${BASE}/${tilId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

// ──────────────────────────────────────────────
// PATCH /api/tils/:id
// ──────────────────────────────────────────────
describe('PATCH /api/tils/:id', () => {
  let token: string;
  let tilId: string;

  beforeEach(async () => {
    token = await registerAndLogin();
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '수정 전 TIL', content: '원본 내용', category: 'ETC' });
    tilId = createRes.body.data.id;
  });

  it('200: title 수정', async () => {
    const res = await request(app)
      .patch(`${BASE}/${tilId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '수정된 제목' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('수정된 제목');
    expect(res.body.data.content).toBe('원본 내용');
  });

  it('200: category 수정', async () => {
    const res = await request(app)
      .patch(`${BASE}/${tilId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'CS' });

    expect(res.status).toBe(200);
    expect(res.body.data.category).toBe('CS');
  });

  it('400: 빈 바디 (수정 필드 없음)', async () => {
    const res = await request(app)
      .patch(`${BASE}/${tilId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('401: 인증 없음', async () => {
    const res = await request(app)
      .patch(`${BASE}/${tilId}`)
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
    expect(res.body.error.code).toBe('TIL_NOT_FOUND');
  });

  it('403: 타 유저 TIL 수정', async () => {
    const otherToken = await registerAndLogin(otherUser);
    const res = await request(app)
      .patch(`${BASE}/${tilId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ title: '탈취 수정' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

// ──────────────────────────────────────────────
// DELETE /api/tils/:id
// ──────────────────────────────────────────────
describe('DELETE /api/tils/:id', () => {
  let token: string;
  let tilId: string;

  beforeEach(async () => {
    token = await registerAndLogin();
    const createRes = await request(app)
      .post(BASE)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '삭제할 TIL', content: '내용' });
    tilId = createRes.body.data.id;
  });

  it('200: 삭제 성공', async () => {
    const res = await request(app)
      .delete(`${BASE}/${tilId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBeDefined();
  });

  it('삭제 후 조회 시 404', async () => {
    await request(app).delete(`${BASE}/${tilId}`).set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .get(`${BASE}/${tilId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('401: 인증 없음', async () => {
    const res = await request(app).delete(`${BASE}/${tilId}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('404: 존재하지 않는 id', async () => {
    const res = await request(app)
      .delete(`${BASE}/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('TIL_NOT_FOUND');
  });

  it('403: 타 유저 TIL 삭제', async () => {
    const otherToken = await registerAndLogin(otherUser);
    const res = await request(app)
      .delete(`${BASE}/${tilId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
