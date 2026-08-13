/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain service: folder tree traversal & cycle guards
   Pure logic — no Node/Electron imports allowed (see .dependency-cruiser.cjs).
   ═══════════════════════════════════════════════════════════════════════════ */

import type { Folder } from '../entities/ssh';

/**
 * Collect the id of a folder and all of its transitive descendants.
 * Used when deleting a folder subtree.
 */
export function collectFolderAndDescendantIds(folders: Folder[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let foundNew = true;
  while (foundNew) {
    foundNew = false;
    for (const f of folders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        foundNew = true;
      }
    }
  }
  return ids;
}

/**
 * True if setting `folderId`'s parent to `parentId` would create a cycle
 * (i.e. `folderId` already appears in the ancestor chain of `parentId`,
 * or the folder is made its own parent).
 */
export function wouldCreateFolderCycle(
  folders: Folder[],
  folderId: string | undefined,
  parentId: string | null | undefined,
): boolean {
  if (!parentId) return false;
  if (folderId && parentId === folderId) return true;

  // Walk up the parent chain from parentId looking for folderId
  const visited = new Set<string>();
  let pid: string | null | undefined = parentId;
  while (pid) {
    if (pid === folderId) return true;
    if (visited.has(pid)) return false; // safety against existing corrupt data
    visited.add(pid);
    const parent = folders.find(f => f.id === pid);
    pid = parent ? parent.parentId : null;
  }
  return false;
}
