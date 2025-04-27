'use client';

import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { FaFacebookSquare, FaInstagram } from 'react-icons/fa';

import { supabase } from '@/lib/supabase';

// 🐛 昆虫館テーブル用の型定義（エリア対応版）
type Museum = {
  id: number;
  name: string;
  address: string;
  url: string;
  facebook_url?: string;
  x_url?: string;
  instagram_url?: string;
  area?: string; // 👈 エリアを追加
};

// 本格版 X（旧Twitter）アイコン（SVG）
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 1200 1227'
      className={className}
      fill='currentColor'
    >
      <path d='M1200 0L741 631l454 596h-269L600 797 287 1227H0l474-640L37 0h269l295 423L913 0z' />
    </svg>
  );
}

export default function HomePage() {
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [loadingMuseums, setLoadingMuseums] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');
  const [filteredMuseums, setFilteredMuseums] = useState<Museum[]>([]);

  useEffect(() => {
    const fetchMuseums = async () => {
      const { data, error } = await supabase
        .from('insect_museums')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        // console.error('Error fetching museums:', error.message);
      } else {
        setMuseums(data as Museum[]);
        setFilteredMuseums(data as Museum[]);
      }

      setLoadingMuseums(false);
    };

    fetchMuseums();
  }, []);

  const handleSearch = (value: string) => {
    if (value.trim() === '') {
      setFilteredMuseums(museums);
    } else {
      const keyword = value.toLowerCase();
      const results = museums.filter(
        (museum) =>
          museum.name.toLowerCase().includes(keyword) ||
          museum.address.toLowerCase().includes(keyword) ||
          (museum.area?.toLowerCase().includes(keyword) ?? false),
      );
      setFilteredMuseums(results);
    }
  };

  return (
    <main>
      {/* 🧷 Stickyヘッダー */}
      <div className='sticky top-0 bg-white z-10 shadow'>
        <div className='p-6 md:p-8 lg:p-10'>
          <h1 className='text-2xl md:text-3xl font-bold mb-4'>昆虫館一覧</h1>

          {/* 🔍 リアルタイム検索バー */}
          <div className='flex items-center space-x-2'>
            <input
              type='text'
              placeholder='施設名や住所、エリアで検索'
              value={searchText}
              onChange={(e) => {
                const value = e.target.value;
                setSearchText(value);
                handleSearch(value);
              }}
              className='border rounded p-2 w-full max-w-md'
            />
          </div>
        </div>
      </div>

      {/* 📋 昆虫館リスト */}
      <div className='p-6 md:p-8 lg:p-10'>
        {loadingMuseums ? (
          <p>読み込み中...</p>
        ) : filteredMuseums.length === 0 ? (
          <p>条件に合う昆虫館が見つかりませんでした。</p>
        ) : (
          <ul className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-6'>
            {filteredMuseums.map((museum) => (
              <li
                key={museum.id}
                className='border p-4 rounded-lg shadow hover:shadow-md transition'
              >
                {/* 施設名 */}
                <h2 className='text-lg md:text-xl font-semibold'>
                  {museum.name}
                </h2>

                {/* エリアラベル + 住所（横並び） */}
                <div className='flex items-center space-x-2 mt-1'>
                  {/* エリアラベル */}
                  {museum.area && (
                    <span
                      className={`inline-block border text-xs md:text-sm font-semibold px-3 py-1 rounded ${
                        museum.area === '北海道'
                          ? 'bg-cyan-100 text-cyan-800 border-gray-300'
                          : museum.area === '東北'
                            ? 'bg-indigo-100 text-sky-800 border-gray-300'
                            : museum.area === '関東'
                              ? 'bg-blue-100 text-blue-800 border-gray-300'
                              : museum.area === '中部'
                                ? 'bg-yellow-100 text-teal-800 border-gray-300'
                                : museum.area === '近畿'
                                  ? 'bg-green-100 text-green-800 border-gray-300'
                                  : museum.area === '中国'
                                    ? 'bg-purple-100 text-lime-800 border-gray-300'
                                    : museum.area === '四国'
                                      ? 'bg-orange-100 text-amber-800 border-gray-300'
                                      : museum.area === '九州'
                                        ? 'bg-red-100 text-rose-800 border-gray-300'
                                        : 'bg-gray-100 text-gray-800 border-gray-300'
                      }`}
                    >
                      {museum.area}
                    </span>
                  )}

                  {/* 住所 */}
                  <p className='text-sm md:text-base text-gray-600'>
                    {museum.address}
                  </p>
                </div>

                {/* リンク表示 */}
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
                      className='text-blue-600 hover:text-blue-800'
                    >
                      <FaFacebookSquare className='h-6 w-6' />
                    </a>
                  )}
                  {museum.x_url && (
                    <a
                      href={museum.x_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-black hover:text-gray-800'
                    >
                      <XIcon className='h-5 w-5' />
                    </a>
                  )}
                  {museum.instagram_url && (
                    <a
                      href={museum.instagram_url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-pink-500 hover:text-pink-700'
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
    </main>
  );
}
