/* ============================================================
   js/detail-modal.js — Character Detail Modal
   Supports both Hanja (Korean) & Kanji (Japanese)
   Features Animated Stroke Order with HanziWriter
   ============================================================ */

/** Emoji fallback map for image keywords */
const emojiMap = {
  water: '💧', fire: '🔥', mountain: '⛰️', tree: '🌳', earth: '🌍',
  gold: '🥇', stone: '🪨', sky: '🌤️', rain: '🌧️', snow: '❄️',
  wind: '💨', cloud: '☁️', river: '🏞️', sea: '🌊', forest: '🌲',
  island: '🏝️', flower: '🌸', grass: '🌿', person: '🧑', woman: '👩',
  child: '👶', father: '👨', mother: '👩‍👧', horse: '🐴', cow: '🐄',
  sheep: '🐑', fish: '🐟', bird: '🐦', dog: '🐕', dragon: '🐲',
  tiger: '🐯', cat: '🐱', sun: '☀️', moon: '🌙', star: '⭐', field: '🌾',
  door: '🚪', gate: '⛩️', house: '🏠', temple: '🛕', village: '🏘️',
  city: '🏙️', road: '🛤️', king: '👑', heart: '❤️', hand: '✋',
  eye: '👁️', ear: '👂', mouth: '👄', power: '💪', strength: '💪',
  food: '🍚', rice: '🍚', tea: '🍵', drink: '🍶', clothes: '👘',
  car: '🚗', boat: '⛵', book: '📖', writing: '✍️', word: '💬',
  language: '🗣️', school: '🏫', study: '📚', number: '🔢', one: '1️⃣',
  two: '2️⃣', three: '3️⃣', four: '4️⃣', five: '5️⃣', six: '6️⃣',
  seven: '7️⃣', eight: '8️⃣', nine: '9️⃣', ten: '🔟', hundred: '💯',
  thousand: '🔢', big: '🔷', small: '🔹', long: '📏', short: '📐',
  high: '🗼', low: '⬇️', new: '✨', old: '🏛️', white: '⬜',
  black: '⬛', red: '🟥', blue: '🟦', green: '🟩', yellow: '🟨',
  bright: '🌟', dark: '🌑', heavy: '🏋️', light: '🪶', fast: '⚡',
  slow: '🐌', begin: '🏁', end: '🔚', enter: '🚪', exit: '🚶',
  up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️', middle: '🎯',
  inside: '📥', outside: '📤', front: '🔜', back: '🔙', north: '🧭',
  south: '🧭', east: '🌅', west: '🌇', spring: '🌸', summer: '☀️',
  autumn: '🍂', winter: '❄️', morning: '🌅', evening: '🌆', night: '🌃',
  day: '☀️', year: '📅', month: '🗓️', time: '⏰', life: '🌱',
  death: '💀', love: '💕', peace: '☮️', war: '⚔️', country: '🏳️',
  people: '👥', friend: '🤝', family: '👨‍👩‍👧‍👦', brother: '👦', sister: '👧',
  virtue: '✨', righteousness: '⚖️', propriety: '🙏', wisdom: '🧠',
  trust: '🤝', loyalty: '🛡️', filial: '💝', benevolence: '💗',
  truth: '💎', good: '👍', evil: '👎', park: '🌳', bridge: '🌉',
  palace: '🏯', castle: '🏯', building: '🏢', medicine: '💊',
  sleep: '😴', bank: '🏦', shell: '🐚', deer: '🦌', turtle: '🐢',
  gift: '🎁', reward: '🏆', profit: '📈', calculate: '🧮',
  order: '📊', help: '🤲', dream: '💭', sing: '🎤', art: '🎨',
  poem: '📝', music: '🎵', teach: '👨‍🏫', grow: '🌱', ask: '❓',
  answer: '💬', correct: '✅', rule: '📋', run: '🏃', walk: '🚶',
  stand: '🧍', sit: '🪑', return: '🔙', come: '🔜', go: '🚶',
  buy: '🛍️', sell: '🏷️', make: '🔨', stop: '🛑', listen: '👂',
  spirit: '⛩️', face: '😊', head: '🗣️', foot: '👣', body: '🧍'
};

function getEmoji(keyword) {
  if (!keyword) return '📝';
  const key = keyword.toLowerCase().trim();
  return emojiMap[key] || '📝';
}

