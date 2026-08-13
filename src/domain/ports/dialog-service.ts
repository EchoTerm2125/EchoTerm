/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain port: native file dialogs
   Async to match the underlying Electron dialog API.
   Implemented by an infrastructure adapter (Phase 3).
   ═══════════════════════════════════════════════════════════════════════════ */

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface FileDialogOptions {
  title: string;
  defaultPath?: string;
  filters?: FileFilter[];
}

export interface FileDialogResult {
  canceled: boolean;
  filePath: string | null;
}

export interface DialogService {
  /** Open dialog for an existing file. */
  pickExistingFile(options: FileDialogOptions): Promise<FileDialogResult>;
  /** Save dialog for choosing a (possibly new) file path. */
  pickSaveFilePath(options: FileDialogOptions): Promise<FileDialogResult>;
}
