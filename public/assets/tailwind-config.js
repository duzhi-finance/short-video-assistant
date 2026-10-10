// 全站共用的 Tailwind 設定（配色與字體）
tailwind.config = {
  theme: {
    extend: {
      colors: {
        editorial: {
          bg: '#FBF9F5',
          card: '#F3EEE7',
          oat: '#EAE2D6',
          border: '#E2D9CF',
          accent: '#B88E52',
          accentHover: '#9F7741',
          dark: '#241E19',
          muted: '#7A6F66'
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
