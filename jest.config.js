module.exports = {
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
    '**/tests/integration/**/*.test.js',
    '**/tests/mocks/**/*.test.js'
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
    '<rootDir>/node_modules'
  ],
};
