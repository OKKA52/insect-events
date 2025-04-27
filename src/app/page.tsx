'use client';

import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { FaFacebookSquare, FaInstagram } from 'react-icons/fa';

import { supabase } from '@/lib/supabase';

// 🐛 昆虫館テーブル用の型定義
type Museum = {
  id: number;
  name: string;
  address: string;
  url: string;
  facebook_url?: string;
  x_url?: string;
  instagram_url?: string;
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
        // console.log('Fetched museums:', data);
      }

      setLoadingMuseums(false);
    };

    fetchMuseums();
  }, []);

  return (
    <main className='p-6 md:p-8 lg:p-10'>
      <h1 className='text-2xl md:text-3xl font-bold mb-6'>昆虫館一覧</h1>

      {loadingMuseums ? (
        <p>読み込み中...</p>
      ) : museums.length === 0 ? (
        <p>昆虫館が登録されていません。</p>
      ) : (
        <ul className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {museums.map((museum) => (
            <li
              key={museum.id}
              className='border p-4 rounded-lg shadow hover:shadow-md transition'
            >
              <h2 className='text-lg md:text-xl font-semibold'>
                {museum.name}
              </h2>
              <p className='text-sm md:text-base text-gray-600'>
                {museum.address}
              </p>

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
                    <span className='ml-1 text-sm md:text-base'>Webサイト</span>
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
    </main>
  );
}
