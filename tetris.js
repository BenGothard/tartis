const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const preview = document.getElementById("preview");
const previewCtx = preview.getContext("2d");
const levelEl = document.getElementById("level-value");
const leaderboardEl = document.getElementById("scores");
const nameInput = document.getElementById("player-name-input");
const clearScoresBtn = document.getElementById("clear-scores");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const difficultyBar = document.getElementById("difficulty-bar");

let animationId = null;
let isPaused = false;
let started = false;

function getPlayerName() {
  return nameInput?.value.trim() || "Anonymous";
}

function loadScores() {
  try {
    return JSON.parse(localStorage.getItem("tartisScores")) || [];
  } catch (e) {
    return [];
  }
}

function saveScores(scores) {
  localStorage.setItem("tartisScores", JSON.stringify(scores));
}

function clearScores() {
  localStorage.removeItem("tartisScores");
  updateLeaderboard();
}

function updateLeaderboard() {
  const scores = loadScores()
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  leaderboardEl.innerHTML = "";
  scores.forEach(({ name, score }) => {
    const li = document.createElement("li");
    li.textContent = `${name}: ${score}`;
    leaderboardEl.appendChild(li);
  });
}

function addScore(name, value) {
  const scores = loadScores();
  scores.push({ name, score: value });
  // Sort scores from highest to lowest and keep only the best five
  const top = scores.sort((a, b) => b.score - a.score).slice(0, 5);
  saveScores(top);
  updateLeaderboard();
}

updateLeaderboard();

if (clearScoresBtn) {
  clearScoresBtn.addEventListener("click", clearScores);
}

const COLS = 20;
const ROWS = 30;
let CELL = 24;

function resizeCanvas() {
  const parentRect = document
    .querySelector('.board-wrapper')
    .getBoundingClientRect();
  canvas.width = Math.floor(parentRect.width);
  canvas.height = Math.floor(parentRect.height);
  CELL = canvas.width / COLS;
  draw();
}

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [
    [2, 0, 0],
    [2, 2, 2],
  ],
  L: [
    [0, 0, 3],
    [3, 3, 3],
  ],
  O: [
    [4, 4],
    [4, 4],
  ],
  S: [
    [0, 5, 5],
    [5, 5, 0],
  ],
  T: [
    [0, 6, 0],
    [6, 6, 6],
  ],
  Z: [
    [7, 7, 0],
    [0, 7, 7],
  ],
};

const SHAPE_KEYS = Object.keys(SHAPES);

const COLORS = {
  0: "#000",
  1: "#00ffff",
  2: "#0000ff",
  3: "#ff7f00",
  4: "#ffff00",
  5: "#00ff00",
  6: "#800080",
  7: "#ff0000",
};

class Piece {
  constructor(shape) {
    this.shape = shape;
    this.x = Math.floor(COLS / 2 - shape[0].length / 2);
    this.y = 0;
  }
}

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

let board = createBoard();
let current = new Piece(randomShape());
let next = new Piece(randomShape());
let dropCounter = 0;
const BASE_DROP_INTERVAL = 500;
const MIN_DROP_INTERVAL = 100;
// Larger step values make the game ramp up in difficulty faster
const LEVEL_SPEED_STEP = 75; // ms faster drop per level
const SCORE_SPEED_STEP = 10; // ms faster drop for every 100 points
let dropInterval = BASE_DROP_INTERVAL;
let linesCleared = 0;
let lastTime = 0;
let score = 0;

function resetGame() {
  board = createBoard();
  current = new Piece(randomShape());
  next = new Piece(randomShape());
  dropCounter = 0;
  dropInterval = BASE_DROP_INTERVAL;
  linesCleared = 0;
  lastTime = 0;
  score = 0;
  draw();
  updateDifficultyMeter();
}

function startGame() {
  if (!started) {
    resetGame();
    started = true;
  }
  isPaused = false;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  pauseBtn.textContent = "Pause";
  update();
}

function pauseGame() {
  if (isPaused) return;
  isPaused = true;
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  pauseBtn.textContent = "Resume";
}

function resumeGame() {
  if (!isPaused) return;
  isPaused = false;
  pauseBtn.textContent = "Pause";
  update();
}

function updateDropInterval() {
  const level = Math.floor(linesCleared / 10);
  const scoreFactor = Math.floor(score / 100) * SCORE_SPEED_STEP;
  dropInterval = Math.max(
    MIN_DROP_INTERVAL,
    BASE_DROP_INTERVAL - level * LEVEL_SPEED_STEP - scoreFactor
  );
  updateDifficultyMeter();
}

function updateDifficultyMeter() {
  if (!difficultyBar) return;
  const percent =
    ((BASE_DROP_INTERVAL - dropInterval) /
      (BASE_DROP_INTERVAL - MIN_DROP_INTERVAL)) *
    100;
  difficultyBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

function randomShape() {
  const key = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)];
  return SHAPES[key].map((r) => [...r]);
}

