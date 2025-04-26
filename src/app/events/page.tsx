'use client';

import { useEffect, useState } from 'react'; // react 関連のインポート

import { supabase } from '@/lib/supabase'; // プロジェクト内のインポート

type Event = {
  id: number;
  title: string;
  event_date: string;
  description: string;
};

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // イベントデータを Supabase から取得
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) {
        //console.error('Error fetching events:', error.message);
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
              <p className='text-sm text-gray-600'>
                {new Date(event.event_date).toLocaleDateString()}
              </p>
              <p className='mt-2'>{event.description}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
