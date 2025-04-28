import * as React from 'react';

// Mock用のSVGコンポーネントを作成
const MockSvg = () => (
  <svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>
    <circle cx='50' cy='50' r='40' />
  </svg>
);

// displayNameを追加
MockSvg.displayName = 'MockSvg';

export default MockSvg;
