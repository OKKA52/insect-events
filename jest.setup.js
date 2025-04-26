// jest-dom の拡張をインポート
// dotenv を使って .env ファイルを読み込む
import dotenv from 'dotenv';
import '@testing-library/jest-dom/extend-expect'; // jest-dom拡張のインポート
dotenv.config(); // .env ファイルを読み込む

// next/router のモックを設定
jest.mock('next/router', () => require('next-router-mock'));
