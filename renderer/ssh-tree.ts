/* ═══════════════════════════════════════════════════════════════════════════
   EchoTerm — Pure folder-tree helpers shared by the SSH panel's connection
   and user folder trees. No DOM / Electron / backend imports (renderer-only).
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Index folders by parentId (top-level folders keyed under '__root__'),
 * sorted by name within each level.
 */
export function buildFolderChildrenMap(folders) {
  const children = new Map();
  for (const f of folders) {
    const pid = f.parentId || '__root__';
    if (!children.has(pid)) children.set(pid, []);
    children.get(pid).push(f);
  }
  for (const [, list] of children) {
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  return children;
}

/**
 * Depth-first list of the folder tree (siblings sorted by name per level,
 * cycle-guarded) with the display label used by folder <select>s and the
 * "Move to folder" context submenu — tree guides plus a ├─ / └─ connector per
 * level, e.g. `└─ Name`, `│   └─ Child`. Order and text mirror the dialog
 * selects so the same folder reads identically in both places.
 */
export function folderTreeLabelEntries(folders) {
  const children = buildFolderChildrenMap(folders);
  const NBSP = '\u00A0';
  const out = [];
  const visited = new Set();
  const walk = (parentId, prefix) => {
    // Cycle guard: a corrupt payload (folder cycles) must not recurse forever.
    if (visited.has(parentId)) return;
    visited.add(parentId);
    const list = children.get(parentId) || [];
    list.forEach((f, i) => {
      const last = i === list.length - 1;
      const connector = last ? '└─ ' : '├─ ';
      out.push({ id: f.id, label: prefix + connector + f.name });
      walk(f.id, prefix + (last ? NBSP.repeat(3) : '│' + NBSP.repeat(2)));
    });
  };
  walk('__root__', '');
  return out;
}

/**
 * Union of the ids of several folders and all their transitive descendants.
 * Nested roots are counted once (visited set).
 */
/** Same as collectFolderSubtree but reuses a pre-built children map. */
function collectFolderSubtreeFrom(children, rootIds) {
  const ids = new Set();
  const queue = [...rootIds];
  while (queue.length > 0) {
    const pid = queue.shift();
    if (ids.has(pid)) continue;
    ids.add(pid);
    for (const f of (children.get(pid) || [])) queue.push(f.id);
  }
  return ids;
}

export function collectFolderSubtree(folders, rootIds) {
  return collectFolderSubtreeFrom(buildFolderChildrenMap(folders), rootIds);
}

/**
 * Reduce a multi-folder selection to its top-most ids: an id that sits inside
 * another selected id's subtree is already covered by that ancestor's delete.
 * Builds the children map once and memoizes each id's subtree, so the cost is
 * O(N + k·subtree-size) instead of rebuilding the map for every pair (O(k²·N)).
 */
export function topLevelFolderIds(ids, folders) {
  const children = buildFolderChildrenMap(folders);
  const memo = new Map();
  const subtreeOf = (id) => {
    if (!memo.has(id)) memo.set(id, collectFolderSubtreeFrom(children, [id]));
    return memo.get(id);
  };
  return ids.filter(id => !ids.some(other => other !== id && subtreeOf(other).has(id)));
}

/**
 * Group items by the folder they belong to. Items with a folderId that is not
 * in the folder list (or null) land in `ungrouped`.
 */
export function groupItemsByFolder(folders, items, folderIdOf) {
  const grouped = new Map();
  for (const f of folders) grouped.set(f.id, []);
  const ungrouped = [];
  for (const item of items) {
    const fid = folderIdOf(item);
    if (fid && grouped.has(fid)) grouped.get(fid).push(item);
    else ungrouped.push(item);
  }
  return { grouped, ungrouped };
}

/**
 * Total item count per folder including descendants, cycle-guarded. Pre-computes
 * every folder in `folders` (orphan subtrees included) so lookups never recompute.
 */
export function computeFolderTotalCounts(folders, folderChildren, folderItems) {
  const totals = new Map();
  const computing = new Set(); // cycle detection
  function calc(folderId) {
    if (totals.has(folderId)) return totals.get(folderId);
    if (computing.has(folderId)) return 0; // cycle detected, break
    computing.add(folderId);
    let count = (folderItems.get(folderId) || []).length;
    for (const sub of (folderChildren.get(folderId) || [])) {
      count += calc(sub.id);
    }
    computing.delete(folderId);
    totals.set(folderId, count);
    return count;
  }
  for (const f of folders) calc(f.id);
  return totals;
}
