// E2E tests — Real Electron app launch and core flows
// Run with: npx playwright test
import { test, expect, _electron as electron } from '@playwright/test';
const fs = require('fs');
const os = require('os');
const path = require('path');

test.describe('EchoTerm E2E', () => {
  let app;
  let page;
  let testUserDataDir;

  test.beforeAll(async () => {
    // Run against an isolated profile so the test never writes to the real
    // app's user data (localStorage, SSH vault, etc.). For example the
    // close-warning opt-out in afterAll must not persist after the run.
    testUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'echoterm-e2e-'));

    // Launch the Electron app
    app = await electron.launch({
      args: ['.', `--user-data-dir=${testUserDataDir}`], // package.json "main" (build/main.js) is the entry
      executablePath: require('electron'),
    });

    // DevTools opens detached and can be the "first" window — instead of relying
    // on window order, wait for the real app window (the one loading index.html).
    let mainWindow = null;
    await expect
      .poll(async () => {
        mainWindow = app.windows().find((w) => w.url().includes('index.html')) ?? null;
        return mainWindow;
      }, { timeout: 15000 })
      .toBeTruthy();
    page = mainWindow;
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    if (!app) return;
    const killTree = () => {
      // Kill the whole process tree so no Electron children stay behind
      try { require('child_process').execSync(`taskkill /PID ${app.process().pid} /T /F`); }
      catch { try { app.process().kill('SIGKILL'); } catch { /* already exited */ } }
    };
    try {
      const closed = app.waitForEvent('close', { timeout: 10000 });
      if (page) {
        // The close-warning blocks graceful close; opt out for this run so the
        // app can exit instead of hanging the worker teardown. The flag only
        // lands in the isolated --user-data-dir, never the real app profile.
        await page.evaluate(() => localStorage.setItem('skipCloseConfirm', 'true'), undefined, { timeout: 5000 });
        await page.evaluate(() => window.close(), undefined, { timeout: 5000 });
      }
      await closed;
    } catch {
      killTree();
    }
    // Remove the isolated profile created for this run
    if (testUserDataDir) {
      try { fs.rmSync(testUserDataDir, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  });

  test('app launches and shows the toolbar', async () => {
    // Check that the toolbar exists
    const toolbar = page.locator('#toolbar');
    await expect(toolbar).toBeVisible();

    // Check app title
    const title = page.locator('.app-title');
    await expect(title).toHaveText('EchoTerm');
  });

  test('terminal pane is present on startup', async () => {
    // Should have at least one terminal pane
    const panes = page.locator('.pane');
    await expect(panes.first()).toBeVisible({ timeout: 5000 });
  });

  test('tab bar is visible', async () => {
    const tabBar = page.locator('#tabBar');
    await expect(tabBar).toBeVisible();
  });

  test('group bar is visible', async () => {
    const groupBar = page.locator('#groupBar');
    await expect(groupBar).toBeVisible();
  });

  test('New Terminal button spawns a second terminal', async () => {
    // Count initial tabs
    const initialTabs = await page.locator('.tab-item').count();

    // Click the New Terminal button
    await page.locator('#btnNewTerminal').click();
    await page.waitForTimeout(1000);

    // Should have one more tab
    const newTabs = await page.locator('.tab-item').count();
    expect(newTabs).toBe(initialTabs + 1);
  });

  test('clicking a tab focuses the terminal', async () => {
    // Spawn a second terminal if needed
    const tabs = page.locator('.tab-item');
    const tabCount = await tabs.count();
    if (tabCount < 2) {
      await page.locator('#btnNewTerminal').click();
      await page.waitForTimeout(1000);
    }

    // Click the second tab
    await page.locator('.tab-item').nth(1).click();
    await page.waitForTimeout(500);

    // Verify it has the active class
    await expect(page.locator('.tab-item').nth(1)).toHaveClass(/active/);
  });

  test('context menu appears on right-clicking a tab', async () => {
    // Right-click on a tab
    const firstTab = page.locator('.tab-item').first();
    await firstTab.click({ button: 'right' });
    await page.waitForTimeout(500);

    // Context menu should be visible
    const ctxMenu = page.locator('#tabContextMenu');
    await expect(ctxMenu).toBeVisible();
  });

  test('status bar shows terminal count', async () => {
    const status = page.locator('#statusTerminalCount');
    await expect(status).toBeVisible();
    const text = await status.textContent();
    expect(text).toMatch(/\d+ terminal/);
  });
});
