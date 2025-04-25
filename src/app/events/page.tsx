'use client';

// 1. 標準ライブラリ
import { useEffect, useState } from 'react';

// 2. サードパーティライブラリ
import { supabase } from '@/lib/supabase'; // Supabase

// 3. 型定義
type Event = {
  id: number;
  title: string;
  description: string;
  date: string;
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        // エラーを表示したい場合は、例えばアラートを使用するか、ユーザーにエラーを通知する方法を検討します。
        // alert('Error fetching events: ' + error.message); // 例: アラートでエラーを通知する場合
      } else {
        setEvents(data as Event[]);
      }

      setLoading(false);
    };

    fetchEvents();
  }, []);

  return (
    <main className='p-8'>
      <h1 className='text-2xl font-bold mb-4'>イベント一覧</h1>
      {loading ? (
        <p>読み込み中...</p>
      ) : events.length === 0 ? (
        <p>イベントが登録されていません。</p>
      ) : (
        <ul className='space-y-4'>
          {events.map((event) => (
            <li key={event.id} className='border p-4 rounded shadow'>
              <h2 className='text-xl font-semibold'>{event.title}</h2>
              <p className='text-sm text-gray-600'>{event.date}</p>
              <p className='mt-2'>{event.description}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
