// jest.config.js
const nextJest = require('next/jest');

// next/jestの設定を取得
const createJestConfig = nextJest({
  dir: './', // Next.jsプロジェクトのルートディレクトリを指定
});

// カスタムのJest設定
const customJestConfig = {
  // テスト環境を設定
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testEnvironment: 'jest-environment-jsdom',

  // モジュール名マッピング (エイリアスの設定)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^~/(.*)$': '<rootDir>/public/$1',
    '^.+\\.(svg)$': '<rootDir>/src/__mocks__/svg.tsx',
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest', // TypeScriptファイルをts-jestで変換
    '^.+\\.js$': 'babel-jest', // JavaScriptファイルをbabel-jestで変換
  },
};

// Jest設定をエクスポート
module.exports = createJestConfig(customJestConfig);
