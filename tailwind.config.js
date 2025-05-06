// tailwind.config.js
module.exports = {
  darkMode: 'media',
  content: [
    './src/**/*.{html,ts,tsx}', // 必要に応じて内容を調整
  ],
  theme: {
    extend: {
      fontFamily: {
        primary: ['"Inter"', 'sans-serif'], // "Inter" フォントを指定
      },
    },
  },
  plugins: [],
};
