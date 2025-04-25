'use client';

export default function ErrorPage() {
  return (
    <section className='bg-white'>
      <div className='layout flex min-h-screen flex-col items-center justify-center text-center text-black'>
        <div className='mb-6 rounded-full bg-red-100 p-4'>
          <span className='text-5xl text-red-600'>⚠️</span>
        </div>
        <h1 className='text-3xl font-bold'>エラーが発生しました</h1>
        <p className='mt-4 text-lg'>
          申し訳ありません。ページの読み込み中に問題が発生しました。
        </p>
        <p className='mt-2 text-sm text-gray-600'>
          しばらくしてから再度お試しください。
        </p>
      </div>
    </section>
  );
}