const DetailModal = {

  /** @type {HTMLElement|null} */
  el: null,

  /** Current character data */
  current: null,

  /** HanziWriter instance */
  writer: null,

  /** Initialize modal */
  init() {
    this.el = document.getElementById('detail-modal');
    this.el.querySelector('.modal-close').addEventListener('click', () => this.close());
    this.el.querySelector('.modal-backdrop').addEventListener('click', () => this.close());
  },

  /**
   * Open the modal for a character
   * @param {Object} char — character data from json
   * @param {Object} allData — the full dataset (to resolve component chips)
   * @param {string} mode — 'hanja' or 'kanji'
   */
  open(char, allData, mode = 'hanja') {
    this.current = char;
    const sheet = this.el.querySelector('.modal-content');
    const isKanji = mode === 'kanji';
    const charSymbol = char.hanja || char.kanji;
    const isLearned = Storage.isLearned(char.id);
    const emoji = getEmoji(char.image_keyword);

    // Build components chips HTML
    let componentsHTML = '';
    if (char.components && char.components.length > 0) {
      const chips = char.components.map((comp) => {
        let compChar = null;
        if (allData && allData.branches) {
          for (const branch of allData.branches) {
            const found = branch.characters.find((c) => (c.id === comp || (c.hanja || c.kanji) === comp));
            if (found) { compChar = found; break; }
          }
        }
        if (compChar) {
          const sym = compChar.hanja || compChar.kanji;
          const read = compChar.reading || compChar.onyomi || '';
          return `<button class="component-chip" data-id="${compChar.id}">${sym} ${read}</button>`;
        }
        return `<span class="component-chip">${comp}</span>`;
      }).join('');

      const label = isKanji ? '構成要素 (Components)' : '구성 요소 (Components)';
      componentsHTML = `
        <div class="detail-section">
          <div class="detail-label">${label}</div>
          <div class="component-chips">${chips}</div>
        </div>`;
    }

    // Pronunciation & Meaning layout
    const readingLabel = isKanji ? '読み方 (Readings)' : '읽기 (Reading)';
    const meaningLabel = isKanji ? '意味 (Meaning)' : '뜻 (Meaning)';

    let readingVal = '';
    let meaningVal = '';
    if (isKanji) {
      readingVal = `
        <div class="readings-block">
          <div><span class="reading-badge on">音</span> ${char.onyomi || '-'}</div>
          <div><span class="reading-badge kun">訓</span> ${char.kunyomi || '-'}</div>
        </div>
      `;
      meaningVal = `${char.meaning_ja} <span class="detail-en">(${char.meaning_en})</span>`;
    } else {
      readingVal = `<span class="korean-reading">${char.reading}</span>`;
      meaningVal = `${char.meaning_kr} <span class="detail-en">(${char.meaning_en})</span>`;
    }

    // Example word & sentence
    const wordTitle = isKanji ? (char.example_word_reading || char.example_word) : char.example_word;
    const wordSub = isKanji ? char.example_word_meaning_ja : char.example_word_reading;
    const wordEn = char.example_word_meaning_en;

    const sentencePrimary = isKanji ? char.example_sentence_ja : char.example_sentence_kr;
    const sentenceReading = isKanji ? `<div class="detail-sentence-furigana">${char.example_sentence_reading || ''}</div>` : '';
    const sentenceEn = char.example_sentence_en;

    sheet.innerHTML = `
      <!-- Visual Card Area -->
      <div class="detail-hero-banner">
        <div class="hero-emoji">${emoji}</div>
        <div class="hero-keyword">${char.image_keyword}</div>
      </div>

      <!-- Character & Animated Stroke Order Box -->
      <div class="detail-char-container">
        <div class="stroke-display-box">
          <div id="character-writer-target" class="writer-target"></div>
        </div>
        <div class="stroke-controls">
          <div class="stroke-info-pill">
            <span>✏️ 획수 / 画数:</span> <strong>${char.strokes}획</strong>
          </div>
          <div class="stroke-btn-row">
            <button id="btn-animate-stroke" class="btn-stroke-act">▶️ 획순 애니메이션 (Animate)</button>
            <button id="btn-quiz-stroke" class="btn-stroke-act secondary">✍️ 직접 쓰기 (Quiz)</button>
          </div>
        </div>
      </div>

      <!-- Readings & Meanings Grid -->
      <div class="detail-grid">
        <div class="detail-section">
          <div class="detail-label">${readingLabel}</div>
          <div class="detail-value">${readingVal}</div>
        </div>
        <div class="detail-section">
          <div class="detail-label">${meaningLabel}</div>
          <div class="detail-value">${meaningVal}</div>
        </div>
      </div>

      ${componentsHTML}

      <!-- Vocabulary Example -->
      <div class="detail-section">
        <div class="detail-label">${isKanji ? '熟語・単語例 (Example Word)' : '단어 예시 (Example Word)'}</div>
        <div class="detail-value detail-example-word">
          <strong>${char.example_word}</strong>
          <span class="detail-reading">${wordSub}</span>
          <span class="detail-en">${wordEn}</span>
        </div>
      </div>

      <!-- Sentence Example -->
      <div class="detail-section">
        <div class="detail-label">${isKanji ? '例文 (Example Sentence)' : '예문 (Example Sentence)'}</div>
        <div class="detail-value detail-sentence">
          <div class="detail-sentence-primary">${sentencePrimary}</div>
          ${sentenceReading}
          <div class="detail-sentence-en">${sentenceEn}</div>
        </div>
      </div>

      <!-- Toggle Learned Button -->
      <button class="btn-learned ${isLearned ? 'is-learned' : ''}" id="btn-toggle-learned">
        ${isLearned ? '✅ 학습 완료 (Learned)' : (isKanji ? '📖 学習済みにする (Mark as Learned)' : '📖 학습 완료로 표시 (Mark as Learned)')}
      </button>
    `;

    // Initialize Animated Stroke Order using HanziWriter
    this._initStrokeWriter(charSymbol);

    // Toggle learned event
    sheet.querySelector('#btn-toggle-learned').addEventListener('click', () => {
      this._toggleLearned(char);
    });

    // Component chip clicks
    sheet.querySelectorAll('.component-chip[data-id]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const compId = chip.dataset.id;
        let compChar = null;
        for (const branch of allData.branches) {
          compChar = branch.characters.find((c) => c.id === compId);
          if (compChar) break;
        }
        if (compChar) {
          this.open(compChar, allData, mode);
        }
      });
    });

    // Show modal
    this.el.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  /** Initialize interactive stroke writer */
  _initStrokeWriter(charSymbol) {
    const target = document.getElementById('character-writer-target');
    if (!target) return;
    target.innerHTML = '';

    if (typeof HanziWriter !== 'undefined') {
      try {
        this.writer = HanziWriter.create('character-writer-target', charSymbol, {
          width: 120,
          height: 120,
          padding: 8,
          showOutline: true,
          strokeAnimationSpeed: 1.2,
          delayBetweenStrokes: 150,
          strokeColor: '#c53030', // Warm crimson / vermilion
          outlineColor: '#dfd8cc', // Soft parchment gray
          drawingColor: '#2b3a4a'
        });

        // Auto animate first time
        this.writer.animateCharacter();

        // Control buttons
        const animateBtn = document.getElementById('btn-animate-stroke');
        if (animateBtn) {
          animateBtn.addEventListener('click', () => {
            if (this.writer) this.writer.animateCharacter();
          });
        }

        const quizBtn = document.getElementById('btn-quiz-stroke');
        if (quizBtn) {
          quizBtn.addEventListener('click', () => {
            if (this.writer) {
              this.writer.quiz({
                onComplete: () => {
                  alert('🎉 완벽합니다! (Well done!)');
                }
              });
            }
          });
        }
      } catch (e) {
        this._fallbackStrokeDisplay(target, charSymbol);
      }
    } else {
      this._fallbackStrokeDisplay(target, charSymbol);
    }
  },

  /** Fallback static large font display if HanziWriter CDN is not available */
  _fallbackStrokeDisplay(target, charSymbol) {
    target.innerHTML = `<div class="static-char-symbol">${charSymbol}</div>`;
  },

  /** Close the modal */
  close() {
    this.el.classList.remove('active');
    document.body.style.overflow = '';
    this.current = null;
    this.writer = null;
  },

  /** Toggle learned state */
  _toggleLearned(char) {
    const btn = this.el.querySelector('#btn-toggle-learned');
    const isKanji = Storage.currentMode === 'kanji';

    if (Storage.isLearned(char.id)) {
      Storage.unmarkLearned(char.id);
      btn.classList.remove('is-learned');
      btn.textContent = isKanji ? '📖 学習済みにする (Mark as Learned)' : '📖 학습 완료로 표시 (Mark as Learned)';
    } else {
      Storage.markLearned(char.id);
      btn.classList.add('is-learned');
      btn.textContent = '✅ 학습 완료 (Learned)';
    }

    if (typeof TreeView !== 'undefined' && TreeView.refreshNodeStates) {
      TreeView.refreshNodeStates();
    }
    if (typeof App !== 'undefined' && App.updateHeaderStats) {
      App.updateHeaderStats();
    }
  }
};
