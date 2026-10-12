module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }]
  },
  collectCoverageFrom: ['src/ingestion/**/*.ts', 'src/normalization/**/*.ts', '!src/**/*.spec.ts'],
  coverageThreshold: {
    global: { lines: 90, branches: 90 }
  }
};
