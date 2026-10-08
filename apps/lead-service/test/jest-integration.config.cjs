module.exports = {
  rootDir: '..',
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testRegex: 'test/integration/.*\\.e2e-spec\\.ts$',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', useESM: true }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 120000
};
