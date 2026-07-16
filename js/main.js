// ==============================
// DOM refs
// ==============================
const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');
const rowsInput = document.getElementById('rowsInput');
const colsInput = document.getElementById('colsInput');
const algoSelect = document.getElementById('algoSelect');
const btnStart = document.getElementById('btnStart');
const btnEnd = document.getElementById('btnEnd');
const btnWall = document.getElementById('btnWall');
const btnReset = document.getElementById('btnReset');
const btnClearAll = document.getElementById('btnClearAll');
const btnStartDemo = document.getElementById('btnStartDemo');
const statusEl = document.getElementById('status');

// ==============================
// State
// ==============================
let currentTool = null;
let startCell = null;
let endCell = null;
const walls = new Set();
let animTimer = null;
let algoGen = null;
let searchState = null;
const STEP_DELAY = 80;

function cellKey(r, c) {
  return r + ',' + c;
}

// ==============================
// Status message
// ==============================
function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = 'status-msg' + (type ? ' status-' + type : '');
}

function clearStatus() {
  statusEl.textContent = '';
  statusEl.className = 'status-msg';
}

// ==============================
// Algorithm select population
// ==============================
function populateAlgoSelect() {
  const options = AlgorithmRegistry.getOptions();
  algoSelect.innerHTML = '<option value="">-- 选择算法 --</option>';
  for (const algo of options) {
    const opt = document.createElement('option');
    opt.value = algo.id;
    opt.textContent = algo.name;
    algoSelect.appendChild(opt);
  }
}

// ==============================
// Drawing
// ==============================
function getCellSize(rows, cols) {
  const maxW = Math.min(800, window.innerWidth - 360);
  const maxH = Math.min(700, window.innerHeight - 120);
  const byRows = Math.floor(maxH / rows);
  const byCols = Math.floor(maxW / cols);
  return Math.max(4, Math.min(byRows, byCols, 40));
}

function drawGrid() {
  const rows = parseInt(rowsInput.value) || 25;
  const cols = parseInt(colsInput.value) || 25;
  const cs = getCellSize(rows, cols);
  const w = cols * cs;
  const h = rows * cs;
  canvas.width = w;
  canvas.height = h;

  // Background
  ctx.fillStyle = '#181825';
  ctx.fillRect(0, 0, w, h);

  // Closed set (explored)
  if (searchState) {
    ctx.fillStyle = '#334155';
    for (const key of searchState.closed) {
      const [r, c] = key.split(',').map(Number);
      ctx.fillRect(c * cs, r * cs, cs, cs);
    }
  }

  // Open set (to explore)
  if (searchState) {
    ctx.fillStyle = '#60a5fa';
    for (const key of searchState.open) {
      const [r, c] = key.split(',').map(Number);
      ctx.fillRect(c * cs, r * cs, cs, cs);
    }
  }

  // Walls
  ctx.fillStyle = '#1e293b';
  for (const key of walls) {
    const [r, c] = key.split(',').map(Number);
    ctx.fillRect(c * cs, r * cs, cs, cs);
  }

  // Final path
  if (searchState && searchState.path) {
    ctx.fillStyle = '#fbbf24';
    for (const p of searchState.path) {
      ctx.fillRect(p.col * cs, p.row * cs, cs, cs);
    }
  }

  // Grid lines
  ctx.strokeStyle = '#2a3a5c';
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= cols; c++) {
    const x = c * cs;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    const y = r * cs;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Start
  if (startCell) {
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(startCell.col * cs + 1, startCell.row * cs + 1, cs - 2, cs - 2);
  }
  // End
  if (endCell) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(endCell.col * cs + 1, endCell.row * cs + 1, cs - 2, cs - 2);
  }

  updateMapDisplay();
}

// ==============================
// Tool logic
// ==============================
function getCell(e) {
  const rows = parseInt(rowsInput.value) || 25;
  const cols = parseInt(colsInput.value) || 25;
  const cs = getCellSize(rows, cols);
  const rect = canvas.getBoundingClientRect();
  const col = Math.floor((e.clientX - rect.left) / cs);
  const row = Math.floor((e.clientY - rect.top) / cs);
  if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
  return { row, col };
}

function setTool(tool) {
  if (currentTool === tool) {
    currentTool = null;
    document.querySelectorAll('.tool-btn').forEach((b) => b.classList.remove('active'));
    canvas.style.cursor = 'pointer';
    return;
  }
  currentTool = tool;
  btnStart.classList.toggle('active', tool === 'start');
  btnEnd.classList.toggle('active', tool === 'end');
  btnWall.classList.toggle('active', tool === 'wall');
  canvas.style.cursor = tool === 'wall' ? 'crosshair' : 'pointer';
}

// ==============================
// Map data string (for debugging)
// ==============================
const mapText = document.getElementById('mapText');
const btnCopyMap = document.getElementById('btnCopyMap');

function generateMapString() {
  const rows = parseInt(rowsInput.value) || 25;
  const cols = parseInt(colsInput.value) || 25;
  const lines = [];
  lines.push(`rows=${rows},cols=${cols}`);
  for (let r = 0; r < rows; r++) {
    let line = '';
    for (let c = 0; c < cols; c++) {
      if (startCell && startCell.row === r && startCell.col === c) line += 'S';
      else if (endCell && endCell.row === r && endCell.col === c) line += 'E';
      else if (walls.has(cellKey(r, c))) line += '#';
      else line += '.';
    }
    lines.push(line);
  }
  return lines.join('\n');
}

