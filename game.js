/* =====================
   DEBUG
===================== */

const DEBUG_HITBOXES = false;

/* =====================
   CANVAS SETUP
===================== */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const BASE_WIDTH = 360;
const BASE_HEIGHT = 640;

canvas.width = BASE_WIDTH;
canvas.height = BASE_HEIGHT;

/* =====================
   UI STYLE
===================== */

const UI_FILL = "#FF2D55";
const UI_STROKE = "#00F5FF";
const UI_FONT = "'Orbitron', 'Exo', 'Rajdhani', system-ui, sans-serif";

/* =====================
   IMAGE LOADING
===================== */

const backgrounds = [];
for (let i = 1; i <= 5; i++) {
  const img = new Image();
  img.src = `images/bg${i}.png`;
  backgrounds.push(img);
}

const shipIdle = new Image();
shipIdle.src = "images/ship_idle.png";

const shipBoostFrames = [];
for (let i = 1; i <= 4; i++) {
  const img = new Image();
  img.src = `images/ship_boost${i}.png`;
  shipBoostFrames.push(img);
}

const pillarImg = new Image();
pillarImg.src = "images/pillar.png";

/* =====================
   GAME STATE
===================== */

let gameState = "start";
let score = 0;

/* =====================
   HIGHSCORES
===================== */

const HIGHSCORE_KEY = "spaceRidersHighscores";
let highscores = JSON.parse(localStorage.getItem(HIGHSCORE_KEY)) || [];

/* =====================
   BACKGROUND
===================== */

let bgFrameIndex = 0;
let bgDirection = 1;
let bgTimer = 0;
const BG_FRAME_TIME = 70;

/* =====================
   SHIP
===================== */

const ship = {
  x: 80,
  y: 300,
  width: 64,
  height: 48,
  velocity: 0,
  gravity: 0.61,
  lift: -11
};

let boosting = false;
let boostFrame = 0;
let boostTimer = 0;

/* =====================
   PIPES
===================== */

const pipes = [];
const pipeWidth = 60;
const gap = 170;
let pipeTimer = 0;
let pipeSpeed = 2.5;

/* =====================
   FULLSCREEN
===================== */

let isFullscreen = false;

/* =====================
   INPUT
===================== */

canvas.addEventListener(
  "touchstart",
  e => {
    e.preventDefault();
    const t = e.touches[0];
    handlePointer(t.clientX, t.clientY);
  },
  { passive: false }
);

canvas.addEventListener("mousedown", e => {
  handlePointer(e.clientX, e.clientY);
});

document.addEventListener("keydown", e => {
  if (e.code === "Space" && gameState === "playing") {
    ship.velocity = ship.lift;
    boosting = true;
  }
});

document.addEventListener("keyup", () => (boosting = false));
document.addEventListener("touchend", () => (boosting = false));

function handlePointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const x = (clientX - rect.left) * scaleX;
  const y = (clientY - rect.top) * scaleY;

  const layout = getMenuLayout();

  if (gameState === "start" && isInside(layout.start, x, y)) {
    startGame();
    return;
  }

  if (gameState === "gameover" && isInside(layout.restart, x, y)) {
    startGame();
    return;
  }

  if (!isFullscreen && isInside(layout.fullscreen, x, y)) {
    requestFullscreen();
    return;
  }

  if (gameState === "playing") {
    ship.velocity = ship.lift;
    boosting = true;
  }
}

/* =====================
   GAME LOOP
===================== */

let lastTime = 0;

