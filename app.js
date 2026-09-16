/* ====================================================================
 *  小喵成长记 - 主程序 v2.0
 *  - 现代化 UI + 自定义组件（DatePicker / BreedPicker / Toast / Sheet）
 * ==================================================================== */

const APP_VERSION = 'v2.2.7';
const APK_VERSION_CODE = 11;  // 与 android/app/build.gradle 的 versionCode 同步

/* ============ 版本记忆（用于检测升级并弹 toast / 关于页标识） ============ */
const LS_LAST_SEEN_VERSION  = 'xiaomiao.lastSeenVersion';     // e.g. 'v2.2.7'
const LS_LAST_SEEN_VCODE    = 'xiaomiao.lastSeenVersionCode'; // e.g. 11
const LS_LAST_UPDATE_CHECK  = 'xiaomiao.lastUpdateCheck';     // ISO timestamp

function getLastSeenVersion()  { return localStorage.getItem(LS_LAST_SEEN_VERSION); }
function getLastSeenVCode()    {
  const v = parseInt(localStorage.getItem(LS_LAST_SEEN_VCODE), 10);
  return Number.isFinite(v) ? v : null;
}
function setLastSeen(version, code) {
  try {
    localStorage.setItem(LS_LAST_SEEN_VERSION, version || APP_VERSION);
    if (Number.isFinite(code)) localStorage.setItem(LS_LAST_SEEN_VCODE, String(code));
  } catch {}
}

/* ============ 体重单位（输入 g，存储 g，展示 kg） ============ */
const fmtKg = g => g ? (Number(g) / 1000).toFixed(2) + ' kg' : '—';
const fmtKgNum = g => g ? (Number(g) / 1000).toFixed(2) : '—';

/* ============ 数据存储 ============ */
const LS_PROFILE = 'xiaomiao.profile';
const LS_RECORDS = 'xiaomiao.records';
const DB_NAME = 'xiaomiao-photos';
const DB_VERSION = 1;
const STORE_PHOTOS = 'photos';

const RECORD_TYPES = {
  feed:    { label: '喂食', emoji: '🍽️', color: '#FFE0CC', textColor: '#E07B3A' },
  weight:  { label: '体重', emoji: '⚖️', color: '#CFE7F5', textColor: '#2D7AB0' },
  poop:    { label: '排便', emoji: '💩', color: '#F0E1D5', textColor: '#A8765A' },
  pee:     { label: '排尿', emoji: '💧', color: '#D8EBF5', textColor: '#3D7AB8' },
  medicine:{ label: '用药', emoji: '💊', color: '#E1D6F5', textColor: '#7B5FCF' },
  sick:    { label: '生病', emoji: '🤒', color: '#F5DCE6', textColor: '#D85A8A' },
  vaccine: { label: '疫苗', emoji: '💉', color: '#D6F0D2', textColor: '#3D7B1F' },
  deworm:  { label: '驱虫', emoji: '🪱', color: '#F5E5C8', textColor: '#A8791A' },
  bath:    { label: '洗澡', emoji: '🛁', color: '#C8E8E5', textColor: '#2A8A82' },
  nail:    { label: '剪甲', emoji: '✂️', color: '#E5E0E0', textColor: '#5A5050' },
  life:    { label: '日常', emoji: '🐾', color: '#FFE5C8', textColor: '#A8631A' },
};

let state = {
  profile: null,
  records: [],
  currentPage: 'home',
  currentFilter: 'all',
  pendingPhotos: [],
};

/* ============ IndexedDB ============ */
let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
        db.createObjectStore(STORE_PHOTOS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}
async function dbPutPhoto(id, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite');
    tx.objectStore(STORE_PHOTOS).put({ id, blob });
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}
async function dbGetPhoto(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readonly');
    const req = tx.objectStore(STORE_PHOTOS).get(id);
    req.onsuccess = () => resolve(req.result ? req.result.blob : null);
    req.onerror = () => reject(req.error);
  });
}
async function dbGetAllPhotos() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readonly');
    const req = tx.objectStore(STORE_PHOTOS).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function dbDeletePhoto(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite');
    tx.objectStore(STORE_PHOTOS).delete(id);
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}
async function dbClearAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PHOTOS, 'readwrite');
    tx.objectStore(STORE_PHOTOS).clear();
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
}

/* ============ 工具方法 ============ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const todayStr = () => new Date().toISOString().slice(0, 10);
const nowStr = () => new Date().toISOString();

function daysBetween(from, to) {
  const a = new Date(from); a.setHours(0, 0, 0, 0);
  const b = new Date(to);  b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((b - a) / 86400000));
}
function ageText(birth) {
  if (!birth) return null;
  const days = daysBetween(birth, new Date());
  if (days < 60) return `${days} 天`;
  if (days < 365) {
    const m = Math.floor(days / 30);
    const d = days % 30;
    return d === 0 ? `${m} 个月` : `${m} 个月 ${d} 天`;
  }
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return m === 0 ? `${y} 岁` : `${y} 岁 ${m} 个月`;
}
function fmtDate(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function greetByHour() {
  const h = new Date().getHours();
  if (h < 6)  return '深夜好，';
  if (h < 11) return '早安，';
  if (h < 14) return '中午好，';
  if (h < 18) return '下午好，';
  if (h < 22) return '晚上好，';
  return '夜深了，';
}

function showToast(msg, ms = 1800) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), ms);
}

/* ============ 持久化 ============ */
function loadProfile() {
  try {
    const raw = localStorage.getItem(LS_PROFILE);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}
function saveProfile(p) {
  localStorage.setItem(LS_PROFILE, JSON.stringify(p));
  state.profile = p;
}
function loadRecords() {
  try {
    const raw = localStorage.getItem(LS_RECORDS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}
function saveRecords(list) {
  localStorage.setItem(LS_RECORDS, JSON.stringify(list));
  state.records = list;
}

/* ====================================================================
 *  自定义组件：底部抽屉 Sheet
 * ==================================================================== */
function openSheet(html) {
  $('#sheetContent').innerHTML = html;
  $('#sheet').classList.remove('hidden');
  history.pushState({ sheet: true }, '');
}
function closeSheet() {
  $('#sheet').classList.add('hidden');
  $('#sheetContent').innerHTML = '';
  state.pendingPhotos = [];
  // 如果这次关闭是被 popstate 触发的，history 已经回退一格，不要再 back()
  if (!closeSheet._skipBack) history.back();
}
closeSheet._skipBack = false;
$('#sheet').addEventListener('click', e => {
  if (e.target.matches('[data-close], .sheet-mask')) closeSheet();
});

/* ====================================================================
 *  自定义组件：全屏弹层 Modal
 * ==================================================================== */
function openModal(html) {
  $('#modalContent').innerHTML = html;
  $('#modal').classList.remove('hidden');
  history.pushState({ modal: true }, '');
}
function closeModal() {
  $('#modal').classList.add('hidden');
  $('#modalContent').innerHTML = '';
  if (!closeModal._skipBack) history.back();
}
closeModal._skipBack = false;
$('#modal').addEventListener('click', e => {
  if (e.target.matches('[data-close], .modal-mask')) closeModal();
});

// Android 系统返回 / WebView 边缘返回手势 → 关掉最上层的 sheet/modal
window.addEventListener('popstate', () => {
  if (!$('#sheet').classList.contains('hidden')) {
    closeSheet._skipBack = true;
    closeSheet();
    closeSheet._skipBack = false;
  } else if (!$('#modal').classList.contains('hidden')) {
    closeModal._skipBack = true;
    closeModal();
    closeModal._skipBack = false;
  }
});

/* ====================================================================
 *  自定义组件：DatePicker（三级日期选择）
 * ==================================================================== */
const DatePicker = {
  // 当前选中值（YYYY-MM-DD）
  value: null,
  // 当前展示的月份
  viewYear: 0,
  viewMonth: 0, // 0-11
  onConfirm: null,

  open(initialValue, onConfirm) {
    const today = new Date();
    const init = initialValue ? new Date(initialValue) : today;
    this.value = initialValue || fmtDate(today);
    this.viewYear = init.getFullYear();
    this.viewMonth = init.getMonth();
    this.onConfirm = onConfirm;
    this.render();
    openModal(this.containerHTML());
    this.renderCalendar();
  },

  containerHTML() {
    return `
      <div class="dp">
        <div class="dp-header">
          <button class="dp-close" data-close aria-label="关闭">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div class="dp-title">选择日期</div>
        </div>
        <div class="dp-month-bar">
          <button class="dp-nav" id="dpPrev" aria-label="上一月">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div class="dp-year-month">
            <button class="dp-ym" id="dpYearBtn">${this.viewYear}年</button>
            <button class="dp-ym" id="dpMonthBtn">${this.viewMonth + 1}月</button>
          </div>
          <button class="dp-nav" id="dpNext" aria-label="下一月">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
        <div class="dp-weekdays">
          <span>日</span><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span>
        </div>
        <div class="dp-grid" id="dpGrid"></div>
        <div class="dp-quick">
          <button class="dp-quick-btn" data-quick="today">今天</button>
          <button class="dp-quick-btn" data-quick="week">一周前</button>
          <button class="dp-quick-btn" data-quick="month">一个月前</button>
          <button class="dp-quick-btn" data-quick="year">一年前</button>
        </div>
        <div class="dp-footer">
          <button class="secondary-btn" data-close>取消</button>
          <button class="primary-btn" id="dpConfirm">确认</button>
        </div>
      </div>
    `;
  },

  render() {
    if (!$('#dpGrid')) return;
    const grid = $('#dpGrid');
    const year = this.viewYear;
    const month = this.viewMonth; // 0-11
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const selected = this.value ? new Date(this.value) : null;
    const todayStr_ = fmtDate(today);

    // 计算 max / min 范围
    const minDate = new Date(2000, 0, 1);
    const maxDate = new Date(); // 不能选未来

    const cells = [];
    // 前置空格（用上个月日期填充）
    const prevDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevDays - i, out: true });
    }
    // 当月
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, out: false });
    }
    // 后置空格
    const remain = (7 - cells.length % 7) % 7;
    for (let i = 1; i <= remain; i++) {
      cells.push({ day: i, out: true });
    }

    grid.innerHTML = cells.map(c => {
      if (c.out) {
        return `<div class="dp-cell dim">${c.day}</div>`;
      }
      const date = new Date(year, month, c.day);
      const dateStr = fmtDate(date);
      const isToday = dateStr === todayStr_;
      const isSelected = dateStr === this.value;
      const isFuture = date > maxDate;
      const cls = ['dp-cell'];
      if (isToday) cls.push('today');
      if (isSelected) cls.push('selected');
      if (isFuture) cls.push('disabled');
      return `<button class="${cls.join(' ')}" data-date="${dateStr}" ${isFuture ? 'disabled' : ''}>${c.day}</button>`;
    }).join('');

    // 更新月份标题
    const yearBtn = $('#dpYearBtn');
    const monthBtn = $('#dpMonthBtn');
    if (yearBtn) yearBtn.textContent = `${this.viewYear}年`;
    if (monthBtn) monthBtn.textContent = `${this.viewMonth + 1}月`;

    // 绑定事件
    grid.onclick = e => {
      const btn = e.target.closest('[data-date]');
      if (!btn || btn.disabled) return;
      this.value = btn.dataset.date;
      this.renderCalendar();
      // 选中即自动确认（更流畅）
      setTimeout(() => this.confirm(), 200);
    };

    const prev = $('#dpPrev');
    const next = $('#dpNext');
    if (prev) prev.onclick = () => this.shiftMonth(-1);
    if (next) next.onclick = () => this.shiftMonth(1);

    const yb = $('#dpYearBtn');
    const mb = $('#dpMonthBtn');
    if (yb) yb.onclick = () => this.showYearPicker();
    if (mb) mb.onclick = () => this.showMonthPicker();

    $$('.dp-quick-btn').forEach(b => {
      b.onclick = () => this.quickPick(b.dataset.quick);
    });

    const cf = $('#dpConfirm');
    if (cf) cf.onclick = () => this.confirm();
  },

  renderCalendar() {
    this.render();
  },

  shiftMonth(delta) {
    let m = this.viewMonth + delta;
    let y = this.viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    this.viewYear = y;
    this.viewMonth = m;
    this.render();
  },

  showYearPicker() {
    const cur = this.viewYear;
    const years = [];
    for (let y = cur - 5; y <= cur + 5; y++) years.push(y);
    const today = new Date().getFullYear();
    const html = `
      <div class="dp">
        <div class="dp-header">
          <button class="dp-close" data-close>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div class="dp-title">选择年份</div>
        </div>
        <div class="dp-year-grid">
          ${years.map(y => `<button class="dp-year-btn ${y === cur ? 'active' : ''}" data-y="${y}">${y}${y === today ? ' · 今年' : ''}</button>`).join('')}
        </div>
      </div>
    `;
    $('#modalContent').innerHTML = html;
    $$('.dp-year-btn').forEach(b => b.onclick = () => {
      this.viewYear = +b.dataset.y;
      $('#modalContent').innerHTML = this.containerHTML();
      this.render();
    });
  },

  showMonthPicker() {
    const months = ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'];
    const html = `
      <div class="dp">
        <div class="dp-header">
          <button class="dp-close" data-close>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div class="dp-title">选择月份</div>
        </div>
        <div class="dp-month-grid">
          ${months.map((name, i) => `<button class="dp-month-btn ${i === this.viewMonth ? 'active' : ''}" data-m="${i}">${name}</button>`).join('')}
        </div>
      </div>
    `;
    $('#modalContent').innerHTML = html;
    $$('.dp-month-btn').forEach(b => b.onclick = () => {
      this.viewMonth = +b.dataset.m;
      $('#modalContent').innerHTML = this.containerHTML();
      this.render();
    });
  },

  quickPick(key) {
    const today = new Date();
    let d = new Date(today);
    if (key === 'today') { /* d 已经是今天 */ }
    else if (key === 'week') d.setDate(d.getDate() - 7);
    else if (key === 'month') d.setMonth(d.getMonth() - 1);
    else if (key === 'year') d.setFullYear(d.getFullYear() - 1);
    this.value = fmtDate(d);
    this.viewYear = d.getFullYear();
    this.viewMonth = d.getMonth();
    this.render();
  },

  confirm() {
    if (!this.value) {
      this.value = fmtDate(new Date());
    }
    if (this.onConfirm) this.onConfirm(this.value);
    closeModal();
  },
};

