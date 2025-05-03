'use client';

import AreaTag from '@/components/AreaTag';
import {
  ArrowTopRightOnSquareIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/solid';
import { FaFacebookSquare, FaInstagram } from 'react-icons/fa';
import { prefectures } from '@/utils/prefectures';
import { useEffect, useRef, useState } from 'react';

import { supabase } from '@/lib/supabase';
import Map from '@/components/Map';

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

export default function HomePage() {
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [loadingMuseums, setLoadingMuseums] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filteredMuseums, setFilteredMuseums] = useState<Museum[]>([]);
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

  const handleSearch = (value: string) => {
    setSearchText(value);

    const rawKeyword = value.trim().normalize('NFC');
    const hiraganaKeyword = katakanaToHiragana(rawKeyword);
    const rawKeywords = rawKeyword.split(/\s+/);
    const hiraKeywords = hiraganaKeyword.split(/\s+/);

    if (rawKeyword === '') {
      setFilteredMuseums(museums);
      setResetKey((prev) => prev + 1);
      return;
    }

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

    const pins = results.filter((m) => m.latitude && m.longitude);
    if (pins.length > 0) {
      setResetKey((prev) => prev + 1);
    }
  };

  const handleClear = () => {
    setSearchText('');
    setFilteredMuseums(museums);
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
  }, []);

  useEffect(() => {
    if (clickedMuseumId !== null) {
      const target = museumRefs.current[clickedMuseumId];
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [clickedMuseumId]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const sortedMuseums = sortByPrefecture(filteredMuseums);

  return (
    <main>
      {/* 上部検索・タイトル */}
      <div className='sticky top-0 bg-white z-10 shadow'>
        <div className='p-6 md:p-8 lg:p-10'>
          <h1
            className='text-2xl md:text-3xl font-bold mb-4 cursor-pointer'
            onClick={handleClear}
          >
            昆虫館マップ
          </h1>
          <div className='flex items-center space-x-6'>
            <input
              type='text'
              placeholder='施設名や住所、エリアで検索'
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
            <span className='text-sm text-gray-600 whitespace-nowrap'>
              {filteredMuseums.length} 件
            </span>
          </div>
        </div>
      </div>

      {/* 地図 */}
      <div className='relative z-0 p-6 md:p-8 lg:p-10'>
        <div ref={mapRef} />
        <Map
          key={resetKey}
          museums={sortedMuseums}
          onHoverMuseum={setHoveredMuseumId}
          onClickMuseum={setClickedMuseumId}
        />
      </div>

      {/* リスト */}
      <div className='p-6 md:p-8 lg:p-10'>
        <h2 className='text-xl font-bold mb-4'>昆虫館リスト</h2>
        {loadingMuseums ? (
          <p>読み込み中...</p>
        ) : sortedMuseums.length === 0 ? (
          <p>条件に合う施設が見つかりませんでした。</p>
        ) : (
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
        )}
      </div>

      {/* ページトップへボタン */}
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
