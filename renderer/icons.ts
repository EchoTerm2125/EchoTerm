/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Shared SVG Icons
   Inline SVG strings for renderer modules that build DOM via innerHTML.
   Icons use a 24×24 stroke grid (Lucide/Feather style) and inherit color
   via currentColor, so they match surrounding text and hover states.
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const clipboard = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>'
    + '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>'
    + '</svg>';

  // Circular arrow — used by a Pane's Reconnect control.
  const refresh = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/>'
    + '<path d="M21 3v5h-5"/>'
    + '</svg>';

  // Play triangle — used by a Dormant Pane's Connect control (ADR 0017).
  const play = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
    + '<polygon points="6 4 20 12 6 20 6 4"/>'
    + '</svg>';

  // ─── Expose on window.App ───────────────────────────────────────────────────
  window.App = window.App || ({} as AppGlobal);
  App.Icons = {
    clipboard,
    refresh,
    play,
  };
})();

export {};
