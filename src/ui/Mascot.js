// The CapyCards mascot: a capybara with a yuzu on its head. Same shapes as tools/make_icons.py.
import { html } from '../../vendor/htm-preact.mjs';

export function Capybara({ size = 44, label = null }) {
  return html`
    <svg class="capybara" width=${size} height=${size} viewBox="0 0 64 64"
      role=${label ? 'img' : null} aria-label=${label} aria-hidden=${label ? null : 'true'}>
      <g stroke="var(--capy-line)" stroke-width="2.5" stroke-linejoin="round">
        <circle cx="18" cy="20" r="4" fill="var(--capy-ear)" />
        <circle cx="46" cy="20" r="4" fill="var(--capy-ear)" />
        <rect x="12" y="19" width="40" height="38" rx="11" fill="var(--capy-fur)" />
        <rect x="16" y="38" width="32" height="16" rx="8" fill="var(--capy-snout)" stroke-width="2" />
        <circle cx="32" cy="14" r="5.5" fill="var(--capy-yuzu)" stroke-width="2" />
      </g>
      <path d="M32 8.5 q4 -4 8 -2 q-3 3 -8 2z" fill="var(--capy-leaf)" />
      <circle cx="23" cy="30" r="2.4" fill="var(--capy-line)" />
      <circle cx="41" cy="30" r="2.4" fill="var(--capy-line)" />
      <ellipse cx="27" cy="44" rx="1.2" ry="2.2" fill="var(--capy-line)" />
      <ellipse cx="37" cy="44" rx="1.2" ry="2.2" fill="var(--capy-line)" />
    </svg>`;
}
