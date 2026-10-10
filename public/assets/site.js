/* ============================================================
   全站設定：之後改價格、開金流，只要改這裡
   ============================================================ */
const SITE = {
  name: '短影音爆款企劃大師',
  price: 990,              // 一次買斷價格（新台幣），請改成你的定價
  originalPrice: 1490,     // 原價（顯示劃線用），不需要就設成 0
  dailyLimit: 20,          // 每組密碼每天可生成次數（後端 DAILY_LIMIT 也要設一樣）
  paymentReady: false,     // 綠界金流串好之後改成 true
  checkoutUrl: '',         // 之後放付款網址或 API 路徑
  contactEmail: '',        // 客服信箱，請填寫
  themePicker: false       // 右下角「風格」切換按鈕；目前固定霧面香檳，所以關掉
};

/* ---------- 風格切換 ---------- */
function setTheme(id) {
  document.documentElement.dataset.theme = id;
  try { localStorage.setItem('sv_theme', id); } catch {}
}

function renderThemePicker() {
  if (!SITE.themePicker || typeof SITE_THEMES === 'undefined') return;
  const wrap = document.createElement('div');
  wrap.className = 'fixed z-40 right-4 flex flex-col items-end gap-2';
  wrap.style.bottom = 'calc(1rem + env(safe-area-inset-bottom, 0px))';
  wrap.innerHTML = `
    <div id="themePanel" class="hidden w-72 max-w-[calc(100vw-2rem)] bg-editorial-surface border border-editorial-border rounded-3xl shadow-xl p-4 fade-in">
      <div class="flex items-baseline justify-between mb-3 px-1">
        <p class="font-serif font-bold">選一個風格</p>
        <p class="font-display italic text-xs text-editorial-accent">Style</p>
      </div>
      <div id="themeList" class="grid gap-2"></div>
      <p class="text-[11px] text-editorial-muted mt-3 px-1 leading-relaxed">點一下立刻換，會記在這台裝置上。</p>
    </div>
    <button id="themeBtn" type="button" aria-label="切換風格" class="flex items-center gap-2 bg-editorial-surface border border-editorial-border hover:border-editorial-accent shadow-lg rounded-full pl-2 pr-4 py-2 text-xs font-medium transition">
      <span id="themeDot" class="w-6 h-6 rounded-full border border-editorial-border"></span>風格
    </button>`;
  document.body.appendChild(wrap);

  const panel = wrap.querySelector('#themePanel');
  const list = wrap.querySelector('#themeList');
  const dot = wrap.querySelector('#themeDot');

  const draw = () => {
    const current = document.documentElement.dataset.theme;
    const t = SITE_THEMES.find(x => x.id === current) || SITE_THEMES[0];
    dot.style.background = `conic-gradient(${t.swatch[2]} 0 25%, ${t.swatch[1]} 0 50%, ${t.swatch[0]} 0 75%, ${t.swatch[3]} 0)`;
    list.innerHTML = SITE_THEMES.map(x => `
      <button type="button" data-theme-id="${x.id}" class="text-left rounded-2xl border p-2.5 transition ${x.id === current
        ? 'border-editorial-accent bg-editorial-card'
        : 'border-editorial-border hover:border-editorial-accent'}">
        <div class="theme-swatch">${x.swatch.map(c => `<span style="background:${c}"></span>`).join('')}</div>
        <div class="flex items-center justify-between mt-2 px-0.5">
          <span class="text-sm font-semibold">${x.name}</span>
          ${x.id === current ? '<span class="text-[11px] text-editorial-accentHover">使用中</span>' : ''}
        </div>
        <p class="text-[11px] text-editorial-muted px-0.5">${x.note}</p>
      </button>`).join('');
  };

  wrap.querySelector('#themeBtn').addEventListener('click', () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) draw();
  });
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-theme-id]');
    if (!b) return;
    setTheme(b.dataset.themeId);
    draw();
  });
  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) panel.classList.add('hidden');
  });
  draw();
}

