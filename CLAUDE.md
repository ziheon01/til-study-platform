# CLAUDE.md

이 파일은 Claude Code가 이 레포에서 작업할 때 따르는 지침이다. 모든 세션 시작 시 자동으로 읽는다.

## 프로젝트 개요

개발자 TIL(Today I Learned) & 스터디 인증 플랫폼. TIL 작성, 일일 학습 태스크 체크, 스트릭 추적, 학습 통계를 제공하는 REST API 백엔드다. Express + TypeScript + Prisma + PostgreSQL로 구현한다.

자세한 내용은 @README.md, 사용 가능한 명령은 @package.json 참고.

## 하네스 파일 (반드시 먼저 읽는다)

세션 시작 시 다음 파일들을 순서대로 확인한다. 이 파일들이 현재 작업 상태의 진실의 원천이다.

- @docs/SPEC.md — 합의된 기능 스펙
- @docs/plan.md — 현재 진행 중인 작업의 계획 (Scope, Acceptance Criteria, Dependencies, Unknowns, Stop Conditions)
- @docs/progress.txt — 마지막 작업 지점과 다음 할 일
- @docs/features.json — 불변 요구사항 목록 (수정/삭제 금지, 완료 시 `passes: true`만 변경)

IMPORTANT: 이 파일들에 없는 작업은 임의로 시작하지 않는다. 필요하면 먼저 plan.md 갱신부터 제안한다.

## 자주 쓰는 명령

```bash
# 개발
npm run dev          # ts-node-dev 핫 리로드

# 빌드 & 실행
npm run build        # TypeScript를 dist/로 컴파일
npm start            # 컴파일된 결과 실행

# 타입체크 & 린트
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src --ext .ts

# 테스트
npm test             # 전체 테스트
npm run test:watch   # 워치 모드
npm run test:coverage

# 단일 테스트 파일 실행 (성능을 위해 우선 사용)
npx jest tests/path/to/file.test.ts

# 데이터베이스 (Prisma)
npx prisma migrate dev    # 개발 환경 마이그레이션 적용
npx prisma generate       # 스키마 변경 후 클라이언트 재생성
npx prisma studio         # DB GUI 열기
```

## 아키텍처

### 진입점
[src/index.ts](src/index.ts) — Express 앱 설정. 현재는 최소 구성이며, 앱이 커지면 미들웨어(helmet, cors, pino-http, express-async-errors)와 라우트 마운팅을 여기에 추가한다.

### 레이어 구조 (Layered Architecture)
Controller → Service → Repository 구조를 따른다. 각 레이어는 자기 책임만 수행하며 레이어를 건너뛰지 않는다.

- `src/controllers` — 요청/응답 라우팅 및 입력 검증만. 비즈니스 로직 작성 금지
- `src/services` — 비즈니스 로직, 트랜잭션 관리
- `src/repositories` — DB 접근, 쿼리 최적화
- `src/dtos` — 입출력 데이터 형태 정의
- `src/mappers` — 엔티티 ↔ DTO 변환
- `src/middlewares` — 인증, 에러 핸들링 등
- `src/utils` — 공통 유틸

### 데이터베이스 레이어
Prisma 스키마는 [prisma/schema.prisma](prisma/schema.prisma)에 있다. 생성된 클라이언트는 기본 위치가 아닌 `src/generated/prisma/`로 출력된다. 스키마 변경 후에는 항상 `npx prisma generate`를 실행한다. DB 연결 설정은 [prisma.config.ts](prisma.config.ts)에서 `DATABASE_URL` 환경 변수로 읽는다.

### 환경 변수
필수 변수 (기본값은 [.env](.env) 참고):
- `DATABASE_URL` — PostgreSQL 연결 문자열
- `JWT_SECRET` — JWT 서명 키
- `JWT_EXPIRES_IN` — 토큰 수명 (기본 `7d`)
- `PORT` — 서버 포트 (기본 `3000`)
- `NODE_ENV`

### 테스트
테스트는 `tests/`에 위치한다 (tsconfig.json에서 제외되며 ts-jest가 별도 컴파일). 테스트 파일은 `**/*.test.ts` 패턴을 따른다.

