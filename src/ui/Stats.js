// Stats for the current language: today's reviews, streak, 30-day retention,
// a 7-day forecast, progress per level and the leech list.
import { html, useMemo } from '../../vendor/htm-preact.mjs';
import { reviewsToday, streak, retention30, forecast } from '../engine/stats.js';
import { introducedSet, isLeech, dayStart } from '../engine/queue.js';
import { LangSwitch } from './Header.js';
import { useMinuteClock } from './Home.js';
import { routeHref } from './route.js';

const NOT_ENOUGH = 'Not enough reviews yet';

/** Day labels for the forecast: Today, then the weekday names (Tue, Wed, ...). */
function dayLabels(now, startHour, n) {
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
  const d0 = dayStart(now, startHour);
  return Array.from({ length: n }, (_, i) => {
    if (i === 0) return 'Today';
    // Noon of that study day, so a daylight-saving shift cannot change the weekday.
    const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i, 12);
    return fmt.format(d);
  });
}

/** The entries of one language: its reviews and resets, plus every undo (they name an id). */
const forLang = (entries, lang) => entries.filter((e) =>
  e.type === 'undo' || (e.type === 'reset' ? e.lang === lang : e.card.startsWith(`${lang}:`)));

function Forecast({ counts, labels }) {
  const max = Math.max(1, ...counts);
  return html`
    <section class="card set-section" aria-labelledby="fc-title">
      <h2 id="fc-title" class="set-title">Next 7 days</h2>
      <ol class="forecast">
        ${counts.map((n, i) => html`
          <li class="fc-day" key=${i}>
            <span class="fc-n">${n}</span>
            <span class="fc-track" aria-hidden="true">
              <span class="fc-bar" style=${`height:${n > 0 ? Math.max(4, (n / max) * 100) : 0}%`}></span>
            </span>
            <span class="fc-label">${labels[i]}</span>
            <span class="visually-hidden">${`${labels[i]}: ${n} due`}</span>
          </li>`)}
      </ol>
    </section>`;
}

export function Stats({ store, s }) {
  const now = useMinuteClock();
  const { lang, profile } = s;
  const hour = profile.settings.dayStartHour;
  const data = s.data[lang];

  const stats = useMemo(() => {
    const entries = forLang(s.entries, lang);
    const states = new Map([...s.states].filter(([id]) => id.startsWith(`${lang}:`)));
    return {
      today: reviewsToday(entries, now, hour),
      streak: streak(entries, now, hour),
      retention: retention30(entries, s.prevState, now),
      forecast: forecast(states, now, 7, hour),
      introduced: introducedSet(states),
      states,
    };
  }, [s.entries, s.states, s.prevState, lang, now, hour]);

  const labels = useMemo(() => dayLabels(now, hour, 7), [now, hour]);
  const done = new Map();
  for (const c of data?.chars ?? []) if (stats.introduced.has(c.id)) done.set(c.level, (done.get(c.level) ?? 0) + 1);

  const byId = new Map((data?.chars ?? []).map((c) => [c.id, c]));
  const leeches = [...stats.states]
    .filter(([id, card]) => isLeech(card) && byId.has(id))
    .map(([id, card]) => ({ char: byId.get(id), lapses: card.lapses }))
    .sort((a, b) => b.lapses - a.lapses || a.char.order - b.char.order);

  const pct = stats.retention == null ? null : Math.round(stats.retention * 100);
  const cjk = lang === 'ko' ? 'hangul' : 'cjk';

  return html`
    <h1 class="screen-title">Stats</h1>
    <${LangSwitch} lang=${lang} onChange=${store.actions.setLang} />
    <section class="card" aria-labelledby="sum-title">
      <h2 id="sum-title" class="visually-hidden">Summary</h2>
      <dl class="sum">
        <div class="sum-item"><dt>Reviews today</dt><dd>${stats.today}</dd></div>
        <div class="sum-item"><dt>Streak</dt><dd>${stats.streak}<span class="sum-unit">${stats.streak === 1 ? ' day' : ' days'}</span></dd></div>
        <div class="sum-item sum-wide"><dt>Retention, last 30 days</dt>
          <dd>${pct == null ? html`<span class="sum-empty">${NOT_ENOUGH}</span>` : `${pct}%`}</dd></div>
      </dl>
    </section>
    <${Forecast} counts=${stats.forecast} labels=${labels} />
    <section class="card set-section" aria-labelledby="prog-title">
      <h2 id="prog-title" class="set-title">Progress by level</h2>
      <ul class="level-list">
        ${(data?.levels ?? []).map((l) => {
          const n = done.get(l.id) ?? 0;
          const w = l.count > 0 ? Math.min(100, (n / l.count) * 100) : 0;
          return html`
            <li class="level-row" key=${l.id}>
              <span class=${lang === 'ko' ? 'level-name hangul' : 'level-name'} lang=${lang}>${l.id}</span>
              <span class="bar" aria-hidden="true"><span class="bar-fill" style=${`width:${w}%`}></span></span>
              <span class="level-count">${n} / ${l.count}<span class="visually-hidden"> introduced</span></span>
            </li>`;
        })}
      </ul>
    </section>
    <section class="card set-section" aria-labelledby="leech-title">
      <h2 id="leech-title" class="set-title">Leeches</h2>
      ${leeches.length === 0
        ? html`<p class="note leech-empty">No leeches. Cards you keep forgetting appear here.</p>`
        : html`
          <ul class="leech-list">
            ${leeches.map(({ char, lapses }) => html`
              <li key=${char.id}>
                <a class="leech-row" href=${routeHref('characters', char.level, char.id)}
                  aria-label=${`${char.char}, ${lapses} lapses`}>
                  <span class=${`leech-char ${cjk}`} lang=${lang}>${char.char}</span>
                  <span class="leech-lapses">${lapses} lapses</span>
                </a>
              </li>`)}
          </ul>`}
    </section>`;
}
