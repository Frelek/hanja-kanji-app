/* ============================================================
   js/storage.js — localStorage abstraction for Hanja & Kanji Learner
   Supports language switching ('hanja' | 'kanji')
   ============================================================ */

const Storage = {

  /** Current active language mode */
  currentMode: 'hanja',

  /** Set current mode ('hanja' | 'kanji') */
  setMode(mode) {
    this.currentMode = mode;
    localStorage.setItem('hk_active_mode', mode);
  },

  /** Get active mode, default 'hanja' */
  getMode() {
    return localStorage.getItem('hk_active_mode') || 'hanja';
  },

  /* ---------- Learned Characters (Mode-Scoped) ---------- */

  /** @returns {Set<string>} IDs of learned characters */
  getLearnedSet() {
    try {
      const key = `${this.currentMode}_learned`;
      const raw = localStorage.getItem(key);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  },

  /** Mark a character as learned and create its initial SRS entry */
  markLearned(id) {
    const set = this.getLearnedSet();
    set.add(id);
    const key = `${this.currentMode}_learned`;
    localStorage.setItem(key, JSON.stringify([...set]));

    // Create initial SRS card if it doesn't exist
    if (!this.getCardState(id)) {
      this.setCardState(id, {
        interval: 0,
        repetition: 0,
        efactor: 2.5,
        dueDate: new Date().toISOString()
      });
    }
  },

  /** Unmark a character and remove its SRS entry */
  unmarkLearned(id) {
    const set = this.getLearnedSet();
    set.delete(id);
    const key = `${this.currentMode}_learned`;
    localStorage.setItem(key, JSON.stringify([...set]));

    // Remove SRS card
    const cards = this.getAllCardStates();
    delete cards[id];
    localStorage.setItem(`${this.currentMode}_srs_cards`, JSON.stringify(cards));
  },

  /** Check if a character has been learned */
  isLearned(id) {
    return this.getLearnedSet().has(id);
  },

  /* ---------- SRS Card States (Mode-Scoped) ---------- */

  /** Get the SRS state for a single character */
  getCardState(id) {
    const cards = this.getAllCardStates();
    return cards[id] || null;
  },

  /** Save SRS state for a character */
  setCardState(id, state) {
    const cards = this.getAllCardStates();
    cards[id] = state;
    localStorage.setItem(`${this.currentMode}_srs_cards`, JSON.stringify(cards));
  },

  /** @returns {Object} all SRS states keyed by character ID */
  getAllCardStates() {
    try {
      const key = `${this.currentMode}_srs_cards`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  /**
   * Filter characters that are due for review (dueDate <= now).
   * @param {Array} allCharacters flat array of character objects
   * @returns {Array} characters due for review, sorted oldest-due first
   */
  getDueCards(allCharacters) {
    const cards = this.getAllCardStates();
    const now = new Date();

    return allCharacters
      .filter((ch) => {
        const state = cards[ch.id];
        if (!state) return false;
        return new Date(state.dueDate) <= now;
      })
      .sort((a, b) => {
        const da = new Date(cards[a.id].dueDate);
        const db = new Date(cards[b.id].dueDate);
        return da - db;
      });
  },

  /* ---------- Settings ---------- */

  /** @returns {Object} user settings with defaults */
  getSettings() {
    const defaults = {
      showEnglish: true,
      showExamples: true,
      dailyGoal: 10
    };
    try {
      const raw = localStorage.getItem('hk_settings');
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
      return defaults;
    }
  },

  /** Save user settings */
  setSettings(settings) {
    localStorage.setItem('hk_settings', JSON.stringify(settings));
  },

  /* ---------- Stats (Mode-Scoped) ---------- */

  /** @returns {{ totalReviews: number, streak: number, lastReviewDate: string|null }} */
  getStats() {
    const defaults = { totalReviews: 0, streak: 0, lastReviewDate: null };
    try {
      const key = `${this.currentMode}_stats`;
      const raw = localStorage.getItem(key);
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
      return defaults;
    }
  },

  /** Increment review count and update streak */
  incrementReviews() {
    const stats = this.getStats();
    stats.totalReviews++;

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (stats.lastReviewDate === yesterday) {
      stats.streak++;
    } else if (stats.lastReviewDate !== today) {
      stats.streak = 1;
    }
    stats.lastReviewDate = today;

    const key = `${this.currentMode}_stats`;
    localStorage.setItem(key, JSON.stringify(stats));
  }
};
