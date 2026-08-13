/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Infrastructure adapter: Electron native file dialogs
   Implements the domain DialogService port.
   ═══════════════════════════════════════════════════════════════════════════ */

import { dialog } from 'electron';
import type { BrowserWindow } from 'electron';

import type { DialogService, FileDialogOptions, FileDialogResult } from '../../domain/ports/dialog-service';

export class ElectronDialogService implements DialogService {
  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  async pickExistingFile(options: FileDialogOptions): Promise<FileDialogResult> {
    const result = await dialog.showOpenDialog(this.getWindow(), {
      title: options.title,
      defaultPath: options.defaultPath,
      filters: options.filters,
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, filePath: null };
    }
    return { canceled: false, filePath: result.filePaths[0] };
  }

  async pickSaveFilePath(options: FileDialogOptions): Promise<FileDialogResult> {
    const result = await dialog.showSaveDialog(this.getWindow(), {
      title: options.title,
      defaultPath: options.defaultPath,
      filters: options.filters,
    });
    if (result.canceled) {
      return { canceled: true, filePath: null };
    }
    return { canceled: false, filePath: result.filePath ?? null };
  }
}
