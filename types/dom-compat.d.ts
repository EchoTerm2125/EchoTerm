/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Migration-phase DOM compatibility shims.
   The legacy renderer code treats event targets and queried elements loosely
   (e.g. `e.target.closest(...)`, `el.checked` on an HTMLElement). These
   augmentations make that compile during the TypeScript migration.
   TODO: tighten over time — replace with proper casts/typed queries and
   delete this file.
   ═══════════════════════════════════════════════════════════════════════════ */

interface EventTarget {
  closest(selectors: string): Element | null;
  readonly dataset: DOMStringMap;
  id?: string;
  checked?: boolean;
  value?: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
}

interface Element {
  readonly dataset: DOMStringMap;
  style: CSSStyleDeclaration;
}

interface HTMLElement {
  checked?: boolean;
  value?: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
}
