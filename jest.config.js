require('dotenv').config({ path: '.env.test' });

/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  testTimeout: 30000,
  // 통합 테스트가 같은 DB를 공유하므로 파일 단위 병렬 실행 방지
  maxWorkers: 1,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};
