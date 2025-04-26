import { render, screen } from '@testing-library/react'; // テストライブラリ関連

import HomePage from '@/app/events/page'; // プロジェクト内のインポート

describe('Homepage', () => {
  it('renders the Components', () => {
    render(<HomePage />);

    const heading = screen.getByText(/イベント一覧/i); // 変更したテキストを確認
    expect(heading).toBeInTheDocument();
  });
});
