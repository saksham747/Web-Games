const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Isometric projection settings
const tileWidth = 60;
const tileHeight = 30;
const tileDepth = 14; // how "tall" each tile's side walls look
const originX = 200;
const originY = 20;

const animDuration = 150; // milliseconds

// 0 = hole (nothing there), 1 = floor, 2 = goal tile
const level = [
  [0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0, 1, 2, 1],
  [0, 0, 0, 0, 0, 1, 1, 1]
];

let block = {
  cell1: { row: 0, col: 2 },
  cell2: { row: 0, col: 2 }
};

// Animation state — now stored as GRID coordinates, not pixels.
// We interpolate row/col first, then project to screen each frame.
let isAnimating = false;
let animStartCell1 = null;
let animStartCell2 = null;
let animEndCell1 = null;
let animEndCell2 = null;
let animStartTime = 0;

document.addEventListener("keydown", (event) => {
  if (isAnimating) return;

  const startCell1 = { ...block.cell1 };
  const startCell2 = { ...block.cell2 };

  if (event.key === "ArrowRight") move("right");
  else if (event.key === "ArrowLeft") move("left");
  else if (event.key === "ArrowUp") move("up");
  else if (event.key === "ArrowDown") move("down");
  else return;

  animStartCell1 = startCell1;
  animStartCell2 = startCell2;
  animEndCell1 = { ...block.cell1 };
  animEndCell2 = { ...block.cell2 };
  animStartTime = performance.now();
  isAnimating = true;
});

function isFloor(row, col) {
  if (row < 0 || row >= level.length) return false;
  if (col < 0 || col >= level[row].length) return false;
  return level[row][col] !== 0;
}

function resetBlock() {
  block.cell1 = { row: 0, col: 2 };
  block.cell2 = { row: 0, col: 2 };
}

function move(direction) {
  let { row: r1, col: c1 } = block.cell1;
  let { row: r2, col: c2 } = block.cell2;

  const isStanding = r1 === r2 && c1 === c2;

  if (direction === "right") {
    if (isStanding) {
      block.cell1 = { row: r1, col: c1 + 1 };
      block.cell2 = { row: r1, col: c1 + 2 };
    } else if (r1 === r2) {
      const farCol = Math.max(c1, c2) + 1;
      block.cell1 = { row: r1, col: farCol };
      block.cell2 = { row: r1, col: farCol };
    } else {
      block.cell1 = { row: r1, col: c1 + 1 };
      block.cell2 = { row: r2, col: c2 + 1 };
    }
  }
  if (direction === "left") {
    if (isStanding) {
      block.cell1 = { row: r1, col: c1 - 2 };
      block.cell2 = { row: r1, col: c1 - 1 };
    } else if (r1 === r2) {
      const nearCol = Math.min(c1, c2) - 1;
      block.cell1 = { row: r1, col: nearCol };
      block.cell2 = { row: r1, col: nearCol };
    } else {
      block.cell1 = { row: r1, col: c1 - 1 };
      block.cell2 = { row: r2, col: c2 - 1 };
    }
  }
  if (direction === "up") {
    if (isStanding) {
      block.cell1 = { row: r1 - 2, col: c1 };
      block.cell2 = { row: r1 - 1, col: c1 };
    } else if (c1 === c2) {
      const nearRow = Math.min(r1, r2) - 1;
      block.cell1 = { row: nearRow, col: c1 };
      block.cell2 = { row: nearRow, col: c1 };
    } else {
      block.cell1 = { row: r1 - 1, col: c1 };
      block.cell2 = { row: r2 - 1, col: c2 };
    }
  }
  if (direction === "down") {
    if (isStanding) {
      block.cell1 = { row: r1 + 1, col: c1 };
      block.cell2 = { row: r1 + 2, col: c1 };
    } else if (c1 === c2) {
      const farRow = Math.max(r1, r2) + 1;
      block.cell1 = { row: farRow, col: c1 };
      block.cell2 = { row: farRow, col: c1 };
    } else {
      block.cell1 = { row: r1 + 1, col: c1 };
      block.cell2 = { row: r2 + 1, col: c2 };
    }
  }

  const r1now = block.cell1.row, c1now = block.cell1.col;
  const r2now = block.cell2.row, c2now = block.cell2.col;

  if (!isFloor(r1now, c1now) || !isFloor(r2now, c2now)) {
    resetBlock();
    return;
  }

  if (r1now === r2now && c1now === c2now && level[r1now][c1now] === 2) {
    alert("You win!");
    resetBlock();
  }
}

