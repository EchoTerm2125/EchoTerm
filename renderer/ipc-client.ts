/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Renderer IPC gateway (outbound port)
   All renderer → main traffic goes through this single client. It defaults
   to the preload bridge (window.api); tests inject a fake with
   setIpcClient() before any renderer module loads.
   ═══════════════════════════════════════════════════════════════════════════ */

import type { WindowApi } from '../shared/ipc';

let client: WindowApi | null = null;

/** Inject an IPC client (a test fake or an alternative transport). */
export function setIpcClient(injected: WindowApi): void {
  client = injected;
}

/** The active IPC client; falls back to the preload bridge on first use. */
export function getIpcClient(): WindowApi {
  if (!client) client = window.api;
  return client;
}
