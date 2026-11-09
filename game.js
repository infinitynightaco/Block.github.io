const GRID = 8;
const CELL = 40;
const COLORS = ['#e94560', '#0f3460', '#533483', '#e94560'];
const PIECE_COLORS = ['#e94560', '#0f3460', '#533483', '#e94560', '#e9c46a', '#2a9d8f'];

const PIECES = [
  [[1]],
  [[1,1]],
  [[1,1,1]],
  [[1,1,1,1]],
  [[1,1],[1,1]],
  [[1,1,1],[1,0,0]],
  [[1,1,1],[0,0,1]],
  [[1,1],[1,0]],
  [[1,1],[0,1]],
  [[1,1,1],[0,1,0]],
  [[1,1,1],[1,1,1]],
  [[1,0],[1,0],[1,1]],
  [[0,1],[0,1],[1,1]],
  [[1,1,1],[1,0,0],[1,0,0]],
  [[1,1,1],[0,0,1],[0,0,1]],
  [[1],[1],[1]],
  [[1,1,1],[1,0,1]],
];

const board = document.getElementById('board');
const ctx = board.getContext('2d');
const piecesEl = document.getElementById('pieces');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const gameOverEl = document.getElementById('game-over-overlay');
const restartBtn = document.getElementById('restart-btn');
const highScoreEl = document.getElementById('high-score');

let highScore = parseInt(localStorage.getItem('blockblast_high')) || 0;
highScoreEl.textContent = highScore;

let grid = Array.from({ length: GRID }, () => Array(GRID).fill(0));
let score = 0;
let combo = 0;
let currentPieces = [];
let pieceColors = [];
let dragging = null;
let dragIndex = -1;

function rand(n) { return Math.floor(Math.random() * n); }

function getPieceSize(shape) {
  return { w: shape[0].length, h: shape.length };
}

function canPlace(g, shape, row, col) {
  const { w, h } = getPieceSize(shape);
  if (row < 0 || col < 0 || row + h > GRID || col + w > GRID) return false;
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++)
      if (shape[r][c] && g[row + r][col + c]) return false;
  return true;
}

function placePiece(g, shape, row, col, val) {
  const { w, h } = getPieceSize(shape);
  for (let r = 0; r < h; r++)
    for (let c = 0; c < w; c++)
      if (shape[r][c]) g[row + r][col + c] = val;
}

function clearLines(g) {
  let cleared = 0;
  for (let r = 0; r < GRID; r++) {
    if (g[r].every(c => c !== 0)) {
      g[r].fill(0);
      cleared++;
    }
  }
  for (let c = 0; c < GRID; c++) {
    let full = true;
    for (let r = 0; r < GRID; r++) {
      if (g[r][c] === 0) { full = false; break; }
    }
    if (full) {
      for (let r = 0; r < GRID; r++) g[r][c] = 0;
      cleared++;
    }
  }
  return cleared;
}

function hasAnyMove(g, pieces) {
  for (const shape of pieces) {
    for (let r = 0; r < GRID; r++)
      for (let c = 0; c < GRID; c++)
        if (canPlace(g, shape, r, c)) return true;
  }
  return false;
}

function drawBoard() {
  ctx.clearRect(0, 0, 320, 320);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, 320, 320);

  for (let r = 0; r <= GRID; r++) {
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(320, r * CELL); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r * CELL, 0); ctx.lineTo(r * CELL, 320); ctx.stroke();
  }

  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      if (grid[r][c]) {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
      }
    }
  }

  if (dragging) {
    const { shape, color, row, col } = dragging;
    const { w, h } = getPieceSize(shape);
    const valid = canPlace(grid, shape, row, col);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        if (shape[r][c]) {
          const x = (col + c) * CELL;
          const y = (row + r) * CELL;
          if (valid) {
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.55;
            ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
            ctx.globalAlpha = 1;
          } else {
            ctx.strokeStyle = '#e94560';
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
          }
        }
      }
    }
  }
}

function drawPieceShape(canvas, shape, color) {
  const { w, h } = getPieceSize(shape);
  const sz = 36;
  canvas.width = w * sz;
  canvas.height = h * sz;
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, canvas.width, canvas.height);
  const ox = (canvas.width - w * sz) / 2;
  const oy = (canvas.height - h * sz) / 2;
  for (let r = 0; r < h; r++) {
    for (let c2 = 0; c2 < w; c2++) {
      if (shape[r][c2]) {
        c.fillStyle = color;
        c.fillRect(c2 * sz + ox + 1, r * sz + oy + 1, sz - 2, sz - 2);
        c.fillStyle = 'rgba(255,255,255,0.15)';
        c.fillRect(c2 * sz + ox + 1, r * sz + oy + 1, sz - 2, 4);
      }
    }
  }
}

function renderPieces() {
  piecesEl.innerHTML = '';
  for (let i = 0; i < currentPieces.length; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'piece-wrapper';
    const canvas = document.createElement('canvas');
    canvas.className = 'piece-canvas';
    canvas.dataset.index = i;
    drawPieceShape(canvas, currentPieces[i], pieceColors[i]);
    wrapper.appendChild(canvas);
    piecesEl.appendChild(wrapper);
  }
}

function getGridPos(clientX, clientY) {
  const rect = board.getBoundingClientRect();
  const scaleX = 320 / rect.width;
  const scaleY = 320 / rect.height;
  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;
  if (x < 0 || y < 0 || x >= 320 || y >= 320) return null;
  return { row: Math.floor(y / CELL), col: Math.floor(x / CELL) };
}

