// Study home: who is studying, the language, today's counts and progress per level.
import { html, useState, useEffect, useMemo } from '../../vendor/htm-preact.mjs';
import { studyQueue } from '../state.js';
import { introducedSet } from '../engine/queue.js';
import { estimateMinutes } from './format.js';
import { ProfileBar, LangSwitch } from './Header.js';
import { routeHref } from './route.js';

/** Re-renders once a minute and when the app comes back to the foreground. */
export function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 60e3);
    const onShow = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onShow);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, []);
  return now;
}

const COUNTS = [
  ['new', 'New'],
  ['learning', 'Learning'],
  ['review', 'Review'],
];

function Today({ counts }) {
  const total = counts.new + counts.learning + counts.review;
  const minutes = estimateMinutes(counts);
  return html`
    <section class="card today" aria-labelledby="today-title">
      <h2 id="today-title" class="today-title">Today</h2>
      <dl class="counts">
        ${COUNTS.map(([key, label]) => html`
          <div class="count" key=${key}>
            <dt class="count-label">${label}</dt>
            <dd class=${`count-value count-${key}`}>${counts[key]}</dd>
          </div>`)}
      </dl>
      ${total > 0
        ? html`<a class="btn btn-primary" href=${routeHref('session')}>Study now</a>`
        : html`<button type="button" class="btn btn-primary" disabled>Study now</button>`}
      <p class="eta">${total > 0 ? `about ${minutes} min` : 'All done for today'}</p>
    </section>`;
}

function Levels({ levels, chars, introduced, lang }) {
  const done = new Map(levels.map((l) => [l.id, 0]));
  for (const c of chars) if (introduced.has(c.id)) done.set(c.level, (done.get(c.level) ?? 0) + 1);
  return html`
    <section class="levels" aria-labelledby="levels-title">
      <h2 id="levels-title" class="visually-hidden">Progress by level</h2>
      <ul class="level-list">
        ${levels.map((l) => {
          const n = done.get(l.id) ?? 0;
          const pct = l.count > 0 ? Math.min(100, (n / l.count) * 100) : 0;
          return html`
            <li class="level-row" key=${l.id}>
              <span class=${lang === 'ko' ? 'level-name hangul' : 'level-name'} lang=${lang}>${l.id}</span>
              <span class="bar" aria-hidden="true"><span class="bar-fill" style=${`width:${pct}%`}></span></span>
              <span class="level-count">${n} / ${l.count}<span class="visually-hidden"> introduced</span></span>
            </li>`;
        })}
      </ul>
    </section>`;
}

export function Home({ store, s }) {
  const now = useMinuteClock();
  const data = s.data[s.lang];
  const queue = useMemo(() => studyQueue(s, now),
    [s.profile, s.lang, s.data, s.states, s.prevState, s.entries, now]);
  const introduced = useMemo(() => introducedSet(s.states), [s.states]);
  // "Welcome back" shows until Study is left.
  useEffect(() => () => store.actions.clearWelcome(), [store]);

  return html`
    <${ProfileBar} profile=${s.profile} sync=${s.sync} now=${now} />
    ${s.welcome && html`<p class="welcome" role="status">Welcome back, ${s.welcome}</p>`}
    <${LangSwitch} lang=${s.lang} onChange=${store.actions.setLang} />
    <h1 class="visually-hidden">Study</h1>
    <${Today} counts=${queue.counts} />
    ${data && html`<${Levels} levels=${data.levels} chars=${data.chars} introduced=${introduced} lang=${s.lang} />`}`;
}
