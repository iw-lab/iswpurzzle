// 화면 아이콘 — 직접 그린 24px 선 SVG(currentColor). 이모지를 쓰지 않는다(기기마다 모양·색이 달라 톤이 깨진다 —
// game-builder check-no-emoji). 키트 아이콘(gb-icons.js)과 같은 선 굵기·끝 모양.
const P: Record<string, string> = {
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M9.5 15l1.8 1.8L15 13"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.2c2.9.2 5 2.6 5 5.8"/>',
  rocket: '<path d="M12 2.5c3 2.2 4.5 5.6 4.5 9.5v4h-9v-4c0-3.9 1.5-7.3 4.5-9.5z"/><circle cx="12" cy="10" r="1.8"/><path d="M7.5 13l-3 3.5V19l3-1.5M16.5 13l3 3.5V19l-3-1.5M10 19.5c.5 1.4 1.2 2 2 2s1.5-.6 2-2"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-9.3-9.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 9.3 4.7C19.5 15.9 12 20.5 12 20.5z" fill="currentColor"/>',
  hash: '<path d="M5 9h15M4 15h15M10 4L8 20M16 4l-2 16"/>',
  ufo: '<ellipse cx="12" cy="13.5" rx="9.5" ry="3.5"/><path d="M7 12a5 5 0 0 1 10 0"/><path d="M8 20l1-3M16 20l-1-3M12 21v-4"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>',
};

/** icon('rocket') → 인라인 SVG 문자열(1.1em · currentColor) */
export function icon(name: string, cls = ''): string {
  const d = P[name];
  if (!d) return '';
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