function isGridEmpty(g) {
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++)
      if (g[r][c] !== 0) return false;
  return true;
}

const comboEl = document.getElementById('combo-display');
let comboTimeout = null;

function showMessage(text, color) {
  comboEl.textContent = text;
  comboEl.style.color = color;
  comboEl.style.opacity = 1;
  comboEl.style.transform = 'translate(-50%, -50%) scale(1.2)';
  if (comboTimeout) clearTimeout(comboTimeout);
  comboTimeout = setTimeout(() => {
    comboEl.style.opacity = 0;
    comboEl.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 1000);
}

const comboCountEl = document.getElementById('combo-count');
const comboLabelEl = document.getElementById('combo-label');

function updateComboUI() {
  if (combo > 0) {
    comboLabelEl.style.display = 'inline';
    comboCountEl.textContent = combo;
  } else {
    comboLabelEl.style.display = 'none';
  }
}

function tryPlace(index, row, col) {
  const shape = currentPieces[index];
  if (!shape || !canPlace(grid, shape, row, col)) return false;
  placePiece(grid, shape, row, col, pieceColors[index]);
  const cleared = clearLines(grid);
  if (cleared > 0) {
    combo++;
    score += cleared * 100;
    score += combo * 100;
    showMessage(`Combo x${combo} +${combo * 100}`, '#e9c46a');
  } else {
    combo = 0;
  }
  updateComboUI();
  score += shape.flat().filter(Boolean).length * 10;
  if (isGridEmpty(grid)) {
    score += 200;
    showMessage('Clear All! +200', '#2a9d8f');
  }
  scoreEl.textContent = score;
  currentPieces.splice(index, 1);
  pieceColors.splice(index, 1);
  renderPieces();
  if (currentPieces.length > 0 && !hasAnyMove(grid, currentPieces)) triggerGameOver();
  return true;
}

function triggerGameOver() {
  if (score > highScore) {
    highScore = score;
    highScoreEl.textContent = highScore;
    localStorage.setItem('blockblast_high', highScore);
  }
  gameOverEl.classList.add('visible');
  finalScoreEl.textContent = score;
}

function refillPieces() {
  if (currentPieces.length > 0) return;
  for (let i = 0; i < 3; i++) {
    const idx = rand(PIECES.length);
    currentPieces.push(PIECES[idx].map(row => [...row]));
    pieceColors.push(PIECE_COLORS[rand(PIECE_COLORS.length)]);
  }
  if (!hasAnyMove(grid, currentPieces)) triggerGameOver();
  renderPieces();
  drawBoard();
}

function newGame() {
  grid = Array.from({ length: GRID }, () => Array(GRID).fill(0));
  score = 0;
  combo = 0;
  scoreEl.textContent = '0';
  gameOverEl.classList.remove('visible');
  comboEl.style.opacity = 0;
  updateComboUI();
  dragging = null;
  dragIndex = -1;
  currentPieces = [];
  pieceColors = [];
  refillPieces();
  drawBoard();
}

function endDrag(clientX, clientY) {
  const canvas = document.querySelector(`.piece-canvas[data-index="${dragIndex}"]`);
  if (canvas) canvas.classList.remove('dragging');
  if (dragging) {
    const pos = getGridPos(clientX, clientY);
    if (pos && canPlace(grid, dragging.shape, pos.row, pos.col)) {
      const idx = dragIndex;
      dragging = null;
      dragIndex = -1;
      if (tryPlace(idx, pos.row, pos.col) && currentPieces.length === 0) refillPieces();
      drawBoard();
      return;
    }
  }
  dragging = null;
  dragIndex = -1;
  drawBoard();
}

piecesEl.addEventListener('pointerdown', (e) => {
  if (gameOverEl.classList.contains('visible')) return;
  const canvas = e.target.closest('.piece-canvas');
  if (!canvas || dragging) return;
  const idx = parseInt(canvas.dataset.index);
  const shape = currentPieces[idx];
  if (!shape) return;
  dragIndex = idx;
  dragging = { shape: shape.map(row => [...row]), color: pieceColors[idx], row: 0, col: 0 };
  canvas.classList.add('dragging');
  canvas.setPointerCapture(e.pointerId);
  e.preventDefault();
});

document.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const pos = getGridPos(e.clientX, e.clientY);
  if (pos) {
    dragging.row = pos.row;
    dragging.col = pos.col;
  }
  drawBoard();
  e.preventDefault();
});

document.addEventListener('pointerup', (e) => {
  if (!dragging) return;
  endDrag(e.clientX, e.clientY);
  e.preventDefault();
});

document.addEventListener('pointercancel', () => {
  if (!dragging) return;
  const canvas = document.querySelector(`.piece-canvas[data-index="${dragIndex}"]`);
  if (canvas) canvas.classList.remove('dragging');
  dragging = null;
  dragIndex = -1;
  drawBoard();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && dragging) {
    const canvas = document.querySelector(`.piece-canvas[data-index="${dragIndex}"]`);
    if (canvas) canvas.classList.remove('dragging');
    dragging = null;
    dragIndex = -1;
    drawBoard();
    e.preventDefault();
  }
});

restartBtn.addEventListener('click', newGame);

newGame();