function updateMapDisplay() {
  mapText.textContent = generateMapString();
}

btnCopyMap.addEventListener('click', () => {
  const text = generateMapString();
  navigator.clipboard.writeText(text).then(() => {
    setStatus('地图数据已复制', 'info');
  }).catch(() => {
    setStatus('复制失败，请手动选中文本复制', 'error');
  });
});

// ==============================
// Search controls
// ==============================
function stopSearch() {
  if (animTimer) clearTimeout(animTimer);
  animTimer = null;
  algoGen = null;
}

function startSearch(algoId) {
  stopSearch();
  if (!startCell || !endCell) return;

  const rows = parseInt(rowsInput.value) || 25;
  const cols = parseInt(colsInput.value) || 25;

  const factory = AlgorithmRegistry.get(algoId);
  if (!factory) return;

  searchState = null;
  algoGen = factory(rows, cols, walls, startCell, endCell);

  function tick() {
    if (!algoGen) return;
    const result = algoGen.next();
    if (result.done) {
      animTimer = null;
      algoGen = null;
      if (searchState && searchState.path) {
        if (searchState.path.length > 0) {
          setStatus('寻路完成！路径长度：' + searchState.path.length, 'success');
        } else {
          setStatus('寻路失败：无法到达终点', 'error');
        }
      }
      return;
    }
    searchState = result.value;
    drawGrid();
    animTimer = setTimeout(tick, STEP_DELAY);
  }
  animTimer = setTimeout(tick, STEP_DELAY);
}

function resetSearch() {
  stopSearch();
  searchState = null;
  clearStatus();
  drawGrid();
}

function clearAll() {
  stopSearch();
  startCell = null;
  endCell = null;
  walls.clear();
  searchState = null;
  drawGrid();
  setStatus('已清空界面', 'info');
}

// ==============================
// Event binding
// ==============================
btnStart.addEventListener('click', () => setTool('start'));
btnEnd.addEventListener('click', () => setTool('end'));
btnWall.addEventListener('click', () => setTool('wall'));

canvas.addEventListener('click', (e) => {
  if (!currentTool) return;
  const cell = getCell(e);
  if (!cell) return;
  const { row, col } = cell;

  stopSearch();
  searchState = null;
  clearStatus();

  if (currentTool === 'start') {
    if (endCell && endCell.row === row && endCell.col === col) return;
    if (walls.has(cellKey(row, col))) return;
    startCell = { row, col };
  } else if (currentTool === 'end') {
    if (startCell && startCell.row === row && startCell.col === col) return;
    if (walls.has(cellKey(row, col))) return;
    endCell = { row, col };
  } else if (currentTool === 'wall') {
    const key = cellKey(row, col);
    if ((startCell && startCell.row === row && startCell.col === col) ||
        (endCell && endCell.row === row && endCell.col === col)) return;
    if (walls.has(key)) walls.delete(key);
    else walls.add(key);
  }
  drawGrid();
});

// Drag-to-paint walls
let painting = false;
canvas.addEventListener('mousedown', (e) => {
  if (currentTool !== 'wall') return;
  painting = true;
  const cell = getCell(e);
  if (!cell) return;
  const { row, col } = cell;
  if ((startCell && startCell.row === row && startCell.col === col) ||
      (endCell && endCell.row === row && endCell.col === col)) return;

  stopSearch();
  searchState = null;
  clearStatus();

  const key = cellKey(row, col);
  if (walls.has(key)) walls.delete(key);
  else walls.add(key);
  drawGrid();
});

canvas.addEventListener('mousemove', (e) => {
  if (!painting || currentTool !== 'wall') return;
  const cell = getCell(e);
  if (!cell) return;
  const { row, col } = cell;
  if ((startCell && startCell.row === row && startCell.col === col) ||
      (endCell && endCell.row === row && endCell.col === col)) return;
  walls.add(cellKey(row, col));
  drawGrid();
});

window.addEventListener('mouseup', () => { painting = false; });

// Button actions
btnReset.addEventListener('click', resetSearch);

btnClearAll.addEventListener('click', clearAll);

btnStartDemo.addEventListener('click', () => {
  if (!algoSelect.value) {
    setStatus('请选择寻路算法', 'error');
    return;
  }
  if (!startCell || !endCell) {
    setStatus('请设置起点和终点', 'error');
    return;
  }
  setStatus('正在寻路...', 'info');
  startSearch(algoSelect.value);
});

algoSelect.addEventListener('change', () => {
  stopSearch();
  searchState = null;
  clearStatus();
  drawGrid();
});

rowsInput.addEventListener('input', () => {
  stopSearch();
  searchState = null;
  startCell = null;
  endCell = null;
  walls.clear();
  clearStatus();
  drawGrid();
});

colsInput.addEventListener('input', () => {
  stopSearch();
  searchState = null;
  startCell = null;
  endCell = null;
  walls.clear();
  clearStatus();
  drawGrid();
});

// ==============================
// Init
// ==============================
populateAlgoSelect();
drawGrid();