/* ====================================================================
 *  自定义组件：BreedPicker（品种选择器：模糊搜索 + 在线补充）
 * ==================================================================== */
const BreedPicker = {
  query: '',
  results: [],
  onlineResults: [],
  loading: false,
  onlineError: null,
  selectedSci: null,
  onConfirm: null,

  open(initial, onConfirm) {
    this.query = '';
    this.selectedSci = initial?.sci || null;
    this.onConfirm = onConfirm;
    this.results = window.searchBreeds('');
    this.onlineResults = [];
    this.onlineError = null;
    this.loading = false;
    openModal(this.containerHTML());
    // ⚠️ 必须在 openModal 之后调用 render，否则 #bpList 等元素不存在
    this.render();
    setTimeout(() => $('#breedSearchInput')?.focus(), 300);
  },

  containerHTML() {
    return `
      <div class="bp">
        <div class="bp-header">
          <button class="dp-close" data-close>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div class="bp-title">选择品种</div>
        </div>
        <div class="bp-search-bar">
          <svg class="bp-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="search" id="breedSearchInput" class="bp-search-input" placeholder="搜索品种名 / 学名 / 别名..." autocomplete="off" />
        </div>
        <div class="bp-list" id="bpList"></div>
        <div class="bp-footer">
          <span class="bp-hint">💡 试试搜 "金渐层" "英短" "布偶"</span>
        </div>
      </div>
    `;
  },

  renderList() {
    const list = $('#bpList');
    if (!list) return;
    const items = [];

    // 本地结果
    if (this.results.length) {
      items.push(`<div class="bp-section-title">本地品种库</div>`);
      items.push(this.results.map(it => this.itemHTML(it, false)).join(''));
    }
    // 在线结果
    if (this.onlineResults.length) {
      items.push(`<div class="bp-section-title">在线搜索结果</div>`);
      items.push(this.onlineResults.map(it => this.itemHTML(it, true)).join(''));
    }
    // 空状态
    if (!this.results.length && !this.onlineResults.length) {
      items.push(`
        <div class="bp-empty">
          <div class="emoji">🔍</div>
          <div>没有匹配的品种</div>
          <button class="secondary-btn" id="bpOnlineBtn">在线搜索 "${this.query}"</button>
        </div>
      `);
    } else if (this.query.trim() && !this.loading && !this.onlineResults.length && !this.onlineError) {
      items.push(`
        <div class="bp-online-cta">
          <button class="secondary-btn" id="bpOnlineBtn">
            🌐 在线搜索更多 "${this.query}"
          </button>
        </div>
      `);
    }
    if (this.loading) {
      items.push(`<div class="bp-loading">搜索中…</div>`);
    }
    if (this.onlineError) {
      items.push(`<div class="bp-error">在线搜索失败：${this.onlineError}<br><small>本地已展示基础品种</small></div>`);
    }
    list.innerHTML = items.join('');
    this.bindListEvents();
  },

  itemHTML(it, online) {
    const selected = this.selectedSci && this.selectedSci === it.sci;
    return `
      <button class="bp-item ${selected ? 'selected' : ''}" data-name="${escapeHtml(it.n)}" data-sci="${escapeHtml(it.sci)}">
        <div class="bp-item-main">
          <div class="bp-item-name">${escapeHtml(it.n)}</div>
          <div class="bp-item-sci">${escapeHtml(it.sci)}${it.origin ? ' · ' + escapeHtml(it.origin) : ''}</div>
          ${it.intro ? `<div class="bp-item-intro">${escapeHtml(it.intro)}</div>` : ''}
        </div>
        ${online ? '<span class="bp-item-badge">在线</span>' : ''}
        ${selected ? '<span class="bp-item-check">✓</span>' : ''}
      </button>
    `;
  },

  bindListEvents() {
    $$('.bp-item').forEach(b => {
      b.onclick = () => this.pick(b.dataset.name, b.dataset.sci);
    });
    const ob = $('#bpOnlineBtn');
    if (ob) ob.onclick = () => this.searchOnline();
  },

  pick(name, sci) {
    this.selectedSci = sci;
    if (this.onConfirm) this.onConfirm({ name, sci });
    closeModal();
  },

  async searchOnline() {
    if (!this.query.trim() || this.loading) return;
    this.loading = true;
    this.renderList();
    const r = await window.searchBreedsOnline(this.query, 8);
    this.loading = false;
    if (r && r.error) {
      this.onlineError = r.error;
    } else {
      this.onlineResults = r || [];
    }
    this.renderList();
  },

  render() {
    if (!$('#breedSearchInput')) return;
    $('#breedSearchInput').value = this.query;
    this.renderList();

    const input = $('#breedSearchInput');
    if (input) {
      input.oninput = e => {
        this.query = e.target.value;
        this.results = window.searchBreeds(this.query);
        // 输入时清空之前的在线结果（避免混淆）
        this.onlineResults = [];
        this.onlineError = null;
        this.renderList();
      };
      input.onkeydown = e => {
        if (e.key === 'Enter' && this.query.trim()) {
          this.searchOnline();
        }
      };
    }
  },
};

/* ====================================================================
 *  渲染
 * ==================================================================== */
function renderAll() {
  renderTopbar();
  renderHome();
  renderTimeline();
  renderLookbook();
  renderProfileForm();
  Assistant.render();
}

function renderTopbar() {
  const p = state.profile;
  $('#topbarName').textContent = p?.name || '小喵';
  $('#topbarGreet').firstChild.textContent = greetByHour();
  $('#topbarDays').textContent = p?.birthDate ? ageText(p.birthDate) : '—';
}

