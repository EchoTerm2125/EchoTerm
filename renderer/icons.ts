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

  // ─── Expose on window.App ───────────────────────────────────────────────────
  window.App = window.App || ({} as AppGlobal);
  App.Icons = {
    clipboard,
  };
})();

export {};
