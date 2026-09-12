// Unit tests for src/domain/services/folder-tree.ts
import { collectFolderAndDescendantIds, cloneFolderSubtree, wouldCreateFolderCycle } from '../../src/domain/services/folder-tree';
import type { ConnectionFolder } from '../../src/domain/entities/ssh';

function folder(id: string, parentId: string | null): ConnectionFolder {
  return { id, name: id, parentId };
}

describe('collectFolderAndDescendantIds', () => {
  it('collects a folder and its transitive descendants only', () => {
    const folders = [
      folder('g1', null),
      folder('g2', 'g1'),
      folder('g3', 'g2'),
      folder('g4', null), // sibling — must not be collected
    ];
    expect(collectFolderAndDescendantIds(folders, 'g1')).toEqual(new Set(['g1', 'g2', 'g3']));
  });

  it('returns just the folder itself when it has no children', () => {
    const folders = [
      folder('g1', null),
      folder('g2', 'g1'),
    ];
    expect(collectFolderAndDescendantIds(folders, 'g2')).toEqual(new Set(['g2']));
  });

  it('collects deep chains regardless of array order', () => {
    // Children listed before their parents — fixed-point loop must still find them
    const folders = [
      folder('g3', 'g2'),
      folder('g2', 'g1'),
      folder('g1', null),
    ];
    expect(collectFolderAndDescendantIds(folders, 'g1')).toEqual(new Set(['g1', 'g2', 'g3']));
  });
});

describe('wouldCreateFolderCycle', () => {
  it('detects making a folder its own parent', () => {
    expect(wouldCreateFolderCycle([folder('g1', null)], 'g1', 'g1')).toBe(true);
  });

  it('detects moving a folder under its own descendant', () => {
    const folders = [
      folder('a', null),
      folder('b', 'a'),
      folder('c', 'b'),
    ];
    // Setting a.parentId = c would create c → b → a → c
    expect(wouldCreateFolderCycle(folders, 'a', 'c')).toBe(true);
  });

  it('allows a valid reparenting', () => {
    const folders = [
      folder('a', null),
      folder('b', null),
      folder('c', 'b'),
    ];
    expect(wouldCreateFolderCycle(folders, 'a', 'c')).toBe(false);
  });

  it('allows any parent for a brand-new folder (no id yet)', () => {
    const folders = [folder('a', null)];
    expect(wouldCreateFolderCycle(folders, undefined, 'a')).toBe(false);
  });

  it('allows null/undefined parent (root level)', () => {
    const folders = [folder('a', null)];
    expect(wouldCreateFolderCycle(folders, 'a', null)).toBe(false);
    expect(wouldCreateFolderCycle(folders, 'a', undefined)).toBe(false);
  });

  it('terminates on pre-existing corrupt cycles in the data', () => {
    // Corrupt data: x ↔ y already form a cycle; moving z under x must not hang
    const folders = [
      folder('x', 'y'),
      folder('y', 'x'),
      folder('z', null),
    ];
    expect(wouldCreateFolderCycle(folders, 'z', 'x')).toBe(false);
  });

  it('handles parent id pointing to a non-existent folder', () => {
    expect(wouldCreateFolderCycle([folder('a', null)], 'a', 'missing')).toBe(false);
  });
});

describe('cloneFolderSubtree', () => {
  it('mints fresh ids, reparents copies, and renames only the root', () => {
    const folders = [
      folder('g1', null),
      folder('g2', 'g1'),
      folder('g9', null),
    ];
    let n = 9;
    const { nodes, idMap } = cloneFolderSubtree(folders, 'g1', 'g9', () => `g${++n}`);

    expect(idMap.get('g1')).toBe('g10');
    expect(idMap.get('g2')).toBe('g11');
    expect(nodes).toEqual([
      { oldId: 'g1', id: 'g10', name: 'g1 (copy)', parentId: 'g9' },
      { oldId: 'g2', id: 'g11', name: 'g2', parentId: 'g10' },
    ]);
  });

  it('returns only the renamed root when the folder has no descendants', () => {
    let n = 0;
    const { nodes } = cloneFolderSubtree([folder('g1', null)], 'g1', null, () => `n${++n}`);
    expect(nodes).toEqual([{ oldId: 'g1', id: 'n1', name: 'g1 (copy)', parentId: null }]);
  });
});