function update(time) {
  const delta = time - lastTime;
  lastTime = time;

  bgTimer += delta;
  if (bgTimer > BG_FRAME_TIME) {
    bgFrameIndex += bgDirection;
    if (bgFrameIndex === backgrounds.length - 1) bgDirection = -1;
    if (bgFrameIndex === 0) bgDirection = 1;
    bgTimer = 0;
  }

  ctx.drawImage(backgrounds[bgFrameIndex], 0, 0, canvas.width, canvas.height);

  if (gameState === "start") {
    drawMenu("SPACE RIDERS");
    requestAnimationFrame(update);
    return;
  }

  if (gameState === "gameover") {
    drawGameOver();
    requestAnimationFrame(update);
    return;
  }

  /* ---------- GAMEPLAY ---------- */

  ship.velocity += ship.gravity;
  ship.y += ship.velocity;

  let img = shipIdle;
  if (boosting) {
    boostTimer += delta;
    if (boostTimer > 50) {
      boostFrame = (boostFrame + 1) % shipBoostFrames.length;
      boostTimer = 0;
    }
    img = shipBoostFrames[boostFrame];
  } else {
    boostFrame = 0;
  }

  ctx.save();
  ctx.translate(ship.x + ship.width / 2, ship.y + ship.height / 2);
  ctx.rotate(ship.velocity * 0.035);
  ctx.drawImage(img, -ship.width / 2, -ship.height / 2, ship.width, ship.height);
  ctx.restore();

  pipeTimer += delta;
  if (pipeTimer > 1400) {
    const top = Math.random() * (canvas.height - gap - 120) + 60;
    pipes.push({
      x: canvas.width,
      top,
      bottom: canvas.height - top - gap,
      passed: false
    });
    pipeTimer = 0;
  }

  pipes.forEach(pipe => {
    pipe.x -= pipeSpeed;

    ctx.save();
    ctx.translate(pipe.x + pipeWidth / 2, pipe.top);
    ctx.scale(1, -1);
    ctx.drawImage(pillarImg, -pipeWidth / 2, 0, pipeWidth, pipe.top);
    ctx.restore();

    ctx.drawImage(
      pillarImg,
      pipe.x,
      canvas.height - pipe.bottom,
      pipeWidth,
      pipe.bottom
    );

    const shipCircle = {
      cx: ship.x + ship.width / 2,
      cy: ship.y + ship.height / 2,
      r: Math.min(ship.width, ship.height) * 0.35
    };

    const capRadius = pipeWidth / 2;

    /* ===== SHORTENED HITBOXES (10%) ===== */

    const topBodyHeight = (pipe.top - capRadius) * 0.9;
    const bottomBodyHeight = (pipe.bottom - capRadius) * 0.9;

    const topBody = {
      x: pipe.x,
      y: 0,
      width: pipeWidth,
      height: topBodyHeight
    };

   const topCap = {
  cx: pipe.x + pipeWidth / 2,
  cy: topBodyHeight + capRadius,
  r: capRadius
};


    const bottomBody = {
      x: pipe.x,
      y: canvas.height - bottomBodyHeight,
      width: pipeWidth,
      height: bottomBodyHeight
    };

    const bottomCap = {
  cx: pipe.x + pipeWidth / 2,
  cy: canvas.height - bottomBodyHeight - capRadius,
  r: capRadius
};


    if (DEBUG_HITBOXES) {
      drawCircleHitbox(shipCircle, "#00F5FF");
      drawRectHitbox(topBody, "#FF2D55");
      drawCircleHitbox(topCap, "#FFD500");
      drawRectHitbox(bottomBody, "#FF2D55");
      drawCircleHitbox(bottomCap, "#FFD500");
    }

    if (
      circleRectCollision(shipCircle, topBody) ||
      circleCircleCollision(shipCircle, topCap) ||
      circleRectCollision(shipCircle, bottomBody) ||
      circleCircleCollision(shipCircle, bottomCap)
    ) {
      endGame();
    }

    if (!pipe.passed && pipe.x + pipeWidth < ship.x) {
      score++;
      pipe.passed = true;
    }
  });

  if (pipes.length && pipes[0].x < -pipeWidth) pipes.shift();
  if (ship.y < 0 || ship.y + ship.height > canvas.height) endGame();

  drawOutlinedText(score.toString(), 20, 36, 18);
  requestAnimationFrame(update);
}

/* =====================
   COLLISION HELPERS
===================== */

function circleRectCollision(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(circle.cy, rect.y + rect.height));
  const dx = circle.cx - closestX;
  const dy = circle.cy - closestY;
  return dx * dx + dy * dy < circle.r * circle.r;
}

