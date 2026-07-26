/**
 * BFS (Breadth-First Search) Pathfinding Algorithm
 *
 * Explores cells in layers outward from the start — like a wave.
 * Uses a queue (FIFO), so it always expands the oldest unvisited cell first.
 * Guarantees the shortest path on unweighted grids (all step costs = 1).
 *
 * 4-directional movement. Yields { open, closed, path } each step.
 */
AlgorithmRegistry.register('bfs', '广度优先搜索 (BFS)', function* bfsSearch(rows, cols, walls, start, end) {
  const startKey = start.row + ',' + start.col;
  const endKey = end.row + ',' + end.col;
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  const queue = [startKey];
  const openSet = new Set([startKey]);
  const closedSet = new Set();
  const parent = {};
  parent[startKey] = null;

  while (queue.length > 0) {
    const key = queue.shift();
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
      queue.push(nkey);
      openSet.add(nkey);
    }
  }

  yield { open: new Set(), closed: closedSet, path: [] };
});
