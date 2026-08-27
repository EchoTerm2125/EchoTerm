// E2E regression — paste multi-line content while the multi-line confirm dialog
// is disabled (skipPastePreview=true). Regression: an extra newline was added
// between lines because the disabled path delegated to xterm's native paste
// (which rewrites \n → \r and double-fires), instead of writing the raw text.
//
// The assertion hooks the main process's terminal:write IPC handler, so it
// checks the exact bytes sent to the PTY and does not depend on how the shell
// renders them. (window.api is exposed via contextBridge, which freezes it in
// some Electron builds, so a renderer-side `window.api.write = ...` wrapper is
// unreliable; capturing ipcMain.on('terminal:write') is version-independent.)
//
// Run with: npx playwright test tests/e2e/paste-newline.test.ts
import { test, expect, _electron as electron } from '@playwright/test';
const fs = require('fs');
const os = require('os');
const path = require('path');

test.describe('Paste with confirm dialog disabled', () => {
  let app;
  let page;
  let testUserDataDir;

  test.beforeAll(async () => {
    testUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'echoterm-paste-e2e-'));

    app = await electron.launch({
      args: ['.', `--user-data-dir=${testUserDataDir}`],
      executablePath: require('electron'),
    });

    let mainWindow = null;
    await expect
      .poll(async () => {
        mainWindow = app.windows().find((w) => w.url().includes('index.html')) ?? null;
        return mainWindow;
      }, { timeout: 15000 })
      .toBeTruthy();
    page = mainWindow;
    await page.waitForLoadState('domcontentloaded');

    // Wait for the initial terminal to be up.
    await expect(page.locator('.pane').first()).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1500);
  });

  test.afterAll(async () => {
    if (!app) return;
    const killTree = () => {
      try { require('child_process').execSync(`taskkill /PID ${app.process().pid} /T /F`); }
      catch { try { app.process().kill('SIGKILL'); } catch { /* already exited */ } }
    };
    try {
      const closed = app.waitForEvent('close', { timeout: 10000 });
      if (page) {
        await page.evaluate(() => localStorage.setItem('skipCloseConfirm', 'true'), undefined, { timeout: 5000 });
        await page.evaluate(() => window.close(), undefined, { timeout: 5000 });
      }
      await closed;
    } catch { killTree(); }
    if (testUserDataDir) { try { fs.rmSync(testUserDataDir, { recursive: true, force: true }); } catch {} }
  });

  test('Ctrl+V multi-line paste with confirm disabled sends the raw text exactly once', async () => {
    // Disable the multi-line confirm dialog.
    await page.evaluate(() => localStorage.setItem('skipPastePreview', 'true'));

    // Capture every write at the main-process IPC boundary. This is the real
    // sink for terminal input (renderer → preload → ipcMain 'terminal:write'),
    // and avoids contextBridge's frozen window.api which a renderer wrapper
    // cannot replace in some Electron builds.
    await app.evaluate(({ ipcMain }) => {
      (globalThis as any).__writeLog = [];
      ipcMain.on('terminal:write', (_event, id, data) => {
        (globalThis as any).__writeLog.push({ id, data });
      });
    });

    // Focus the terminal and put a marker at the current prompt.
    const term = page.locator('.xterm-container');
    await term.click({ position: { x: 30, y: 30 } });
    await page.keyboard.type('echo CSTART');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(800);

    // Deterministically invoke the app's own paste handler. Prior attempts
    // (keyboard.press('Control+v'), webContents.paste()) depend on OS window
    // focus / the system clipboard and flake under concurrent workers; and a
    // ClipboardEvent constructor never populates clipboardData. Here we
    // dispatch a 'paste' event on the xterm container with a clipboardData
    // accessor, so the handler runs synchronously with our text — no focus,
    // no OS clipboard, no timing.
    const clipboardText = 'ECHO A\r\nECHO B\r\nECHO C';
    await page.evaluate((text) => {
      const dt = new DataTransfer();
      dt.setData('text', text);
      const ev = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'clipboardData', { get: () => dt });
      document.querySelector('.xterm-container')?.dispatchEvent(ev);
    }, clipboardText);

    // The dispatch above is fully synchronous (handler → pasteToTerminal →
    // window.api.write → ipcMain 'terminal:write'), so the write is recorded.
    const writes = await app.evaluate(() => (globalThis as any).__writeLog ?? []);
    const esc = String.fromCharCode(27); // ESC
    const clean = writes.map((w) => ({
      id: w.id,
      data: w.data
        .replace(new RegExp('^' + esc + '\\[200~'), '')   // strip bracketed-paste start marker
        .replace(new RegExp(esc + '\\[201~$'), ''),       // strip bracketed-paste end marker
    }));
    const multi = clean.filter((w) => w.data.includes('ECHO A') && w.data.includes('ECHO B') && w.data.includes('ECHO C'));

    // Regression: the clipboard text must be sent exactly once. CRLF line
    // endings must be normalized to bare LF — a raw \r written to ConPTY would
    // register as a second Enter and insert a blank line between pasted lines.
    expect(multi.length).toBe(1);
    expect(multi[0].data).toBe('ECHO A\nECHO B\nECHO C');
  });
});