function circleCircleCollision(c1, c2) {
  const dx = c1.cx - c2.cx;
  const dy = c1.cy - c2.cy;
  return dx * dx + dy * dy < (c1.r + c2.r) * (c1.r + c2.r);
}

/* =====================
   DEBUG DRAW HELPERS
===================== */

function drawCircleHitbox(c, color) {
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawRectHitbox(r, color) {
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x, r.y, r.width, r.height);
  ctx.restore();
}

/* =====================
   MENUS / FLOW
===================== */

function drawMenu(title) {
  const layout = getMenuLayout();
  drawText(title, layout.titleY, 30);
  drawButton(layout.start, "START");
  if (!isFullscreen) drawButton(layout.fullscreen, "FULLSCREEN", 14);
}

function drawGameOver() {
  const layout = getMenuLayout();
  drawText("GAME OVER", layout.titleY, 28);
  drawText(`SCORE ${score}`, layout.scoreY, 18);

  drawText("TOP 3", layout.scoresY, 14);
  highscores.forEach((s, i) => {
    drawOutlinedText(
      `${i + 1}. ${s}`,
      canvas.width / 2,
      layout.scoresY + 22 + i * 18,
      14
    );
  });

  drawButton(layout.restart, "RESTART");
}

function getMenuLayout() {
  const cx = canvas.width * 0.5;
  const y = canvas.height * 0.25;

  return {
    titleY: y,
    scoreY: y + 40,
    scoresY: y + 80,
    start: { x: cx - canvas.width * 0.3, y: canvas.height * 0.55, width: canvas.width * 0.6, height: 48 },
    restart: { x: cx - canvas.width * 0.3, y: canvas.height * 0.6, width: canvas.width * 0.6, height: 48 },
    fullscreen: { x: cx - canvas.width * 0.3, y: canvas.height * 0.7, width: canvas.width * 0.6, height: 40 }
  };
}

function requestFullscreen() {
  if (canvas.requestFullscreen) {
    canvas.requestFullscreen();
  } else {
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  isFullscreen = true;
}

window.addEventListener("resize", () => {
  if (isFullscreen) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});

function startGame() {
  resetGame();
  gameState = "playing";
}

function endGame() {
  saveHighscore(score);
  gameState = "gameover";
}

function resetGame() {
  ship.y = 300;
  ship.velocity = 0;
  pipes.length = 0;
  score = 0;
}

function saveHighscore(s) {
  highscores.push(s);
  highscores.sort((a, b) => b - a);
  highscores = highscores.slice(0, 3);
  localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(highscores));
}

/* =====================
   UI HELPERS
===================== */

function drawOutlinedText(text, x, y, size) {
  ctx.font = `${size}px ${UI_FONT}`;
  ctx.lineWidth = 3;
  ctx.strokeStyle = UI_STROKE;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = UI_FILL;
  ctx.fillText(text, x, y);
}

function drawText(text, y, size) {
  ctx.font = `${size}px ${UI_FONT}`;
  ctx.textAlign = "center";
  ctx.strokeStyle = UI_STROKE;
  ctx.lineWidth = 3;
  ctx.strokeText(text, canvas.width / 2, y);
  ctx.fillStyle = UI_FILL;
  ctx.fillText(text, canvas.width / 2, y);
  ctx.textAlign = "left";
}

function drawButton(btn, label, size = 18) {
  ctx.strokeStyle = UI_STROKE;
  ctx.lineWidth = 2;
  ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
  ctx.font = `${size}px ${UI_FONT}`;
  ctx.textAlign = "center";
  ctx.strokeText(label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 6);
  ctx.fillStyle = UI_FILL;
  ctx.fillText(label, btn.x + btn.width / 2, btn.y + btn.height / 2 + 6);
  ctx.textAlign = "left";
}

function isInside(btn, x, y) {
  return x >= btn.x && x <= btn.x + btn.width &&
         y >= btn.y && y <= btn.y + btn.height;
}

/* =====================
   START
===================== */

requestAnimationFrame(update);