/* ---------- 共用頁首 ---------- */
function renderHeader(page) {
  const el = document.getElementById('site-header');
  if (!el) return;
  const brand = `
    <a href="${page === 'app' ? '/app' : page === 'admin' ? '/admin' : '#'}" class="flex items-baseline gap-2 min-w-0">
      <span class="font-display italic text-editorial-accent text-lg leading-none">S</span>
      <span class="font-serif font-bold text-base md:text-lg truncate">${SITE.name}</span>
    </a>`;
  const shell = inner => `
    <header class="sticky z-40 bg-editorial-bg/90 backdrop-blur border-b border-editorial-border/70" style="top: env(safe-area-inset-top, 0px)">${inner}</header>`;

  // 工具頁、管理後台：只放品牌名稱與右側狀態
  if (page === 'app' || page === 'admin') {
    el.innerHTML = shell(`
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        ${brand}
        <div id="memberSlot" class="flex items-center gap-2"></div>
      </div>`);
    return;
  }

  // 銷售頁：單頁錨點導覽
  const link = (href, label) =>
    `<a href="${href}" class="px-3 py-2 rounded-full text-sm text-editorial-muted hover:text-editorial-dark transition">${label}</a>`;
  const links = link('#features', '功能') + link('#pricing', '方案') + link('#faq', '常見問題') + link('#policies', '條款');
  el.innerHTML = shell(`
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        ${brand}
        <nav class="hidden md:flex items-center gap-1">${links}</nav>
        <div class="flex items-center gap-2">
          <a href="/app" class="hidden sm:inline-flex text-xs border border-editorial-border hover:border-editorial-accent bg-editorial-surface px-4 py-2 rounded-full transition">已購買？進入工具</a>
          <a href="#pricing" class="inline-flex text-xs bg-editorial-dark hover:bg-editorial-accent text-white px-4 py-2 rounded-full transition">立即購買</a>
          <button id="menuBtn" class="md:hidden w-10 h-10 rounded-full border border-editorial-border flex items-center justify-center" aria-label="開啟選單">☰</button>
        </div>
      </div>
      <nav id="mobileMenu" class="md:hidden hidden border-t border-editorial-border/70 px-4 py-3 flex flex-col gap-1">
        ${links}
        <a href="/app" class="px-3 py-2 rounded-full text-sm text-editorial-accentHover">已購買？進入工具 →</a>
      </nav>`);
  const menu = document.getElementById('mobileMenu');
  document.getElementById('menuBtn').addEventListener('click', () => menu.classList.toggle('hidden'));
  menu.addEventListener('click', e => { if (e.target.closest('a')) menu.classList.add('hidden'); });
}

/* ---------- 連到條款時自動展開 ---------- */
function openPolicyFromHash() {
  const id = location.hash.slice(1);
  const el = id && document.getElementById(id);
  if (el && el.tagName === 'DETAILS') {
    el.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ---------- 共用頁尾 ---------- */
function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  el.innerHTML = `
    <footer class="mt-20 border-t border-editorial-border/70">
      <div class="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
        <div>
          <p class="font-serif font-bold">${SITE.name}</p>
          <p class="font-display italic text-xs text-editorial-muted mt-1">Written for creators who want it to feel real.</p>
        </div>
        <div class="flex flex-wrap gap-x-5 gap-y-2 text-xs text-editorial-muted">
          <a href="/#terms" class="hover:text-editorial-dark">服務條款</a>
          <a href="/#privacy" class="hover:text-editorial-dark">隱私權政策</a>
          <a href="/#refund" class="hover:text-editorial-dark">退款政策</a>
          <span>客服信箱：<span data-contact class="select-all"></span></span>
        </div>
      </div>
      <p class="text-center text-[11px] text-editorial-muted pb-8">© ${new Date().getFullYear()} ${SITE.name}</p>
    </footer>`;
}

/* ---------- 提示訊息 ---------- */
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-editorial-dark text-white text-xs px-4 py-2.5 rounded-full shadow-lg opacity-0 pointer-events-none transition-opacity z-[60]';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.style.opacity = '0'), 2200);
}

/* ---------- 購買按鈕 ---------- */
function bindBuyButtons() {
  document.querySelectorAll('[data-buy]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      if (SITE.paymentReady && SITE.checkoutUrl) {
        location.href = SITE.checkoutUrl;
      } else {
        toast('線上付款即將開放，敬請期待');
      }
    });
  });
}

/* ---------- 價格文字 ---------- */
function fillPrices() {
  const fmt = n => 'NT$ ' + Number(n).toLocaleString('zh-TW');
  document.querySelectorAll('[data-price]').forEach(el => (el.textContent = fmt(SITE.price)));
  document.querySelectorAll('[data-original-price]').forEach(el => {
    if (SITE.originalPrice) el.textContent = fmt(SITE.originalPrice);
    else el.remove();
  });
  document.querySelectorAll('[data-daily-limit]').forEach(el => (el.textContent = SITE.dailyLimit));
  document.querySelectorAll('[data-contact]').forEach(el => {
    el.textContent = SITE.contactEmail || '（客服信箱待填寫）';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderHeader(document.body.dataset.page);
  renderFooter();
  fillPrices();
  bindBuyButtons();
  renderThemePicker();
  openPolicyFromHash();
  window.addEventListener('hashchange', openPolicyFromHash);
});
