module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.int-spec.ts'],
  testTimeout: 120000,
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }]
  }
};
