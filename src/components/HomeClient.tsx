/* 'use client' が先頭に必要 */
'use client';

import AreaTag from '@/components/AreaTag';
import { toHalfWidth, katakanaToHiragana } from '@/utils/text';
import { ArrowTopRightOnSquareIcon, ChevronUpIcon } from '@heroicons/react/24/solid';
import { FaFacebookSquare, FaInstagram } from 'react-icons/fa';
import Image from 'next/image';
import dynamic from 'next/dynamic';
// import { useState } from 'react';

const InsectMap = dynamic(() => import('@/components/Map'), {
  ssr: false,
});

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

interface HomeClientProps {
  tab: 'museums' | 'events';
  setTab: (tab: 'museums' | 'events') => void;
  searchText: string;
  setSearchText: (value: string) => void;
  handleSearch: (value: string) => void;
  handleClear: () => void;
  resetKey: number;
  sortedMuseums: Museum[];
  uniqueEventMuseums: Museum[];
  setHoveredMuseumId: (id: number | null) => void;
  setClickedMuseumId: (id: number | null) => void;
  eventSortOrder: 'asc' | 'desc';
  setEventSortOrder: (order: 'asc' | 'desc') => void;
  // filteredMuseums: Museum[];
  // filteredEvents: EventWithMuseum[];
  visibleMuseumIds: number[];
  visibleMuseums: Museum[];
  eventCountMap: Map<number, number>;
  museumRefs: React.MutableRefObject<Record<number, HTMLLIElement | null>>;
  mapRef: React.RefObject<HTMLDivElement | null>;
  showScrollTop: boolean;
  scrollToTop: () => void;
  setVisibleMuseumIds: (ids: number[]) => void;
  sortedEvents: EventWithMuseum[];
  hoveredMuseumId: number | null;
}

export default function HomeClient({
  tab,
  setTab,
  searchText,
  handleSearch,
  handleClear,
  resetKey,
  sortedMuseums,
  uniqueEventMuseums,
  setHoveredMuseumId,
  setClickedMuseumId,
  eventSortOrder,
  setEventSortOrder,
  // filteredMuseums,
  // filteredEvents,
  visibleMuseums,
  visibleMuseumIds,
  eventCountMap,
  museumRefs,
  mapRef,
  showScrollTop,
  scrollToTop,
  setVisibleMuseumIds,
  sortedEvents,
  hoveredMuseumId,
}: HomeClientProps) {
  // const [visibleMuseumIds, setVisibleMuseumIds] = useState<number[]>([]);
  const raw = searchText.trim();
  const halfWidth = toHalfWidth(raw).normalize('NFC');
  const hiraKey = katakanaToHiragana(halfWidth);

  // ─── ① 地図に表示中の館IDに紐づくイベントだけをまず抽出 ───
  const eventsInMap = sortedEvents.filter(
    (event) => event.insect_museums !== null && visibleMuseumIds.includes(event.insect_museums.id),
  );

  // ─── ② ひらがな／半角カナ・漢字カナを混在させた部分一致フィルタ ───
  const filteredEvents = raw
    ? eventsInMap.filter((event) => {
        return [
          // イベント固有
          event.title,
          // 施設情報（漢字／カナ／かな）すべてを対象に
          event.insect_museums?.name,
          event.insect_museums?.name_kana,
          event.insect_museums?.prefecture,
          event.insect_museums?.prefecture_kana,
          event.insect_museums?.area,
          event.insect_museums?.area_kana,
          event.insect_museums?.address,
          event.insect_museums?.address_kana,
        ].some((v) => {
          const str = (v ?? '').normalize('NFC');
          const hw = toHalfWidth(str);
          const hira = katakanaToHiragana(hw);
          // 漢字／カナ文字列は hw, ひらがなは hiraKey で比較
          return hw.includes(halfWidth) || hira.includes(hiraKey);
        });
      })
    : eventsInMap;

  // 同じ要領で filteredMuseums も…
  const filteredMuseums = raw
    ? sortedMuseums.filter((museum) => {
        return [
          museum.name,
          museum.prefecture,
          museum.area,
          museum.name_kana,
          museum.prefecture_kana,
          museum.area_kana,
        ].some((v) => {
          const str = (v ?? '').normalize('NFC');
          const hw = toHalfWidth(str);
          const hira = katakanaToHiragana(hw);
          return hw.includes(halfWidth) || hira.includes(hiraKey);
        });
      })
    : visibleMuseums;

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
          setVisibleMuseumIds={setVisibleMuseumIds}
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
          {tab === 'museums' && searchText.trim() === '' && (
            <p className='mb-4 text-sm text-gray-500 dark:text-gray-300'>
              ※ 地図に表示されている施設のみを表示中です
            </p>
          )}

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
                {filteredMuseums.map((museum) => (
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
          ) : filteredEvents.length === 0 ? (
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
              {filteredEvents.map((event) => (
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
