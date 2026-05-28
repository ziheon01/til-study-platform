import request from 'supertest';
import app from '../../src/index';
import { clearDatabase, disconnectDatabase } from '../helpers/db';

beforeEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

const BASE = '/api/auth';

const validUser = {
  email: 'test@example.com',
  password: 'password123',
  nickname: 'tester',
};

// ──────────────────────────────────────────────
// POST /api/auth/register
// ──────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('201: 정상 회원가입', async () => {
    const res = await request(app).post(`${BASE}/register`).send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      email: validUser.email,
      nickname: validUser.nickname,
    });
    expect(res.body.data).not.toHaveProperty('password');
    expect(res.body.data.id).toBeDefined();
  });

  it('400: 이메일 형식 오류', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ ...validUser, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400: 비밀번호 8자 미만', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ ...validUser, password: '1234567' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('400: nickname 누락', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('409: 이미 존재하는 이메일', async () => {
    await request(app).post(`${BASE}/register`).send(validUser);
    const res = await request(app).post(`${BASE}/register`).send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_CONFLICT');
  });
});

// ──────────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send(validUser);
  });

  it('200: 정상 로그인', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user).toMatchObject({
      email: validUser.email,
      nickname: validUser.nickname,
    });
  });

  it('400: 바디 검증 실패', async () => {
    const res = await request(app).post(`${BASE}/login`).send({ email: validUser.email });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('401: 존재하지 않는 이메일', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: 'no@example.com', password: validUser.password });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('401: 비밀번호 불일치', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

// ──────────────────────────────────────────────
// POST /api/auth/logout
// ──────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  let refreshToken: string;

  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send(validUser);
    const loginRes = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password });
    refreshToken = loginRes.body.data.refreshToken;
  });

  it('200: 정상 로그아웃', async () => {
    const res = await request(app).post(`${BASE}/logout`).send({ refreshToken });

    expect(res.status).toBe(200);
  });

  it('400: refreshToken 미제공', async () => {
    const res = await request(app).post(`${BASE}/logout`).send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('401: 이미 무효화된 refreshToken', async () => {
    await request(app).post(`${BASE}/logout`).send({ refreshToken });
    const res = await request(app).post(`${BASE}/logout`).send({ refreshToken });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });
});

// ──────────────────────────────────────────────
// POST /api/auth/refresh
// ──────────────────────────────────────────────
describe('POST /api/auth/refresh', () => {
  let refreshToken: string;

  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send(validUser);
    const loginRes = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password });
    refreshToken = loginRes.body.data.refreshToken;
  });

  it('200: 새 accessToken 발급', async () => {
    const res = await request(app).post(`${BASE}/refresh`).send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('400: refreshToken 미제공', async () => {
    const res = await request(app).post(`${BASE}/refresh`).send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('401: 유효하지 않은 refreshToken', async () => {
    const res = await request(app)
      .post(`${BASE}/refresh`)
      .send({ refreshToken: 'invalid.token.here' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('401: 로테이션 후 이전 토큰 재사용 불가', async () => {
    await request(app).post(`${BASE}/refresh`).send({ refreshToken });
    const res = await request(app).post(`${BASE}/refresh`).send({ refreshToken });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });
});

// ──────────────────────────────────────────────
// GET /api/auth/me
// ──────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  let accessToken: string;

  beforeEach(async () => {
    await request(app).post(`${BASE}/register`).send(validUser);
    const loginRes = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password });
    accessToken = loginRes.body.data.accessToken;
  });

  it('200: 내 정보 반환', async () => {
    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      email: validUser.email,
      nickname: validUser.nickname,
    });
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('401: Authorization 헤더 없음', async () => {
    const res = await request(app).get(`${BASE}/me`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('401: 유효하지 않은 토큰', async () => {
    const res = await request(app)
      .get(`${BASE}/me`)
      .set('Authorization', 'Bearer invalid.token');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
