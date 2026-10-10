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
  contactEmail: ''         // 客服信箱，請填寫
};

/* ---------- 共用頁首 ---------- */
function renderHeader(page) {
  const el = document.getElementById('site-header');
  if (!el) return;
  const brand = `
    <a href="${page === 'app' ? '/app' : '#'}" class="flex items-baseline gap-2 min-w-0">
      <span class="font-display italic text-editorial-accent text-lg leading-none">S</span>
      <span class="font-serif font-bold text-base md:text-lg truncate">${SITE.name}</span>
    </a>`;
  const shell = inner => `
    <header class="sticky z-40 bg-editorial-bg/90 backdrop-blur border-b border-editorial-border/70" style="top: env(safe-area-inset-top, 0px)">${inner}</header>`;

  // 工具頁：只放品牌名稱與會員狀態
  if (page === 'app') {
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
          <a href="/app" class="hidden sm:inline-flex text-xs border border-editorial-border hover:border-editorial-accent bg-white px-4 py-2 rounded-full transition">已購買？進入工具</a>
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
  openPolicyFromHash();
  window.addEventListener('hashchange', openPolicyFromHash);
});
