module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.ts'],
  clearMocks: true,
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'es2017',
          module: 'commonjs',
          moduleResolution: 'node',
          strict: true,
          lib: ['dom', 'es2017'],
          types: ['jest'],
        },
      },
    ],
  },
};
