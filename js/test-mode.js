/* ============================================================
   js/test-mode.js — Anki-Style Spaced Repetition Test Mode
   Supports both Hanja (Korean) & Kanji (Japanese)
   ============================================================ */

const TestMode = {

  /** Container element */
  el: null,

  /** Full data reference */
  data: null,

  /** Current review queue */
  queue: [],

  /** Index into the current queue */
  currentIndex: 0,

  /** Whether the current card's answer is revealed */
  answerRevealed: false,

  /** Session stats */
  sessionStats: { reviewed: 0, correct: 0 },

  /** Active category when in category-specific quiz mode */
  currentCategory: null,

  /** Flag to prevent hashchange routing from overriding category quiz */
  isCategoryMode: false,

  /** Initialize test mode */
  init(data) {
    this.data = data;
    this.el = document.getElementById('test-view');
  },

  /** Update data source on language toggle */
  updateData(newData) {
    this.data = newData;
  },

  /**
   * Start a quiz for a specific category/branch.
   * Only includes characters in this branch that are MARKED AS LEARNED.
   * @param {Object} branch The category branch object
   */
  startCategoryQuiz(branch) {
    this.currentCategory = branch;
    this.isCategoryMode = true;
    this.sessionStats = { reviewed: 0, correct: 0 };
    this.currentIndex = 0;
    this.answerRevealed = false;

    // Filter strictly to learned characters in this category
    const learnedInBranch = branch.characters.filter((c) => Storage.isLearned(c.id));
    this.queue = [...learnedInBranch].sort(() => Math.random() - 0.5);

    App.navigateTo('test');
    this.render();
  },

  /** Called when the test tab becomes active */
  activate(forceGeneral = false) {
    if (this.isCategoryMode && this.currentCategory && !forceGeneral) {
      this.isCategoryMode = false;
      this.render();
      return;
    }

    this.currentCategory = null;
    this.isCategoryMode = false;
    this.sessionStats = { reviewed: 0, correct: 0 };
    this.currentIndex = 0;
    this.answerRevealed = false;

    // Gather all characters from all branches
    const allChars = this.data.branches.flatMap((b) => b.characters);

    // CRITICAL: Quiz should take ONLY things learned and marked as learned!
    const learnedChars = allChars.filter((c) => Storage.isLearned(c.id));

    if (learnedChars.length === 0) {
      this.queue = [];
    } else {
      // Get due cards among learned characters
      const due = Storage.getDueCards(learnedChars);
      this.queue = due.length > 0 ? due : [...learnedChars].sort(() => Math.random() - 0.5);
    }

    this.render();
  },

  /** Render the entire test view */
  render() {
    const isKanji = Storage.currentMode === 'kanji';

    // No cards due
    if (this.queue.length === 0) {
      this._renderEmpty(isKanji);
      return;
    }

    // Session complete
    if (this.currentIndex >= this.queue.length) {
      this._renderComplete(isKanji);
      return;
    }

    const char = this.queue[this.currentIndex];
    const stats = Storage.getStats();
    const cardState = Storage.getCardState(char.id) || { interval: 0, repetition: 0, efactor: 2.5 };

    // Calculate preview intervals for each rating
    const previewIntervals = [0, 1, 2, 3].map((grade) => {
      const result = this._sm2Preview(cardState, grade);
      return this._formatInterval(result.interval);
    });

    const emoji = getEmoji(char.image_keyword);
    const progress = this.queue.length > 0 ? ((this.currentIndex) / this.queue.length * 100) : 0;
    const charSymbol = char.hanja || char.kanji;

    const promptText = isKanji ? 'この漢字の意味と読みは？' : '이 한자의 뜻과 읽기는?';
    const reading = isKanji 
      ? `音: ${char.onyomi || '-'} / 訓: ${char.kunyomi || '-'}`
      : `${char.reading}`;
    const meaning = isKanji
      ? `${char.meaning_ja} <span class="card-back-en">(${char.meaning_en})</span>`
      : `${char.meaning_kr} <span class="card-back-en">(${char.meaning_en})</span>`;
    
    const word = char.example_word;
    const wordReading = isKanji ? (char.example_word_reading || '') : char.example_word_reading;
    const wordMeaning = char.example_word_meaning_en;

    const sentence = isKanji ? char.example_sentence_ja : char.example_sentence_kr;
    const sentenceReading = isKanji && char.example_sentence_reading ? `<div class="card-sentence-furigana">${char.example_sentence_reading}</div>` : '';
    const sentenceEn = char.example_sentence_en;

    const remainLabel = isKanji ? `残り ${this.queue.length - this.currentIndex}枚` : `${this.queue.length - this.currentIndex} 남음`;
    const streakLabel = isKanji ? `🔥 ${stats.streak}日連続` : `🔥 ${stats.streak}일 연속`;

    let categoryBannerHTML = '';
    if (this.currentCategory) {
      const catLabel = isKanji ? (this.currentCategory.name_ja || this.currentCategory.name_kr) : this.currentCategory.name_kr;
      categoryBannerHTML = `
        <div class="category-quiz-banner">
          <button class="btn-quiz-back" id="btn-quiz-back">← ${isKanji ? 'ツリーへ戻る' : '트리로 돌아가기'}</button>
          <div class="category-quiz-info">
            <span class="category-quiz-icon">${this.currentCategory.icon}</span>
            <span class="category-quiz-name">${catLabel}</span>
            <span class="category-quiz-tag">${isKanji ? 'カテゴリーテスト' : '카테고리 퀴즈'}</span>
          </div>
        </div>
      `;
    }

    // Example word formatting:
    // In Japanese, write pure kana right below the Kanji example word
    let exampleWordHTML = '';
    if (isKanji) {
      const pureKana = char.example_word_kana || (char.example_word_reading ? char.example_word_reading.split('(')[0].trim() : '');
      exampleWordHTML = `
        <div class="card-example-word-box">
          <strong class="example-kanji-title">${word}</strong>
          <div class="card-example-kana">かな: <span class="kana-pure">${pureKana}</span></div>
          <div class="card-example-reading">${char.example_word_meaning_ja || wordReading}</div>
          <div class="card-example-meaning">${wordMeaning}</div>
        </div>
      `;
    } else {
      exampleWordHTML = `
        <div class="card-example-word-box">
          <strong class="example-kanji-title">${word}</strong>
          <span class="card-example-reading">${wordReading}</span>
          <div class="card-example-meaning">${wordMeaning}</div>
        </div>
      `;
    }

    this.el.innerHTML = `
      ${categoryBannerHTML}
      <div class="test-header">
        <div class="test-progress-bar">
          <div class="test-progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="test-stats">
          <span class="test-stat">📚 ${remainLabel}</span>
          <span class="test-stat">${streakLabel}</span>
        </div>
      </div>

      <div class="flashcard-container">
        <div class="flashcard ${this.answerRevealed ? 'flipped' : ''}">
          <!-- Card Front -->
          <div class="flashcard-front">
            <div class="card-emoji-hint">${emoji}</div>
            <div class="card-hanja">${charSymbol}</div>
            <div class="card-prompt">${promptText}</div>
          </div>

          <!-- Card Back -->
          <div class="flashcard-back">
            <div class="card-back-emoji">${emoji}</div>
            <div class="card-back-hanja">${charSymbol}</div>
            <div class="card-back-reading">${reading}</div>
            <div class="card-back-meaning">${meaning}</div>
            <div class="card-back-example">
              ${exampleWordHTML}
            </div>
            <div class="card-back-sentence">
              <div class="card-sentence-primary">${sentence}</div>
              ${sentenceReading}
              <div class="card-sentence-en">${sentenceEn}</div>
            </div>
          </div>
        </div>
      </div>

      ${this.answerRevealed ? `
        <div class="rating-buttons">
          <button class="rating-btn rating-again" data-grade="0">
            <span class="rating-label">${isKanji ? 'もう一度' : '다시'}</span>
            <span class="rating-sublabel">Again</span>
            <span class="rating-interval">${previewIntervals[0]}</span>
          </button>
          <button class="rating-btn rating-hard" data-grade="1">
            <span class="rating-label">${isKanji ? '難しい' : '어려움'}</span>
            <span class="rating-sublabel">Hard</span>
            <span class="rating-interval">${previewIntervals[1]}</span>
          </button>
          <button class="rating-btn rating-good" data-grade="2">
            <span class="rating-label">${isKanji ? '正解' : '좋음'}</span>
            <span class="rating-sublabel">Good</span>
            <span class="rating-interval">${previewIntervals[2]}</span>
          </button>
          <button class="rating-btn rating-easy" data-grade="3">
            <span class="rating-label">${isKanji ? '簡単' : '쉬움'}</span>
            <span class="rating-sublabel">Easy</span>
            <span class="rating-interval">${previewIntervals[3]}</span>
          </button>
        </div>
      ` : `
        <button class="btn-show-answer" id="btn-show-answer">
          ${isKanji ? '答えを表示 (Show Answer)' : '답 보기 (Show Answer)'}
        </button>
      `}
    `;

    // Event listeners
    if (this.answerRevealed) {
      this.el.querySelectorAll('.rating-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const grade = parseInt(btn.dataset.grade, 10);
          this._rateCard(char, grade);
        });
      });
    } else {
      const showBtn = this.el.querySelector('#btn-show-answer');
      if (showBtn) {
        showBtn.addEventListener('click', () => {
          this.answerRevealed = true;
          this.render();
        });
      }

      const cardEl = this.el.querySelector('.flashcard');
      if (cardEl) {
        cardEl.addEventListener('click', () => {
          this.answerRevealed = true;
          this.render();
        });
      }
    }

    // Category quiz back-to-tree button
    const backBtn = this.el.querySelector('#btn-quiz-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.currentCategory = null;
        this.isCategoryMode = false;
        App.navigateTo('tree');
      });
    }
  },

  /** Render empty state */
  _renderEmpty(isKanji) {
    const stats = Storage.getStats();
    const learnedCount = Storage.getLearnedSet().size;

    let title = isKanji ? '復習するカードがありません！' : '복습할 카드가 없어요!';
    let sub = isKanji ? 'No cards due for review!' : 'No cards to review!';
    let cta = isKanji ? '🌳 ツリー画面で漢字カードを開き、「学習済みにする」にチェックしてください！' : '🌳 트리 뷰에서 한자 카드를 클릭하고 「학습 완료」로 표시해 보세요!';
    const btnText = isKanji ? 'ツリー画面へ戻る (Go to Tree)' : '트리 뷰로 가기 (Go to Tree)';

    if (this.currentCategory) {
      const catLabel = isKanji ? (this.currentCategory.name_ja || this.currentCategory.name_kr) : this.currentCategory.name_kr;
      title = isKanji ? `『${catLabel}』に学習済みの漢字がありません！` : `[${catLabel}] 카테고리에 학습 완료된 한자가 없습니다!`;
      sub = isKanji ? 'No learned cards in this category!' : 'No learned cards in this category!';
    }

    this.el.innerHTML = `
      <div class="test-empty">
        <div class="test-empty-emoji">🎉</div>
        <h2 class="test-empty-title">${title}</h2>
        <p class="test-empty-sub">${sub}</p>
        <div class="test-empty-stats">
          <div class="stat-item">
            <span class="stat-number">${learnedCount}</span>
            <span class="stat-desc">${isKanji ? '学習済み漢字<br>Learned' : '학습한 한자<br>Learned'}</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${stats.totalReviews}</span>
            <span class="stat-desc">${isKanji ? '総復習回数<br>Reviews' : '총 복습 횟수<br>Reviews'}</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">🔥 ${stats.streak}</span>
            <span class="stat-desc">${isKanji ? '連続日数<br>Streak' : '연속 학습일<br>Streak'}</span>
          </div>
        </div>
        <p class="test-empty-cta">${cta}</p>
        <button class="btn-go-tree" id="btn-go-tree">${btnText}</button>
      </div>
    `;

    this.el.querySelector('#btn-go-tree').addEventListener('click', () => {
      this.currentCategory = null;
      this.isCategoryMode = false;
      App.navigateTo('tree');
    });
  },

  /** Render session complete state */
  _renderComplete(isKanji) {
    const accuracy = this.sessionStats.reviewed > 0
      ? Math.round((this.sessionStats.correct / this.sessionStats.reviewed) * 100)
      : 0;
    const stats = Storage.getStats();

    let title = isKanji ? '本日の復習完了！' : '복습 완료!';
    let sub = 'Session Complete!';
    let btnText = isKanji ? 'ツリー画面へ戻る (Go to Tree)' : '트리 뷰로 가기 (Go to Tree)';

    if (this.currentCategory) {
      const catLabel = isKanji ? (this.currentCategory.name_ja || this.currentCategory.name_kr) : this.currentCategory.name_kr;
      title = isKanji ? `🎉 『${catLabel}』テスト完了！` : `🎉 [${catLabel}] 카테고리 퀴즈 완료!`;
      sub = isKanji ? 'Category Quiz Completed!' : '카테고리 테스트를 성공적으로 마쳤습니다!';
    }

    this.el.innerHTML = `
      <div class="test-complete">
        <div class="test-complete-emoji">🏆</div>
        <h2 class="test-complete-title">${title}</h2>
        <p class="test-complete-sub">${sub}</p>
        <div class="test-complete-stats">
          <div class="stat-item">
            <span class="stat-number">${this.sessionStats.reviewed}</span>
            <span class="stat-desc">${isKanji ? '復習カード数<br>Reviewed' : '복습한 카드<br>Reviewed'}</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">${accuracy}%</span>
            <span class="stat-desc">${isKanji ? '正解率<br>Accuracy' : '정확도<br>Accuracy'}</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">🔥 ${stats.streak}</span>
            <span class="stat-desc">${isKanji ? '連続日数<br>Streak' : '연속 학습일<br>Streak'}</span>
          </div>
        </div>
        <button class="btn-go-tree" id="btn-go-tree-complete">${btnText}</button>
      </div>
    `;

    this.el.querySelector('#btn-go-tree-complete').addEventListener('click', () => {
      this.currentCategory = null;
      this.isCategoryMode = false;
      App.navigateTo('tree');
    });
  },

  /** SM-2 Algorithm */
  _sm2(card, grade) {
    let { interval, repetition, efactor } = card;
    const gradeMap = { 0: 0, 1: 2, 2: 4, 3: 5 };
    const g = gradeMap[grade];

    efactor = Math.max(1.3, efactor + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02)));

    if (g >= 3) {
      if (repetition === 0) interval = 1;
      else if (repetition === 1) interval = 6;
      else interval = Math.round(interval * efactor);
      repetition++;
    } else {
      repetition = 0;
      interval = 1;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);

    return {
      interval,
      repetition,
      efactor: parseFloat(efactor.toFixed(2)),
      dueDate: dueDate.toISOString()
    };
  },

  /** Preview interval */
  _sm2Preview(card, grade) {
    let { interval, repetition, efactor } = card;
    const gradeMap = { 0: 0, 1: 2, 2: 4, 3: 5 };
    const g = gradeMap[grade];

    efactor = Math.max(1.3, efactor + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02)));

    if (g >= 3) {
      if (repetition === 0) interval = 1;
      else if (repetition === 1) interval = 6;
      else interval = Math.round(interval * efactor);
    } else {
      interval = 1;
    }

    return { interval };
  },

  /** Rate card */
  _rateCard(char, grade) {
    const cardState = Storage.getCardState(char.id) || { interval: 0, repetition: 0, efactor: 2.5 };
    const updated = this._sm2(cardState, grade);
    Storage.setCardState(char.id, updated);

    this.sessionStats.reviewed++;
    if (grade >= 2) this.sessionStats.correct++;

    Storage.incrementReviews();

    if (grade === 0) {
      this.queue.push(char);
    }

    this.currentIndex++;
    this.answerRevealed = false;
    this.render();

    if (typeof App !== 'undefined' && App.updateHeaderStats) {
      App.updateHeaderStats();
    }
  },

  /** Format interval label */
  _formatInterval(days) {
    if (days <= 0) return '< 1m';
    if (days === 1) return '1일 (1d)';
    if (days < 30) return `${days}일 (${days}d)`;
    const months = Math.round(days / 30);
    return `${months}달 (${months}mo)`;
  }
};
