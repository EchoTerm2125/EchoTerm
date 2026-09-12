const { contextBridge, ipcRenderer } = require('electron');

import type {
  PanelGroupState,
  PanelSearchOptions,
  SearchMatch,
  SearchPanelTheme,
  SearchResults,
} from './shared/ipc';

/**
 * Bridge for the search panel window. The panel owns no terminal — it asks the
 * main window's renderer (relayed by the main process) to run searches and to
 * jump to a match.
 */
const searchApi = {
  /** Current theme + translated labels, cached by the main process. */
  init: (): Promise<SearchPanelTheme> => ipcRenderer.invoke('panel:init'),
  /** The active group's last search, or null when it has never been searched. */
  groupState: (): Promise<PanelGroupState | null> => ipcRenderer.invoke('panel:group-state'),
  /** Group switches push the newly active group's last search. */
  onShow: (callback: (state: PanelGroupState | null) => void): (() => void) => {
    const listener = (_event: unknown, state: unknown) => callback((state ?? null) as PanelGroupState | null);
    ipcRenderer.on('panel:show', listener);
    return () => ipcRenderer.removeListener('panel:show', listener);
  },
  run: (query: string, options: PanelSearchOptions): Promise<SearchResults> =>
    ipcRenderer.invoke('panel:run', query, options),
  jump: (match: SearchMatch): void => ipcRenderer.send('panel:jump', match),
  close: (): void => ipcRenderer.send('panel:close'),
  onTheme: (callback: (info: SearchPanelTheme) => void): (() => void) => {
    const listener = (_event: unknown, info: unknown) => callback(info as SearchPanelTheme);
    ipcRenderer.on('panel:theme', listener);
    return () => ipcRenderer.removeListener('panel:theme', listener);
  },
};

contextBridge.exposeInMainWorld('searchApi', searchApi);

export {};
