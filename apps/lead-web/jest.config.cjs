module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }]
  },
  moduleNameMapper: {
    '^server-only$': '<rootDir>/src/test/mocks/server-only.ts',
    '^next/headers$': '<rootDir>/src/test/mocks/next-headers.ts'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup-tests.ts']
};
