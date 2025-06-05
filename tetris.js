const canvas = document.getElementById("board");
const context = canvas.getContext("2d");
const preview = document.getElementById("preview");
const previewCtx = preview.getContext("2d");
const scoreEl = document.getElementById("score-value");
const leaderboardEl = document.getElementById("scores");
const nameInput = document.getElementById("player-name-input");
const clearScoresBtn = document.getElementById("clear-scores");

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
const CELL = 24;

canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;

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

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let current = new Piece(randomShape());
let next = new Piece(randomShape());
let dropCounter = 0;
const BASE_DROP_INTERVAL = 500;
const MIN_DROP_INTERVAL = 100;
let dropInterval = BASE_DROP_INTERVAL;
let linesCleared = 0;
let lastTime = 0;
let score = 0;

function randomShape() {
  const keys = Object.keys(SHAPES);
  const key = keys[Math.floor(Math.random() * keys.length)];
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
    score += lines * lines * 100;
    linesCleared += lines;
    const level = Math.floor(linesCleared / 10);
    dropInterval = Math.max(
      MIN_DROP_INTERVAL,
      BASE_DROP_INTERVAL - level * 50
    );
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
  while (!collide(current, 0, 1)) {
    current.y++;
  }
  merge(current);
  clearLines();
  current = next;
  next = new Piece(randomShape());
  if (collide(current)) {
    addScore(getPlayerName(), score);
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    score = 0;
    current = new Piece(randomShape());
    next = new Piece(randomShape());
  }
  dropCounter = 0;
}

function drawMatrix(matrix, offsetX, offsetY, ctx, ghost = false) {
  ctx.save();
  if (ghost) ctx.globalAlpha = 0.3;
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        ctx.fillStyle = COLORS[value];
        ctx.fillRect((x + offsetX) * CELL, (y + offsetY) * CELL, CELL, CELL);
        ctx.strokeStyle = "#444";
        ctx.strokeRect((x + offsetX) * CELL, (y + offsetY) * CELL, CELL, CELL);
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
  drawMatrix(next.shape, 1, 1, previewCtx);

  scoreEl.textContent = score;
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;
  dropCounter += delta;
  if (dropCounter > dropInterval) {
    dropCounter = 0;
    if (!collide(current, 0, 1)) {
      current.y++;
    } else {
      merge(current);
      clearLines();
      current = next;
      next = new Piece(randomShape());
      if (collide(current)) {
        addScore(getPlayerName(), score);
        board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        score = 0;
        current = new Piece(randomShape());
        next = new Piece(randomShape());
      }
    }
  }

  draw();
  requestAnimationFrame(update);
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const left = key === "a" || event.key === "ArrowLeft";
  const right = key === "d" || event.key === "ArrowRight";
  const down = key === "s" || event.key === "ArrowDown";
  const rotateKey = key === "w" || event.key === "ArrowUp";
  const dropKey = event.code === "Space" || event.key === " ";

  if (left && !collide(current, -1, 0)) current.x--;
  if (right && !collide(current, 1, 0)) current.x++;
  if (down && !collide(current, 0, 1)) current.y++;
  if (rotateKey) rotate(current);
  if (dropKey) {
    event.preventDefault();
    hardDrop();
  }
});

update();
