const { contextBridge, ipcRenderer } = require('electron');

import type { SearchMatch, SearchPanelTheme, SearchResults } from './shared/ipc';

/**
 * Bridge for the search panel window. The panel owns no terminal — it asks the
 * main window's renderer (relayed by the main process) to run searches and to
 * jump to a match.
 */
const searchApi = {
  /** Current theme + translated labels, cached by the main process. */
  init: (): Promise<SearchPanelTheme> => ipcRenderer.invoke('panel:init'),
  run: (query: string): Promise<SearchResults> => ipcRenderer.invoke('panel:run', query),
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
