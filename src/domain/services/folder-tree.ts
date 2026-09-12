/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Domain service: folder tree traversal & cycle guards
   Pure logic — no Node/Electron imports allowed (see .dependency-cruiser.cjs).
   Generic over any `{id, parentId}` node — used by both connection folders
   and user folders.
   ═══════════════════════════════════════════════════════════════════════════ */

/** Minimal structural shape needed by the tree helpers. */
interface FolderNode {
  id: string;
  parentId: string | null;
}

/**
 * Collect the id of a folder and all of its transitive descendants.
 * Used when deleting a folder subtree.
 */
export function collectFolderAndDescendantIds(folders: FolderNode[], rootId: string): Set<string> {
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
  folders: FolderNode[],
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

/** A folder in a copied subtree: the source id plus its freshly minted copy. */
export interface ClonedFolderNode {
  oldId: string;
  id: string;
  name: string;
  parentId: string | null;
}

/**
 * Deep-copy a folder subtree: mint a fresh id for the root and every
 * descendant, reparent each copy onto its copied parent, and append " (copy)"
 * to the root copy's name only (inner folders keep their names). The root copy
 * takes `newParentId`. Pure — id minting is injected by the caller.
 */
export function cloneFolderSubtree<N extends { id: string; name: string; parentId?: string | null }>(
  folders: N[],
  rootId: string,
  newParentId: string | null,
  mintId: () => string,
): { nodes: ClonedFolderNode[]; idMap: Map<string, string> } {
  const subtreeIds = collectFolderAndDescendantIds(
    folders.map(f => ({ id: f.id, parentId: f.parentId ?? null })),
    rootId,
  );
  // Mint every id up-front so a child can point at its copied parent's id
  // regardless of iteration order.
  const idMap = new Map<string, string>();
  for (const id of subtreeIds) idMap.set(id, mintId());

  const nodes: ClonedFolderNode[] = [];
  for (const id of subtreeIds) {
    const source = folders.find(f => f.id === id);
    if (!source) continue;
    const isRoot = id === rootId;
    const oldParentId = source.parentId ?? null;
    nodes.push({
      oldId: id,
      id: idMap.get(id)!,
      name: isRoot ? `${source.name} (copy)` : source.name,
      parentId: isRoot ? newParentId : (oldParentId ? idMap.get(oldParentId) ?? null : null),
    });
  }
  return { nodes, idMap };
}
