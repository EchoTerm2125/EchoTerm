// Integration tests — tab-bar action buttons hand keyboard focus back to the
// active terminal. Regression: clicking Echo All / Toggle All / Paste All /
// Echo Mode moved focus onto the button (a mouse-only surface) and nothing
// refocused the xterm textarea; paste-all never refocused, and the echo
// handlers bailed out when the active terminal stayed in the echo selection.
// The rule lives in one delegated #tabBar click listener in ui.ts that calls
// App.Terminal.refocus(), which is echo-aware. See docs/adr/0003-*.md.
import { setupTest, injectGroup, injectTerminal } from '../setup.js';

describe('Integration: Tab-bar click refocus', () => {
  let App;

  beforeEach(async () => {
    App = await setupTest('terminal', 'tabs', 'groups', 'ui', 'echo', 'menus');

    injectGroup('g1', 'Group 1');
    App.state.activeGroupId = 'g1';

    // Real binding order from app.ts init(): bindToolbar wires the delegated
    // #tabBar refocus listener, bindEchoControls wires the echo buttons.
    App.UI.bindToolbar();
    App.Echo.bindEchoControls();
  });

  function addTerminal(id) {
    const entry = injectTerminal(id);
    // Real spawnTerminal calls term.open(xtermDiv), which attaches the
    // textarea to the DOM so focus() is observable via document.activeElement.
    entry.term.open(entry.paneEl.querySelector('.xterm-container'));
    App.state.terminalGroups.set(id, 'g1');
    App.state.groups.get('g1').terminalIds.add(id);
    App.Tabs.addTab(id, 'powershell');
  }

  function clickButton(id) {
    document.getElementById(id).dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
  }

  // focusTerminal defers the actual xterm focus via setTimeout(…, 20).
  const settle = () => new Promise((r) => setTimeout(r, 40));

  it('ignores clicks on the tab list (not an action button)', () => {
    addTerminal(1);
    App.state.activeTerminalId = 1;
    const spy = vi.spyOn(App.Terminal, 'refocus');

    App.tabList.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(spy).not.toHaveBeenCalled();
  });

  it('refocuses the active terminal after Echo All in normal mode', async () => {
    addTerminal(1);
    App.state.activeTerminalId = 1;
    const spy = vi.spyOn(App.Terminal, 'refocus');

    clickButton('btnEchoAll');
    await settle();

    expect(spy).toHaveBeenCalled();
    expect(document.activeElement).toBe(App.state.terminals.get(1).term.textarea);
  });

  it('refocuses the active terminal after Paste All while it stays echoed', async () => {
    addTerminal(1);
    addTerminal(2);
    App.state.activeTerminalId = 2;
    App.state.echoModeActive = true;
    App.state.echoSelection.add(1);
    App.state.echoSelection.add(2);

    clickButton('btnEchoPaste');
    await settle();

    expect(document.activeElement).toBe(App.state.terminals.get(2).term.textarea);
  });

  it('refocuses an echoed terminal when the active one is deselected', async () => {
    addTerminal(1);
    addTerminal(2);
    App.state.activeTerminalId = 1; // not in the echo selection
    App.state.echoModeActive = true;
    App.state.echoSelection.add(2);

    clickButton('btnEchoPaste');
    await settle();

    expect(document.activeElement).toBe(App.state.terminals.get(2).term.textarea);
  });

  it('is a no-op when no terminal exists', async () => {
    clickButton('btnEchoAll');
    clickButton('btnEchoMode');
    await settle();

    expect(document.activeElement).not.toBeInstanceOf(HTMLTextAreaElement);
  });
});