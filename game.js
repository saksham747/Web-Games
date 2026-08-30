const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const tileSize = 50;


// 0 = hole (nothing there), 1 = floor, 2 = goal tile
const level = [
  [0, 0, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0, 2, 1, 1],
  [0, 0, 0, 0, 0, 1, 1, 1]
];

let block = {
  cell1: { row: 0, col: 2 },
  cell2: { row: 0, col: 2 }
};

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") move("right");
  if (event.key === "ArrowLeft") move("left");
  if (event.key === "ArrowUp") move("up");
  if (event.key === "ArrowDown") move("down");
  draw();
});

function isFloor(row, col) {
  if (row < 0 || row >= level.length) return false;
  if (col < 0 || col >= level[row].length) return false;
  return level[row][col] !== 0;
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
      // lying horizontally -> stand up on the far side
      const farCol = Math.max(c1, c2) + 1;
      block.cell1 = { row: r1, col: farCol };
      block.cell2 = { row: r1, col: farCol };
    } else {
      // lying vertically -> shift both cells right, shape unchanged
      block.cell1 = { row: r1, col: c1 + 1 };
      block.cell2 = { row: r2, col: c2 + 1 };
    }
  }
  if (direction === "left") {
    if (isStanding) {
      block.cell1 = { row: r1, col: c1 - 2 };
      block.cell2 = { row: r1, col: c1 - 1 };
    } else if (r1 === r2) {
      // lying horizontally -> stand up on the near side
      const nearCol = Math.min(c1, c2) - 1;
      block.cell1 = { row: r1, col: nearCol };
      block.cell2 = { row: r1, col: nearCol };
    } else {
      // lying vertically -> shift both cells left, shape unchanged
      block.cell1 = { row: r1, col: c1 - 1 };
      block.cell2 = { row: r2, col: c2 - 1 };
    }
  }
  if (direction === "up") {
    if (isStanding) {
      block.cell1 = { row: r1 - 2, col: c1 };
      block.cell2 = { row: r1 - 1, col: c1 };
    } else if (c1 === c2) {
      // lying vertically -> stand up on the near side
      const nearRow = Math.min(r1, r2) - 1;
      block.cell1 = { row: nearRow, col: c1 };
      block.cell2 = { row: nearRow, col: c1 };
    } else {
      // lying horizontally -> shift both cells up, shape unchanged
      block.cell1 = { row: r1 - 1, col: c1 };
      block.cell2 = { row: r2 - 1, col: c2 };
    }
  }
  if (direction === "down") {
    if (isStanding) {
      block.cell1 = { row: r1 + 1, col: c1 };
      block.cell2 = { row: r1 + 2, col: c1 };
    } else if (c1 === c2) {
      // lying vertically -> stand up on the far side
      const farRow = Math.max(r1, r2) + 1;
      block.cell1 = { row: farRow, col: c1 };
      block.cell2 = { row: farRow, col: c1 };
    } else {
      // lying horizontally -> shift both cells down, shape unchanged
      block.cell1 = { row: r1 + 1, col: c1 };
      block.cell2 = { row: r2 + 1, col: c2 };
    }
  }
  // Check if either cell has fallen off valid floor
  const r1now = block.cell1.row, c1now = block.cell1.col;
  const r2now = block.cell2.row, c2now = block.cell2.col;

  if (!isFloor(r1now, c1now) || !isFloor(r2now, c2now)) {
    resetBlock();
    return;
  }
  if (!isFloor(r1now, c1now) || !isFloor(r2now, c2now)) {
    resetBlock();
    return;
  }

  // Check win: standing upright, exactly on the goal tile
  if (r1now === r2now && c1now === c2now && level[r1now][c1now] === 2) {
    alert("You win!");
    resetBlock();
  }
}
function resetBlock() {
  block.cell1 = { row: 0, col: 2 };
  block.cell2 = { row: 0, col: 2 };
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let row = 0; row < level.length; row++) {
    for (let col = 0; col < level[row].length; col++) {
      const tile = level[row][col];

      if (tile === 1) {
        ctx.fillStyle = "#999";
      } else if (tile === 2) {
        ctx.fillStyle = "orange";
      } else {
        continue;
      }

      ctx.fillRect(col * tileSize, row * tileSize, tileSize - 1, tileSize - 1);
    }
  } // <-- outer "row" loop closes HERE now, before block code

  ctx.fillStyle = "#3498db";

  const r1 = block.cell1.row, c1 = block.cell1.col;
  const r2 = block.cell2.row, c2 = block.cell2.col;

  if (r1 === r2 && c1 === c2) {
    ctx.fillRect(c1 * tileSize + 5, r1 * tileSize + 5, tileSize - 10, tileSize - 10);
  } else {
    const left = Math.min(c1, c2) * tileSize;
    const top = Math.min(r1, r2) * tileSize;
    const width = (Math.abs(c1 - c2) + 1) * tileSize;
    const height = (Math.abs(r1 - r2) + 1) * tileSize;
    ctx.fillRect(left + 5, top + 5, width - 10, height - 10);
  }
}

draw();