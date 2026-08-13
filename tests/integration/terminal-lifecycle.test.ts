// Integration tests — Terminal lifecycle (spawn → focus → close)
import { vi } from 'vitest';
import { setupTest, injectGroup } from '../setup.js';

describe('Integration: Terminal Lifecycle', () => {
  let App;

  beforeEach(async () => {
    // Load all modules to test full integration
    App = await setupTest('terminal', 'tabs', 'groups', 'ui', 'echo', 'menus');

    // Set up a default group (required by spawnTerminal)
    injectGroup('g1', 'Group 1');
    App.state.activeGroupId = 'g1';
  });

  describe('spawnTerminal', () => {
    it('creates a terminal entry in state', async () => {
      const id = await App.Terminal.spawnTerminal('powershell');
      expect(id).toBe(1);
      expect(App.state.terminals.has(1)).toBe(true);

      const entry = App.state.terminals.get(1);
      expect(entry.shell).toBe('powershell');
      expect(entry.paneEl).toBeInstanceOf(HTMLElement);
      expect(entry.term).toBeDefined();
    });

    it('adds terminal to active group', async () => {
      await App.Terminal.spawnTerminal('powershell');
      expect(App.state.terminalGroups.get(1)).toBe('g1');
      expect(App.state.groups.get('g1').terminalIds.has(1)).toBe(true);
    });

    it('sets the new terminal as active', async () => {
      await App.Terminal.spawnTerminal('powershell');
      expect(App.state.activeTerminalId).toBe(1);
    });

    it('adds terminal to paneOrder', async () => {
      await App.Terminal.spawnTerminal('powershell');
      expect(App.state.paneOrder).toContain(1);
    });

    it('creates a pane with correct DOM structure', async () => {
      await App.Terminal.spawnTerminal('powershell');
      const pane = App.container.querySelector('.pane');
      expect(pane).not.toBeNull();
      expect(pane.querySelector('.pane-titlebar')).not.toBeNull();
      expect(pane.querySelector('.xterm-container')).not.toBeNull();
      expect(pane.querySelector('.pane-close')).not.toBeNull();
    });

    it('creates a tab in the tab bar', async () => {
      await App.Terminal.spawnTerminal('powershell');
      const tab = App.tabList.querySelector('.tab-item');
      expect(tab).not.toBeNull();
      expect(tab.dataset.termId).toBe('1');
    });

    it('spawns with different shells', async () => {
      await App.Terminal.spawnTerminal('cmd');
      const entry = App.state.terminals.get(1);
      expect(entry.shell).toBe('cmd');
    });

    it('shows a warning and does not create a terminal when Git Bash cannot be located', async () => {
      App.gitBashPath = null;
      App.UI.promptLocateGitBash = vi.fn(() => Promise.resolve(false));
      App.UI.showToast = vi.fn();

      const id = await App.Terminal.spawnTerminal('gitbash');

      expect(id).toBeNull();
      expect(App.state.terminals.size).toBe(0);
      expect(App.api.spawnTerminal).not.toHaveBeenCalled();
      expect(App.UI.showToast).toHaveBeenCalledWith(App.__('toastGitBashNotFound'));
    });

    it('increments terminal ID for each spawn', async () => {
      const id1 = await App.Terminal.spawnTerminal('powershell');
      const id2 = await App.Terminal.spawnTerminal('cmd');
      expect(id1).toBe(1);
      expect(id2).toBe(2);
      expect(App.state.terminals.size).toBe(2);
    });
  });

  describe('focusTerminal', () => {
    it('sets activeTerminalId', async () => {
      await App.Terminal.spawnTerminal('powershell');
      await App.Terminal.spawnTerminal('cmd');
      App.Terminal.focusTerminal(1);
      expect(App.state.activeTerminalId).toBe(1);
    });

    it('updates tab selection', async () => {
      await App.Terminal.spawnTerminal('powershell');
      await App.Terminal.spawnTerminal('cmd');
      App.Terminal.focusTerminal(2);
      const tab1 = App.Tabs.getTabCache().get(1);
      const tab2 = App.Tabs.getTabCache().get(2);
      expect(tab1.classList.contains('active')).toBe(false);
      expect(tab2.classList.contains('active')).toBe(true);
    });

    it('restores terminal focus after confirming paste preview with Ctrl+Enter', async () => {
      const id = await App.Terminal.spawnTerminal('powershell');
      const termEntry = App.state.terminals.get(id);
      const previewText = document.getElementById('pastePreviewText');

      App.Terminal.showPastePreview(id, 'line 1\nline 2');

      expect(document.activeElement).toBe(previewText);

      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        bubbles: true,
      }));

      await new Promise(resolve => setTimeout(resolve, 60));

      expect(document.activeElement).toBe(termEntry.term.textarea);
    });
  });

  describe('closeTerminal', () => {
    it('removes terminal from state', async () => {
      const id = await App.Terminal.spawnTerminal('powershell');
      App.Terminal.closeTerminal(id);
      expect(App.state.terminals.has(id)).toBe(false);
    });

    it('removes terminal from paneOrder', async () => {
      const id = await App.Terminal.spawnTerminal('powershell');
      App.Terminal.closeTerminal(id);
      expect(App.state.paneOrder).not.toContain(id);
    });

    it('removes terminal from group', async () => {
      const id = await App.Terminal.spawnTerminal('powershell');
      App.Terminal.closeTerminal(id);
      expect(App.state.terminalGroups.has(id)).toBe(false);
      expect(App.state.groups.get('g1').terminalIds.has(id)).toBe(false);
    });

    it('removes tab from DOM', async () => {
      const id = await App.Terminal.spawnTerminal('powershell');
      App.Terminal.closeTerminal(id);
      const tab = App.tabList.querySelector(`[data-term-id="${id}"]`);
      expect(tab).toBeNull();
    });

    it('shifts focus to next terminal in same group', async () => {
      const id1 = await App.Terminal.spawnTerminal('powershell');
      const id2 = await App.Terminal.spawnTerminal('cmd');
      App.Terminal.focusTerminal(id1);
      App.Terminal.closeTerminal(id1);
      expect(App.state.activeTerminalId).toBe(id2);
    });

    it('calls api.killTerminal', async () => {
      const id = await App.Terminal.spawnTerminal('powershell');
      App.Terminal.closeTerminal(id);
      expect(App.api.killTerminal).toHaveBeenCalledWith(id);
    });
  });
});