// --- Isometric projection + drawing helpers ---

// Converts grid coordinates (can be fractional, for animation) into the
// screen pixel position of that tile's TOP vertex.
function gridToScreen(row, col) {
  return {
    x: originX + (col - row) * (tileWidth / 2),
    y: originY + (col + row) * (tileHeight / 2)
  };
}

// Fills a polygon given an array of {x, y} points, in order.
function fillPoly(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fill();
}

// Draws one tile as a 3-faced pseudo-3D block: a top diamond, plus a left
// and right side wall, each shaded a different color to fake lighting.
function drawTile(row, col, topColor, leftColor, rightColor) {
  const { x, y } = gridToScreen(row, col);
  const hw = tileWidth / 2;
  const hh = tileHeight / 2;

  const top = { x: x, y: y };
  const right = { x: x + hw, y: y + hh };
  const bottom = { x: x, y: y + tileHeight };
  const left = { x: x - hw, y: y + hh };

  const bottomDown = { x: bottom.x, y: bottom.y + tileDepth };
  const leftDown = { x: left.x, y: left.y + tileDepth };
  const rightDown = { x: right.x, y: right.y + tileDepth };

  fillPoly([left, bottom, bottomDown, leftDown], leftColor);
  fillPoly([right, bottom, bottomDown, rightDown], rightColor);
  fillPoly([top, right, bottom, left], topColor);
}

function drawLevel() {
  for (let row = 0; row < level.length; row++) {
    for (let col = 0; col < level[row].length; col++) {
      const tile = level[row][col];

      if (tile === 1) {
        drawTile(row, col, "#b0b0b0", "#787878", "#959595");
      } else if (tile === 2) {
        drawTile(row, col, "orange", "#b35900", "#cc6600");
      }
      // tile === 0 (hole): draw nothing
    }
  }
}

const standingHeight = 70; // tall box, when upright
const lyingHeight = 30;    // flatter box, when lying down

function isStandingCells(cell1, cell2) {
  return cell1.row === cell2.row && cell1.col === cell2.col;
}

// Draws the block as a real 3D box, sized to whatever footprint it
// currently covers (one cell if standing, two if lying flat).
function drawBlockBox(cell1, cell2, height) {
  const r1 = Math.min(cell1.row, cell2.row);
  const r2 = Math.max(cell1.row, cell2.row);
  const c1 = Math.min(cell1.col, cell2.col);
  const c2 = Math.max(cell1.col, cell2.col);

  // Footprint corners — same idea as a single tile, just spanning a range
  const top = gridToScreen(r1, c1);
  const right = gridToScreen(r1, c2 + 1);
  const bottom = gridToScreen(r2 + 1, c2 + 1);
  const left = gridToScreen(r2 + 1, c1);

  // Roof corners: same footprint, shifted upward by the box's height
  const roofTop = { x: top.x, y: top.y - height };
  const roofRight = { x: right.x, y: right.y - height };
  const roofBottom = { x: bottom.x, y: bottom.y - height };
  const roofLeft = { x: left.x, y: left.y - height };

  fillPoly([left, bottom, roofBottom, roofLeft], "#1b4f72");   // left face (darkest)
  fillPoly([right, bottom, roofBottom, roofRight], "#2874a6"); // right face (medium)
  fillPoly([roofTop, roofRight, roofBottom, roofLeft], "#5dade2"); // top face (lightest)
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function gameLoop(timestamp) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawLevel();

  let cell1, cell2, blockHeight;

  if (isAnimating) {
    const elapsed = timestamp - animStartTime;
    let t = elapsed / animDuration;

    if (t >= 1) {
      t = 1;
      isAnimating = false;
    }

    cell1 = {
      row: lerp(animStartCell1.row, animEndCell1.row, t),
      col: lerp(animStartCell1.col, animEndCell1.col, t)
    };
    cell2 = {
      row: lerp(animStartCell2.row, animEndCell2.row, t),
      col: lerp(animStartCell2.col, animEndCell2.col, t)
    };

    const startHeight = isStandingCells(animStartCell1, animStartCell2) ? standingHeight : lyingHeight;
    const endHeight = isStandingCells(animEndCell1, animEndCell2) ? standingHeight : lyingHeight;
    blockHeight = lerp(startHeight, endHeight, t);
  } else {
    cell1 = block.cell1;
    cell2 = block.cell2;
    blockHeight = isStandingCells(cell1, cell2) ? standingHeight : lyingHeight;
  }

  drawBlockBox(cell1, cell2, blockHeight);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);