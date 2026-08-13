/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Application contract: session event callbacks
   Passed to session-spawning use cases so they stay decoupled from the
   transport that delivers output to the renderer.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SessionEvents {
  onData(data: string): void;
  onExit(): void;
}
