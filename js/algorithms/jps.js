/**
 * JPS (Jump Point Search) Pathfinding Algorithm
 *
 * 4-directional movement. Greatly reduces search space compared to A*
 * by skipping straight-line regions and only evaluating "jump points" —
 * cells where the path must turn due to obstacles.
 *
 * Yields { open, closed, path } each step for visualization.
 */
AlgorithmRegistry.register('jps', 'JPS', function* jpsSearch(rows, cols, walls, start, end) {
  const openHeap = []; // [f, g, r, c]
  const openSet = new Set();
  const closedSet = new Set();
  const gScore = {};
  const parent = {};
  const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  function h(r, c) {
    return Math.abs(r - end.row) + Math.abs(c - end.col);
  }

  function isWalkable(r, c) {
    return r >= 0 && r < rows && c >= 0 && c < cols && !walls.has(r + ',' + c);
  }

  // Scan in a straight line from (r, c) in direction (dr, dc) for the goal.
  // Returns true if the goal is reachable in a clear straight line.
  function scanToGoal(r, c, dr, dc) {
    let cr = r + dr, cc = c + dc;
    while (isWalkable(cr, cc)) {
      if (cr === end.row && cc === end.col) return true;
      cr += dr;
      cc += dc;
    }
    return false;
  }

  // ============================================================
  // Jump: scan in direction (dx, dy) from (cx, cy) and return
  // the next jump point {row, col}, or null if blocked.
  // ============================================================
  function jump(cx, cy, dx, dy) {
    const nx = cx + dx;
    const ny = cy + dy;

    if (!isWalkable(nx, ny)) return null;
    if (nx === end.row && ny === end.col) return { row: nx, col: ny };

    // Perpendicular goal check: if the goal is reachable by going
    // north/south (for horizontal jumps) or east/west (for vertical
    // jumps) from this cell, mark this cell as a jump point.
    if (dy !== 0) {
      if (scanToGoal(nx, ny, -1, 0) || scanToGoal(nx, ny, 1, 0))
        return { row: nx, col: ny };
    }
    if (dx !== 0) {
      if (scanToGoal(nx, ny, 0, -1) || scanToGoal(nx, ny, 0, 1))
        return { row: nx, col: ny };
    }

    // Forced neighbor: vertical movement — check left/right
    if (dx !== 0) {
      if ((!isWalkable(cx, cy + 1) && isWalkable(nx, ny + 1)) ||
          (!isWalkable(cx, cy - 1) && isWalkable(nx, ny - 1))) {
        return { row: nx, col: ny };
      }
    }

    // Forced neighbor: horizontal movement — check up/down
    if (dy !== 0) {
      if ((!isWalkable(cx + 1, cy) && isWalkable(nx + 1, ny)) ||
          (!isWalkable(cx - 1, cy) && isWalkable(nx - 1, ny))) {
        return { row: nx, col: ny };
      }
    }

    return jump(nx, ny, dx, dy);
  }

  // ============================================================
  // Get successors (jump points) from (r, c) given parent (pr, pc)
  //
  // In 4-directional movement there are no diagonal short-cuts, so
  // we must try ALL perpendicular directions (not just forced ones).
  // The speed-up over A* still comes from straight-line jumping.
  // ============================================================
  function getSuccessors(r, c, pr, pc) {
    const result = [];

    if (pr === undefined) {
      // Start node: try all 4 directions
      for (const [dx, dy] of dirs) {
        const jp = jump(r, c, dx, dy);
        if (jp) result.push(jp);
      }
      // Fallback: if no jump points found at all, add immediate walkable
      // neighbors. This handles cases where walls block all jump paths.
      if (result.length === 0) {
        for (const [dx, dy] of dirs) {
          const nr = r + dx, nc = c + dy;
          if (isWalkable(nr, nc)) result.push({ row: nr, col: nc });
        }
      }
      return result;
    }

    const dx = Math.sign(r - pr);
    const dy = Math.sign(c - pc);

    // Natural: continue straight
    const straightJp = jump(r, c, dx, dy);
    if (straightJp) result.push(straightJp);

    // Perpendicular: always try both, with fallback to immediate neighbor
    // when the full jump finds no jump point.
    if (dx !== 0) {
      const jpEast = jump(r, c, 0, 1);
      if (jpEast) result.push(jpEast);
      else if (isWalkable(r, c + 1)) result.push({ row: r, col: c + 1 });

      const jpWest = jump(r, c, 0, -1);
      if (jpWest) result.push(jpWest);
      else if (isWalkable(r, c - 1)) result.push({ row: r, col: c - 1 });
    }
    if (dy !== 0) {
      const jpSouth = jump(r, c, 1, 0);
      if (jpSouth) result.push(jpSouth);
      else if (isWalkable(r + 1, c)) result.push({ row: r + 1, col: c });

      const jpNorth = jump(r, c, -1, 0);
      if (jpNorth) result.push(jpNorth);
      else if (isWalkable(r - 1, c)) result.push({ row: r - 1, col: c });
    }

    return result;
  }

  // ============================================================
  // Path reconstruction (fill intermediate cells along jumps)
  // ============================================================
  function reconstructPath(key) {
    const rev = [];
    let cur = key;
    while (cur && parent.hasOwnProperty(cur)) {
      const [cr, cc] = cur.split(',').map(Number);
      const pKey = parent[cur];
      if (pKey) {
        const [pr, pc] = pKey.split(',').map(Number);
        // Walk from child back toward parent (inclusive of child, exclusive of parent)
        const dr = Math.sign(cr - pr) || 0;
        const dc = Math.sign(cc - pc) || 0;
        let rr = cr, ccc = cc;
        while (rr !== pr || ccc !== pc) {
          rev.push({ row: rr, col: ccc });
          rr -= dr;
          ccc -= dc;
        }
      } else {
        rev.push({ row: cr, col: cc });
      }
      cur = pKey;
    }
    return rev.reverse();
  }

  // ============================================================
  // Main loop
  // ============================================================
  const startKey = start.row + ',' + start.col;
  openHeap.push([h(start.row, start.col), 0, start.row, start.col]);
  openSet.add(startKey);
  gScore[startKey] = 0;
  parent[startKey] = null;

  while (openHeap.length > 0) {
    openHeap.sort((a, b) => a[0] - b[0]);
    const [f, g, r, c] = openHeap.shift();
    const key = r + ',' + c;

    if (closedSet.has(key)) continue;

    openSet.delete(key);
    closedSet.add(key);

    if (r === end.row && c === end.col) {
      const path = reconstructPath(key);
      yield { open: new Set(openSet), closed: new Set(closedSet), path };
      return;
    }

    yield { open: new Set(openSet), closed: new Set(closedSet), path: null };

    // Determine parent for neighbor pruning
    const pKey = parent[key];
    let pr, pc;
    if (pKey) {
      [pr, pc] = pKey.split(',').map(Number);
    }

    const successors = getSuccessors(r, c, pr, pc);
    for (const jp of successors) {
      const jkey = jp.row + ',' + jp.col;
      const stepCost = Math.abs(jp.row - r) + Math.abs(jp.col - c);
      const tentG = g + stepCost;

      if (tentG < (gScore[jkey] ?? Infinity)) {
        gScore[jkey] = tentG;
        parent[jkey] = key;
        openHeap.push([tentG + h(jp.row, jp.col), tentG, jp.row, jp.col]);
        openSet.add(jkey);
      }
    }
  }

  yield { open: new Set(), closed: closedSet, path: [] };
});
