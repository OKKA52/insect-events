'use client';

import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

// 🐛 昆虫館テーブル用の型定義
type Museum = {
  id: number;
  name: string;
  address: string;
  url: string;
};

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
      }

      setLoadingMuseums(false);
    };

    fetchMuseums();
  }, []);

  return (
    <main className='p-8'>
      <h1 className='text-2xl font-bold mb-4'>昆虫館一覧</h1>

      {loadingMuseums ? (
        <p>読み込み中...</p>
      ) : museums.length === 0 ? (
        <p>昆虫館が登録されていません。</p>
      ) : (
        <ul className='space-y-4'>
          {museums.map((museum) => (
            <li key={museum.id} className='border p-4 rounded shadow'>
              <h2 className='text-xl font-semibold'>{museum.name}</h2>
              <p className='text-sm text-gray-600'>{museum.address}</p>
              {museum.url && (
                <a
                  href={museum.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center text-blue-600 hover:underline mt-2'
                >
                  <ArrowTopRightOnSquareIcon className='h-5 w-5 mr-1' />
                  Webサイト
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
