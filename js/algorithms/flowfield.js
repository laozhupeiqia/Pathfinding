/**
 * Flow Field (流场寻路) Algorithm
 *
 * Two phases, all-at-once (no step-by-step animation):
 *
 * Phase 1 — Dijkstra wave from the end: compute the shortest distance from
 * every reachable cell back to the goal.
 *
 * Phase 2 — For each cell, pick the neighbor with the smallest distance and
 * store that direction as the "flow arrow."
 *
 * Phase 3 — Walk the flow field from start → end to extract the path.
 *
 * The result includes a `flowField` Map (cellKey → {dr, dc}) that the
 * rendering code uses to draw direction arrows in every cell.
 *
 * Yields { open, closed, path, flowField, isFlowField } once.
 */
AlgorithmRegistry.register('flowfield', '流场寻路', function* flowFieldSearch(rows, cols, walls, start, end) {
  const startKey = start.row + ',' + start.col;
  const endKey = end.row + ',' + end.col;
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  // ---- Min-heap helpers ----
  const heap = [];
  function push(item) {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  }
  function pop() {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length > 0) {
      heap[0] = last;
      let i = 0, n = heap.length;
      while (true) {
        let s = i;
        const l = i * 2 + 1, r = i * 2 + 2;
        if (l < n && heap[l][0] < heap[s][0]) s = l;
        if (r < n && heap[r][0] < heap[s][0]) s = r;
        if (s === i) break;
        [heap[i], heap[s]] = [heap[s], heap[i]];
        i = s;
      }
    }
    return top;
  }

  // ---- Phase 1: distance field from the end ----
  const dist = {};
  const closed = new Set();

  dist[endKey] = 0;
  push([0, end.row, end.col]);

  while (heap.length > 0) {
    const [d, r, c] = pop();
    const key = r + ',' + c;
    if (closed.has(key)) continue;
    closed.add(key);

    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc, nkey = nr + ',' + nc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (walls.has(nkey)) continue;
      const tent = d + 1;
      if (tent < (dist[nkey] ?? Infinity)) {
        dist[nkey] = tent;
        push([tent, nr, nc]);
      }
    }
  }

  // ---- Phase 2: flow direction for every reachable cell ----
  // Tie-breaking: when two neighbors have the same distance, prefer the
  // direction that has a larger component toward the goal (dot product).
  // Otherwise a cell at the wall corner might point RIGHT when it should
  // point DOWN, because "right" happens to be checked first in dirs.
  const flowField = new Map();
  for (const key of closed) {
    const [r, c] = key.split(',').map(Number);
    const drToEnd = end.row - r;
    const dcToEnd = end.col - c;
    let bestDir = null;
    let bestDist = Infinity;
    let bestDot = -Infinity;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc, nkey = nr + ',' + nc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (walls.has(nkey)) continue;
      const nd = dist[nkey];
      if (nd === undefined) continue;
      const dot = dr * drToEnd + dc * dcToEnd;
      if (nd < bestDist || (nd === bestDist && dot > bestDot)) {
        bestDist = nd;
        bestDot = dot;
        bestDir = { dr, dc };
      }
    }
    if (bestDir) flowField.set(key, bestDir);
  }

  // ---- Phase 3: walk the flow field start → end ----
  const path = [];
  const seen = new Set();
  let cur = startKey;
  while (cur !== endKey) {
    if (seen.has(cur)) break; // loop guard
    seen.add(cur);
    const [r, c] = cur.split(',').map(Number);
    path.push({ row: r, col: c });
    const dir = flowField.get(cur);
    if (!dir) { path.length = 0; break; }
    cur = (r + dir.dr) + ',' + (c + dir.dc);
  }
  if (path.length > 0) path.push({ row: end.row, col: end.col });

  // ---- Done ----
  yield {
    open: new Set(),
    closed,
    path,
    flowField,
    isFlowField: true,
  };
});
