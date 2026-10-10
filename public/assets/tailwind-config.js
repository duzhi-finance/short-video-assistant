/* ============================================================
   風格（配色）設定：全站共用
   - 每個風格的顏色定義在 site.css 的 [data-theme="..."]
   - 預設風格改 SITE_DEFAULT_THEME；使用者選過的會記在瀏覽器裡
   ============================================================ */
const SITE_DEFAULT_THEME = 'luxe';
const SITE_LOCK_THEME = true; // true：全站固定用上面的風格；想開放切換就改成 false，並把 site.js 的 themePicker 改成 true

const SITE_THEMES = [
  { id: 'editorial', name: '燕麥雜誌', note: '奶油米白・香檳金・經典雜誌感', swatch: ['#FBF9F5', '#EAE2D6', '#B88E52', '#241E19'] },
  { id: 'luxe',      name: '霧面香檳', note: '毛玻璃卡片・懸停浮起・高訂質感', swatch: ['#F9F6F0', '#F2EDE4', '#A8824A', '#1C1815'] },
  { id: 'rose',      name: '玫瑰奶茶', note: '柔霧粉・溫柔美妝感', swatch: ['#FBF6F4', '#EBDAD5', '#B07A72', '#2A1F1E'] },
  { id: 'sage',      name: '鼠尾草綠', note: '低飽和綠・自然清爽', swatch: ['#F7F8F4', '#DFE4D6', '#7C8B6A', '#1F2420'] },
  { id: 'ink',       name: '墨藍藝廊', note: '冷灰白・沉穩專業', swatch: ['#F6F7F9', '#DDE1E8', '#3E5C8A', '#161B24'] }
];

// 在頁面畫出來之前就套用風格，避免閃一下
(function applySavedTheme() {
  let id = SITE_DEFAULT_THEME;
  if (!SITE_LOCK_THEME) { try { id = localStorage.getItem('sv_theme') || id; } catch {} }
  if (!SITE_THEMES.some(t => t.id === id)) id = SITE_DEFAULT_THEME;
  document.documentElement.dataset.theme = id;
})();

const themeColor = name => `rgb(var(--c-${name}) / <alpha-value>)`;

tailwind.config = {
  theme: {
    extend: {
      colors: {
        editorial: {
          bg: themeColor('bg'),
          surface: themeColor('surface'),
          card: themeColor('card'),
          oat: themeColor('oat'),
          border: themeColor('border'),
          accent: themeColor('accent'),
          accentHover: themeColor('accent-hover'),
          dark: themeColor('dark'),
          muted: themeColor('muted')
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', '"Noto Serif TC"', 'serif'],
        serif: ['"Noto Serif TC"', 'serif'],
        sans: ['"Noto Sans TC"', 'sans-serif']
      }
    }
  }
};
