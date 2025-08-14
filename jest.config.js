module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@pos-argentina/(.*)$': '<rootDir>/packages/$1/src',
    '^@/(.*)$': '<rootDir>/apps/pos-terminal/src/$1'
  },
  testMatch: [
    '<rootDir>/packages/**/__tests__/**/*.(test|spec).(ts|tsx)',
    '<rootDir>/apps/**/__tests__/**/*.(test|spec).(ts|tsx)',
    '<rootDir>/packages/**/*.(test|spec).(ts|tsx)',
    '<rootDir>/apps/**/*.(test|spec).(ts|tsx)'
  ],
  collectCoverageFrom: [
    'packages/**/*.{ts,tsx}',
    'apps/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/*.config.{js,ts}',
    '!**/coverage/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80
    },
    './packages/pos-core/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  coverageReporters: [
    'text',
    'text-summary', 
    'html',
    'lcov'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testTimeout: 30000,
  verbose: true,
  roots: ['<rootDir>/packages', '<rootDir>/apps']
};