'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Event = {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  event_description: string;
};

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) {
        // console.error('Error fetching events:', error.message);
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
                {event.start_date === event.end_date
                  ? new Date(event.start_date).toLocaleDateString()
                  : `${new Date(event.start_date).toLocaleDateString()} ～ ${new Date(event.end_date).toLocaleDateString()}`}
              </p>
              <p className='mt-2'>{event.event_description}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
