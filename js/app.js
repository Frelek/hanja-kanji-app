/* ============================================================
   js/app.js — Main Application Controller & Router
   Supports Language Switching (🇰🇷 한자 <-> 🇯🇵 漢字)
   ============================================================ */

const App = {
  /** Cached datasets */
  dataHanja: null,
  dataKanji: null,

  /** Active data reference */
  data: null,

  /** Current active language mode ('hanja' | 'kanji') */
  currentMode: 'hanja',

  /** Currently active view ID ('tree', 'test', 'settings') */
  currentView: 'tree',

  /** Initialize the application */
  async init() {
    try {
      this._registerServiceWorker();

      // Restore saved language mode
      this.currentMode = Storage.getMode();

      // Pre-load both Hanja & Kanji datasets
      const [resHanja, resKanji] = await Promise.all([
        fetch('./data/hanja.json').then(r => r.json()),
        fetch('./data/kanji.json').then(r => r.json())
      ]);

      this.dataHanja = resHanja;
      this.dataKanji = resKanji;

      this.data = this.currentMode === 'kanji' ? this.dataKanji : this.dataHanja;

      // Initialize UI modules
      DetailModal.init();
      TreeView.init(this.data);
      TestMode.init(this.data);
      this._initSettings();

      // Navigation & routing
      this._initNavigation();
      this._initLanguageSwitcher();
      this._handleRoute();

      // Initial stats render in header
      this.updateHeaderStats();

      // Listen for hash changes
      window.addEventListener('hashchange', () => this._handleRoute());

    } catch (err) {
      console.error('App init failed:', err);
      const main = document.querySelector('.main-content');
      if (main) {
        main.innerHTML = `
          <div style="padding: 40px 20px; text-align: center; color: #c53030;">
            <h2>⚠️ 데이터를 불러오지 못했습니다.</h2>
            <p style="margin-top: 10px; color: #635c54;">${err.message}</p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #c53030; color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">다시 시도 (Retry)</button>
          </div>
        `;
      }
    }
  },

  /** Switch language between 'hanja' and 'kanji' */
  setLanguage(mode) {
    if (this.currentMode === mode) return;

    this.currentMode = mode;
    Storage.setMode(mode);

    this.data = mode === 'kanji' ? this.dataKanji : this.dataHanja;

    // Update UI toggle buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === mode);
    });

    // Update header brand text
    const brandTitle = document.querySelector('.brand-title');
    const brandBadge = document.querySelector('.brand-badge');
    const brandIcon = document.querySelector('.brand-icon');

    if (mode === 'kanji') {
      if (brandTitle) brandTitle.innerHTML = '漢字学習 <span class="brand-badge">260+</span>';
      if (brandIcon) brandIcon.textContent = '字';
    } else {
      if (brandTitle) brandTitle.innerHTML = '한자 학습 <span class="brand-badge">280+</span>';
      if (brandIcon) brandIcon.textContent = '漢';
    }

    // Refresh tree and test mode with new dataset
    TreeView.updateData(this.data);
    TestMode.updateData(this.data);

    if (this.currentView === 'test') {
      TestMode.activate();
    }

    this.updateHeaderStats();
    if (this.currentView === 'settings') {
      this._renderSettings();
    }
  },

  /** Initialize upper right language switcher */
  _initLanguageSwitcher() {
    const switcher = document.querySelector('.lang-switcher');
    if (!switcher) return;

    // Set initial active state
    switcher.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === this.currentMode);
      btn.addEventListener('click', () => {
        this.setLanguage(btn.dataset.lang);
      });
    });
  },

  /** Switch between views ('tree', 'test', 'settings') */
  navigateTo(view) {
    if (this.currentView === view) return;
    window.location.hash = `#${view}`;
  },

  /** Route handler based on window.location.hash */
  _handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'tree';
    const validViews = ['tree', 'test', 'settings'];
    const targetView = validViews.includes(hash) ? hash : 'tree';

    this.currentView = targetView;

    // Toggle active view sections
    document.querySelectorAll('.view-section').forEach((section) => {
      section.classList.remove('active');
    });
    const targetSection = document.getElementById(`${targetView}-view`);
    if (targetSection) {
      targetSection.classList.add('active');
    }

    // Toggle active tabs in bottom navigation
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.view === targetView);
    });

    // View-specific activation
    if (targetView === 'test') {
      TestMode.activate();
    } else if (targetView === 'tree') {
      TreeView.refreshNodeStates();
    } else if (targetView === 'settings') {
      this._renderSettings();
    }

    this.updateHeaderStats();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /** Initialize bottom navigation event listeners */
  _initNavigation() {
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const view = tab.dataset.view;
        this.navigateTo(view);
      });
    });
  },

  /** Update header stats counters (learned count, streak) */
  updateHeaderStats() {
    const learnedSet = Storage.getLearnedSet();
    const stats = Storage.getStats();

    const learnedEl = document.getElementById('stat-learned-count');
    if (learnedEl) {
      learnedEl.textContent = `${learnedSet.size}字`;
    }

    const streakEl = document.getElementById('stat-streak-count');
    if (streakEl) {
      streakEl.textContent = `${stats.streak}日`;
    }
  },

  /** Settings module init */
  _initSettings() {
    const resetBtn = document.getElementById('btn-reset-data');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const isKanji = this.currentMode === 'kanji';
        const msg = isKanji 
          ? '現在の言語の学習データを初期化しますか？\nReset learning progress for current language?'
          : '모든 학습 데이터와 복습 기록을 초기화하시겠습니까?\nReset learning progress?';

        if (confirm(msg)) {
          localStorage.removeItem(`${this.currentMode}_learned`);
          localStorage.removeItem(`${this.currentMode}_srs_cards`);
          localStorage.removeItem(`${this.currentMode}_stats`);
          this.updateHeaderStats();
          TreeView.render();
          alert('초기화되었습니다. (Reset complete)');
          this.navigateTo('tree');
        }
      });
    }
  },

  /** Render settings values dynamically */
  _renderSettings() {
    const learnedSet = Storage.getLearnedSet();
    const stats = Storage.getStats();
    const totalChars = this.data ? this.data.branches.reduce((sum, b) => sum + b.characters.length, 0) : 0;

    const countEl = document.getElementById('setting-total-learned');
    if (countEl) {
      countEl.textContent = `${learnedSet.size} / ${totalChars}`;
    }

    const reviewEl = document.getElementById('setting-total-reviews');
    if (reviewEl) {
      reviewEl.textContent = `${stats.totalReviews}회 (Times)`;
    }

    const streakEl = document.getElementById('setting-current-streak');
    if (streakEl) {
      streakEl.textContent = `${stats.streak}일 연속 (Streak)`;
    }
  },

  /** Register Progressive Web App Service Worker */
  _registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => console.log('ServiceWorker registered:', reg.scope))
          .catch((err) => console.warn('ServiceWorker registration skipped:', err));
      });
    }
  }
};

// Bootstrap application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
