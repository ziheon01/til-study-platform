# plan.md — 학습 통계 기능 구현

작성일: 2026-06-01
상태: 승인 대기

---

## 기능 개요

SPEC.md §2 학습 통계 파트 구현. 단일 엔드포인트로 4가지 지표를 한 번에 반환한다.

```
GET    /api/stats               학습 통계 조회 (인증 필요)
```

반환하는 통계:
- 스트릭: 현재 연속 학습일, 최장 연속 학습일
- 오늘 태스크 완료율 (완료 수 / 전체 수)
- 이번 주 TIL 작성 일수 (오늘 포함 7일 기준)
- 이번 주 태스크 완료율 (7일 기준)

---

## Scope — 생성/수정할 파일

### 신규 생성

| 파일 | 역할 |
|------|------|
| `src/dtos/stats.dto.ts` | 응답 타입 정의 |
| `src/repositories/stats.repository.ts` | 통계 전용 집계 쿼리 (날짜 범위 조회) |
| `src/services/stats.service.ts` | 통계 계산 비즈니스 로직 |
| `src/controllers/stats.controller.ts` | Express Router (`GET /api/stats`) |
| `tests/integration/stats.test.ts` | 통합 테스트 (Supertest) |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `src/index.ts` | `/api/stats` 라우터 마운팅 |
| `docs/features.json` | 통계 기능 항목 추가 |

---

## Acceptance Criteria

### AC-1. 통계 조회 `GET /api/stats`

- [ ] 인증 없음 → `401`
- [ ] 성공 → `200`, `{ data: StatsResponse }`

### AC-2. Streak 통계

- [ ] Streak 기록 없으면 `currentStreak: 0`, `longestStreak: 0`, `lastStudiedAt: null`
- [ ] Streak 기록 있으면 해당 값 반환

### AC-3. 오늘 태스크 완료율

- [ ] 오늘(UTC) 태스크가 없으면 `totalTasks: 0`, `completedTasks: 0`, `taskCompletionRate: 0`
- [ ] 일부 완료 시 `completedTasks / totalTasks` (소수점 둘째 자리 반올림)
- [ ] 전부 완료 시 `taskCompletionRate: 1`

### AC-4. 이번 주 TIL 작성 일수

- [ ] "이번 주" = 이번 주 월요일 00:00 UTC ~ 오늘 23:59:59.999 UTC
- [ ] TIL 없으면 `tilCount: 0`
- [ ] TIL 있으면 해당 기간 내 TIL이 존재하는 날짜 수 반환 (최대 7)

### AC-5. 이번 주 태스크 완료율

- [ ] "이번 주" 범위는 AC-4와 동일 (이번 주 월요일 ~ 오늘)
- [ ] 이번 주 태스크 없으면 `weeklyTotalTasks: 0`, `weeklyCompletedTasks: 0`, `weeklyTaskCompletionRate: 0`
- [ ] 있으면 `weeklyCompletedTasks / weeklyTotalTasks`

### AC-6. 공통

- [ ] `npm run typecheck` 오류 없음
- [ ] `npm test` 전체 통과 (73 + 신규 테스트)
- [ ] 모든 날짜 계산은 UTC 기준

---

## 응답 타입 정의

```typescript
interface StatsResponse {
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastStudiedAt: string | null;  // 'YYYY-MM-DD' or null
  };
  today: {
    totalTasks: number;
    completedTasks: number;
    taskCompletionRate: number;    // 0.0 ~ 1.0, 소수점 둘째 자리 반올림
  };
  weekly: {
    tilCount: number;              // 이번 주 TIL 작성 일수 (0~7)
    totalTasks: number;
    completedTasks: number;
    taskCompletionRate: number;    // 0.0 ~ 1.0, 소수점 둘째 자리 반올림
  };
}
```

---

## Dependencies

- **기존 repository**: `streak.repository.ts`의 `findStreakByUserId` 재사용
- **신규 쿼리**: 날짜 범위 기반 TIL 수 / Task 집계 → `stats.repository.ts`에 신규 작성
- **기존 인프라**: `authenticate`, `AppError`, `sendSuccess` — 이미 구현됨
- **환경 변수**: 추가 없음

---

## 설계 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| "이번 주" 정의 | 이번 주 월요일 00:00 UTC ~ 오늘 23:59:59 UTC | 사용자 직관에 맞는 주 단위 (월~일), 고정 7일보다 자연스러움 |
| 완료율 없을 때 | 0 반환 (null 아님) | 클라이언트가 null 처리 없이 항상 숫자로 사용 가능 |
| 완료율 정밀도 | 소수점 둘째 자리 반올림 (`Math.round(rate * 100) / 100`) | 프론트에서 퍼센트 표시 용이 |
| stats.repository.ts 분리 | 통계 전용 집계 쿼리를 별도 파일에 분리 | 기존 til/task repository에 통계 쿼리 혼재 방지 |
| 요청 바디/쿼리 검증 | 없음 (GET, 쿼리 파라미터 없음) | validate 미들웨어 불필요 |

---

## Unknowns

1. **일요일 예외 처리**: `Date.getUTCDay()`는 일요일=0, 월요일=1 … 토요일=6을 반환한다. 일요일에 "이번 주 월요일"을 구하면 단순히 `-6`을 빼면 되지만, 월요일=1 기준 공식 `dayOfWeek - 1`을 그대로 적용하면 일요일(0)은 `0 - 1 = -1`이 되어 **지난 주 토요일**을 가리키는 버그가 발생한다.
   → 해결: `(dayOfWeek + 6) % 7`로 월요일=0, 화요일=1, … 일요일=6으로 변환 후 오늘에서 빼면 항상 이번 주 월요일을 정확히 구할 수 있다.

---

## Stop Conditions — 멈추고 사용자에게 묻는 시점

- 같은 테스트 실패를 2회 수정 시도 후에도 해결 안 될 때

---

## 구현 순서 (Work 단계)

TDD 원칙 적용: **실패 테스트 → 최소 구현 → 통과** 반복.

1. **DTO**: `src/dtos/stats.dto.ts`
2. **테스트 작성** (실패 상태): `tests/integration/stats.test.ts` — AC-1 ~ AC-5
3. **Repository**: `stats.repository.ts` (날짜 범위 쿼리)
4. **Service**: `stats.service.ts` (집계 + 완료율 계산)
5. **Controller**: `stats.controller.ts`
6. **`src/index.ts` 업데이트**: `/api/stats` 라우터 마운팅
7. **`docs/features.json` 업데이트**: 통계 항목 추가
8. 최종 `typecheck` + `npm test` 확인