### 핵심 의존성
- Express 4 + `express-async-errors` (async 핸들러에서 try/catch 불필요)
- Zod (요청 검증)
- bcrypt (비밀번호 해싱)
- jsonwebtoken (JWT 인증)
- pino / pino-http (구조화 로깅)
- swagger-jsdoc + swagger-ui-express (API 문서)

## Plan → Work → Review 워크플로

모든 기능은 이 사이클을 따른다.

### Plan 단계
- 새 기능은 먼저 `docs/plan.md`에 다음을 명시한 뒤 사용자 승인을 받고 시작한다
  - Scope: 건드릴 파일과 영역
  - Acceptance Criteria: 검증 가능한 완료 기준
  - Dependencies: 의존하는 기존 코드/스키마
  - Unknowns: 확실하지 않은 부분 (지어내지 않는다)
  - Stop Conditions: 멈추고 인간에게 묻는 시점
- 작은 변경(diff를 한 문장으로 설명 가능)은 plan.md를 생략하고 바로 진행한다

### Work 단계
- IMPORTANT: 검증 가능한 기능은 **TDD를 기본으로 한다**. 실패하는 테스트 → 최소 구현 → 리팩토링
- 인프라 세팅/보일러플레이트는 TDD 예외. 실행 가능한 검증 스크립트로 대체한다
- 한 번에 거대한 변경을 쏟지 않는다. 검토 가능한 단위로 점진적으로 진행한다
- 작업 종료 시 `docs/progress.txt`에 무엇을 했고 다음에 무엇을 할지 한두 줄 기록한다

### Review 단계
- 구현 직후 자기 코드를 그대로 리뷰하지 않는다. 가능하면 서브에이전트로 위임하거나 별도 세션에서 리뷰한다
- 리뷰 체크리스트: 완료 기준 충족, 엣지 케이스(null/빈 배열/동시성), 보안, 성능(N+1), 아키텍처 준수
- 문제 발견 시 수정은 **최대 2회까지 자동 시도**한다. 2회 후에도 해결되지 않으면 임의로 더 생성하지 말고 즉시 중단하여 사용자에게 보고한다

## 코드 스타일

- ES 모듈(import/export) 사용, CommonJS(require) 금지
- `any` 사용 금지. 타입이 불투명하면 인터페이스를 정의한다
- Controller는 라우팅과 입력 검증만. 비즈니스 로직 금지
- Service에서 트랜잭션을 관리한다
- API 응답은 항상 공통 Response Wrapper로 감싼다
- DB 엔티티를 클라이언트에 그대로 노출하지 않는다. 응답은 DTO/Mapper를 거친다
- 에러는 공통 에러 응답 규격을 따른다

## 검증 및 종료 규칙

- IMPORTANT: 일련의 코드 변경을 마치면 반드시 타입체크와 관련 테스트를 실행한다
- 성능을 위해 전체 테스트가 아닌 단일 테스트를 우선 실행한다
- 에러는 억누르지 말고 근본 원인을 해결한다
- 테스트가 깨진 상태로 "완료"를 선언하지 않는다
- 통과시키려고 테스트를 삭제하거나 약화시키지 않는다. `docs/features.json`은 수정·삭제 금지

## 컨텍스트 관리

- Plan → Work → Review 단계 전환 시, 또는 관련 없는 작업으로 넘어갈 때 `/clear`를 제안한다
- 같은 이슈를 두 번 고쳐도 안 되면 누적 세션을 이어가지 말고 새 세션을 권한다
- 파일을 많이 읽는 조사 작업은 서브에이전트에 위임한다
- 세션 종료 전 반드시 `docs/progress.txt`를 갱신한다

## 저장소 에티켓

- 브랜치 네이밍: `feat/기능명`, `fix/이슈명`
- 커밋 메시지: 무엇을·왜 바꿨는지 드러나게 작성한다
- 커밋 단위는 의미 있게 쪼갠다 (학습 히스토리 목적)

## 개발 환경 특이사항

- 로컬은 WSL(Ubuntu) 기반
- Prisma 클라이언트 출력 경로가 기본값이 아닌 `src/generated/prisma/`임에 주의

## 주의할 함정

이 프로젝트에서 실제로 겪은, 직관적이지 않은 동작만 누적해서 적는다. 처음에는 비워둔다.