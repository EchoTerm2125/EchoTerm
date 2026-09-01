// Unit tests — copying a soft-wrapped line must keep a single logical line.
//
// Regression: entering echo mode resizes terminals via the fit addon. xterm's
// default `reflowCursorLine: false` truncates the cursor (input) line on
// resize instead of re-wrapping it, so a long typed command is cut to the new
// column count and copying the selection yields the partial line plus stray
// empty rows ("2 lines"). The app enables `reflowCursorLine: true`, which
// re-wraps the cursor line and keeps the copy on one line.
import { Terminal } from '@xterm/xterm';

// Minimal browser stubs xterm needs to open in jsdom.
function stubBrowserApis() {
  (globalThis as any).matchMedia = (globalThis as any).matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  }));
  (globalThis as any).ResizeObserver = (globalThis as any).ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };
  HTMLCanvasElement.prototype.getContext = HTMLCanvasElement.prototype.getContext || (() => ({
    fillRect: () => {}, clearRect: () => {}, getImageData: () => ({ data: [] }),
    putImageData: () => {}, createImageData: () => [], setTransform: () => {},
    drawImage: () => {}, save: () => {}, fillText: () => {}, restore: () => {},
    beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {},
    stroke: () => {}, translate: () => {}, scale: () => {}, rotate: () => {},
    arc: () => {}, fill: () => {}, measureText: () => ({ width: 7 }),
    transform: () => {}, rect: () => {}, clip: () => {},
  })) as any;
  Object.defineProperty(globalThis, 'devicePixelRatio', { value: 1, writable: true });
}

const APP_TERMINAL_OPTIONS = {
  cursorBlink: true,
  cursorStyle: 'bar',
  bracketedPasteMode: true,
  reflowCursorLine: true, // must match renderer/terminal.ts
};

function openTerm(options) {
  const term = new Terminal({ cols: 30, rows: 5, scrollback: 100, ...options } as any);
  const host = document.createElement('div');
  document.body.appendChild(host);
  (term as any).open(host);
  return term;
}

function writeWait(term: Terminal, data: string) {
  return new Promise<void>((resolve) => term.write(data, () => resolve()));
}

describe('Copy wrapped text after a resize (echo-mode grid reflow)', () => {
  beforeAll(() => stubBrowserApis());

  it('keeps a long cursor-line command as one line after the terminal shrinks', async () => {
    // A long command is still on the input (cursor) line when the echo-mode
    // grid resize hits — exactly what happens when echo mode is enabled while
    // a long line is being typed/pasted.
    const term = openTerm(APP_TERMINAL_OPTIONS);
    const long = 'A'.repeat(26); // fits at 30 cols: single row
    await writeWait(term, long); // no \r\n -> cursor stays on this line

    (term as any).resize(10, 5); // echo-mode fit shrinks the terminal

    term.select(0, 0, long.length);
    const copied = term.getSelection();

    expect(copied).toBe(long);
    expect(copied.split('\n').length).toBe(1);
  });

  it('still joins a line that wraps while typing into a narrow terminal', async () => {
    const term = openTerm(APP_TERMINAL_OPTIONS);
    const long = 'B'.repeat(26); // wraps across 3 rows at 10 cols
    await writeWait(term, long + '\r\n'); // committed output line

    (term as any).resize(10, 5);

    term.select(0, 0, long.length);
    const copied = term.getSelection();

    expect(copied).toBe(long);
    expect(copied.split('\n').length).toBe(1);
  });

  it('default xterm truncates the cursor line on resize (documents the bug)', async () => {
    // Sanity check that the test actually exercises the buggy behavior: with
    // xterm's default reflowCursorLine:false the cursor line is truncated and
    // copying yields multiple lines.
    const term = openTerm({});
    const long = 'C'.repeat(26);
    await writeWait(term, long);

    (term as any).resize(10, 5);

    term.select(0, 0, long.length);
    const copied = term.getSelection();

    expect(copied.split('\n').length).toBeGreaterThan(1);
    expect(copied).not.toBe(long);
  });
});
