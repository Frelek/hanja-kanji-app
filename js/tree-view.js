/* ============================================================
   js/tree-view.js — Branch Tree Learning Interface
   Supports both Hanja (Korean) & Kanji (Japanese)
   ============================================================ */

const TreeView = {

  /** Container element */
  el: null,

  /** Full data reference */
  data: null,

  /** Currently selected branch ID */
  currentBranch: null,

  /** Initialize the tree view */
  init(data) {
    this.data = data;
    this.el = document.getElementById('tree-view');

    // Default to first branch if none selected or not present in new dataset
    if (data.branches.length > 0) {
      if (!this.currentBranch || !data.branches.some(b => b.id === this.currentBranch)) {
        this.currentBranch = data.branches[0].id;
      }
    }

    this.render();
  },

  /** Update data source on language toggle */
  updateData(newData) {
    this.data = newData;
    if (newData.branches.length > 0) {
      this.currentBranch = newData.branches[0].id;
    }
    this.render();
  },

  /** Full render — tabs + tree */
  render() {
    this.el.innerHTML = '';
    const isKanji = Storage.currentMode === 'kanji';

    // Branch tabs strip
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'branch-tabs';
    tabsContainer.innerHTML = this.data.branches.map((branch) => {
      const active = branch.id === this.currentBranch ? 'active' : '';
      const branchLabel = isKanji ? (branch.name_ja || branch.name_kr) : branch.name_kr;
      return `<button class="branch-tab ${active}" data-branch="${branch.id}">${branch.icon} ${branchLabel}</button>`;
    }).join('');
    this.el.appendChild(tabsContainer);

    // Tab click handler
    tabsContainer.addEventListener('click', (e) => {
      const tab = e.target.closest('.branch-tab');
      if (!tab) return;
      this.currentBranch = tab.dataset.branch;
      this.render();
    });

    // Mouse drag horizontal scrolling for tabs
    let isDown = false, startX, scrollLeft;
    tabsContainer.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - tabsContainer.offsetLeft;
      scrollLeft = tabsContainer.scrollLeft;
    });
    tabsContainer.addEventListener('mouseleave', () => { isDown = false; });
    tabsContainer.addEventListener('mouseup', () => { isDown = false; });
    tabsContainer.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - tabsContainer.offsetLeft;
      tabsContainer.scrollLeft = scrollLeft - (x - startX);
    });

    // Tree content area
    const treeContent = document.createElement('div');
    treeContent.className = 'tree-content';
    this.el.appendChild(treeContent);

    // Find the current branch
    const branch = this.data.branches.find((b) => b.id === this.currentBranch);
    if (!branch) return;

    // Branch header
    const header = document.createElement('div');
    header.className = 'branch-header';
    const learnedCount = branch.characters.filter((c) => Storage.isLearned(c.id)).length;
    const branchLabel = isKanji ? (branch.name_ja || branch.name_kr) : branch.name_kr;

    header.innerHTML = `
      <div class="branch-header-top">
        <div class="branch-header-info">
          <h2 class="branch-title">${branch.icon} ${branchLabel} <span class="branch-title-en">${branch.name_en}</span></h2>
          <div class="branch-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${branch.characters.length > 0 ? (learnedCount / branch.characters.length * 100) : 0}%"></div>
            </div>
            <span class="progress-text">${learnedCount}/${branch.characters.length}</span>
          </div>
        </div>
        <button class="btn-category-quiz ${learnedCount === 0 ? 'is-empty' : ''}" id="btn-category-quiz" title="${isKanji ? 'このカテゴリーをテスト' : '카테고리 퀴즈'}">
          <span class="quiz-btn-icon">⚡</span>
          <span class="quiz-btn-label">${isKanji ? 'カテゴリーテスト' : '카테고리 퀴즈'}</span>
          <span class="quiz-btn-badge">${learnedCount}</span>
        </button>
      </div>
    `;
    treeContent.appendChild(header);

    // Event listener for category quiz (ONLY shown at top of category)
    const quizBtn = header.querySelector('#btn-category-quiz');
    if (quizBtn) {
      quizBtn.addEventListener('click', () => {
        const learnedInBranch = branch.characters.filter(c => Storage.isLearned(c.id));
        if (learnedInBranch.length === 0) {
          const msg = isKanji 
            ? '⚠️ まだこのカテゴリーで学習済みの漢字がありません。\n漢字カードを開いて「学習済みにする」にチェックしてください！'
            : '⚠️ 아직 이 카테고리에서 학습 완료한 한자가 없습니다.\n한자 카드를 클릭해 먼저 「학습 완료」로 표시해주세요!';
          alert(msg);
          return;
        }

        TestMode.startCategoryQuiz(branch);
      });
    }

    // Build character lookup map and children map for this branch
    const charMap = new Map();
    const childrenMap = new Map();

    branch.characters.forEach((ch) => {
      charMap.set(ch.id, ch);
      if (!childrenMap.has(ch.id)) childrenMap.set(ch.id, []);
    });

    // Populate children map
    branch.characters.forEach((ch) => {
      if (ch.parent_id && charMap.has(ch.parent_id)) {
        if (!childrenMap.has(ch.parent_id)) childrenMap.set(ch.parent_id, []);
        childrenMap.get(ch.parent_id).push(ch);
      }
    });

    // Find root nodes (no parent or parent not in this branch)
    const roots = branch.characters.filter((ch) => !ch.parent_id || !charMap.has(ch.parent_id));

    // Sort roots by level
    roots.sort((a, b) => (a.level || 0) - (b.level || 0));

    // Render tree starting from roots
    const treeContainer = document.createElement('div');
    treeContainer.className = 'tree-container';
    roots.forEach((root) => {
      treeContainer.appendChild(this._renderNode(root, childrenMap, charMap, 0, isKanji));
    });
    treeContent.appendChild(treeContainer);

    // Scroll active tab into view
    requestAnimationFrame(() => {
      const activeTab = tabsContainer.querySelector('.branch-tab.active');
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });
  },

  /**
   * Recursively render a tree node and its children
   */
  _renderNode(char, childrenMap, charMap, depth, isKanji) {
    const level = document.createElement('div');
    level.className = 'tree-level';
    level.style.setProperty('--depth', depth);

    const isLearned = Storage.isLearned(char.id);
    const isLocked = this._isLocked(char, charMap);
    const children = childrenMap.get(char.id) || [];
    const hasChildren = children.length > 0;

    const charSymbol = char.hanja || char.kanji;
    const reading = isKanji ? (char.kunyomi || char.onyomi || '') : char.reading;
    const meaning = isKanji ? char.meaning_ja : char.meaning_kr;

    // Node element
    const node = document.createElement('div');
    node.className = `tree-node ${isLearned ? 'learned' : ''} ${isLocked ? 'locked' : ''} level-${Math.min(char.level || 0, 3)}`;
    node.dataset.id = char.id;
    node.dataset.level = char.level || 0;

    // Connector line for child nodes
    if (depth > 0) {
      const connector = document.createElement('div');
      connector.className = 'node-connector';
      node.appendChild(connector);
    }

    // Card body
    const card = document.createElement('div');
    card.className = 'node-card';
    card.innerHTML = `
      <span class="node-hanja">${charSymbol}</span>
      <div class="node-text-col">
        <span class="node-reading">${reading}</span>
        <span class="node-meaning">${meaning}</span>
      </div>
      ${isLearned ? '<span class="node-check">✓</span>' : ''}
      ${hasChildren ? '<span class="node-expand">▾</span>' : ''}
    `;
    node.appendChild(card);

    // Click handler
    card.addEventListener('click', () => {
      if (isLocked) {
        this._showToast(char, charMap, isKanji);
        return;
      }
      DetailModal.open(char, this.data, Storage.currentMode);
    });

    level.appendChild(node);

    // Children container
    if (hasChildren) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'tree-children';
      children.sort((a, b) => (a.level || 0) - (b.level || 0));

      children.forEach((child) => {
        childrenContainer.appendChild(this._renderNode(child, childrenMap, charMap, depth + 1, isKanji));
      });

      level.appendChild(childrenContainer);
    }

    return level;
  },

  /** Check if a character is locked */
  _isLocked(char, charMap) {
    if ((char.level || 0) <= 1) return false;
    if (!char.parent_id) return false;
    return !Storage.isLearned(char.parent_id);
  },

  /** Show locked toast */
  _showToast(char, charMap, isKanji) {
    const parent = charMap.get(char.parent_id);
    const parentSym = parent ? (parent.hanja || parent.kanji) : char.parent_id;
    const parentRead = parent ? (parent.reading || parent.kunyomi || parent.onyomi || '') : '';
    const parentLabel = `${parentSym} (${parentRead})`;

    const msg = isKanji 
      ? `🔒 先に「${parentLabel}」を学習してください！`
      : `🔒 먼저 "${parentLabel}"을(를) 학습하세요!`;

    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    toast.textContent = msg;
    toast.classList.add('visible');

    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2200);
  },

  _toastTimer: null,

  /** Refresh node states */
  refreshNodeStates() {
    this.render();
  }
};
