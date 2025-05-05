'use client';

import AreaTag from '@/components/AreaTag';
import {
  ArrowTopRightOnSquareIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/solid';
import { FaFacebookSquare, FaInstagram } from 'react-icons/fa';
import { prefectures } from '@/utils/prefectures';
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Map from '@/components/Map';

const sortByPrefecture = (list: Museum[]) => {
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

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 1200 1227'
      fill='currentColor'
      className={className}
    >
      <path d='M1200 0L741 631l454 596h-269L600 797 287 1227H0l474-640L37 0h269l295 423L913 0z' />
    </svg>
  );
}

type Museum = {
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
};

type EventWithMuseum = {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  event_url?: string;
  insect_museums: {
    id: number;
    name: string;
    latitude?: number;
    longitude?: number;
    address?: string;
  } | null;
};

export default function HomePage() {
  const [tab, setTab] = useState<'museums' | 'events'>('museums');
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [events, setEvents] = useState<EventWithMuseum[]>([]);
  const [loadingMuseums, setLoadingMuseums] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filteredMuseums, setFilteredMuseums] = useState<Museum[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventWithMuseum[]>([]);
  const [eventSortOrder, setEventSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hoveredMuseumId, setHoveredMuseumId] = useState<number | null>(null);
  const [clickedMuseumId, setClickedMuseumId] = useState<number | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const museumRefs = useRef<Record<number, HTMLLIElement | null>>({});
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const katakanaToHiragana = (str: string) =>
    str.replace(/[ァ-ヶ]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) - 0x60),
    );

  const handleSearch = useCallback(
    (value: string) => {
      setSearchText(value);
      const rawKeyword = value.trim().normalize('NFC');
      const hiraganaKeyword = katakanaToHiragana(rawKeyword);
      const rawKeywords = rawKeyword.split(/\s+/);
      const hiraKeywords = hiraganaKeyword.split(/\s+/);

      if (rawKeyword === '') {
        setFilteredMuseums(museums);
        setFilteredEvents(events);
        setResetKey((prev) => prev + 1);
        return;
      }

      if (tab === 'museums') {
        const results = museums.filter((museum) => {
          const name = (museum.name ?? '').normalize('NFC');
          const nameKana = katakanaToHiragana(museum.name_kana ?? '').normalize(
            'NFC',
          );
          const address = (museum.address ?? '').normalize('NFC');
          const addressKana = katakanaToHiragana(
            museum.address_kana ?? '',
          ).normalize('NFC');
          const area = (museum.area ?? '').normalize('NFC');
          const areaKana = katakanaToHiragana(museum.area_kana ?? '').normalize(
            'NFC',
          );
          const pref = (museum.prefecture ?? '').normalize('NFC');
          const prefKana = katakanaToHiragana(
            museum.prefecture_kana ?? '',
          ).normalize('NFC');

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
          return rawKeywords.every((word, i) => {
            const hiraWord = hiraKeywords[i];
            return (
              title.includes(word) ||
              title.includes(hiraWord) ||
              museumName.includes(word)
            );
          });
        });
        setFilteredEvents(results);
      }

      setResetKey((prev) => prev + 1);
    },
    [tab, museums, events],
  );

  // 並び替え
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const dateA = new Date(a.start_date).getTime();
    const dateB = new Date(b.start_date).getTime();
    return eventSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const handleClear = () => {
    setSearchText('');
    setFilteredMuseums(museums);
    setFilteredEvents(events);
    setClickedMuseumId(null);
    setHoveredMuseumId(null);
    setResetKey((prev) => prev + 1);
    setTimeout(() => {
      const el = mapRef.current;
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 220;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  useEffect(() => {
    const fetchMuseums = async () => {
      const { data, error } = await supabase.from('insect_museums').select('*');
      if (!error) {
        setMuseums(data as Museum[]);
        setFilteredMuseums(data as Museum[]);
      }
      setLoadingMuseums(false);
    };
    fetchMuseums();

    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, insect_museums(id, name, latitude, longitude, address)');
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
      if (target)
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [clickedMuseumId]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (searchText !== '') {
      handleSearch(searchText);
    }
  }, [tab, searchText, handleSearch]);

  const sortedMuseums = sortByPrefecture(filteredMuseums);

  return (
    <main>
      <div className='sticky top-0 bg-white z-10 shadow'>
        <div className='p-6 md:p-8 lg:p-10'>
          {/* タイトル */}
          <h1
            className='text-2xl md:text-3xl font-bold mb-4 cursor-pointer'
            onClick={handleClear}
          >
            昆虫館マップ
          </h1>

          {/* タブボタン + 件数 */}
          <div className='mb-4 flex items-center'>
            <button
              onClick={() => setTab('museums')}
              className={`px-4 py-2 rounded ${tab === 'museums' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              昆虫館
            </button>
            <button
              onClick={() => setTab('events')}
              className={`ml-4 px-4 py-2 rounded ${tab === 'events' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              イベント
            </button>
            <span className='ml-10 text-sm text-gray-600'>
              {tab === 'museums'
                ? filteredMuseums.length
                : filteredEvents.length}{' '}
              件
            </span>
          </div>

          <div className='flex items-center space-x-6'>
            <input
              type='text'
              placeholder={
                tab === 'museums'
                  ? '施設名や県・エリア名で検索'
                  : '施設名やイベント名で検索'
              }
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className='border rounded p-2 w-full max-w-md text-base'
            />
            <button
              onClick={handleClear}
              className='px-4 h-10 bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap text-sm'
            >
              クリア
            </button>
          </div>
        </div>
      </div>

      <div className='relative z-0 p-6 md:p-8 lg:p-10'>
        <div ref={mapRef} />
        <Map
          key={resetKey}
          museums={
            tab === 'museums'
              ? sortedMuseums
              : (sortedEvents
                  .map((e) => ({
                    id: e.id,
                    name: e.title,
                    latitude: e.insect_museums?.latitude,
                    longitude: e.insect_museums?.longitude,
                    address: e.insect_museums?.address,
                  }))
                  .filter((e) => e.latitude && e.longitude) as Museum[])
          }
          onHoverMuseum={setHoveredMuseumId}
          onClickMuseum={setClickedMuseumId}
        />
      </div>

      <div className='p-6 md:p-8 lg:p-10'>
        {tab === 'museums' ? (
          <h2 className='text-xl font-bold mb-4'>昆虫館リスト</h2>
        ) : (
          <div className='flex items-center mb-4'>
            <h2 className='text-xl font-bold'>イベント一覧</h2>
            <div className='flex items-center space-x-2 ml-8'>
              <label className='text-sm text-gray-600'>開催日順:</label>
              <select
                value={eventSortOrder}
                onChange={(e) =>
                  setEventSortOrder(e.target.value as 'asc' | 'desc')
                }
                className='border p-1 rounded text-sm'
              >
                <option value='asc'>近い順</option>
                <option value='desc'>遠い順</option>
              </select>
            </div>
          </div>
        )}

        {loadingMuseums ? (
          <p>読み込み中...</p>
        ) : tab === 'museums' ? (
          <ul className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-6'>
            {sortedMuseums.map((museum) => (
              <li
                key={museum.id}
                ref={(el) => {
                  museumRefs.current[museum.id] = el;
                }}
                className={`border p-4 rounded-lg shadow transition ${
                  hoveredMuseumId === museum.id
                    ? 'bg-yellow-100'
                    : 'hover:shadow-md'
                }`}
              >
                <h2 className='text-lg md:text-xl font-semibold'>
                  {museum.name}
                </h2>
                <div className='flex items-center space-x-2 mt-1'>
                  {museum.area && <AreaTag area={museum.area} />}
                  <p className='text-sm md:text-base text-gray-600'>
                    {museum.address}
                  </p>
                </div>
                <div className='flex items-center space-x-3 md:space-x-5 mt-3'>
                  {museum.url && (
                    <a
                      href={museum.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-600 hover:underline flex items-center'
                    >
                      <ArrowTopRightOnSquareIcon className='h-5 w-5' />
                      <span className='ml-1 text-sm md:text-base'>
                        Webサイト
                      </span>
                    </a>
                  )}
                  {museum.facebook_url && (
                    <a
                      href={museum.facebook_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-600'
                    >
                      <FaFacebookSquare className='h-6 w-6' />
                    </a>
                  )}
                  {museum.x_url && (
                    <a
                      href={museum.x_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-black'
                    >
                      <div className='w-6 h-6 border border-gray-400 rounded-md flex items-center justify-center'>
                        <XIcon className='w-3 h-3' />
                      </div>
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
        ) : sortedEvents.length === 0 ? (
          <div className='text-gray-600 text-sm mt-4'>
            <p>該当するイベントが見つかりませんでした。</p>
            {searchText && (
              <ul className='list-disc list-inside mt-2 space-y-1'>
                <li>キーワードを変更して再度検索してください。</li>
                <li>施設名やエリア名での検索をお試しください。</li>
                <li>「近い順」に並び替えると見つかる場合があります。</li>
              </ul>
            )}
          </div>
        ) : (
          <ul className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-6'>
            {sortedEvents.map((event) => (
              <li
                key={event.id}
                className='border p-4 rounded-lg shadow hover:shadow-md'
              >
                <h2 className='text-lg font-semibold'>{event.title}</h2>
                <p className='text-sm text-gray-600'>
                  {event.insect_museums?.name || '施設不明'}
                </p>
                <p className='text-sm mt-1 text-gray-700'>
                  {event.start_date} ～ {event.end_date}
                </p>
                {event.event_url && (
                  <a
                    href={event.event_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-blue-600 text-sm hover:underline'
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
          className='fixed bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition'
          aria-label='ページトップへ'
        >
          <ChevronUpIcon className='h-6 w-6' />
        </button>
      )}
    </main>
  );
}
