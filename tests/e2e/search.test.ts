// E2E tests — Terminal search: Ctrl+F find bar and the Ctrl+Shift+F panel window
// Run with: npm run test:e2e
import { test, expect, _electron as electron } from '@playwright/test';
const fs = require('fs');
const os = require('os');
const path = require('path');

test.describe('EchoTerm search E2E', () => {
  let app;
  let page;
  let testUserDataDir;

  test.beforeAll(async () => {
    testUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'echoterm-search-e2e-'));

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
    // Wait for the first terminal so there is something to search.
    await expect(page.locator('.pane').first()).toBeVisible({ timeout: 10000 });
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
    } catch {
      killTree();
    }
    if (testUserDataDir) {
      try { fs.rmSync(testUserDataDir, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  });

  test('Ctrl+F opens the find bar over the active pane', async () => {
    await page.locator('.xterm-container').first().click();
    await page.keyboard.press('Control+f');

    const findBar = page.locator('#findBar');
    await expect(findBar).toBeVisible();

    // Escape closes it again.
    await page.keyboard.press('Escape');
    await expect(findBar).toBeHidden();
  });

  test('Ctrl+Shift+F opens the search panel window', async () => {
    await page.locator('.xterm-container').first().click();
    await page.keyboard.press('Control+Shift+F');

    let panel = null;
    await expect
      .poll(async () => {
        panel = app.windows().find((w) => w.url().includes('search-window.html')) ?? null;
        return panel;
      }, { timeout: 10000 })
      .toBeTruthy();

    await panel.waitForLoadState('domcontentloaded');
    await expect(panel.locator('#panelTitleLabel')).toBeVisible();

    // Running a search returns the panel's "no matches" state for a term that
    // cannot appear in a fresh terminal.
    await panel.locator('#panelInput').fill('zzz-no-such-text-zzz');
    await panel.locator('#panelInput').press('Enter');
    await expect(panel.locator('.panel-empty')).toBeVisible({ timeout: 5000 });

    // Closing the panel removes its window.
    await panel.locator('#panelClose').click();
    await expect
      .poll(() => app.windows().some((w) => w.url().includes('search-window.html')), { timeout: 10000 })
      .toBe(false);
  });
});
