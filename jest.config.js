module.exports = {
  testMatch: ['<rootDir>/server/tests/unit/**/*.test.js'],
  transform: {},
  testEnvironment: 'node',
  rootDir: '.',
  transform: {},
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  setupFiles: ['./jest.setup.js'],
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/unit/**/*.test.mjs',
    '**/tests/integration/**/*.test.js',
    '**/tests/integration/**/*.test.mjs',
    '**/tests/mocks/**/*.test.js',
    '**/tests/mocks/**/*.test.mjs'
  ],
  testPathIgnorePatterns: ['/node_modules/'],
  moduleDirectories: [
    'node_modules'
  ],
  modulePaths: [
    '<rootDir>/node_modules'
  ],
  moduleDirectories: [
    'node_modules',
    '<rootDir>/node_modules',
    '<rootDir>/server/node_modules'
  ],
};
