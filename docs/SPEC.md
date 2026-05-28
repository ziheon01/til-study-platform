# SPEC.md — 개발자 TIL & 스터디 인증 플랫폼

최초 작성일: 2026-05-28
상태: 확정

---

## 1. 프로젝트 목적

개발자가 매일 공부한 내용을 TIL로 기록하고, 학습 태스크 완료율과 스트릭을 통해 꾸준한 학습 습관을 시각화하는 플랫폼이다.

---

## 2. MVP 범위

### In Scope

**인증**
- 회원가입 (이메일 + 비밀번호)
- 로그인 / 로그아웃 (JWT Access Token + Refresh Token)
- Access Token 재발급
- 내 정보 조회

**TIL**
- 하루 1개 TIL 작성 (날짜 단위, 사용자당 하루 중복 작성 불가)
- TIL 수정 / 삭제
- TIL 목록 조회 (최신순)
- TIL 단건 조회
- 마크다운 본문 지원
- 카테고리 태그 (CS, 알고리즘, 백엔드, 프론트엔드, 기타)
- TIL 작성 시 스트릭 즉시 계산 및 업데이트

**학습 태스크**
- 오늘의 태스크 등록 / 수정 / 삭제
- 태스크 완료 체크 / 해제
- 태스크 목록 조회 (날짜 기준)

**학습 통계**
- 스트릭: 현재 연속 학습일, 최장 연속 학습일
- 오늘 태스크 완료율
- 이번 주 TIL 작성 일수 (7일 기준)
- 이번 주 태스크 완료율

### Out of Scope (MVP 이후)

- 소셜 로그인 (Google, GitHub)
- 타 유저 TIL 공개 / 팔로우
- 댓글, 좋아요
- 월간 통계, 카테고리별 학습 분포
- 알림 (스트릭 위험 알림 등)
- 이미지 업로드
- Cron 기반 Streak 배치 계산

---

## 3. 사용자 시나리오 (핵심 플로우)

1. 회원가입 → 로그인 (Access Token + Refresh Token 발급)
2. 오늘 공부할 태스크를 미리 등록
3. 공부 완료 후 태스크 체크
4. TIL 작성 → 스트릭 즉시 계산 및 증가
5. 대시보드에서 이번 주 통계 확인
6. Access Token 만료 시 Refresh Token으로 재발급

---

## 4. 데이터 모델 (초안)

```
User
- id
- email (unique)
- password (hashed)
- nickname
- createdAt
- updatedAt

RefreshToken
- id
- userId (FK)
- token (hashed, unique)
- expiresAt
- createdAt

TIL
- id
- userId (FK)
- date (DATE 타입, 사용자당 unique)
- title
- content (마크다운)
- category (enum: CS | ALGORITHM | BACKEND | FRONTEND | ETC)
- createdAt
- updatedAt

Task
- id
- userId (FK)
- date (DATE 타입)
- title
- isCompleted (boolean, default false)
- createdAt
- updatedAt

Streak
- id
- userId (FK, unique)
- currentStreak (현재 연속일)
- longestStreak (최장 연속일)
- lastStudiedAt (마지막 TIL 작성일, UTC DATE)
- updatedAt
```

---

## 5. API 엔드포인트 (초안)

### 인증
```
POST   /api/auth/register       회원가입
POST   /api/auth/login          로그인 (Access Token + Refresh Token 발급)
POST   /api/auth/logout         로그아웃 (Refresh Token 무효화)
POST   /api/auth/refresh        Access Token 재발급
GET    /api/auth/me             내 정보 조회
```

### TIL
```
POST   /api/tils                TIL 작성 (스트릭 즉시 업데이트)
GET    /api/tils                TIL 목록 조회 (최신순)
GET    /api/tils/:id            TIL 단건 조회
PATCH  /api/tils/:id            TIL 수정
DELETE /api/tils/:id            TIL 삭제
```

### 태스크
```
POST   /api/tasks               태스크 등록
GET    /api/tasks?date=YYYY-MM-DD  날짜별 태스크 목록
PATCH  /api/tasks/:id           태스크 수정
PATCH  /api/tasks/:id/complete  태스크 완료 토글
DELETE /api/tasks/:id           태스크 삭제
```

### 통계
```
GET    /api/stats               학습 통계 조회
```

---

## 6. 기술 스택

- Node.js + TypeScript (strict)
- Express
- Prisma + PostgreSQL
- Zod (요청 검증)
- JWT Access Token (15분) + Refresh Token (7일)
- Jest + Supertest (테스트)
- Swagger (API 문서)
- Docker Compose (로컬 인프라)

---

## 7. 확정된 설계 결정 사항

| 항목 | 결정 | 이유 |
|------|------|------|
| Streak 계산 시점 | TIL 작성 시 즉시 계산 | MVP 범위 내 단순 구현, Cron은 이후 레이어로 추가 가능 |
| 날짜 기준 | 서버 UTC | 타임존 처리 복잡도 제거 |
| Refresh Token | 도입 | 실무 수준의 JWT 인증 경험 확보 |
| Streak 저장 방식 | 별도 테이블 분리 | 관심사 분리, User 테이블 비대화 방지 |