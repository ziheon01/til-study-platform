# plan.md — 학습 태스크 기능 구현

작성일: 2026-06-01
상태: 승인 대기

---

## 기능 개요

SPEC.md §2 학습 태스크 파트 구현.

```
POST   /api/tasks                  태스크 등록
GET    /api/tasks?date=YYYY-MM-DD  날짜별 태스크 목록
PATCH  /api/tasks/:id              태스크 수정 (title)
PATCH  /api/tasks/:id/complete     태스크 완료 토글 (isCompleted 반전)
DELETE /api/tasks/:id              태스크 삭제
```

---

## Scope — 생성/수정할 파일

### 신규 생성

| 파일 | 역할 |
|------|------|
| `src/dtos/task.dto.ts` | 요청/응답 Zod 스키마 + 타입 |
| `src/repositories/task.repository.ts` | Task CRUD (Prisma) |
| `src/services/task.service.ts` | Task 비즈니스 로직 |
| `src/controllers/task.controller.ts` | Express Router |
| `tests/integration/task.test.ts` | 통합 테스트 (Supertest) |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `src/index.ts` | `/api/tasks` 라우터 마운팅 |
| `docs/features.json` | Task 기능 항목 추가 |

---

## Acceptance Criteria

### AC-1. 태스크 등록 `POST /api/tasks`

- [ ] 인증 없음 → `401`
- [ ] title 누락 → `400`
- [ ] 성공 → `201`, `{ data: TaskResponse }`
- [ ] date 생략 시 오늘 UTC 기본값 사용
- [ ] date 제공 시 해당 날짜로 등록 (미래/과거 날짜 허용, MVP)

### AC-2. 태스크 목록 조회 `GET /api/tasks?date=YYYY-MM-DD`

- [ ] 인증 없음 → `401`
- [ ] date 쿼리 파라미터 누락 → `400`
- [ ] date 형식 오류 (YYYY-MM-DD 외) → `400`
- [ ] 해당 날짜 본인 태스크만 반환
- [ ] 성공 → `200`, `{ data: TaskResponse[] }` (빈 배열 포함)

### AC-3. 태스크 수정 `PATCH /api/tasks/:id`

- [ ] 인증 없음 → `401`
- [ ] 존재하지 않는 id → `404`
- [ ] 본인 태스크 아님 → `403`
- [ ] 빈 바디 (수정 필드 없음) → `400`
- [ ] title 수정 가능
- [ ] 성공 → `200`, `{ data: TaskResponse }`

### AC-4. 태스크 완료 토글 `PATCH /api/tasks/:id/complete`

- [ ] 인증 없음 → `401`
- [ ] 존재하지 않는 id → `404`
- [ ] 본인 태스크 아님 → `403`
- [ ] 성공 → `200`, `{ data: TaskResponse }` (isCompleted 반전)
- [ ] 두 번 호출 시 원복 (false → true → false)

### AC-5. 태스크 삭제 `DELETE /api/tasks/:id`

- [ ] 인증 없음 → `401`
- [ ] 존재하지 않는 id → `404`
- [ ] 본인 태스크 아님 → `403`
- [ ] 성공 → `200`, `{ data: { message: '삭제되었습니다' } }`

### AC-6. 공통

- [ ] `npm run typecheck` 오류 없음
- [ ] `npm test` 전체 통과 (47 + 신규 테스트)
- [ ] DB 엔티티 직접 노출 없음 (응답은 항상 DTO 경유)
- [ ] 모든 엔드포인트에 `authenticate` 미들웨어 적용

---

## 응답 타입 정의

```typescript
interface TaskResponse {
  id: string;
  userId: string;
  date: string;       // 'YYYY-MM-DD'
  title: string;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Dependencies

- **Prisma 스키마**: `Task` 모델 이미 정의됨. 마이그레이션도 완료 상태.
- **기존 인프라**: `authenticate`, `validate`, `AppError`, `sendSuccess` — 이미 구현됨.
- **날짜 유틸**: `til.service.ts`의 `todayUTC()` 패턴 동일하게 적용.
- **환경 변수**: 추가 변수 없음.

---

## 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| POST date | 생략 시 오늘 UTC, 명시 시 해당 날짜 | TIL과 달리 Task는 날짜 지정 등록이 자연스러움 (미리 내일 태스크 등록 등) |
| GET date 파라미터 | 필수 | SPEC 엔드포인트가 명시적으로 날짜 기반 조회, 전체 반환은 Out of Scope |
| PATCH /complete | 토글 방식 (조회 후 반전) | 단순, 멱등성은 두 번 호출 시 원복으로 충족 |
| 403 vs 404 (타인 태스크) | 403 반환 | TIL과 동일 정책 |

---

## Unknowns

1. **date 유효성 범위**: MVP에서는 미래/과거 날짜를 허용하기로 결정. 추후 "오늘만 허용" 정책 추가 가능.
2. **GET date 미제공 시**: 400 반환. "오늘 날짜 기본값" 대신 명시적 오류를 반환해 클라이언트가 항상 날짜를 인지하도록.

---

## Stop Conditions — 멈추고 사용자에게 묻는 시점

- 같은 테스트 실패를 2회 수정 시도 후에도 해결 안 될 때

---

## 구현 순서 (Work 단계)

TDD 원칙 적용: **실패 테스트 → 최소 구현 → 통과** 반복.

1. **DTO**: `src/dtos/task.dto.ts`
2. **테스트 작성** (실패 상태): `tests/integration/task.test.ts` — AC-1 ~ AC-5 전체
3. **Repository**: `task.repository.ts`
4. **Service**: `task.service.ts`
5. **Controller**: `task.controller.ts`
6. **`src/index.ts` 업데이트**: `/api/tasks` 라우터 마운팅
7. **`docs/features.json` 업데이트**: Task 항목 추가
8. 최종 `typecheck` + `npm test` 확인
