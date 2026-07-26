/**
 * Dijkstra's Algorithm
 *
 * Explores cells in order of their distance from the start (g-score only,
 * no heuristic). Guarantees the shortest path on any graph with non-negative
 * edge weights.
 *
 * On a uniform 4-directional grid (all step costs = 1), Dijkstra behaves
 * identically to BFS but uses a priority queue ordered by cost-so-far,
 * producing a circular wave-front centered on the start — great to contrast
 * with A*'s goal-biased frontier.
 *
 * Yields { open, closed, path } each step for visualization.
 */
AlgorithmRegistry.register('dijkstra', 'Dijkstra', function* dijkstraSearch(rows, cols, walls, start, end) {
  const startKey = start.row + ',' + start.col;
  const endKey = end.row + ',' + end.col;
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  const heap = [];
  const openSet = new Set();
  const closedSet = new Set();
  const gScore = {};
  const parent = {};

  function push(g, r, c) {
    heap.push([g, r, c]);
    openSet.add(r + ',' + c);
  }

  // Min-heap push (sift up)
  function pushHeap(item) {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  }

  function popHeap() {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0;
      const n = heap.length;
      while (true) {
        let smallest = i;
        const l = i * 2 + 1, r = i * 2 + 2;
        if (l < n && heap[l][0] < heap[smallest][0]) smallest = l;
        if (r < n && heap[r][0] < heap[smallest][0]) smallest = r;
        if (smallest === i) break;
        [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
        i = smallest;
      }
    }
    return top;
  }

  gScore[startKey] = 0;
  parent[startKey] = null;
  pushHeap([0, start.row, start.col]);

  while (heap.length > 0) {
    const [g, r, c] = popHeap();
    const key = r + ',' + c;

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

      const tentG = g + 1;
      if (tentG < (gScore[nkey] ?? Infinity)) {
        gScore[nkey] = tentG;
        parent[nkey] = key;
        pushHeap([tentG, nr, nc]);
        openSet.add(nkey);
      }
    }
  }

  yield { open: new Set(), closed: closedSet, path: [] };
});
