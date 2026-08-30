const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Isometric projection settings
const tileWidth = 60;
const tileHeight = 30;
const tileDepth = 14; // how "tall" each tile's side walls look
const originX = 200;
const originY = 80;

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

// Animation state. We only need where the block STARTED and which
// direction it's tipping — true rotation math derives the rest.
let isAnimating = false;
let animStartCell1 = null;
let animStartCell2 = null;
let animDirection = null;
let animStartTime = 0;

document.addEventListener("keydown", (event) => {
  if (isAnimating) return;

  const startCell1 = { ...block.cell1 };
  const startCell2 = { ...block.cell2 };

  let direction = null;
  if (event.key === "ArrowRight") direction = "right";
  else if (event.key === "ArrowLeft") direction = "left";
  else if (event.key === "ArrowUp") direction = "up";
  else if (event.key === "ArrowDown") direction = "down";
  else return;

  move(direction);

  animStartCell1 = startCell1;
  animStartCell2 = startCell2;
  animDirection = direction;
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

// Projects a full 3D world point (x = col, y = height, z = row) to screen.
// gridToScreen is just this with y (height) always 0.
function worldToScreen(p) {
  return {
    x: originX + (p.x - p.z) * (tileWidth / 2),
    y: originY + (p.x + p.z) * (tileHeight / 2) - p.y * heightScale
  };
}

// Rotates one 3D corner around a pivot edge by angle theta, simulating a
// physical tip. Since the block only ever moves axis-aligned, the rotation
// only ever affects two of the three coordinates at once:
//   - rolling left/right rotates in the x/height plane (z stays fixed)
//   - rolling up/down rotates in the z/height plane (x stays fixed)
// "sign" flips the rotation direction depending on which way we're tipping.
function tipCorner(p, axis, pivot, sign, theta) {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);

  if (axis === "x") {
    const u = p.x - pivot;
    const newU = u * cosT + sign * p.y * sinT;
    const newY = -sign * u * sinT + p.y * cosT;
    return { x: pivot + newU, y: newY, z: p.z };
  } else {
    const w = p.z - pivot;
    const newW = w * cosT + sign * p.y * sinT;
    const newY = -sign * w * sinT + p.y * cosT;
    return { x: p.x, y: newY, z: pivot + newW };
  }
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

const standingHeight = 1.5;  // tall box, in GRID UNITS (was raw pixels)
const lyingHeight = 0.75;    // flatter box, in GRID UNITS
const heightScale = 44;      // pixels per 1.0 grid unit of height — the only
                              // place height gets converted to actual pixels

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
  // (height is in grid units, so scale it to pixels here — same rule
  // worldToScreen follows)
  const roofTop = { x: top.x, y: top.y - height * heightScale };
  const roofRight = { x: right.x, y: right.y - height * heightScale };
  const roofBottom = { x: bottom.x, y: bottom.y - height * heightScale };
  const roofLeft = { x: left.x, y: left.y - height * heightScale };

  fillPoly([left, bottom, roofBottom, roofLeft], "#1b4f72");   // left face (darkest)
  fillPoly([right, bottom, roofBottom, roofRight], "#2874a6"); // right face (medium)
  fillPoly([roofTop, roofRight, roofBottom, roofLeft], "#5dade2"); // top face (lightest)
}

// Draws the block mid-roll: rotating around the correct pivot edge based
// on its shape BEFORE the move and which direction it's tipping.
// t goes from 0 (start of the move) to 1 (fully tipped, 90 degrees).
function drawBlockTipping(startCell1, startCell2, direction, t) {
  const c1 = Math.min(startCell1.col, startCell2.col);
  const c2 = Math.max(startCell1.col, startCell2.col);
  const r1 = Math.min(startCell1.row, startCell2.row);
  const r2 = Math.max(startCell1.row, startCell2.row);
  const h = isStandingCells(startCell1, startCell2) ? standingHeight : lyingHeight;

  const theta = t * (Math.PI / 2); // 0 to 90 degrees, in radians
  const axis = (direction === "left" || direction === "right") ? "x" : "z";
  const sign = (direction === "right" || direction === "down") ? 1 : -1;
  const pivot = axis === "x"
    ? (sign > 0 ? c2 + 1 : c1)
    : (sign > 0 ? r2 + 1 : r1);

  // The box's 8 corners, before rotation: 4 on the ground, 4 on the roof
  const bottomsRaw = [
    { x: c1,     y: 0, z: r1 },
    { x: c2 + 1, y: 0, z: r1 },
    { x: c2 + 1, y: 0, z: r2 + 1 },
    { x: c1,     y: 0, z: r2 + 1 }
  ];
  const topsRaw = bottomsRaw.map((p) => ({ x: p.x, y: h, z: p.z }));

  const bottoms = bottomsRaw.map((p) => worldToScreen(tipCorner(p, axis, pivot, sign, theta)));
  const tops = topsRaw.map((p) => worldToScreen(tipCorner(p, axis, pivot, sign, theta)));

  fillPoly([bottoms[3], bottoms[2], tops[2], tops[3]], "#1b4f72");   // left face
  fillPoly([bottoms[1], bottoms[2], tops[2], tops[1]], "#2874a6");   // right face
  fillPoly([tops[0], tops[1], tops[2], tops[3]], "#5dade2");         // top face
}

function gameLoop(timestamp) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawLevel();

  if (isAnimating) {
    const elapsed = timestamp - animStartTime;
    let t = elapsed / animDuration;

    if (t >= 1) {
      t = 1;
      isAnimating = false;
    }

    drawBlockTipping(animStartCell1, animStartCell2, animDirection, t);
  } else {
    const height = isStandingCells(block.cell1, block.cell2) ? standingHeight : lyingHeight;
    drawBlockBox(block.cell1, block.cell2, height);
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);