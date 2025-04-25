// app/events/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id, title, event_date, description,
          museum:insect_museums ( name )
        `)
        .order('event_date', { ascending: true })

      if (error) {
        console.error(error)
      } else {
        setEvents(data)
      }
    }

    loadEvents()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">イベント一覧</h1>
      <ul>
        {events.map((event) => (
          <li key={event.id} className="mb-6 border-b pb-4">
            <p className="text-lg font-semibold">{event.title}</p>
            <p className="text-sm text-gray-600">開催日: {event.event_date}</p>
            <p className="text-sm">場所: {event.museum?.name}</p>
            <p className="mt-2">{event.description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

