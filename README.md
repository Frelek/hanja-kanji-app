# 한자 & 漢字 학습 (Hanja & Kanji Learner) 🌸

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-brightgreen)](https://frelekkacper.com/hanja-kanji-app/)
[![Progressive Web App](https://img.shields.io/badge/PWA-100%25%20Offline-orange)](https://frelekkacper.com/hanja-kanji-app/)
[![Characters](https://img.shields.io/badge/Vocabulary-551%20Characters-blue)](https://frelekkacper.com/hanja-kanji-app/)

> **Live Application**: [https://frelekkacper.com/hanja-kanji-app/](https://frelekkacper.com/hanja-kanji-app/) (or [https://frelek.github.io/hanja-kanji-app/](https://frelek.github.io/hanja-kanji-app/))  
> **Source Repository**: [https://github.com/Frelek/hanja-kanji-app](https://github.com/Frelek/hanja-kanji-app)

A mobile-first, 100% offline-capable Progressive Web Application (PWA) designed to teach **Korean Hanja (한자)** and **Japanese Joyo Kanji (漢字)** through an etymological **Family Tree Branching Model**, reinforced with **Anki-style SM-2 Spaced Repetition Flashcards** and **Animated Stroke Order**.

---

## 🎯 1. Core Vision & Goals of the App

### The Tree-Branch Learning Approach
Rather than presenting characters as isolated rote lists, the app structures characters into semantic, visual families:
- **Level 0 (Root Radicals)**: Elementary pictograms and foundational building blocks (e.g., `木` Tree, `日` Sun, `水` Water, `人` Person).
- **Level 1 (Derivatives)**: Characters created by adding strokes or combining roots (e.g., `木` Tree → `林` Grove, `本` Origin, `休` Rest).
- **Level 2+ (Compounds)**: Complex ideograms building upon previous tiers (e.g., `林` Grove → `森` Forest).

### Dual Language Support (Upper Right Switcher)
- **🇰🇷 Korean Hanja Mode**: 15 branches with **287 essential Hanja**, Korean readings (`음`), definitions (`훈`), compound words, and natural Korean sentences.
- **🇯🇵 Japanese Kanji Mode**: 14 branches with **264 Joyo Kanji**, Onyomi (音読み), Kunyomi (訓読み), compound words with **pure kana readings directly beneath**, and Japanese sentences with furigana.
- **Total Database**: **551 unique characters** (exceeding the 500-word milestone).

### Strict Quizzing & Spaced Repetition Rules
1. **No Inline Word Quizzes**: Character detail modals display stroke animations and vocabulary, without inline quiz clutter.
2. **Category Quiz Only at Top**: Each category branch features a prominent quiz trigger (`⚡ 카테고리 퀴즈` / `⚡ カテゴリーテスト`) at the top of its header.
3. **Learned Words Only**: Quizzes strictly test only characters that the user has explicitly marked as learned (`Storage.isLearned`).
4. **Anki SM-2 Spaced Repetition**: 4-grade algorithm (`Again`, `Hard`, `Good`, `Easy`) tracking review intervals, ease factors, streaks, and due dates.

### Traditional Parchment Aesthetic
- Warm, glare-free **Hanji/Washi bright beige background** (`#f7f4ed`).
- East Asian **calligraphy sumi ink typography** (`#231f1d`).
- Traditional **vermilion red accents** (주칠 / 朱色 `#c53030`).

---

## 📂 2. Repository & Directory Structure

```
d:/0_Antigravity/6_Hanja_and_Kanji_app/
├── index.html                  # Single-page PWA shell and meta headers
├── manifest.json               # Standalone web app configuration & icon map
├── sw.js                       # ServiceWorker v3 (Cache-first offline engine)
├── README.md                   # Complete specification & usage documentation
├── test_app.js                 # Automated Node.js validation test suite
├── apple-touch-icon.png        # iOS home screen icon (180x180)
├── make_icons.py               # Generates PWA icon assets
├── generate_all_data.py        # Dataset builder script
├── build_full_database.py      # Expanded 551-character dataset compiler
├── .gitignore                  # Git tracking rules
├── css/
│   └── styles.css              # Full aesthetic styling & responsive layout
├── data/
│   ├── hanja.json              # 287 Korean Hanja records across 15 branches
│   └── kanji.json              # 264 Japanese Kanji records across 14 branches
├── icons/
│   ├── icon-192.png            # 192x192 PWA maskable icon
│   └── icon-512.png            # 512x512 PWA maskable icon
└── js/
    ├── app.js                  # Main controller, router, SW registrar, language switcher
    ├── storage.js              # Mode-scoped localStorage & SM-2 state manager
    ├── tree-view.js            # Branch tabs, vertical tree graph, category quiz header
    ├── detail-modal.js         # Character bottom sheet, HanziWriter stroke animation
    ├── test-mode.js            # Anki flashcard engine (SM-2, category & general review)
    └── hanzi-writer.min.js     # Bundled HanziWriter library (36 KB, 100% offline)
```

---

## ⚙️ 3. Key Modules & Technical Specifications

| File | Purpose & Responsibilities |
| :--- | :--- |
| `js/app.js` | Top-level coordinator. Manages initial JSON fetching, hash-based routing (`#tree`, `#test`, `#settings`), language switching, and ServiceWorker registration. |
| `js/storage.js` | LocalStorage abstraction. Scopes all keys by mode (`hanja_*` vs `kanji_*`) to keep Korean and Japanese learning data completely isolated. |
| `js/tree-view.js` | Renders the draggable branch tab strip, the category progress header with the **Category Quiz Button**, and the hierarchically linked node graph. |
| `js/detail-modal.js` | Interactive bottom sheet. Runs offline animated stroke orders using `HanziWriter`, displays pure kana under Japanese words, and toggles "Mark as Learned". |
| `js/test-mode.js` | Spaced repetition flashcard runner. Supports Category Quiz and General Due Review, strictly filtering by `Storage.isLearned()`. |
| `js/hanzi-writer.min.js` | Self-contained stroke order animation library bundled locally so stroke playback does not rely on third-party CDNs. |
| `sw.js` | Pre-caches all assets during installation. Employs a cache-first strategy with automatic background network caching. |

---

## 🔒 4. Rules & Invariants for Future AI Developers

> [!IMPORTANT]
> **Preserve these invariants in any future update**:
> 1. **Do not use external CDNs for core functions**: Keep `HanziWriter` and all fonts/scripts bundled locally so the PWA remains 100% offline capable.
> 2. **Japanese Pure Kana Display**: Under every Kanji example word, the pure kana (`example_word_kana`) must always be rendered immediately below it.
> 3. **Quizzing Scope**: Quizzes must **never** test unlearned characters. Always filter test queues using `Storage.isLearned(id)`.
> 4. **No Inline Quizzes**: Keep the quiz button strictly at the top of the category header; do not re-add quiz buttons inside the character modal.
> 5. **Mode Isolation**: Keep `hanja` and `kanji` localStorage states strictly separate.

---

## 📱 5. Installation on iPhone (Safari)

1. Open **`https://frelekkacper.com/hanja-kanji-app/`** (or `https://frelek.github.io/hanja-kanji-app/`) in Safari.
2. Tap the **Share icon** (`↑`) at the bottom of the screen.
3. Select **Add to Home Screen** (**홈 화면에 추가**).
4. Ensure **"Open as Web App"** is **ticked / checked** (this launches the app in standalone fullscreen mode without the Safari URL bar).
5. Tap **Add**. The app will now work completely offline.

---

## 🤖 6. GitHub, Authentication & API Guide for AI & Developers

### GitHub Links & Endpoints
- **Repository**: [https://github.com/Frelek/hanja-kanji-app](https://github.com/Frelek/hanja-kanji-app)
- **Clone / Remote URL**: `https://github.com/Frelek/hanja-kanji-app.git`
- **Live Site**: [https://frelekkacper.com/hanja-kanji-app/](https://frelekkacper.com/hanja-kanji-app/) (or [https://frelek.github.io/hanja-kanji-app/](https://frelek.github.io/hanja-kanji-app/))
- **Actions Workflow**: [https://github.com/Frelek/hanja-kanji-app/actions](https://github.com/Frelek/hanja-kanji-app/actions)
- **Pages Settings**: [https://github.com/Frelek/hanja-kanji-app/settings/pages](https://github.com/Frelek/hanja-kanji-app/settings/pages)

### Headless Git Authentication for AI Assistants
- **Owner**: `Frelek`
- To avoid GUI authentication blocks from Windows Git Credential Manager, automated AI tasks push using a GitHub Personal Access Token (PAT) with `repo` scope:
  ```powershell
  # 1. Set temporary authenticated remote
  git remote set-url origin https://Frelek:<TOKEN>@github.com/Frelek/hanja-kanji-app.git

  # 2. Push to main
  git push origin main

  # 3. Sanitize remote URL immediately
  git remote set-url origin https://github.com/Frelek/hanja-kanji-app.git
  ```

### API Architecture: Zero External APIs
- The application requires **zero external cloud backend APIs** or subscriptions.
- **Client-Side Web APIs**: Service Worker API (`sw.js`), Cache API (`hanja-kanji-learner-v3`), Web Storage API (`localStorage`), Hash Navigation (`#tree`, `#test`, `#settings`).
- **Offline Engine**: HanziWriter 2.x API bundled locally in [hanzi-writer.min.js](file:///d:/0_Antigravity/6_Hanja_and_Kanji_app/js/hanzi-writer.min.js).