function collide(piece, offX = 0, offY = 0) {
  const { shape, x, y } = piece;
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const newX = x + col + offX;
        const newY = y + row + offY;
        if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
        if (newY >= 0 && board[newY][newX]) return true;
      }
    }
  }
  return false;
}

function merge(piece) {
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) board[piece.y + y][piece.x + x] = value;
    });
  });
}

function rotate(piece) {
  const { shape } = piece;
  const m = shape[0].map((_, x) => shape.map((row) => row[x]).reverse());
  const clone = { shape: m, x: piece.x, y: piece.y };
  if (!collide(clone)) piece.shape = m;
}

function clearLines() {
  let lines = 0;
  outer: for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (!board[y][x]) continue outer;
    }
    board.splice(y, 1);
    board.unshift(Array(COLS).fill(0));
    lines++;
  }
  if (lines > 0) {
    linesCleared += lines;
    const level = Math.floor(linesCleared / 10);
    const multiplier = level + 1; // reward higher levels with more points
    score += lines * lines * 100 * multiplier;
    updateDropInterval();
  }
}

function spawnNext() {
  current = next;
  next = new Piece(randomShape());
  if (collide(current)) {
    addScore(getPlayerName(), score);
    board = createBoard();
    score = 0;
    linesCleared = 0;
    dropInterval = BASE_DROP_INTERVAL;
    current = new Piece(randomShape());
    next = new Piece(randomShape());
  }
}

function getGhostPiece(piece) {
  const ghost = { shape: piece.shape, x: piece.x, y: piece.y };
  while (!collide(ghost, 0, 1)) {
    ghost.y++;
  }
  return ghost;
}

function hardDrop() {
  const ghost = getGhostPiece(current);
  current.y = ghost.y;
  merge(current);
  clearLines();
  spawnNext();
  dropCounter = 0;
}

function drawMatrix(matrix, offsetX, offsetY, ctx, ghost = false, cellSize = CELL) {
  ctx.save();
  if (ghost) ctx.globalAlpha = 0.3;
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        ctx.fillStyle = COLORS[value];
        ctx.fillRect(
          (x + offsetX) * cellSize,
          (y + offsetY) * cellSize,
          cellSize,
          cellSize
        );
        ctx.strokeStyle = "#444";
        ctx.strokeRect(
          (x + offsetX) * cellSize,
          (y + offsetY) * cellSize,
          cellSize,
          cellSize
        );
      }
    });
  });
  ctx.restore();
}

function draw() {
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawMatrix(board, 0, 0, context);
  const ghost = getGhostPiece(current);
  drawMatrix(ghost.shape, ghost.x, ghost.y, context, true);
  drawMatrix(current.shape, current.x, current.y, context);

  previewCtx.clearRect(0, 0, preview.width, preview.height);
  const previewCell = Math.min(preview.width, preview.height) / 4;
  const offsetX = Math.floor((4 - next.shape[0].length) / 2);
  const offsetY = Math.floor((4 - next.shape.length) / 2);
  drawMatrix(next.shape, offsetX, offsetY, previewCtx, false, previewCell);

  if (levelEl) {
    const level = Math.floor(linesCleared / 10) + 1;
    levelEl.textContent = level;
  }
}

function update(time = 0) {
  if (isPaused) return;
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;
  updateDropInterval();
  if (dropCounter > dropInterval) {
    dropCounter = 0;
    if (!collide(current, 0, 1)) {
      current.y++;
    } else {
      merge(current);
      clearLines();
      spawnNext();
    }
  }

  draw();
  animationId = requestAnimationFrame(update);
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const left = key === "a" || event.key === "ArrowLeft";
  const right = key === "d" || event.key === "ArrowRight";
  const down = key === "s" || event.key === "ArrowDown";
  const rotateKey = key === "w" || event.key === "ArrowUp";
  const dropKey = event.code === "Space" || event.key === " ";

  if (!started) {
    if (dropKey) {
      event.preventDefault();
      startGame();
    }
    return;
  }

  if (isPaused) return;

  if (left && !collide(current, -1, 0)) current.x--;
  if (right && !collide(current, 1, 0)) current.x++;
  if (down && !collide(current, 0, 1)) current.y++;
  if (rotateKey) rotate(current);
  if (dropKey) {
    event.preventDefault();
    hardDrop();
  }
});

window.addEventListener('resize', resizeCanvas);
window.addEventListener('DOMContentLoaded', resizeCanvas);

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', () => {
  if (isPaused) {
    resumeGame();
  } else {
    pauseGame();
  }
});
pauseBtn.disabled = true;

resizeCanvas();
updateDifficultyMeter();
