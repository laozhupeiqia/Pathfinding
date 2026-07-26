/**
 * DFS (Depth-First Search) Pathfinding Algorithm
 *
 * Explores as far as possible along each branch before backtracking.
 * Uses a stack (LIFO), so the most recently discovered cell is expanded first.
 *
 * WARNING: Does NOT guarantee the shortest path — may run deep into dead ends.
 * Good for demonstrating why "go deep first" is a bad strategy for pathfinding.
 *
 * 4-directional movement. Yields { open, closed, path } each step.
 */
AlgorithmRegistry.register('dfs', '深度优先搜索 (DFS)', function* dfsSearch(rows, cols, walls, start, end) {
  const startKey = start.row + ',' + start.col;
  const endKey = end.row + ',' + end.col;
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  const stack = [startKey];
  const openSet = new Set([startKey]);
  const closedSet = new Set();
  const parent = {};
  parent[startKey] = null;

  while (stack.length > 0) {
    const key = stack.pop();
    const [r, c] = key.split(',').map(Number);

    if (closedSet.has(key)) continue;

    openSet.delete(key);
    closedSet.add(key);

    if (r === end.row && c === end.col) {
      const path = [];
      let cur = key;
      while (cur && parent.hasOwnProperty(cur)) {
        const [pr, pc] = cur.split(',').map(Number);
        path.unshift({ row: pr, col: pc });
        cur = parent[cur];
      }
      yield { open: new Set(openSet), closed: new Set(closedSet), path };
      return;
    }

    yield { open: new Set(openSet), closed: new Set(closedSet), path: null };

    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      const nkey = nr + ',' + nc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (walls.has(nkey)) continue;
      if (closedSet.has(nkey)) continue;
      if (openSet.has(nkey)) continue;

      parent[nkey] = key;
      stack.push(nkey);
      openSet.add(nkey);
    }
  }

  yield { open: new Set(), closed: closedSet, path: [] };
});
