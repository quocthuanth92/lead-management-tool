module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testRegex: 'test/.*\\.int-spec\\.ts$',
  testTimeout: 240000,
  transform: {
    '^.+\\.[jt]s$': ['ts-jest', { tsconfig: { allowJs: true, module: 'commonjs' } }]
  },
  transformIgnorePatterns: [
    '[\\\\/]node_modules[\\\\/](?!(?:.*[\\\\/])?(?:@nestjs[\\\\/]schedule|cron)[\\\\/])'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  moduleFileExtensions: ['ts', 'js', 'json']
};
