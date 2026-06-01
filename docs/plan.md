# plan.md — TIL 기능 구현

작성일: 2026-06-01
상태: 승인 대기

---

## 기능 개요

SPEC.md §2 TIL 파트 구현. TIL 작성 시 Streak 즉시 계산 포함.

```
POST   /api/tils                TIL 작성 (스트릭 즉시 업데이트)
GET    /api/tils                TIL 목록 조회 (최신순)
GET    /api/tils/:id            TIL 단건 조회
PATCH  /api/tils/:id            TIL 수정
DELETE /api/tils/:id            TIL 삭제
```

---

## Scope — 생성/수정할 파일

### 신규 생성

| 파일 | 역할 |
|------|------|
| `src/dtos/til.dto.ts` | 요청/응답 Zod 스키마 + 타입 |
| `src/repositories/til.repository.ts` | TIL CRUD (Prisma) |
| `src/repositories/streak.repository.ts` | Streak upsert/조회 (Prisma) |
| `src/services/til.service.ts` | TIL 비즈니스 로직 + Streak 계산 |
| `src/controllers/til.controller.ts` | Express Router |
| `tests/integration/til.test.ts` | 통합 테스트 (Supertest) |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `src/index.ts` | `/api/tils` 라우터 마운팅 |
| `docs/features.json` | TIL + Streak 기능 항목 추가 |

---

## Acceptance Criteria

### AC-1. TIL 작성 `POST /api/tils`

- [ ] 인증 없음 → `401`
- [ ] 요청 바디 검증 실패 (title/content 누락, category 유효하지 않은 값) → `400`
- [ ] 오늘 날짜 TIL 중복 작성 → `409`
- [ ] 성공 → `201`, `{ data: TilResponse }`
- [ ] 성공 시 Streak 즉시 계산 및 업데이트 (Streak 행 없으면 새로 생성)

### AC-2. TIL 목록 조회 `GET /api/tils`

- [ ] 인증 없음 → `401`
- [ ] 본인 TIL만 반환 (타 유저 TIL 불포함)
- [ ] 날짜 내림차순 정렬 (최신순)
- [ ] 성공 → `200`, `{ data: TilResponse[] }`

### AC-3. TIL 단건 조회 `GET /api/tils/:id`

- [ ] 인증 없음 → `401`
- [ ] 존재하지 않는 id → `404`
- [ ] 본인 TIL이 아님 → `403`
- [ ] 성공 → `200`, `{ data: TilResponse }`

### AC-4. TIL 수정 `PATCH /api/tils/:id`

- [ ] 인증 없음 → `401`
- [ ] 존재하지 않는 id → `404`
- [ ] 본인 TIL이 아님 → `403`
- [ ] 요청 바디 검증 실패 → `400`
- [ ] title, content, category 부분 수정 가능 (date는 수정 불가)
- [ ] 성공 → `200`, `{ data: TilResponse }`

### AC-5. TIL 삭제 `DELETE /api/tils/:id`

- [ ] 인증 없음 → `401`
- [ ] 존재하지 않는 id → `404`
- [ ] 본인 TIL이 아님 → `403`
- [ ] 성공 → `200`, `{ data: { message: '삭제되었습니다' } }`
- [ ] Streak은 삭제 시 재계산하지 않음 (MVP 제약)

### AC-6. Streak 계산 (TIL 작성 시)

- [ ] Streak 행이 없는 경우 → `currentStreak = 1`, `longestStreak = 1`, `lastStudiedAt = 오늘(UTC)`로 생성
- [ ] `lastStudiedAt`이 오늘 → 변경 없음 (이미 오늘 TIL 작성됨)
- [ ] `lastStudiedAt`이 어제 → `currentStreak + 1`, `longestStreak = max(longestStreak, currentStreak)`, `lastStudiedAt = 오늘`
- [ ] `lastStudiedAt`이 그 이전 → `currentStreak = 1`, `lastStudiedAt = 오늘` (연속 끊김)

### AC-7. 공통

- [ ] `npm run typecheck` 오류 없음
- [ ] `npm test` 전체 통과
- [ ] DB 엔티티 직접 노출 없음 (응답은 항상 DTO 경유)
- [ ] 모든 엔드포인트에 `authenticate` 미들웨어 적용

---

## 응답 타입 정의

```typescript
interface TilResponse {
  id: string;
  userId: string;
  date: string;          // 'YYYY-MM-DD' 형식
  title: string;
  content: string;
  category: 'CS' | 'ALGORITHM' | 'BACKEND' | 'FRONTEND' | 'ETC';
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Dependencies

- **Prisma 스키마**: `Til`, `Streak` 모델 이미 정의됨 (`@@unique([userId, date])` 포함). 마이그레이션 완료 여부 확인 필요.
- **기존 인프라**: `authenticate`, `validate`, `AppError`, `sendSuccess` — 인증 기능에서 이미 구현됨.
- **환경 변수**: 인증과 동일 (추가 변수 없음)

---

## 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| TIL date 설정 | 서버에서 오늘 UTC 날짜 자동 설정 (클라이언트 지정 불가) | MVP 단순화, 타임존 처리 복잡도 제거 |
| Streak 초기화 시점 | TIL 작성 성공 후 동기 upsert | SPEC 명시 "즉시 계산" |
| 삭제 시 Streak 재계산 | 하지 않음 | MVP 범위 외, Cron 기반 배치로 이후 추가 |
| 403 vs 404 (타인 TIL) | 403 반환 | 인증된 사용자 환경에서 접근 권한 거부임을 명확히 |
| 목록 페이지네이션 | 없음 (전체 반환) | MVP 범위, 추후 cursor 기반 페이지네이션 추가 가능 |
| Streak lastStudiedAt 비교 | UTC DATE 기준 (시/분/초 무시) | SPEC §7 "날짜 기준: 서버 UTC" |

---

## Unknowns

1. **테스트 DB 마이그레이션**: `tils`, `streaks` 테이블이 `til_platform_test` DB에 이미 적용됐는지 확인 필요. Work 시작 전 `npx prisma migrate deploy` 실행 여부 결정.
2. **목록 조회 응답 크기**: TIL이 많아지면 content 필드 포함으로 응답이 커질 수 있음. MVP에서는 전체 반환으로 진행하되 이후 커서 페이지네이션 고려.

---

## Stop Conditions — 멈추고 사용자에게 묻는 시점

- 테스트 DB 마이그레이션 실패로 통합 테스트 실행 불가 시
- Streak 계산 로직에서 동시성 이슈 또는 예상치 못한 날짜 경계 버그 발생 시
- 같은 테스트 실패를 2회 수정 시도 후에도 해결 안 될 때

---

## 구현 순서 (Work 단계)

TDD 원칙 적용: 각 엔드포인트별 **실패 테스트 → 최소 구현 → 통과** 반복.

1. **DTO**: `src/dtos/til.dto.ts`
2. **테스트 작성** (실패 상태): `tests/integration/til.test.ts` — AC-1 ~ AC-5 전체
3. **Repository**: `til.repository.ts`, `streak.repository.ts`
4. **Service**: `til.service.ts` (Streak 계산 로직 포함)
5. **Controller**: `til.controller.ts`
6. **`src/index.ts` 업데이트**: `/api/tils` 라우터 마운팅
7. **`docs/features.json` 업데이트**: TIL + Streak 항목 추가
8. 최종 `typecheck` + `npm test` 확인
