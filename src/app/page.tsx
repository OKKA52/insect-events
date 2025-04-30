'use client';

import {
  ArrowTopRightOnSquareIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/solid';
import { FaFacebookSquare, FaInstagram } from 'react-icons/fa';
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
};

const prefectures = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
];

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
  const [mapZoomLevel, setMapZoomLevel] = useState(5);

  const handleClear = () => {
    setSearchText('');
    setFilteredMuseums(museums);
    setClickedMuseumId(null);
    setHoveredMuseumId(null);
    setResetKey((prev) => prev + 1);
    setMapZoomLevel(5);

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

  const katakanaToHiragana = (str: string) =>
    str.replace(/[ァ-ヶ]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) - 0x60),
    );

  const handleSearch = (value: string) => {
    setSearchText(value);

    if (value.trim() === '') {
      setFilteredMuseums(museums);
      setMapZoomLevel(5);
      return;
    }

    const keyword = katakanaToHiragana(value.toLowerCase());
    const keywords = keyword.split(/\s+/);

    const results = museums.filter((museum) => {
      const name = museum.name.toLowerCase();
      const nameKana = katakanaToHiragana(
        museum.name_kana?.toLowerCase() ?? '',
      );
      const address = museum.address.toLowerCase();
      const addressKana = katakanaToHiragana(
        museum.address_kana?.toLowerCase() ?? '',
      );
      const area = museum.area?.toLowerCase() ?? '';
      const pref = museum.prefecture?.toLowerCase() ?? '';

      return keywords.every(
        (word) =>
          name.includes(word) ||
          nameKana.includes(word) ||
          address.includes(word) ||
          addressKana.includes(word) ||
          area.includes(word) ||
          pref.includes(word),
      );
    });

    setFilteredMuseums(results);

    const matchedPref = museums.find(
      (m) => m.prefecture?.toLowerCase() === keyword,
    );
    const matchedArea = museums.find((m) => m.area?.toLowerCase() === keyword);

    if (matchedPref) {
      setMapZoomLevel(9);
    } else if (matchedArea) {
      setMapZoomLevel(7);
    } else {
      setMapZoomLevel(7);
    }
  };

  const sortedMuseums = sortByPrefecture(filteredMuseums);

  return (
    <main>
      <div className='sticky top-0 bg-white z-10 shadow'>
        <div className='p-6 md:p-8 lg:p-10'>
          <h1 className='text-2xl md:text-3xl font-bold mb-4'>昆虫館一覧</h1>
          <div className='flex items-center space-x-6'>
            <input
              type='text'
              placeholder='施設名や住所、エリアで検索'
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              className='border rounded p-2 w-full max-w-md'
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

      <div className='relative z-0 p-6 md:p-8 lg:p-10'>
        <div ref={mapRef} />
        <h2 className='text-xl font-bold mb-4'>昆虫館マップ</h2>
        <Map
          key={resetKey}
          museums={sortedMuseums}
          onHoverMuseum={setHoveredMuseumId}
          onClickMuseum={setClickedMuseumId}
          zoomLevel={mapZoomLevel}
        />
      </div>

      {/* 昆虫館リスト */}
      <div className='p-6 md:p-8 lg:p-10'>
        {loadingMuseums ? (
          <p>読み込み中...</p>
        ) : sortedMuseums.length === 0 ? (
          <p>条件に合う昆虫館が見つかりませんでした。</p>
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
                  {museum.area && (
                    <span
                      className={`inline-block border border-gray-300 text-xs md:text-sm font-semibold px-3 py-1 rounded self-start shrink-0 ${
                        museum.area === '北海道'
                          ? 'bg-cyan-100 text-cyan-800'
                          : museum.area === '東北'
                            ? 'bg-indigo-100 text-indigo-800'
                            : museum.area === '関東'
                              ? 'bg-blue-100 text-blue-800'
                              : museum.area === '中部'
                                ? 'bg-yellow-100 text-yellow-800'
                                : museum.area === '近畿'
                                  ? 'bg-green-100 text-green-800'
                                  : museum.area === '中国'
                                    ? 'bg-purple-100 text-purple-800'
                                    : museum.area === '四国'
                                      ? 'bg-orange-100 text-orange-800'
                                      : museum.area === '九州'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {museum.area}
                    </span>
                  )}
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
