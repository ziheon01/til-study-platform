# plan.md — 인증 기능 구현

작성일: 2026-05-29
상태: 승인 대기

---

## 기능 개요

SPEC.md §2 인증 파트 구현.

```
POST   /api/auth/register       회원가입
POST   /api/auth/login          로그인 (Access Token + Refresh Token 발급)
POST   /api/auth/logout         로그아웃 (Refresh Token 무효화)
POST   /api/auth/refresh        Access Token 재발급
GET    /api/auth/me             내 정보 조회
```

---

## Scope — 생성/수정할 파일

### 신규 생성

| 파일 | 역할 |
|------|------|
| `src/utils/prisma.ts` | Prisma 클라이언트 싱글톤 |
| `src/utils/jwt.ts` | Access Token / Refresh Token 발급·검증 |
| `src/utils/password.ts` | bcrypt 해싱·비교 |
| `src/utils/response.ts` | 공통 Response Wrapper (`{ data }` / `{ error }`) |
| `src/middlewares/errors.ts` | AppError 클래스 + 글로벌 에러 핸들러 |
| `src/middlewares/authenticate.ts` | Bearer Access Token 검증 미들웨어 |
| `src/middlewares/validate.ts` | Zod 스키마 검증 미들웨어 |
| `src/dtos/auth.dto.ts` | 요청/응답 Zod 스키마 + 타입 |
| `src/repositories/user.repository.ts` | User CRUD (Prisma) |
| `src/repositories/refreshToken.repository.ts` | RefreshToken CRUD (Prisma) |
| `src/services/auth.service.ts` | 인증 비즈니스 로직 |
| `src/controllers/auth.controller.ts` | Express Router (라우팅 + 검증 위임) |
| `tests/integration/auth.test.ts` | 통합 테스트 (Supertest) |
| `tests/helpers/db.ts` | 테스트 DB 초기화 헬퍼 |
| `.env.test` | 테스트 전용 환경 변수 |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `src/index.ts` | helmet, cors, pino-http, express-async-errors 등록, `/api/auth` 라우터 마운팅, 에러 핸들러 등록 |
| `jest.config.js` | `testEnvironment` 설정에 `.env.test` 로드 추가 |

---

## Acceptance Criteria

### AC-1. 회원가입 `POST /api/auth/register`

- [ ] 요청 바디 검증 실패 (이메일 형식 오류 / 비밀번호 8자 미만 / nickname 누락) → `400`
- [ ] 이미 존재하는 이메일 → `409`
- [ ] 성공 → `201`, `{ data: { id, email, nickname, createdAt } }` (password 미포함)

### AC-2. 로그인 `POST /api/auth/login`

- [ ] 요청 바디 검증 실패 → `400`
- [ ] 존재하지 않는 이메일 또는 비밀번호 불일치 → `401`
- [ ] 성공 → `200`, `{ data: { accessToken, refreshToken, user: { id, email, nickname } } }`

### AC-3. 로그아웃 `POST /api/auth/logout`

- [ ] refreshToken 미제공 → `400`
- [ ] 존재하지 않거나 만료된 refreshToken → `401`
- [ ] 성공 → `200`, 해당 refreshToken DB에서 삭제

### AC-4. Access Token 재발급 `POST /api/auth/refresh`

- [ ] refreshToken 미제공 → `400`
- [ ] 존재하지 않거나 만료된 refreshToken → `401`
- [ ] 성공 → `200`, `{ data: { accessToken } }`, 기존 refreshToken 삭제 후 신규 refreshToken 발급

### AC-5. 내 정보 조회 `GET /api/auth/me`

- [ ] Authorization 헤더 없음 → `401`
- [ ] Access Token 무효 / 만료 → `401`
- [ ] 성공 → `200`, `{ data: { id, email, nickname, createdAt } }`

### AC-6. 보안

- [ ] 비밀번호는 bcrypt(saltRounds=10)로 해싱, DB에 평문 없음
- [ ] Refresh Token은 SHA-256 해싱 후 DB 저장 (JWT는 72바이트 초과 가능 → bcrypt 제한 우회)
- [ ] Access Token 만료: 15분 (`15m`). Refresh Token 만료: 7일 (`7d`)

### AC-7. 공통

- [ ] `npm run typecheck` 오류 없음
- [ ] `npm test` (통합 테스트 포함) 전체 통과
- [ ] DB 엔티티 직접 노출 없음 (응답은 항상 DTO 경유)

---

## Dependencies

- **Prisma 스키마**: `User`, `RefreshToken` 모델 이미 정의됨. 현재 마이그레이션 상태 확인 필요.
- **설치된 패키지**: `bcrypt`, `jsonwebtoken`, `zod`, `express`, `express-async-errors`, `helmet`, `cors`, `pino`, `pino-http` — 모두 `package.json`에 존재.
- **Node.js 내장**: `crypto` (SHA-256 해싱에 사용)
- **환경 변수**: `JWT_SECRET`, `DATABASE_URL` (`.env` 확인 완료)

---

## 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| Refresh Token 저장 방식 | SHA-256 해싱 | JWT는 72바이트 초과 가능 → bcrypt 한계 우회; SHA-256은 결정적이므로 조회 가능 |
| Refresh Token 로테이션 | Refresh 시 기존 삭제 + 신규 발급 | 탈취된 토큰 재사용 방지 |
| 로그아웃 범위 | 요청의 refreshToken 1개만 삭제 | 다중 기기 로그인은 MVP 외 범위 |
| Access Token 만료 | 15분 (`15m`) | SPEC.md §6 명시 |
| 테스트 DB | `til_platform_test` (별도 DB) | 개발 DB 오염 방지 |
| 에러 응답 형식 | `{ error: { code, message } }` | 클라이언트가 오류 종류를 구분 가능 |

---

## Unknowns

1. **테스트 DB 마이그레이션**: `til_platform_test` DB가 Docker에 없으면 `npx prisma migrate deploy --schema` 실행 필요. → Work 시작 전 DB 상태 확인 후 처리.
2. **`features.json` 부재**: 현재 파일 없음. Work 단계에서 인증 기능 항목을 신규 생성 후 진행.

---

## Stop Conditions — 멈추고 사용자에게 묻는 시점

- 테스트 DB(`til_platform_test`) 생성·마이그레이션이 실패해서 통합 테스트를 실행할 수 없을 때
- Prisma 마이그레이션이 개발 DB에서도 실패할 때 (스키마 충돌)
- 같은 테스트 실패를 2회 수정 시도 후에도 해결 안 될 때

---

## 구현 순서 (Work 단계)

TDD 원칙 적용: 각 엔드포인트별 **실패 테스트 → 최소 구현 → 통과** 반복.

1. **공통 인프라**: `prisma.ts`, `response.ts`, `errors.ts`, `validate.ts`
2. **유틸**: `password.ts`, `jwt.ts`
3. **테스트 환경**: `.env.test`, `tests/helpers/db.ts`, `jest.config.js` 수정
4. **`features.json` 신규 생성**
5. **회원가입** (register): 테스트 → DTO → Repository → Service → Controller → 통과
6. **로그인** (login): 테스트 → Service → Controller → 통과
7. **로그아웃** (logout): 테스트 → Service → Controller → 통과
8. **토큰 재발급** (refresh): 테스트 → Service → Controller → 통과
9. **내 정보** (me): 테스트 → `authenticate` 미들웨어 → Controller → 통과
10. **`src/index.ts` 업데이트**: 미들웨어·라우터 등록
11. 최종 `typecheck` + `npm test` 확인
