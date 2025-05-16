// app/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import HomeClient from '@/components/HomeClient';
import { toHalfWidth, katakanaToHiragana } from '@/utils/text';
import { supabase } from '@/lib/supabase';
import { prefectures } from '@/utils/prefectures';

interface Museum {
  id: number;
  name: string;
  address: string;
  url: string;
  facebook_url?: string;
  x_url?: string;
  instagram_url?: string;
  image_url?: string;
  area?: string;
  name_kana?: string;
  prefecture?: string;
  address_kana?: string;
  latitude?: number;
  longitude?: number;
  area_kana?: string;
  prefecture_kana?: string;
}

interface EventWithMuseum {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  event_url?: string;
  insect_museums: Museum | null;
}

export default function HomePage() {
  const [tab, setTab] = useState<'museums' | 'events'>('museums');
  const [searchText, setSearchText] = useState('');
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [events, setEvents] = useState<EventWithMuseum[]>([]);
  const [filteredMuseums, setFilteredMuseums] = useState<Museum[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventWithMuseum[]>([]);
  const [eventSortOrder, setEventSortOrder] = useState<'asc' | 'desc'>('asc');
  const [resetKey, setResetKey] = useState(0);
  const [hoveredMuseumId, setHoveredMuseumId] = useState<number | null>(null);
  const [, setClickedMuseumId] = useState<number | null>(null);
  const [visibleMuseumIds, setVisibleMuseumIds] = useState<number[]>([]);
  //const [visibleMuseumIds, setVisibleMuseumIds] = useState<number[]>(allMuseumIds);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const museumRefs = useRef<Record<number, HTMLLIElement | null>>({});
  //const mapRef = useRef<HTMLDivElement | null>(null);
  //const mapRef = useRef<L.Map | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClear = () => {
    setSearchText('');
    setFilteredMuseums(museums);
    setFilteredEvents(events);
    setClickedMuseumId(null);
    setHoveredMuseumId(null);
    setResetKey((prev) => prev + 1);
    setTimeout(() => {
      const el = mapRef.current;
      if (el && typeof window !== 'undefined') {
        const y = el.getBoundingClientRect().top + window.scrollY - 220;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
      //if (mapRef.current) {
      //  mapRef.current.setView(DEFAULT_CENTER, 5);
      //　}
      setVisibleMuseumIds(museums.map((m) => m.id));
    }, 100);
    //setTab('museums');
  };

  const handleSearch = useCallback(
    (value: string) => {
      setSearchText(value);
      const rawKeyword = value.trim();
      const halfWidthKeyword = toHalfWidth(rawKeyword).normalize('NFC');
      const hiraganaKeyword = katakanaToHiragana(halfWidthKeyword);
      const rawKeywords = halfWidthKeyword.split(/\s+/);
      const hiraKeywords = hiraganaKeyword.split(/\s+/);

      if (halfWidthKeyword === '') {
        setFilteredMuseums(museums);
        setFilteredEvents(events);
        setResetKey((prev) => prev + 1);
        return;
      }

      if (tab === 'museums') {
        const results = museums.filter((museum) => {
          const name = (museum.name ?? '').normalize('NFC');
          const nameKana = katakanaToHiragana(museum.name_kana ?? '').normalize('NFC');
          const address = (museum.address ?? '').normalize('NFC');
          const addressKana = katakanaToHiragana(museum.address_kana ?? '').normalize('NFC');
          const area = (museum.area ?? '').normalize('NFC');
          const areaKana = katakanaToHiragana(museum.area_kana ?? '').normalize('NFC');
          const pref = (museum.prefecture ?? '').normalize('NFC');
          const prefKana = katakanaToHiragana(museum.prefecture_kana ?? '').normalize('NFC');

          return rawKeywords.every((word, i) => {
            const hiraWord = hiraKeywords[i];
            return (
              name.includes(word) ||
              name.includes(hiraWord) ||
              nameKana.includes(hiraWord) ||
              address.includes(word) ||
              address.includes(hiraWord) ||
              addressKana.includes(hiraWord) ||
              area.includes(word) ||
              area.includes(hiraWord) ||
              areaKana.includes(hiraWord) ||
              pref.includes(word) ||
              pref.includes(hiraWord) ||
              prefKana.includes(hiraWord)
            );
          });
        });
        setFilteredMuseums(results);
      } else {
        const results = events.filter((event) => {
          const title = event.title.normalize('NFC');
          const museumName = event.insect_museums?.name?.normalize('NFC') ?? '';
          const museumKana = katakanaToHiragana(event.insect_museums?.name_kana ?? '').normalize(
            'NFC',
          );
          const museumAddress = event.insect_museums?.address?.normalize('NFC') ?? '';
          const museumAddressKana = katakanaToHiragana(
            event.insect_museums?.address_kana ?? '',
          ).normalize('NFC');
          const museumArea = event.insect_museums?.area?.normalize('NFC') ?? '';
          const museumAreaKana = katakanaToHiragana(
            event.insect_museums?.area_kana ?? '',
          ).normalize('NFC');
          const museumPref = event.insect_museums?.prefecture?.normalize('NFC') ?? '';
          const museumPrefKana = katakanaToHiragana(
            event.insect_museums?.prefecture_kana ?? '',
          ).normalize('NFC');

          return rawKeywords.every((word, i) => {
            const hiraWord = hiraKeywords[i];
            return (
              title.includes(word) ||
              title.includes(hiraWord) ||
              museumName.includes(word) ||
              museumKana.includes(hiraWord) ||
              museumAddress.includes(word) ||
              museumAddress.includes(hiraWord) ||
              museumAddressKana.includes(hiraWord) ||
              museumArea.includes(word) ||
              museumAreaKana.includes(hiraWord) ||
              museumPref.includes(word) ||
              museumPrefKana.includes(hiraWord)
            );
          });
        });
        setFilteredEvents(results);
      }

      setResetKey((prev) => prev + 1);
    },
    [tab, museums, events],
  );

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: museumData } = await supabase.from('insect_museums').select('*');
      const { data: eventData } = await supabase
        .from('events')
        .select(
          '*, insect_museums(id, name, name_kana,latitude, longitude, address, address_kana,area,area_kana,prefecture,prefecture_kana)',
        );

      if (museumData) {
        setMuseums(museumData);
        setFilteredMuseums(museumData);
      }
      if (eventData) {
        setEvents(eventData as EventWithMuseum[]);
        setFilteredEvents(eventData as EventWithMuseum[]);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (museums.length > 0) {
      setVisibleMuseumIds(museums.map((m) => m.id));
    }
  }, [museums]);

  useEffect(() => {
    if (searchText !== '') {
      handleSearch(searchText);
    }
  }, [tab, searchText, handleSearch]);

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const dateA = new Date(a.start_date).getTime();
    const dateB = new Date(b.start_date).getTime();
    return eventSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const eventCountMap = new Map<number, number>();
  sortedEvents.forEach((event) => {
    const museum = event.insect_museums;
    if (museum) {
      eventCountMap.set(museum.id, (eventCountMap.get(museum.id) ?? 0) + 1);
    }
  });

  const sortedMuseums = [...filteredMuseums].sort((a, b) => {
    const indexA = prefectures.indexOf(a.prefecture ?? '');
    const indexB = prefectures.indexOf(b.prefecture ?? '');

    if (indexA !== -1 && indexB !== -1) {
      if (indexA === indexB) {
        // 同じ県内なら施設名の読みがなでソート
        return (a.name_kana ?? '').localeCompare(b.name_kana ?? '', 'ja');
      }
      return indexA - indexB;
    }

    // indexが見つからない（-1）場合は文字列で比較（例: 空欄の都道府県など）
    return (a.prefecture ?? '').localeCompare(b.prefecture ?? '', 'ja');
  });

  const eventMuseumList = sortedEvents
    .map((e) => e.insect_museums)
    .filter(
      (m): m is Museum => !!m && typeof m.latitude === 'number' && typeof m.longitude === 'number',
    );

  const eventMuseumMap = new Map(eventMuseumList.map((m) => [m.id, m]));
  const uniqueEventMuseums = Array.from(eventMuseumMap.values());
  const visibleMuseums = sortedMuseums.filter((m) => visibleMuseumIds.includes(m.id));

  return (
    <HomeClient
      tab={tab}
      setTab={setTab}
      searchText={searchText}
      setSearchText={setSearchText}
      handleSearch={handleSearch}
      handleClear={handleClear}
      resetKey={resetKey}
      sortedMuseums={sortedMuseums}
      uniqueEventMuseums={uniqueEventMuseums}
      setHoveredMuseumId={setHoveredMuseumId}
      setClickedMuseumId={setClickedMuseumId}
      eventSortOrder={eventSortOrder}
      setEventSortOrder={setEventSortOrder}
      // filteredMuseums={filteredMuseums}
      // filteredEvents={filteredEvents}
      visibleMuseums={visibleMuseums}
      visibleMuseumIds={visibleMuseumIds}
      eventCountMap={eventCountMap}
      museumRefs={museumRefs}
      mapRef={mapRef}
      showScrollTop={showScrollTop}
      scrollToTop={scrollToTop}
      setVisibleMuseumIds={setVisibleMuseumIds}
      hoveredMuseumId={hoveredMuseumId}
      sortedEvents={sortedEvents}
    />
  );
}
