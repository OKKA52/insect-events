/* 'use client' が先頭に必要 */
'use client';

import AreaTag from '@/components/AreaTag';
import { ArrowTopRightOnSquareIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import { FaFacebookSquare, FaInstagram } from 'react-icons/fa';
import { prefectures } from '@/utils/prefectures';
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import InsectMap from '@/components/Map';
import Image from 'next/image';

// 型定義
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

const sortByPrefecture = (list: Museum[]): Museum[] => {
  return [...list].sort((a, b) => {
    const indexA = prefectures.indexOf(a.prefecture ?? '');
    const indexB = prefectures.indexOf(b.prefecture ?? '');
    if (indexA !== -1 && indexB !== -1) {
      if (indexA === indexB) {
        return (a.name_kana ?? '').localeCompare(b.name_kana ?? '', 'ja');
      }
      return indexA - indexB;
    } else {
      return (a.prefecture ?? '').localeCompare(b.prefecture ?? '', 'ja');
    }
  });
};

const toHalfWidth = (str: string): string => {
  return str
    .replace(/[！-～]/g, (ch: string) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ');
};

const katakanaToHiragana = (str: string): string =>
  str.replace(/[ァ-ヶ]/g, (match: string) => String.fromCharCode(match.charCodeAt(0) - 0x60));

export default function HomePage() {
  const [visibleMuseumIds, setVisibleMuseumIds] = useState<number[]>([]);
  const [tab, setTab] = useState<'museums' | 'events'>('museums');
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [events, setEvents] = useState<EventWithMuseum[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filteredMuseums, setFilteredMuseums] = useState<Museum[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventWithMuseum[]>([]);
  const [eventSortOrder, setEventSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hoveredMuseumId, setHoveredMuseumId] = useState<number | null>(null);
  const [clickedMuseumId, setClickedMuseumId] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const museumRefs = useRef<Record<number, HTMLLIElement | null>>({});
  const mapRef = useRef<HTMLDivElement | null>(null);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = typeof window.scrollY === 'number' ? window.scrollY : 0;
      setShowScrollTop(scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  const sortedMuseums = sortByPrefecture(filteredMuseums);

  const eventMuseumList = sortedEvents
    .map((e) => e.insect_museums)
    .filter(
      (m): m is Museum => !!m && typeof m.latitude === 'number' && typeof m.longitude === 'number',
    );

  const visibleMuseums = sortedMuseums.filter((m: Museum) => visibleMuseumIds.includes(m.id));

  const eventMuseumEntries = eventMuseumList.map((m) => [m.id, m] as [number, Museum]);

  const eventMuseumMap: Map<number, Museum> = new globalThis.Map(eventMuseumEntries);

  const uniqueEventMuseums: Museum[] = Array.from(eventMuseumMap.values());

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
    }, 100);
  };

  useEffect(() => {
    const fetchMuseums = async () => {
      const { data, error } = await supabase.from('insect_museums').select('*');
      if (!error) {
        setMuseums(data as Museum[]);
        setFilteredMuseums(data as Museum[]);
      }
    };
    fetchMuseums();

    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select(
          '*, insect_museums(id, name, name_kana,latitude, longitude, address, address_kana,area,area_kana,prefecture,prefecture_kana)',
        );
      if (!error && data) {
        setEvents(data as EventWithMuseum[]);
        setFilteredEvents(data as EventWithMuseum[]);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    if (clickedMuseumId !== null) {
      const target = museumRefs.current[clickedMuseumId];
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [clickedMuseumId]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      setShowScrollTop(scrollY > 300);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    if (searchText !== '') {
      handleSearch(searchText);
    }
  }, [tab, searchText, handleSearch]);

  return (
    <main>
      <div className='sticky top-0 z-10 bg-white shadow dark:bg-gray-900'>
        <div className='p-6 md:p-8 lg:p-10'>
          <h1
            className='mb-4 cursor-pointer text-2xl font-bold text-black md:text-3xl dark:text-white'
            onClick={handleClear}
          >
            昆虫館マップ
          </h1>

          <div className='mb-4 flex items-center'>
            <button
              onClick={() => setTab('museums')}
              className={`rounded px-4 py-2 ${tab === 'museums' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-white'}`}
            >
              昆虫館
            </button>
            <button
              onClick={() => setTab('events')}
              className={`ml-4 rounded px-4 py-2 ${tab === 'events' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-white'}`}
            >
              イベント
            </button>
            <span className='ml-10 text-sm text-gray-600 dark:text-white'>
              {tab === 'museums' ? filteredMuseums.length : filteredEvents.length} 件
            </span>
          </div>

          <div className='flex items-center space-x-6'>
            <input
              type='text'
              placeholder={
                tab === 'museums' ? '施設名や県・エリア名で検索' : '施設名やイベント名で検索'
              }
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className='w-full max-w-md rounded border bg-white p-2 text-base text-black dark:border-gray-600 dark:bg-gray-800 dark:text-white'
            />
            <button
              onClick={handleClear}
              className='h-10 whitespace-nowrap rounded bg-blue-500 px-4 text-sm text-white hover:bg-blue-600'
            >
              クリア
            </button>
          </div>
        </div>
      </div>

      <div className='relative z-0 bg-white p-6 md:p-8 lg:p-10 dark:bg-gray-900'>
        <div ref={mapRef} />
        <InsectMap
          key={resetKey}
          museums={tab === 'museums' ? sortedMuseums : uniqueEventMuseums}
          onHoverMuseum={setHoveredMuseumId}
          onClickMuseum={setClickedMuseumId}
          eventCounts={tab === 'events' ? eventCountMap : undefined}
          setVisibleMuseumIds={tab === 'museums' ? setVisibleMuseumIds : undefined}
        />
      </div>

      <div className='bg-white p-6 md:p-8 lg:p-10 dark:bg-gray-900'>
        {tab === 'museums' ? (
          <h2 className='mb-4 text-xl font-bold text-black dark:text-white'>昆虫館リスト</h2>
        ) : (
          <div className='mb-4 flex items-center'>
            <h2 className='text-xl font-bold text-black dark:text-white'>イベント一覧</h2>
            <div className='ml-8 flex items-center space-x-2'>
              <label className='text-sm text-gray-600 dark:text-gray-300'>開催日順:</label>
              <select
                value={eventSortOrder}
                onChange={(e) => setEventSortOrder(e.target.value as 'asc' | 'desc')}
                className='rounded border bg-white p-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white'
              >
                <option value='asc'>近い順</option>
                <option value='desc'>遠い順</option>
              </select>
            </div>
          </div>
        )}

        <div className='bg-white p-6 md:p-8 lg:p-10 dark:bg-gray-900'>
          {tab === 'museums' ? (
            filteredMuseums.length === 0 ? (
              <div className='mt-4 text-sm text-gray-600 dark:text-gray-300'>
                <p>該当する昆虫館が見つかりませんでした。</p>
                {searchText && (
                  <ul className='mt-2 list-inside list-disc space-y-1'>
                    <li>キーワードを変更して再度検索してください。</li>
                    <li>施設名やエリア名での検索をお試しください。</li>
                  </ul>
                )}
              </div>
            ) : (
              <ul className='mt-6 grid grid-cols-1 gap-6 md:grid-cols-2'>
                {visibleMuseums.map((museum) => (
                  <li
                    key={museum.id}
                    ref={(el) => {
                      museumRefs.current[museum.id] = el;
                    }}
                    className={`rounded-lg border p-4 shadow transition ${
                      hoveredMuseumId === museum.id
                        ? 'bg-yellow-100 dark:bg-yellow-900'
                        : 'hover:shadow-md dark:border-gray-600 dark:bg-gray-800'
                    }`}
                  >
                    <h2 className='text-lg font-semibold text-black md:text-xl dark:text-white'>
                      {museum.name}
                    </h2>
                    <div className='mt-1 flex items-center space-x-2'>
                      {museum.area && <AreaTag area={museum.area} />}
                      <p className='text-sm text-gray-600 md:text-base dark:text-gray-300'>
                        {museum.address}
                      </p>
                    </div>
                    <div className='mt-3 flex items-center space-x-3 md:space-x-5'>
                      {museum.url && (
                        <a
                          href={museum.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='flex items-center text-blue-600 hover:underline'
                        >
                          <ArrowTopRightOnSquareIcon className='h-5 w-5 text-blue-600 dark:text-gray-300' />
                          <span className='ml-1 text-sm md:text-blue-600 dark:text-gray-300'>
                            Webサイト
                          </span>
                        </a>
                      )}
                      {museum.facebook_url && (
                        <a
                          href={museum.facebook_url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-blue-600 dark:text-gray-300'
                        >
                          <FaFacebookSquare className='h-6 w-6' />
                        </a>
                      )}
                      {museum.x_url && (
                        <a
                          href={museum.x_url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-black dark:text-white'
                        >
                          <Image
                            src='/images/x-icon.png'
                            alt='X'
                            width={23}
                            height={23}
                            className='mt-[1px] h-6 w-6 rounded object-contain hover:opacity-80'
                          />
                        </a>
                      )}
                      {museum.instagram_url && (
                        <a
                          href={museum.instagram_url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-pink-500'
                        >
                          <FaInstagram className='h-6 w-6' />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )
          ) : sortedEvents.length === 0 ? (
            <div className='mt-4 text-sm text-gray-600 dark:text-gray-300'>
              <p>該当するイベントが見つかりませんでした。</p>
              {searchText && (
                <ul className='mt-2 list-inside list-disc space-y-1'>
                  <li>キーワードを変更して再度検索してください。</li>
                  <li>施設名やエリア名での検索をお試しください。</li>
                </ul>
              )}
            </div>
          ) : (
            <ul className='mt-6 grid grid-cols-1 gap-6 md:grid-cols-2'>
              {sortedEvents.map((event) => (
                <li
                  key={event.id}
                  className='rounded-lg border p-4 shadow hover:shadow-md dark:border-gray-600 dark:bg-gray-800'
                >
                  <h2 className='text-lg font-semibold text-black dark:text-white'>
                    {event.title}
                  </h2>
                  <p className='text-sm text-gray-600 dark:text-gray-300'>
                    {event.insect_museums?.name || '施設不明'}
                  </p>
                  <p className='mt-1 text-sm text-gray-700 dark:text-gray-400'>
                    {event.start_date} ～ {event.end_date}
                  </p>
                  {event.event_url && (
                    <a
                      href={event.event_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-sm text-blue-600 hover:underline dark:text-gray-300'
                    >
                      詳細はこちら
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className='fixed bottom-6 right-6 rounded-full bg-blue-600 p-3 text-white shadow-lg transition hover:bg-blue-700'
            aria-label='ページトップへ'
          >
            <ChevronUpIcon className='h-6 w-6' />
          </button>
        )}
      </div>
    </main>
  );
}
