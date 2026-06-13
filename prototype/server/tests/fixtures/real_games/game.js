// Canonical initial JS for all generated games (pipeline-v3)
// Assumes #game-canvas and all DOM boilerplate are present (see game.html)

// Set up the canvas and context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Set fixed canvas size explicitly (Rule 1)
canvas.width = 360;
canvas.height = 640;

// Player entity as a glowing orb positioned at bottom center
const player = {
  x: 180, // fixed center x (360/2)
  y: 600, // fixed near bottom y (640 - 40)
  radius: 20,
  glowColor: 'rgba(255, 255, 100, 0.8)',
  speed: 5,
  collectedColors: new Set() // Track collected light particle colors
};

// Movement flags
let moveLeft = false;
let moveRight = false;

// Moving platform entity near top, moves horizontally in a loop
const platform = {
  x: 0, // start at left edge
  y: 80, // fixed near top y
  width: 120,
  height: 20,
  speed: 2,
  direction: 1 // 1 = moving right, -1 = moving left
};

// Array to hold multiple light particles spawned on the moving platform
let lightParticles = [];

// Possible colors for light particles
const lightParticleColors = [
  'rgba(255, 255, 200, 0.9)', // pale yellow
  'rgba(255, 150, 150, 0.9)', // soft red
  'rgba(150, 255, 150, 0.9)', // soft green
  'rgba(150, 150, 255, 0.9)'  // soft blue
];

// Win condition flag
let hasWon = false;

// Game over flag for timer expiration
let gameOver = false;

// Function to spawn a new light particle on the moving platform
function spawnLightParticle() {
  // Randomly pick a color from the list
  const color = lightParticleColors[Math.floor(Math.random() * lightParticleColors.length)];
  // Create new particle at center of platform, just above it
  const particle = {
    x: platform.x + 60, // center of platform (0 + 60)
    y: platform.y - 10, // just above platform
    radius: 8,
    color: color,
    descendSpeed: 0.5
  };
  lightParticles.push(particle);
}

// Initial spawn of one light particle to start
spawnLightParticle();

// Draw glowing orb function
function drawPlayer() {
  // Glow effect
  ctx.shadowColor = player.glowColor;
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'yellow';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0; // reset shadow
}

// Draw platform function
function drawPlatform() {
  ctx.fillStyle = 'gray';
  ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
}

// Draw light particle function
function drawLightParticle(particle) {
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
  ctx.fill();
}

// Handle keyboard input for left/right movement
window.addEventListener('keydown', function(e) {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    moveLeft = true;
  } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    moveRight = true;
  }
});

window.addEventListener('keyup', function(e) {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    moveLeft = false;
  } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    moveRight = false;
  }
});

// Absorb flag for absorb button press
let absorbPressed = false;

// Handle absorb button press (Space key)
window.addEventListener('keydown', function(e) {
  if (e.code === 'Space') {
    absorbPressed = true;
  }
});

// Update player position based on input and keep within screen bounds
function updatePlayer() {
  if (moveLeft) {
    player.x -= player.speed;
  }
  if (moveRight) {
    player.x += player.speed;
  }
  // Clamp player.x to stay fully visible within canvas width
  if (player.x < player.radius) {
    player.x = player.radius;
  }
  if (player.x > 360 - player.radius) {
    player.x = 360 - player.radius;
  }
}

// Update platform position, move horizontally in a loop
function updatePlatform() {
  platform.x += platform.speed * platform.direction;
  // Reverse direction if hitting canvas edges
  if (platform.x <= 0) {
    platform.x = 0;
    platform.direction = 1;
  }
  if (platform.x >= 240) { // 360 - platform.width = 240
    platform.x = 240;
    platform.direction = -1;
  }
}

// Update all light particles position to move along with platform and descend vertically
function updateLightParticles() {
  for (let i = lightParticles.length - 1; i >= 0; i--) {
    const particle = lightParticles[i];
    // Move horizontally with platform
    particle.x = platform.x + 60; // center of platform
    // Descend vertically slowly
    particle.y += particle.descendSpeed;
    // Prevent it from going above platform's initial position (optional)
    if (particle.y < platform.y - 10) {
      particle.y = platform.y - 10;
    }
    // Prevent it from descending below bottom of canvas
    if (particle.y > 640 - particle.radius) {
      particle.y = 640 - particle.radius;
    }
  }
}

// Check if player is close enough to absorb any light particle
function tryAbsorbLightParticle() {
  if (!absorbPressed) return;
  if (lightParticles.length === 0) {
    absorbPressed = false;
    return;
  }
  // Check each particle for absorption
  for (let i = 0; i < lightParticles.length; i++) {
    const particle = lightParticles[i];
    const dx = player.x - particle.x;
    const dy = player.y - particle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const absorbRadius = player.radius + particle.radius + 10; // 10 pixels extra tolerance
    if (distance <= absorbRadius) {
      // Absorb action: remove light particle and track its color
      player.collectedColors.add(particle.color);
      lightParticles.splice(i, 1); // Remove particle from array
      console.log('Light particle absorbed! Collected colors:', Array.from(player.collectedColors));
      absorbPressed = false;
      return; // Absorb only one particle per press
    }
  }
  // If no particle absorbed, reset absorbPressed anyway
  absorbPressed = false;
}

// Check win condition: player has absorbed at least one light particle of each color
function checkWinCondition() {
  for (const color of lightParticleColors) {
    if (!player.collectedColors.has(color)) {
      return false;
    }
  }
  return true;
}

// Periodically spawn new light particles on the moving platform
let spawnTimer = 0;
const spawnInterval = 3000; // spawn every 3000 ms (3 seconds)
let lastSpawnTime = performance.now();

// Timer for 5-minute game limit
const gameDuration = 300000; // 300,000 ms = 5 minutes
const gameStartTime = performance.now();

// Main game loop
function gameLoop() {
  const now = performance.now();

  // Check if time limit exceeded and player hasn't won yet
  if (!hasWon && !gameOver && now - gameStartTime >= gameDuration) {
    gameOver = true;
    console.log('Time is up! Game over.');
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!hasWon && !gameOver) {
    updatePlayer();
    updatePlatform();
    updateLightParticles();
    tryAbsorbLightParticle();

    // Check win condition and trigger win if met
    if (checkWinCondition()) {
      hasWon = true;
      console.log('You have absorbed all colors! You win!');
    }

    drawPlatform();
    for (const particle of lightParticles) {
      drawLightParticle(particle);
    }
    drawPlayer();

    // Handle periodic spawning
    if (now - lastSpawnTime >= spawnInterval) {
      spawnLightParticle();
      lastSpawnTime = now;
    }

    requestAnimationFrame(gameLoop);

  } else {
    // Game ended: either win or time over
    ctx.fillStyle = 'white';
    ctx.font = '28px Arial';
    ctx.textAlign = 'center';
    if (hasWon) {
      ctx.fillText('You Win!', 180, 320);
    } else if (gameOver) {
      ctx.fillText('Time\'s Up! Game Over', 180, 320);
    }
  }
}
gameLoop();