async function renderHome() {
  const p = state.profile;

  const heroImg = $('#heroPhoto');
  const heroEmpty = heroImg.querySelector('.hero-photo-empty');
  if (p?.avatarPhotoId) {
    try {
      const blob = await dbGetPhoto(p.avatarPhotoId);
      if (blob) {
        if (!heroImg.querySelector('img')) {
          heroImg.insertAdjacentHTML('afterbegin', '<img alt="" />');
        }
        const img = heroImg.querySelector('img');
        img.src = URL.createObjectURL(blob);
        heroEmpty.style.display = 'none';
      } else {
        heroEmpty.style.display = '';
        heroImg.querySelector('img')?.remove();
      }
    } catch {
      heroEmpty.style.display = '';
      heroImg.querySelector('img')?.remove();
    }
  } else {
    heroEmpty.style.display = '';
    heroImg.querySelector('img')?.remove();
  }

  $('#heroName').textContent = p?.name || '小喵';
  $('#heroBreed').textContent = p?.breed || '尚未设置';
  $('#heroAge').textContent = p?.birthDate ? ageText(p.birthDate) : '—';

  $('#statDays').textContent = p?.birthDate ? daysBetween(p.birthDate, new Date()) : '—';
  $('#statRecords').textContent = state.records.length;
  const lastW = [...state.records].reverse().find(r => r.type === 'weight');
  $('#statWeight').textContent = lastW ? fmtKgNum(lastW.value) : '—';

  const photoCount = state.records.reduce((s, r) => s + (r.photos?.length || 0), 0);
  $('#statPhotos').textContent = photoCount;

  // 体重趋势图
  renderWeightChart();

  // 疫苗 / 驱虫到期提醒
  renderVaccineReminder();

  // 浮动 + 按钮
  ensureFab();

  // 最近 5 条
  const recent = $('#recentRecords');
  const items = [...state.records].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  if (items.length === 0) {
    recent.innerHTML = `
      <div class="recent-empty">
        <div class="emoji">📝</div>
        <div>还没有记录</div>
        <div style="margin-top:4px;font-size:11px;color:var(--text-muted)">点下面的按钮记下第一笔吧～</div>
      </div>
    `;
  } else {
    recent.innerHTML = items.map(r => {
      const t = RECORD_TYPES[r.type] || RECORD_TYPES.life;
      return `
        <div class="recent-item">
          <div class="recent-ico" style="background:${t.color};color:${t.textColor}">${t.emoji}</div>
          <div class="recent-main">
            <div class="recent-title">${escapeHtml(r.title || t.label)}${r.value ? ` · ${r.type === 'weight' ? escapeHtml(fmtKg(r.value)) : escapeHtml(r.value)}` : ''}</div>
            <div class="recent-meta">${fmtDateTime(r.createdAt)} · ${escapeHtml((r.note || '').slice(0, 30))}</div>
          </div>
          <span class="recent-arrow">›</span>
        </div>
      `;
    }).join('');
  }
}

/* ====================================================================
 *  体重趋势图（纯 canvas，无依赖）
 * ==================================================================== */
function renderWeightChart() {
  const host = $('#weightChart');
  if (!host) return;
  const items = state.records
    .filter(r => r.type === 'weight' && r.value)
    .map(r => ({ t: new Date(r.createdAt).getTime(), w: parseFloat(r.value) }))
    .filter(x => !isNaN(x.w))
    .sort((a, b) => a.t - b.t);

  if (items.length === 0) {
    host.innerHTML = `
      <div class="weight-chart">
        <div class="weight-chart-head">
          <div class="weight-chart-title">📊 体重趋势</div>
        </div>
        <div style="text-align:center;color:#9a7a5a;font-size:13px;padding:20px 0">
          还没有体重记录<br>
          <small style="font-size:11px;opacity:.7">在"记录 → 体重"添加后会显示在这里</small>
        </div>
      </div>`;
    return;
  }

  const latest = items[items.length - 1];
  const min = Math.min(...items.map(x => x.w));
  const max = Math.max(...items.map(x => x.w));
  const pad = (max - min) * 0.15 || 0.2;
  const yMin = min - pad;
  const yMax = max + pad;

  host.innerHTML = `
    <div class="weight-chart">
      <div class="weight-chart-head">
        <div class="weight-chart-title">📊 体重趋势</div>
        <div class="weight-chart-now">${fmtKgNum(latest.w)}<small>kg</small></div>
      </div>
      <canvas class="weight-chart-canvas" width="600" height="240"></canvas>
      <div class="weight-chart-stats">
        <span>最高 <b>${fmtKgNum(max)}</b>kg</span>
        <span>最低 <b>${fmtKgNum(min)}</b>kg</span>
        <span>共 <b>${items.length}</b> 次</span>
      </div>
    </div>`;

  // 画图
  const canvas = host.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth * dpr;
  const H = canvas.clientHeight * dpr;
  canvas.width = W; canvas.height = H;
  ctx.scale(dpr, dpr);
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const padL = 28, padR = 8, padT = 10, padB = 18;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const xOf = t => padL + (items.length === 1 ? innerW / 2 :
    ((t - items[0].t) / (items[items.length - 1].t - items[0].t)) * innerW);
  const yOf = v => padT + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  // 网格
  ctx.strokeStyle = '#fbe8d4';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padT + (i / 4) * innerH;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.fillStyle = '#9a7a5a';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    const v = yMax - (i / 4) * (yMax - yMin);
    ctx.fillText(fmtKgNum(v), padL - 4, y + 3);
  }

  // 填充区域
  if (items.length > 1) {
    ctx.fillStyle = 'rgba(255, 154, 60, .15)';
    ctx.beginPath();
    ctx.moveTo(xOf(items[0].t), yOf(items[0].w));
    items.forEach(p => ctx.lineTo(xOf(p.t), yOf(p.w)));
    ctx.lineTo(xOf(items[items.length - 1].t), padT + innerH);
    ctx.lineTo(xOf(items[0].t), padT + innerH);
    ctx.closePath();
    ctx.fill();
  }

  // 折线
  ctx.strokeStyle = '#ff9a3c';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  items.forEach((p, i) => {
    const x = xOf(p.t), y = yOf(p.w);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // 圆点 + 最新点高亮
  items.forEach((p, i) => {
    const x = xOf(p.t), y = yOf(p.w);
    const isLast = i === items.length - 1;
    ctx.fillStyle = isLast ? '#ff7a18' : '#fff';
    ctx.beginPath(); ctx.arc(x, y, isLast ? 5 : 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff9a3c';
    ctx.lineWidth = isLast ? 3 : 2;
    ctx.stroke();
  });
}

/* ====================================================================
 *  疫苗 / 驱虫到期提醒
 *  优先级：3 天内 → 红色 urgent；14 天内 → 橙色；超过忽略
 * ==================================================================== */
function renderVaccineReminder() {
  const host = $('#vaccineReminder');
  if (!host) return;
  const p = state.profile;
  if (!p) { host.innerHTML = ''; return; }

  const reminders = [];
  const now = new Date();
  const dayDiff = (d) => Math.ceil((new Date(d) - now) / 86400000);

  if (p.lastVaccineDate) {
    const d = dayDiff(p.nextVaccineDate ||
      new Date(new Date(p.lastVaccineDate).getTime() + 365 * 86400000));
    reminders.push({ icon: '💉', name: '疫苗', days: d, date: p.nextVaccineDate });
  }
  if (p.lastDewormDate) {
    const d = dayDiff(p.nextDewormDate ||
      new Date(new Date(p.lastDewormDate).getTime() + 90 * 86400000));
    reminders.push({ icon: '🐛', name: '体内驱虫', days: d, date: p.nextDewormDate });
  }
  if (p.lastExternalDewormDate) {
    const d = dayDiff(p.nextExternalDewormDate ||
      new Date(new Date(p.lastExternalDewormDate).getTime() + 30 * 86400000));
    reminders.push({ icon: '🪲', name: '体外驱虫', days: d, date: p.nextExternalDewormDate });
  }

  const upcoming = reminders
    .filter(r => r.days <= 14)
    .sort((a, b) => a.days - b.days);

  if (upcoming.length === 0) {
    host.innerHTML = '';
    return;
  }

  host.innerHTML = upcoming.map(r => {
    const urgent = r.days <= 3;
    const txt = r.days < 0
      ? `<b>${r.icon} ${r.name}已逾期 ${-r.days} 天</b>`
      : r.days === 0
        ? `<b>${r.icon} ${r.name}今天到期</b>`
        : `<b>${r.icon} ${r.name}还有 ${r.days} 天</b>`;
    return `
      <div class="vaccine-banner${urgent ? ' urgent' : ''}" data-jump="vaccine">
        <div class="vaccine-banner-text">
          ${txt}
          <small>${r.date ? '到期日：' + r.date : '记得按时打疫苗/驱虫哦'}</small>
        </div>
        <button class="vaccine-banner-close" data-dismiss="vaccine">×</button>
      </div>`;
  }).join('');

  host.querySelectorAll('.vaccine-banner').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.matches('[data-dismiss]')) return;
      switchTab('settings');
      setTimeout(() => openProfileSheet(), 300);
    });
    el.querySelector('[data-dismiss]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      el.style.display = 'none';
    });
  });
}

/* ====================================================================
 *  浮动 + 按钮（4 种快捷记录）
 * ==================================================================== */
function ensureFab() {
  // 只检查自己创建的 fab-home；timeline 静态的 #fabAdd 也是 .fab，不能误判
  if (document.querySelector('.fab-home')) return;
  const fab = document.createElement('button');
  fab.className = 'fab fab-home';
  fab.setAttribute('aria-label', '快速记录');
  fab.textContent = '＋';
  const menu = document.createElement('div');
  menu.className = 'fab-menu';
  const items = [
    { label: '喂食', emoji: '🍽', type: 'feed' },
    { label: '排便', emoji: '💩', type: 'poop' },
    { label: '体重', emoji: '⚖️', type: 'weight' },
    { label: '健康', emoji: '💊', type: 'health' },
  ];
  menu.innerHTML = items.map(i =>
    `<div class="fab-menu-item" data-type="${i.type}">
       <span class="label">${i.label}</span>
       <div class="circle">${i.emoji}</div>
     </div>`
  ).join('');
  document.body.appendChild(fab);
  document.body.appendChild(menu);

  let open = false;
  const toggle = () => {
    open = !open;
    menu.classList.toggle('open', open);
    fab.textContent = open ? '×' : '＋';
  };
  fab.addEventListener('click', toggle);
  menu.querySelectorAll('.fab-menu-item').forEach(el => {
    el.addEventListener('click', () => {
      open = false;
      menu.classList.remove('open');
      fab.textContent = '＋';
      openRecordSheet(el.dataset.type);
    });
  });

  updateFabVisibility();
}

// 控制两个 FAB 的可见性：
//   home 页 → 显示 .fab-home（带菜单），隐藏 #fabAdd（timeline 的）
//   timeline 页 → 显示 #fabAdd，隐藏 .fab-home
//   其他页 → 都不显示（settings/assistant/相册 都没有 + 按钮）
function updateFabVisibility() {
  const isHome = state.currentPage === 'home';
  const fabHome = document.querySelector('.fab-home');
  const fabTimeline = document.getElementById('fabAdd');
  if (fabHome) fabHome.style.display = isHome ? 'flex' : 'none';
  if (fabTimeline) fabTimeline.style.display = isHome ? 'none' : '';
}

