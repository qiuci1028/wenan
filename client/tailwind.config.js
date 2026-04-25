/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 主色：浅雾蓝
        primary: '#6B90AE',
        'primary-light': '#8AA8C0',
        'primary-dark': '#557590',
        // 辅助色：浅杏色
        accent: '#F5F0E8',
        'accent-light': '#FAF8F5',
        'accent-dark': '#E8E0D8',
        // 强调色：豆沙粉
        highlight: '#D9A8A8',
        'highlight-light': '#E8C4C4',
        'highlight-dark': '#C89090',
        // 文字颜色
        'text-primary': '#2D2D2D',
        'text-secondary': '#7A7A7A',
        'text-muted': '#A0A0A0',
        // 背景色
        'bg-primary': '#FFFFFF',
        'bg-secondary': '#F5F0E8',
        // 其他
        'card-bg': '#FFFFFF',
        'border-color': '#E8E0D8'
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', '"Inter"', 'sans-serif'],
        serif: ['"ZCOOL XiaoWei"', '"Ma Shan Zheng"', '"STKaiti"', '"KaiTi"', 'serif']
      },
      spacing: {
        'card-gap': '24px',
        'page-padding': '32px',
        'header-height': '64px'
      },
      borderRadius: {
        'card': '12px',
        'btn': '20px'
      },
      maxWidth: {
        'page': '1200px'
      }
    }
  },
  plugins: []
}