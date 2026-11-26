// Character families for one level: each char hangs under its primary parent (spec 7.1.1).
import { isAvailable } from './queue.js';

const byOrder = (a, b) => a.char.order - b.char.order;

/**
 * The level's forest. A node is
 * `{ char, status: 'studied'|'new'|'later', needs, alsoParents, fromLevel, children }`:
 * `char` is the dataset record; `needs` (required parents not yet introduced) and
 * `alsoParents` (the parents other than the primary one) are characters. Roots are the
 * level's chars whose primary parent is null or in another level; `fromLevel` names that
 * level. Pure: reads its arguments and writes nothing.
 */
export function buildForest(chars, levelId, introduced) {
  const byId = new Map(chars.map((c) => [c.id, c]));
  const glyph = (id) => byId.get(id)?.char ?? id.slice(id.indexOf(':') + 1);

  const nodes = new Map();
  for (const c of chars) {
    if (c.level !== levelId) continue;
    const status = introduced.has(c.id) ? 'studied' : isAvailable(c, introduced) ? 'new' : 'later';
    nodes.set(c.id, {
      char: c,
      status,
      needs: (c.required ?? []).filter((id) => !introduced.has(id)).map(glyph),
      alsoParents: (c.parents ?? []).filter((id) => id !== c.primaryParent).map(glyph),
      fromLevel: null,
      children: [],
    });
  }

  const roots = [];
  for (const node of nodes.values()) {
    const parentId = node.char.primaryParent;
    const parent = parentId == null ? undefined : nodes.get(parentId);
    if (parent) {
      parent.children.push(node);
    } else {
      node.fromLevel = byId.get(parentId)?.level ?? null;
      roots.push(node);
    }
  }
  for (const node of nodes.values()) node.children.sort(byOrder);
  return roots.sort(byOrder);
}

/**
 * Roots grouped for display: roots that grow from the same earlier-level parent share
 * one group (`parent` is its id), placed where its first root falls in study order.
 * Every other root is a group of one with `parent: null`.
 */
export function familyGroups(roots) {
  const groups = [];
  const byParent = new Map();
  for (const node of roots) {
    const parent = node.fromLevel ? node.char.primaryParent : null;
    if (parent && byParent.has(parent)) {
      byParent.get(parent).nodes.push(node);
      continue;
    }
    const group = { parent, fromLevel: parent ? node.fromLevel : null, nodes: [node] };
    if (parent) byParent.set(parent, group);
    groups.push(group);
  }
  return groups;
}