function renderTimeline() {
  const list = $('#timelineList');
  const filter = state.currentFilter;
  const filtered = filter === 'all' ? state.records : state.records.filter(r => r.type === filter);
  const sorted = [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (sorted.length === 0) {
    list.innerHTML = `
      <div class="recent-empty" style="margin-top:40px">
        <div class="emoji">📖</div>
        <div>还没有记录</div>
        <div style="margin-top:4px;font-size:11px;color:var(--text-muted)">点右下角 ＋ 添加</div>
      </div>
    `;
    return;
  }

  const groups = {};
  sorted.forEach(r => {
    const day = r.createdAt.slice(0, 10);
    if (!groups[day]) groups[day] = [];
    groups[day].push(r);
  });
  const days = Object.keys(groups).sort().reverse();

  list.innerHTML = days.map(day => {
    const ageLine = state.profile?.birthDate
      ? `<span class="day-age">${ageText(state.profile.birthDate)}</span>`
      : '';
    return `
      <div class="timeline-day">
        <div class="day-head">
          <h3>${day}</h3>
          ${ageLine}
          <span class="day-count">${groups[day].length} 条</span>
        </div>
        <div class="day-items">
          ${groups[day].map(r => renderTimelineItem(r)).join('')}
        </div>
      </div>
    `;
  }).join('');

  sorted.forEach(async r => {
    if (r.photos && r.photos.length) {
      for (const pid of r.photos) {
        const imgEl = list.querySelector(`img[data-pid="${pid}"]`);
        if (!imgEl) continue;
        try {
          const blob = await dbGetPhoto(pid);
          if (blob) imgEl.src = URL.createObjectURL(blob);
        } catch {}
      }
    }
  });
}

function renderTimelineItem(r) {
  const t = RECORD_TYPES[r.type] || RECORD_TYPES.life;
  const photosHtml = (r.photos && r.photos.length)
    ? `<div class="tl-photos">${r.photos.map(pid => `<img data-pid="${pid}" alt="" />`).join('')}</div>`
    : '';
  return `
    <div class="tl-card" data-rid="${r.id}">
      <div class="tl-ico" style="background:${t.color};color:${t.textColor}">${t.emoji}</div>
      <div class="tl-main">
        <div class="tl-title">
          <span>${escapeHtml(r.title || t.label)}</span>
          ${r.value ? `<span class="tl-value">· ${r.type === 'weight' ? escapeHtml(fmtKg(r.value)) : escapeHtml(r.value)}</span>` : ''}
        </div>
        ${r.note ? `<div class="tl-desc">${escapeHtml(r.note)}</div>` : ''}
        ${photosHtml}
        <div class="tl-foot">
          <span>${fmtDateTime(r.createdAt)}</span>
          <button class="tl-del" data-del="${r.id}">删除</button>
        </div>
      </div>
    </div>
  `;
}

async function renderLookbook() {
  const grid = $('#lookbookGrid');
  const photos = state.records
    .filter(r => r.photos && r.photos.length)
    .flatMap(r => r.photos.map(pid => ({ pid, record: r })));

  $('#lookCount').textContent = photos.length;

  if (photos.length === 0) {
    grid.innerHTML = `
      <div class="recent-empty" style="grid-column:1/-1;margin-top:40px">
        <div class="emoji">📷</div>
        <div>还没有照片</div>
        <div style="margin-top:4px;font-size:11px;color:var(--text-muted)">点上方"添加"拍下第一张吧</div>
      </div>
    `;
    return;
  }

  photos.sort((a, b) => b.record.createdAt.localeCompare(a.record.createdAt));

  grid.innerHTML = photos.map(({ pid, record }) => `
    <div class="look-card">
      <img data-pid="${pid}" alt="" />
      <div class="look-overlay">
        <div class="look-age">${state.profile?.birthDate ? ageText(state.profile.birthDate) : ''}</div>
        <div class="look-date">${fmtDate(record.createdAt)} · ${(record.note || '').slice(0, 20)}</div>
      </div>
      <button class="look-del" data-del-pid="${pid}" data-del-rid="${record.id}">×</button>
    </div>
  `).join('');

  for (const { pid } of photos) {
    try {
      const blob = await dbGetPhoto(pid);
      if (!blob) continue;
      const imgEl = grid.querySelector(`img[data-pid="${pid}"]`);
      if (imgEl) imgEl.src = URL.createObjectURL(blob);
    } catch {}
  }
}

// 更新健康提醒 accordion 头部状态徽章
function updateHealthAccordionStatus() {
  const p = state.profile || {};
  const groups = {
    vaccine:  { last: 'lastVaccineDate',      next: 'nextVaccineDate' },
    deworm:   { last: 'lastDewormDate',       next: 'nextDewormDate' },
    extDeworm:{ last: 'lastExternalDewormDate', next: 'nextExternalDewormDate' },
  };
  Object.entries(groups).forEach(([key, fields]) => {
    const el = document.querySelector(`.acc-status[data-status="${key}"]`);
    if (!el) return;
    const next = p[fields.next];
    const last = p[fields.last];
    if (next) {
      el.textContent = '下次 ' + next;
      el.classList.add('has-value');
    } else if (last) {
      el.textContent = '上次 ' + last;
      el.classList.add('has-value');
    } else {
      el.textContent = '未设置';
      el.classList.remove('has-value');
    }
  });
}

function renderProfileForm() {
  const f = $('#profileForm');
  if (!f) return;
  const p = state.profile || {};

  f.name.value = p.name || '';

  // 品种 picker
  const bp = $('#breedPicker');
  if (p.breed) {
    bp.classList.add('has-value');
    bp.querySelector('.picker-text').textContent = p.breed;
    bp.querySelector('.picker-text').classList.remove('placeholder');
  } else {
    bp.classList.remove('has-value');
    bp.querySelector('.picker-text').textContent = '点击选择品种';
    bp.querySelector('.picker-text').classList.add('placeholder');
  }
  f.breed.value = p.breed || '';
  f.breedSci.value = p.breedSci || '';

  // 性别 segmented
  $$('#genderSeg button').forEach(b => b.classList.toggle('active', b.dataset.v === (p.gender || 'unknown')));
  f.gender.value = p.gender || 'unknown';

  // 日期 picker
  ['birthDate', 'adoptDate'].forEach(name => {
    const picker = $('#' + (name === 'birthDate' ? 'birthPicker' : 'adoptPicker'));
    const val = p[name];
    if (val) {
      picker.classList.add('has-value');
      picker.querySelector('.picker-text').textContent = fmtDate(val);
      picker.querySelector('.picker-text').classList.remove('placeholder');
    } else {
      picker.classList.remove('has-value');
      picker.querySelector('.picker-text').textContent = '点击选择';
      picker.querySelector('.picker-text').classList.add('placeholder');
    }
    f[name].value = val || '';
  });
}

/* ====================================================================
 *  助手模块：知识库 + AI 宠物医生
 * ==================================================================== */
const KB_CAT_COLORS = {
  '疾病': { bg: '#F5DCE6', fg: '#D85A8A', icon: '🤒' },
  '症状': { bg: '#FFE0CC', fg: '#E07B3A', icon: '🔍' },
  '护理': { bg: '#D6F0D2', fg: '#3D7B1F', icon: '🩺' },
  '营养': { bg: '#FFF1D6', fg: '#C9A058', icon: '🍗' },
  '行为': { bg: '#CFE7F5', fg: '#2D7AB0', icon: '🎯' },
  '紧急': { bg: '#FCE3E3', fg: '#E15555', icon: '🚨' },
};

const Assistant = {
  chatMode: false,
  history: [],
  loading: false,

  render() {
    if (this.chatMode) return; // 聊天模式不重渲染（保留输入状态）
    this.renderQuickList('');
  },

  renderQuickList(query) {
    const list = $('#kbQuickList');
    if (!list) return;
    let items;
    if (query && query.trim()) {
      items = window.searchKnowledge(query, 12);
      if (items.length === 0) {
        list.innerHTML = `
          <div class="recent-empty" style="grid-column:1/-1;padding:24px 12px">
            <div class="emoji">🤔</div>
            <div>知识库里没找到「${escapeHtml(query)}」相关</div>
            <div style="margin-top:6px;font-size:11px">试试问 AI 医生吧 ↓</div>
          </div>
        `;
        return;
      }
    } else {
      items = window.recommendKnowledge(8);
    }
    list.innerHTML = items.map(k => this.cardHTML(k)).join('');
    $$('#kbQuickList .kb-card').forEach(b => {
      b.onclick = () => this.openDetail(b.dataset.id);
    });
  },

  cardHTML(k) {
    const c = KB_CAT_COLORS[k.cat] || { bg: '#F0E1D5', fg: '#A8765A', icon: '📖' };
    const sevMark = k.needsVet ? `<span style="font-size:10px;background:var(--danger-bg);color:var(--danger);padding:1px 6px;border-radius:6px;font-weight:700;margin-left:auto">需就医</span>` : '';
    return `
      <button class="kb-card" data-id="${k.id}">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
          <div class="kb-card-ico" style="background:${c.bg};color:${c.fg}">${c.icon}</div>
          ${sevMark}
        </div>
        <div class="kb-card-title">${escapeHtml(k.title)}</div>
        <div class="kb-card-desc">${escapeHtml(k.desc)}</div>
        <div class="kb-card-cat">${escapeHtml(k.cat)}</div>
      </button>
    `;
  },

  openDetail(id) {
    const k = window.CAT_KNOWLEDGE.find(x => x.id === id);
    if (!k) return;
    const c = KB_CAT_COLORS[k.cat] || { icon: '📖' };
    const sevHtml = k.needsVet
      ? `<div class="kb-detail-cat" style="color:var(--danger)">⚠️ 建议尽快就医</div>`
      : '';
    const stepsHtml = k.steps.map(s => {
      const isWarn = /^(🚨|⚠️|❌|不能)/.test(s);
      return `<li class="${isWarn ? 'warn' : ''}">${escapeHtml(s)}</li>`;
    }).join('');
    openSheet(`
      <div class="kb-detail">
        <div class="kb-detail-head">
          <div class="kb-card-ico" style="background:${KB_CAT_COLORS[k.cat]?.bg || '#F0E1D5'};color:${KB_CAT_COLORS[k.cat]?.fg || '#A8765A'};font-size:24px">${c.icon}</div>
          <div>
            <div class="kb-detail-title">${escapeHtml(k.title)}</div>
            <div class="kb-detail-cat">${escapeHtml(k.cat)} · 严重程度 ${k.severity}/5</div>
            ${sevHtml}
          </div>
        </div>
        <div class="kb-detail-desc">${escapeHtml(k.desc)}</div>
        <h4 style="margin:0 0 8px;font-size:14px">📋 处理建议</h4>
        <ol class="kb-detail-steps">${stepsHtml}</ol>
        <div class="sheet-actions">
          <button class="secondary-btn" data-close>关闭</button>
          <button class="primary-btn" id="askAiFromKb">问 AI 医生</button>
        </div>
      </div>
    `);
    $('#askAiFromKb').onclick = () => {
      closeSheet();
      this.history.push({ role: 'assistant', content: `我看到你在了解「${k.title}」。如果想深入问，可以告诉我具体情况，比如症状持续时间、小猫年龄、近期的饮食和用药情况。` });
      this.enterChat();
    };
  },

  enterChat() {
    this.chatMode = true;
    const page = document.querySelector('.page[data-page="assistant"]');
    page.classList.add('chat-mode');
    this.mountChatUI();
    setTimeout(() => $('#chatInput')?.focus(), 100);
  },

  exitChat() {
    this.chatMode = false;
    const page = document.querySelector('.page[data-page="assistant"]');
    page.classList.remove('chat-mode');
    page.innerHTML = this.originalHTML();
    this.bindHomeEvents();
    this.renderQuickList($('#kbSearchInput')?.value || '');
  },

  originalHTML() {
    return `
      <div class="assistant-hero">
        <div class="assistant-hero-inner">
          <div class="assistant-avatar">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div class="assistant-greet">
            <div class="assistant-title">🐾 小喵健康顾问</div>
            <div class="assistant-sub">症状 / 用药 / 护理 / 行为 — 随时问我</div>
          </div>
        </div>
      </div>

      <div class="search-bar">
        <svg class="search-ico" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="search" id="kbSearchInput" class="search-input" placeholder="搜索养猫知识，比如：呕吐 / 猫癣 / 疫苗" autocomplete="off" />
      </div>

      <div class="section">
        <div class="section-head">
          <div class="section-title">📚 知识速查</div>
        </div>
        <div id="kbQuickList" class="kb-quick-grid"></div>
      </div>

      <div class="section">
        <div class="section-head">
          <div class="section-title">🤖 智能问答</div>
          <div class="section-tip">DeepSeek AI · 复杂问题问我</div>
        </div>
        <button class="ai-start-btn" id="aiStartBtn">
          <div class="ai-start-ico">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2"/>
              <circle cx="12" cy="5" r="2"/>
              <path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>
            </svg>
          </div>
          <div class="ai-start-text">
            <div class="ai-start-title">找 AI 宠物医生聊聊</div>
            <div class="ai-start-sub">回答不了的问题，这里可以详细咨询</div>
          </div>
          <span class="ai-start-arrow">›</span>
        </button>
      </div>
    `;
  },

  mountChatUI() {
    const page = document.querySelector('.page[data-page="assistant"]');
    page.innerHTML = `
      <div class="chat-page">
        <div class="chat-header">
          <button class="chat-header-back" id="chatBack" aria-label="返回">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div class="chat-header-info">
            <div class="chat-header-name">🐾 AI 宠物医生</div>
            <div class="chat-header-status">在线 · DeepSeek</div>
          </div>
          <button class="chat-clear" id="chatClear">清空</button>
        </div>
        <div class="chat-list" id="chatList"></div>
        <div class="chat-input-bar">
          <textarea class="chat-input" id="chatInput" rows="1" placeholder="描述小猫的情况…" maxlength="500"></textarea>
          <button class="chat-send" id="chatSend" aria-label="发送">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    this.bindChatEvents();
    this.renderMessages();
  },

  bindHomeEvents() {
    const sb = $('#aiStartBtn');
    if (sb) sb.onclick = () => this.enterChat();
    const input = $('#kbSearchInput');
    if (input) {
      input.oninput = e => this.renderQuickList(e.target.value);
    }
  },

  bindChatEvents() {
    $('#chatBack').onclick = () => this.exitChat();
    $('#chatClear').onclick = () => {
      if (!confirm('清空本次对话？')) return;
      this.history = [];
      this.renderMessages();
    };
    $('#chatSend').onclick = () => this.sendMessage();
    const input = $('#chatInput');
    input.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    };
    // 自适应高度
    input.oninput = () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
      $('#chatSend').disabled = !input.value.trim();
    };
    $('#chatSend').disabled = true;
  },

  renderMessages() {
    const list = $('#chatList');
    if (!list) return;
    if (this.history.length === 0) {
      list.innerHTML = `
        <div class="chat-welcome">
          <div class="emoji">🐾</div>
          <div class="chat-welcome-title">你好，我是你的 AI 宠物医生</div>
          <div class="chat-welcome-sub">描述小猫的症状、行为、饮食<br>任何养猫问题都可以问我</div>
          <div class="chat-quick-asks">
            <button data-q="小猫呕吐怎么办？">🤮 呕吐</button>
            <button data-q="猫咪不吃东西怎么办？">🍚 拒食</button>
            <button data-q="猫打喷嚏流鼻涕？">🤧 感冒</button>
            <button data-q="猫咪疫苗怎么打？">💉 疫苗</button>
            <button data-q="猫咪多久驱虫一次？">🪱 驱虫</button>
          </div>
          <div style="margin-top:14px;font-size:11px;color:var(--text-muted)">⚠️ AI 仅供参考，严重情况请及时就医</div>
        </div>
      `;
      $$('.chat-quick-asks button').forEach(b => {
        b.onclick = () => {
          $('#chatInput').value = b.dataset.q;
          $('#chatSend').disabled = false;
          this.sendMessage();
        };
      });
      return;
    }
    list.innerHTML = this.history.map(m => this.bubbleHTML(m)).join('');
    list.scrollTop = list.scrollHeight;
  },

  bubbleHTML(m) {
    if (m.content === '__TYPING__') {
      return `
        <div class="chat-bubble typing">
          <div class="chat-bubble-ico">🐾</div>
          <div class="chat-bubble-text"><span></span><span></span><span></span></div>
        </div>
      `;
    }
    if (m.role === 'user') {
      return `
        <div class="chat-bubble user">
          <div class="chat-bubble-ico">我</div>
          <div class="chat-bubble-text">${escapeHtml(m.content)}</div>
        </div>
      `;
    }
    return `
      <div class="chat-bubble">
        <div class="chat-bubble-ico">🐾</div>
        <div class="chat-bubble-text">${escapeHtml(m.content)}</div>
      </div>
    `;
  },

  async sendMessage() {
    const input = $('#chatInput');
    const text = input.value.trim();
    if (!text || this.loading) return;

    input.value = '';
    input.style.height = 'auto';
    $('#chatSend').disabled = true;

    this.history.push({ role: 'user', content: text });
    this.loading = true;
    this.history.push({ role: 'assistant', content: '__TYPING__' });
    this.renderMessages();

    try {
      const reply = await this.callDeepSeek(text);
      // 替换 typing
      this.history = this.history.filter(m => m.content !== '__TYPING__');
      this.history.push({ role: 'assistant', content: reply });
    } catch (e) {
      this.history = this.history.filter(m => m.content !== '__TYPING__');
      this.history.push({
        role: 'assistant',
        content: `抱歉，暂时连不上 AI 医生 😿\n\n错误：${e.message}\n\n请检查网络后重试。\n知识库内容仍可正常浏览。`,
      });
    }
    this.loading = false;
    this.renderMessages();
  },

  /* 紧急信号检测（借鉴 Codex PetCareKnowledge.urgentFor）
   * 命中时在 AI 回答顶部加一条红色警示，引导立即就医
   */
  URGENT_KEYWORDS: [
    '尿不出', '无尿', '排不出尿', '尿闭',
    '张口呼吸', '呼吸困难', '喘不上气', '喘',
    '抽搐', '抽筋', '痉挛', '昏迷', '晕倒', '休克',
    '无法站立', '站不起来', '瘫倒',
    '误食', '吞异物', '中毒', '中毒迹象',
    '血便', '便血', '黑便', '吐血', '呕血',
    '严重外伤', '大出血', '车祸', '摔伤',
    '持续呕吐', '频繁呕吐', '吐个不停',
  ],

  detectUrgent(text) {
    if (!text) return false;
    return this.URGENT_KEYWORDS.some(k => text.includes(k));
  },

  URGENT_BANNER: '⚠️ 你描述的情况可能是急症。请立即停止自行处理，联系最近的 24 小时宠物医院或急诊兽医。路上保持环境安静、保暖，避免应激。',

  async callDeepSeek(text) {
    const cleanHistory = this.history
      .filter(m => m.content !== '__TYPING__')
      .map(m => ({ role: m.role, content: m.content }));

    const isUrgent = this.detectUrgent(text);

    const sysMsg = {
      role: 'system',
      content: `你是中文养猫健康知识咨询助手，专门帮养猫人士整理观察要点、提供常识级照护建议。

严格边界：
- 不要声称自己是兽医，不要确诊，不要给药物剂量、处方或替代就医的方案
- 任何给主人的具体用药/剂量建议都拒绝，统一回复「用药需由兽医面诊后开具」
- 不要做影像学/化验单解读
- 遇到尿不出、呼吸费力/张口呼吸、抽搐、昏迷、严重外伤、误食毒物或异物、持续呕吐、黑便/血便等急症信号，必须在回答开头明确建议立即联系急诊兽医

回答风格：
- 用简洁中文，先给安全判断，再给可记录的观察要点和下一步
- 如果信息不足，礼貌询问：年龄、持续时间、次数、食欲、饮水、精神状态、已知接触物
- 末尾给一句温和提醒，但不重复用户问题`,
    };

    // 直接打绝对 URL（CF Pages Function），避开 Android WebView SW 注册失败的问题
    // server 端已配 Access-Control-Allow-Origin: *
    const res = await fetch('https://xiaomiao-toh.pages.dev/api/deepseek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: window.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [sysMsg, ...cleanHistory],
      }),
    });

    if (!res.ok) {
      let errDetail = '';
      try { errDetail = (await res.json()).error?.message || ''; } catch {}
      throw new Error(`API ${res.status}${errDetail ? ' · ' + errDetail : ''}`);
    }

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('返回为空');

    // 前置紧急横幅（前端保险，避免模型偶尔漏掉）
    if (isUrgent && !content.includes('急诊') && !content.includes('立即就医')) {
      content = `${this.URGENT_BANNER}\n\n${content}`;
    }
    return content;
  },
};

/* ====================================================================
 *  Sheet: 新增/编辑记录
 * ==================================================================== */
function openRecordSheet(presetType) {
  const typeOptions = Object.entries(RECORD_TYPES).map(([k, v]) =>
    `<button type="button" class="type-chip" data-type="${k}">${v.emoji} ${v.label}</button>`
  ).join('');

  openSheet(`
    <h3>添加记录</h3>
    <form id="recordForm" class="form">
      <div class="form-section">
        <div class="form-label">类型</div>
        <div class="type-grid" id="typeGrid">${typeOptions}</div>
      </div>
      <label class="field">
        <span class="field-label">标题（可留空）</span>
        <input type="text" name="title" placeholder="比如：早餐 / 益生菌" />
      </label>
      <label class="field" id="valueField">
        <span class="field-label">数值</span>
        <input type="text" name="value" placeholder="如 280g / 半片" />
      </label>
      <div class="form-row">
        <label class="field" style="flex:1">
          <span class="field-label">时间</span>
          <div class="field-picker" id="whenPicker">
            <span class="picker-text">${new Date().toLocaleString('zh-CN', { hour12: false })}</span>
            <span class="picker-arrow">›</span>
          </div>
        </label>
      </div>
      <label class="field">
        <span class="field-label">备注</span>
        <textarea name="note" rows="2" placeholder="观察到的行为、症状…"></textarea>
      </label>
      <div class="form-section">
        <div class="form-label">添加照片（可选）</div>
        <div class="photo-actions">
          <button type="button" class="photo-action" data-add-photo="camera">
            <span class="emoji">📷</span><span>拍照</span>
          </button>
          <button type="button" class="photo-action" data-add-photo="album">
            <span class="emoji">🖼️</span><span>相册</span>
          </button>
        </div>
        <div id="pendingPhotos" class="pending-photos"></div>
      </div>
      <div class="sheet-actions">
        <button type="button" class="secondary-btn" data-close>取消</button>
        <button type="submit" class="primary-btn">保存</button>
      </div>
    </form>
  `);

  // 默认选中类型
  const initialType = presetType || 'feed';
  selectType(initialType);

  $$('#typeGrid .type-chip').forEach(b => {
    b.onclick = () => selectType(b.dataset.type);
  });

  $('#whenPicker').onclick = () => {
    DatePicker.open(null, val => {
      // val 是 YYYY-MM-DD
      // 实际时间精确到分钟
      const now = new Date();
      const picked = new Date(val);
      picked.setHours(now.getHours(), now.getMinutes());
      $('#whenPicker .picker-text').textContent = picked.toLocaleString('zh-CN', { hour12: false });
      $('#whenPicker').dataset.iso = picked.toISOString();
    });
  };

  bindPhotoButtons();
  $('#recordForm').addEventListener('submit', onRecordSubmit);
}

function selectType(type) {
  $$('#typeGrid .type-chip').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  const t = RECORD_TYPES[type];
  const lbl = $('#valueField .field-label');
  if (type === 'weight') lbl.textContent = '体重 (g)';
  else if (type === 'medicine') lbl.textContent = '剂量';
  else if (type === 'feed') lbl.textContent = '喂食量';
  else lbl.textContent = '数值';
  $('#valueField input').placeholder =
    type === 'weight' ? '280' :
    type === 'medicine' ? '半片' :
    type === 'feed' ? '50g' : '可留空';
}

function bindPhotoButtons() {
  $('#sheet').addEventListener('click', e => {
    const act = e.target.closest('[data-add-photo]');
    if (!act) return;
    const mode = act.dataset.addPhoto;
    const input = mode === 'camera' ? $('#cameraInput') : $('#photoInput');
    input.value = '';
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) addPendingPhoto(f);
    };
    input.click();
  });
}

async function addPendingPhoto(file) {
  const compressed = await compressImage(file, 1280, 0.82);
  state.pendingPhotos.push(compressed);
  renderPendingPhotos();
}

function renderPendingPhotos() {
  const wrap = $('#pendingPhotos');
  if (!wrap) return;
  wrap.innerHTML = state.pendingPhotos.map((blob, i) =>
    `<div class="pending-photo"><img src="${URL.createObjectURL(blob)}" /><button type="button" class="pp-del" data-rm="${i}">×</button></div>`
  ).join('');
  $$('#pendingPhotos .pp-del').forEach(b => {
    b.onclick = () => {
      state.pendingPhotos.splice(+b.dataset.rm, 1);
      renderPendingPhotos();
    };
  });
}

async function compressImage(file, maxSize, quality) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });
  let w = img.width, h = img.height;
  if (w > maxSize || h > maxSize) {
    if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
    else { w = Math.round(w * maxSize / h); h = maxSize; }
  }
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return new Promise(res => canvas.toBlob(b => res(b), 'image/jpeg', quality));
}

async function onRecordSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const type = $('#typeGrid .type-chip.active')?.dataset.type || 'life';
  const when = $('#whenPicker').dataset.iso || nowStr();

  const photoIds = [];
  for (const blob of state.pendingPhotos) {
    const id = 'p_' + uid();
    await dbPutPhoto(id, blob);
    photoIds.push(id);
  }

  const rec = {
    id: 'r_' + uid(),
    type,
    title: form.title.value.trim(),
    value: form.value.value.trim(),
    note: form.note.value.trim(),
    createdAt: when,
    photos: photoIds,
  };
  saveRecords([...state.records, rec]);
  closeSheet();
  showToast('已记录 ✨');
  renderAll();
}

/* ====================================================================
 *  Sheet: 换形象照
 * ==================================================================== */
function openChangePhotoSheet() {
  openSheet(`
    <h3>更换形象照</h3>
    <p class="sheet-tip">形象照会显示在主页顶部。</p>
    <div class="photo-actions big">
      <button class="photo-action" data-add-photo="camera">
        <span class="emoji">📷</span><span>拍照</span>
      </button>
      <button class="photo-action" data-add-photo="album">
        <span class="emoji">🖼️</span><span>相册</span>
      </button>
    </div>
    <div id="pendingPhotos" class="pending-photos"></div>
    <div class="sheet-actions">
      <button class="secondary-btn" data-close>取消</button>
      <button class="primary-btn" id="confirmAvatar">设为形象照</button>
    </div>
  `);
  bindPhotoButtons();
  $('#confirmAvatar').onclick = async () => {
    if (state.pendingPhotos.length === 0) { showToast('请先选一张照片'); return; }
    const blob = state.pendingPhotos[0];
    const id = 'p_' + uid();
    await dbPutPhoto(id, blob);
    const p = { ...(state.profile || {}), avatarPhotoId: id };
    saveProfile(p);
    closeSheet();
    showToast('形象照已更新 📸');
    renderAll();
  };
}

/* ====================================================================
 *  Sheet: 拍照记录（形象相册添加）
 * ==================================================================== */
function openLookbookSheet() {
  openSheet(`
    <h3>添加形象照</h3>
    <div class="photo-actions big">
      <button class="photo-action" data-add-photo="camera">
        <span class="emoji">📷</span><span>拍照</span>
      </button>
      <button class="photo-action" data-add-photo="album">
        <span class="emoji">🖼️</span><span>相册</span>
      </button>
    </div>
    <div id="pendingPhotos" class="pending-photos"></div>
    <label class="field" style="margin-top:14px">
      <span class="field-label">拍摄日期</span>
      <div class="field-picker" id="lookDatePicker">
        <span class="picker-text">${todayStr()}</span>
        <span class="picker-arrow">›</span>
      </div>
    </label>
    <label class="field">
      <span class="field-label">备注</span>
      <input type="text" id="lookNote" placeholder="比如：第一次洗澡" />
    </label>
    <div class="sheet-actions">
      <button class="secondary-btn" data-close>取消</button>
      <button class="primary-btn" id="saveLook">保存</button>
    </div>
  `);
  bindPhotoButtons();

  let lookDate = todayStr();
  $('#lookDatePicker').onclick = () => {
    DatePicker.open(lookDate, val => {
      lookDate = val;
      $('#lookDatePicker .picker-text').textContent = val;
    });
  };

  $('#saveLook').onclick = async () => {
    if (state.pendingPhotos.length === 0) { showToast('请先选一张照片'); return; }
    const blob = state.pendingPhotos[0];
    const pid = 'p_' + uid();
    await dbPutPhoto(pid, blob);
    const rec = {
      id: 'r_' + uid(),
      type: 'life',
      title: '形象记录',
      note: $('#lookNote').value.trim(),
      createdAt: new Date(lookDate + 'T12:00:00').toISOString(),
      photos: [pid],
    };
    saveRecords([...state.records, rec]);
    closeSheet();
    showToast('形象照已保存 📸');
    renderAll();
  };
}

/* ====================================================================
 *  引导页
 * ==================================================================== */
function maybeOnboard() {
  if (state.profile) return;
  openSheet(`
    <div class="onboard">
      <div class="onboard-icon"><img src="icon.svg" alt="" /></div>
      <h3>🐱 欢迎使用小喵成长记</h3>
      <p class="sheet-tip">先告诉我们关于小猫的基本信息</p>
      <form id="onboardForm" class="form">
        <label class="field">
          <span class="field-label">小猫名字</span>
          <input type="text" name="name" required placeholder="给它起个名字" />
        </label>
        <label class="field">
          <span class="field-label">出生日期</span>
          <div class="field-picker" id="obBirthPicker">
            <span class="picker-text placeholder">点击选择</span>
            <span class="picker-arrow">›</span>
          </div>
          <input type="hidden" name="birthDate" />
        </label>
        <label class="field">
          <span class="field-label">品种（可后填）</span>
          <div class="field-picker" id="obBreedPicker">
            <span class="picker-text placeholder">点击选择品种</span>
            <span class="picker-arrow">›</span>
          </div>
          <input type="hidden" name="breed" />
          <input type="hidden" name="breedSci" />
        </label>
        <button type="submit" class="primary-btn block">
          开始记录 ✨
        </button>
      </form>
    </div>
  `);
  let birthDate = '';
  $('#obBirthPicker').onclick = () => {
    DatePicker.open(birthDate, val => {
      birthDate = val;
      $('#obBirthPicker .picker-text').textContent = val;
      $('#obBirthPicker .picker-text').classList.remove('placeholder');
      $('#obBirthPicker').classList.add('has-value');
    });
  };
  $('#obBreedPicker').onclick = () => {
    BreedPicker.open(null, ({ name, sci }) => {
      $('#obBreedPicker .picker-text').textContent = name;
      $('#obBreedPicker .picker-text').classList.remove('placeholder');
      $('#obBreedPicker').classList.add('has-value');
      $('#obBreedPicker').dataset.name = name;
      $('#obBreedPicker').dataset.sci = sci;
    });
  };

  $('#onboardForm').onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const p = {
      name: fd.get('name').trim() || '小喵',
      birthDate: birthDate,
      breed: $('#obBreedPicker').dataset.name || '',
      breedSci: $('#obBreedPicker').dataset.sci || '',
      gender: 'unknown',
      createdAt: nowStr(),
    };
    saveProfile(p);
    closeSheet();
    showToast(`欢迎，${p.name} 🐾`);
    renderAll();
  };
}

/* ====================================================================
 *  Tab 切换
 * ==================================================================== */
function switchTab(name) {
  state.currentPage = name;
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  $$('.page').forEach(p => {
    const active = p.dataset.page === name;
    if (active && !p.classList.contains('active')) {
      // 重新触发动画
      p.classList.add('active');
      p.style.animation = 'none';
      p.offsetHeight;
      p.style.animation = '';
    } else {
      p.classList.toggle('active', active);
    }
  });
  updateFabVisibility();
  if (name === 'home') renderHome();
  if (name === 'timeline') renderTimeline();
  if (name === 'lookbook') renderLookbook();
  if (name === 'settings') renderProfileForm();
  if (name === 'assistant') {
    // 切走再回来时重置 chatMode → 回主页
    if (Assistant.chatMode) {
      Assistant.chatMode = false;
      const page = document.querySelector('.page[data-page="assistant"]');
      page.classList.remove('chat-mode');
      page.innerHTML = Assistant.originalHTML();
      Assistant.bindHomeEvents();
    }
    Assistant.render();
  }
}

/* ====================================================================
 *  删除记录
 * ==================================================================== */
async function deleteRecord(id) {
  const r = state.records.find(x => x.id === id);
  if (!r) return;
  if (!confirm('确认删除这条记录？')) return;
  if (r.photos) for (const pid of r.photos) await dbDeletePhoto(pid);
  saveRecords(state.records.filter(x => x.id !== id));
  renderAll();
  showToast('已删除');
}

/* ====================================================================
 *  导入 / 导出 / 清空
 *  照片以 base64 内嵌，JSON 文件可直接备份到网盘 / 微信
 * ==================================================================== */
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
async function base64ToBlob(dataUrl) {
  const r = await fetch(dataUrl);
  return await r.blob();
}

async function exportData() {
  showToast('准备导出…');
  const photos = await dbGetAllPhotos();
  const photoOut = [];
  for (const p of photos) {
    if (!p || !p.id || !p.blob) continue;
    try {
      const dataUrl = await blobToBase64(p.blob);
      photoOut.push({ id: p.id, type: p.blob.type || 'image/jpeg', dataUrl });
    } catch {}
  }
  const data = {
    version: 2,
    exportedAt: nowStr(),
    app: 'xiaomiao',
    profile: state.profile,
    records: state.records,
    photos: photoOut,
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `xiaomiao-backup-${todayStr()}.json`;
  a.click();
  showToast(`已导出 ${state.records.length} 条记录、${photoOut.length} 张照片 📤`);
}
async function importData(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.records)) throw new Error('文件格式不对');
    const photoCount = Array.isArray(data.photos) ? data.photos.length : 0;
    if (!confirm(`检测到 ${data.records.length} 条记录、${photoCount} 张照片，确认导入？\n当前数据会被覆盖。`)) return;
    if (data.profile) saveProfile(data.profile);
    saveRecords(data.records);
    if (Array.isArray(data.photos)) {
      for (const p of data.photos) {
        if (p && p.id && p.dataUrl) {
          try {
            const blob = await base64ToBlob(p.dataUrl);
            await dbPutPhoto(p.id, blob);
          } catch {}
        }
      }
    }
    renderAll();
    showToast('导入完成 ✅');
  } catch (err) {
    showToast('导入失败：' + err.message);
  }
}
async function clearAll() {
  if (!confirm('⚠️ 真的要清空全部数据吗？')) return;
  if (!confirm('再次确认：所有记录和照片都会消失，确定吗？')) return;
  localStorage.removeItem(LS_PROFILE);
  localStorage.removeItem(LS_RECORDS);
  await dbClearAll();
  state.profile = null;
  state.records = [];
  renderAll();
  maybeOnboard();
  showToast('已清空');
}

/* ====================================================================
 *  事件绑定
 * ==================================================================== */
function bindEvents() {
  // 底栏
  $$('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

  // 顶栏
  $('#topbarSettings').addEventListener('click', () => switchTab('settings'));

  // 首页 - 换形象照
  $('#changePhotoBtn').addEventListener('click', e => {
    e.stopPropagation();
    openChangePhotoSheet();
  });
  $('#heroPhoto').addEventListener('click', () => openChangePhotoSheet());

  // 首页 - 快速按钮
  $$('.quick-btn').forEach(b => b.addEventListener('click', () => {
    openRecordSheet(b.dataset.action);
  }));

  // 首页 - stat 卡片点击跳转
  $$('.stat-card[data-jump]').forEach(card => {
    card.addEventListener('click', () => switchTab(card.dataset.jump));
  });

  // 设置页 - 立即检查更新
  const checkUpdateRow = $('#check-update-row');
  if (checkUpdateRow) {
    checkUpdateRow.addEventListener('click', () => {
      showToast('正在检查更新…', 1500);
      checkApkUpdateVerbose(true);
    });
  }

  // 时间线页
  $('#fabAdd').addEventListener('click', () => openRecordSheet());
  $('#filterTabs').addEventListener('click', e => {
    const t = e.target.closest('.chip');
    if (!t) return;
    $$('.chip').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    state.currentFilter = t.dataset.filter;
    renderTimeline();
  });
  $('#timelineList').addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    if (del) deleteRecord(del.dataset.del);
  });
  $('#gotoTimeline').addEventListener('click', () => switchTab('timeline'));

  // 形象页
  $('#addLookbookBtn').addEventListener('click', openLookbookSheet);
  $('#lookbookGrid').addEventListener('click', async e => {
    const del = e.target.closest('[data-del-pid]');
    if (!del) return;
    e.stopPropagation();
    const pid = del.dataset.delPid;
    const rid = del.dataset.delRid;
    if (!confirm('删除这张形象照？')) return;
    await dbDeletePhoto(pid);
    const rec = state.records.find(r => r.id === rid);
    if (rec) {
      rec.photos = rec.photos.filter(p => p !== pid);
      if (rec.photos.length === 0) {
        saveRecords(state.records.filter(r => r.id !== rid));
      } else {
        saveRecords(state.records);
      }
    }
    renderAll();
    showToast('已删除');
  });

  // 设置 - 品种 picker
  $('#breedPicker').addEventListener('click', () => {
    BreedPicker.open({ name: state.profile?.breed, sci: state.profile?.breedSci }, ({ name, sci }) => {
      const p = { ...(state.profile || {}), breed: name, breedSci: sci };
      saveProfile(p);
      renderProfileForm();
      renderAll();
      showToast(`品种已设为 ${name}`);
    });
  });

  // 设置 - 性别 segmented
  $('#genderSeg').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    $$('#genderSeg button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    $('#profileForm input[name="gender"]').value = b.dataset.v;
  });

  // 设置 - 出生日期 picker
  $('#birthPicker').addEventListener('click', () => {
    DatePicker.open(state.profile?.birthDate, val => {
      $('#profileForm input[name="birthDate"]').value = val;
      $('#birthPicker').classList.add('has-value');
      $('#birthPicker .picker-text').textContent = val;
      $('#birthPicker .picker-text').classList.remove('placeholder');
    });
  });

  // 设置 - 到家日期 picker
  $('#adoptPicker').addEventListener('click', () => {
    DatePicker.open(state.profile?.adoptDate, val => {
      $('#profileForm input[name="adoptDate"]').value = val;
      $('#adoptPicker').classList.add('has-value');
      $('#adoptPicker .picker-text').textContent = val;
      $('#adoptPicker .picker-text').classList.remove('placeholder');
    });
  });

  // 健康提醒 - 6 个 picker
  const healthPickers = [
    ['lastVaccinePicker', 'lastVaccineDate'],
    ['nextVaccinePicker', 'nextVaccineDate'],
    ['lastDewormPicker', 'lastDewormDate'],
    ['nextDewormPicker', 'nextDewormDate'],
    ['lastExtDewormPicker', 'lastExternalDewormDate'],
    ['nextExtDewormPicker', 'nextExternalDewormDate'],
  ];
  healthPickers.forEach(([pickerId, field]) => {
    const el = document.getElementById(pickerId);
    if (!el) return;
    el.addEventListener('click', () => {
      DatePicker.open(state.profile?.[field], val => {
        const form = $('#profileForm');
        form.querySelector(`input[name="${field}"]`).value = val;
        el.classList.add('has-value');
        el.querySelector('.picker-text').textContent = val;
        el.querySelector('.picker-text').classList.remove('placeholder');
        updateHealthAccordionStatus();
      });
    });
  });

  // 健康提醒 - 折叠交互
  $$('.accordion-head[data-target]').forEach(head => {
    head.addEventListener('click', () => {
      const target = head.dataset.target;
      const body = document.getElementById(target);
      if (!body) return;
      head.classList.toggle('open');
      body.classList.toggle('open');
    });
  });
  updateHealthAccordionStatus();

  // 设置 - 表单提交
  $('#profileForm').addEventListener('submit', e => {
    e.preventDefault();
    const p = {
      ...(state.profile || {}),
      name: e.target.name.value.trim(),
      breed: e.target.breed.value.trim(),
      breedSci: e.target.breedSci.value.trim(),
      gender: e.target.gender.value || 'unknown',
      birthDate: e.target.birthDate.value,
      adoptDate: e.target.adoptDate.value,
    };
    saveProfile(p);
    renderAll();
    showToast('已保存 ✅');
  });

  // 设置 - 数据管理
  $('#exportBtn').addEventListener('click', exportData);
  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', e => {
    const f = e.target.files?.[0];
    if (f) importData(f);
    e.target.value = '';
  });
  $('#clearBtn').addEventListener('click', clearAll);

  // 助手页
  Assistant.bindHomeEvents();
}

/* ====================================================================
 *  Service Worker：本地 APP 不再使用（避免覆盖安装后显示旧版本）
 *  启动时主动清理历史遗留的 SW + 缓存
 * ==================================================================== */
async function cleanupLegacySW() {
  // 用 localStorage 标记版本，避免每次都执行
  if (localStorage.getItem('xiaomiao.sw-cleaned-v2')) return false;
  let didClean = false;
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        try { await r.unregister(); didClean = true; } catch {}
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const k of keys) {
        try { await caches.delete(k); didClean = true; } catch {}
      }
    }
  } catch {}
  localStorage.setItem('xiaomiao.sw-cleaned-v2', '1');
  return didClean;
}

/* ====================================================================
 *  返回键 / 边缘滑动返回手势的统一入口
 *  （由 Android MainActivity.onBackPressed 通过 evaluateJavascript 调用）
 *
 *  返回 true  = 已处理，消费这次返回
 *  返回 false = 不处理，让原生 onBackPressed 走默认（退出 App）
 *
 *  层级返回逻辑（从最深层到最外层）：
 *    1. sheet 开着 → 关 sheet
 *    2. modal 开着 → 关 modal
 *    3. 助手 chat-mode → 退出 chat，回到助手主页
 *    4. timeline 有非 all filter → 重置为 all
 *    5. 当前不在首页 → 切回首页
 *    6. 在首页 → 第一次 toast 提示「再按一次退出」，第二次才退出
 * ==================================================================== */
let __backPressedOnce = false;
window.__xiaomiaoBack = function () {
  // 1. sheet
  const sheet = document.getElementById('sheet');
  if (sheet && !sheet.classList.contains('hidden')) {
    closeSheet._skipBack = true;
    closeSheet();
    closeSheet._skipBack = false;
    return true;
  }
  // 2. modal
  const modal = document.getElementById('modal');
  if (modal && !modal.classList.contains('hidden')) {
    closeModal._skipBack = true;
    closeModal();
    closeModal._skipBack = false;
    return true;
  }
  // 3. 助手 chat-mode
  if (typeof Assistant !== 'undefined' && Assistant.chatMode) {
    Assistant.chatMode = false;
    document.querySelector('.page[data-page="assistant"]')?.classList.remove('chat-mode');
    document.getElementById('chatInput')?.blur();
    showToast('已退出对话');
    return true;
  }
  // 4. timeline 非 all filter
  if (state.currentPage === 'timeline' && state.currentFilter && state.currentFilter !== 'all') {
    state.currentFilter = 'all';
    document.querySelectorAll('#filterTabs .chip').forEach(c => {
      c.classList.toggle('active', c.dataset.filter === 'all');
    });
    renderTimeline();
    return true;
  }
  // 5. 非首页 → 切回首页
  if (state.currentPage && state.currentPage !== 'home') {
    switchTab('home');
    return true;
  }
  // 6. 在首页 → 第一次 toast，第二次返回 false（退出 App）
  if (!__backPressedOnce) {
    __backPressedOnce = true;
    showToast('再按一次退出 App', 1800);
    setTimeout(() => { __backPressedOnce = false; }, 1800);
    return true;
  }
  return false;
};

/* ====================================================================
 *  启动
 * ==================================================================== */

/**
 * 检测 versionCode 变化：
 *  - 首次启动（没有 last-seen）→ 静默写入，不弹 toast
 *  - 升级（last-seen code < 当前 code）→ 弹 "🎉 已升级到 vX.Y.Z"
 *  - 关于页底部追加 "vX.Y.Z · 自动更新 · 已是最新" 标识
 */
function checkVersionUpgrade() {
  try {
    const lastVer  = getLastSeenVersion();
    const lastCode = getLastSeenVCode();
    const curCode  = APK_VERSION_CODE;

    const isFirstLaunch = lastVer === null || lastCode === null;
    const isUpgraded =
      !isFirstLaunch &&
      Number.isFinite(curCode) &&
      Number.isFinite(lastCode) &&
      curCode > lastCode;

    if (isUpgraded) {
      // 延迟一下，等 splash 淡出再弹，体验更顺
      setTimeout(() => showToast(`🎉 已升级到 ${APP_VERSION}`, 2400), 800);
    }

    // 无论是否升级，都刷新关于页状态 + 写入最新
    refreshAboutVerStatus();
    setLastSeen(APP_VERSION, curCode);
  } catch (e) {
    // 静默失败，不影响启动
    console.warn('checkVersionUpgrade:', e);
  }
}

/**
 * 关于页底部加 "vX.Y.Z · 自动更新 · 已是最新" 标识
 * - 不 hardcode 版本号，从 APP_VERSION 读取
 * - 用现成的 .about-ver 元素兜底（SW 缓存的旧 HTML 没有 status 元素）
 */
function refreshAboutVerStatus() {
  // 主显示：v2.2.7 · 自动更新
  const verEl = document.querySelector('.about-ver');
  if (verEl) verEl.textContent = `${APP_VERSION} · 自动更新`;

  // 状态徽章：已是最新
  let statusEl = document.getElementById('aboutVerStatus');
  if (!statusEl) {
    // 兜底：动态注入到 about-info 末尾
    const info = document.querySelector('.about-info');
    if (info) {
      statusEl = document.createElement('div');
      statusEl.id = 'aboutVerStatus';
      statusEl.className = 'about-ver-status';
      info.appendChild(statusEl);
    }
  }
  if (statusEl) {
    statusEl.textContent = `${APP_VERSION} · 自动更新 · 已是最新`;
    statusEl.classList.remove('hidden');
  }
}

async function boot() {
  // 清理旧 SW 缓存（必要时 reload 一次）
  const cleaned = await cleanupLegacySW();
  if (cleaned) {
    // 用 replace 避免留下历史记录
    location.replace(location.href.split('#')[0] + '?_=' + Date.now());
    return;
  }
  try {
    state.profile = loadProfile();
    state.records = loadRecords();
    bindEvents();

    // 强制覆盖版本号（防止 SW 缓存的旧 HTML 显示老版本）
    const verEl = document.querySelector('.about-ver');
    if (verEl) verEl.textContent = `${APP_VERSION} · 自动更新`;

    renderAll();
  } catch (err) {
    console.error('Boot error:', err);
    showToast('初始化失败：' + err.message);
  }
  // 版本变化检测（必须在 renderAll 之后，关于页 DOM 已就位）
  checkVersionUpgrade();
  // 无论是否抛错，splash 必须消失
  setTimeout(() => {
    $('#splash').classList.add('hidden');
    $('#app').classList.remove('hidden');
    const hash = (location.hash || '').replace('#', '');
    if (['home','timeline','lookbook','settings','assistant'].includes(hash)) switchTab(hash);
    else maybeOnboard();
  }, 600);

  // 启动后异步检查更新（不阻塞 UI）
  checkRemoteUpdate();
  checkApkUpdate();
}

/* ====================================================================
 *  远程版本检测（核心：让 APK 用户能收到推送的更新）
 *  每次启动对比 version.json 的 build 字段，比本地新就提示刷新
 * ==================================================================== */
const LOCAL_BUILD = 8;  // 与 www/version.json 同步
let remoteUpdateInfo = null;

async function checkRemoteUpdate() {
  try {
    const r = await fetch('version.json?_=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return;
    const info = await r.json();
    remoteUpdateInfo = info;
    const remoteBuild = info.build || 0;
    if (remoteBuild <= LOCAL_BUILD) return;

    // 弹一个明显的提示条
    const banner = document.createElement('div');
    banner.className = 'update-banner';
    banner.innerHTML = `
      <div class="update-banner-text">
        <strong>✨ ${info.version || '新版本'} 已就绪</strong>
        <span>${info.changelog || ''}</span>
      </div>
      <button class="update-banner-btn">立即更新</button>
      <button class="update-banner-close" aria-label="关闭">×</button>
    `;
    document.body.appendChild(banner);
    setTimeout(() => banner.classList.add('show'), 50);

    banner.querySelector('.update-banner-btn').addEventListener('click', () => {
      // 强制 SW 跳过等待 + 通知用户
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage('SKIP_WAITING');
      }
      // 强制刷新（绕过缓存）
      location.reload();
    });
    banner.querySelector('.update-banner-close').addEventListener('click', () => {
      banner.classList.remove('show');
      setTimeout(() => banner.remove(), 300);
    });
  } catch (e) {
    // 离线 / 没部署 / 跨域 → 静默忽略
  }
}

/* ====================================================================
 *  APK 版本检测
 *  App 内提示"有新版本可用"，用户点"立即更新"→ App 内下载 APK
 *  → 下载完成自动调起 Android 系统安装界面
 *
 *  ⚠️ 关键区别：
 *    - checkRemoteUpdate() 检测 web 资源更新（HTML/JS/CSS/SW）
 *    - checkApkUpdate() 检测原生 APK 更新（Java 改动、Gradle 配置）
 *
 *  配置：在 www/apk-version.json 里改 versionCode
 * ==================================================================== */
async function checkApkUpdate() {
  return checkApkUpdateVerbose(false);
}

/**
 * 详细版的检查更新：把每一步结果通过 toast 告知用户
 * 用于「立即检查更新」按钮的主动诊断
 */
async function checkApkUpdateVerbose(verbose) {
  const url = 'https://xiaomiao-toh.pages.dev/www/apk-version.json?_=' + Date.now();
  try {
    const r = await fetch(url, { cache: 'no-store', mode: 'cors' });
    if (!r.ok) {
      if (verbose) showToast(`❌ fetch 失败: HTTP ${r.status}`, 3000);
      return null;
    }
    const info = await r.json();
    if (verbose) {
      showToast(`📡 server: ${info.versionName} (v${info.versionCode}) · local: v${APK_VERSION_CODE}`, 3000);
    }
    if (!info.versionCode || info.versionCode <= APK_VERSION_CODE) {
      if (verbose) showToast('✅ 已经是最新版本', 2000);
      return info;
    }
    showApkUpdateBanner(info);
    if (verbose) showToast(`🆕 发现新版本 ${info.versionName}`, 2000);
    return info;
  } catch (e) {
    if (verbose) showToast(`❌ fetch 异常: ${e.message || e}`, 3000);
    return null;
  }
}

function showApkUpdateBanner(info) {
  // 避免重复弹
  if (document.getElementById('apk-update-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'apk-update-banner';
  banner.className = 'apk-update-banner';
  banner.innerHTML = `
    <div class="apk-update-text">
      <strong>📱 ${info.versionName || '新版本'} 已就绪</strong>
      <span>${info.changelog || '点击立即更新'}</span>
    </div>
    <button class="apk-update-btn">立即更新</button>
    <button class="apk-update-close" aria-label="关闭">×</button>
  `;
  document.body.appendChild(banner);
  setTimeout(() => banner.classList.add('show'), 50);

  banner.querySelector('.apk-update-btn').addEventListener('click', () => {
    showToast('开始下载 APK，下载完成后会自动调起安装', 2500);
    // 用 <a download> 触发 WebView 的下载监听（MainActivity 里接管 → DownloadManager）
    const a = document.createElement('a');
    a.href = info.downloadUrl;
    a.download = `xiaomiao-${info.versionName || 'update'}.apk`;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
  banner.querySelector('.apk-update-close').addEventListener('click', () => {
    banner.classList.remove('show');
    setTimeout(() => banner.remove(), 300);
  });
}

boot();