// Game variables
const character = document.getElementById('character');
const gameArea = document.querySelector('.game-area');
const scoreDisplay = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over');
const finalScoreDisplay = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');

// Debug mode - set to true to see collision areas (for development)
const debugCollisions = false;

// Rock and flower assets
const rockAssets = ['Assets/Rock 1.png', 'Assets/Rock 2.png', 'Assets/Rock 3.png'];
const flowerAssets = ['Assets/flower 1.png', 'Assets/flower 2.png'];

// Preload all assets
const assetsToLoad = [
    ...rockAssets,
    ...flowerAssets,
    'Assets/Platform.png',
    'Assets/cloud 1.png',
    'Assets/cloud 2.png',
    'Assets/cloud 3.png',
    'Assets/cloud-catball.png',
    'Assets/Cloud-liquina.png',
    'Character Sprites /run.gif'
];

let assetsLoaded = 0;
let gameReady = false;

// Object pools for performance optimization
const obstaclePool = [];
const coinPool = [];
const activeObstacles = [];
const activeCoins = [];
const effectPool = [];
const activeEffects = [];

// Preload assets function
function preloadAssets() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingProgress = document.getElementById('loading-progress');
    
    assetsToLoad.forEach(src => {
        const img = new Image();
        img.onload = () => {
            assetsLoaded++;
            const progress = (assetsLoaded / assetsToLoad.length) * 100;
            loadingProgress.style.width = `${progress}%`;
            
            if (assetsLoaded === assetsToLoad.length) {
                gameReady = true;
                console.log('All assets loaded! Game ready to start.');
                initializeObjectPools();
                // Hide loading screen and start game
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    startGame();
                }, 500);
            }
        };
        img.onerror = () => {
            console.warn(`Failed to load: ${src}`);
            assetsLoaded++;
            const progress = (assetsLoaded / assetsToLoad.length) * 100;
            loadingProgress.style.width = `${progress}%`;
            
            if (assetsLoaded === assetsToLoad.length) {
                gameReady = true;
                initializeObjectPools();
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    startGame();
                }, 500);
            }
        };
        img.src = src;
    });
}

// Initialize object pools for better performance
function initializeObjectPools() {
    // Pre-create obstacle elements
    for (let i = 0; i < 10; i++) {
        const obstacle = document.createElement('div');
        obstacle.classList.add('obstacle');
        obstacle.style.backgroundSize = 'contain';
        obstacle.style.backgroundPosition = 'center bottom';
        obstacle.style.backgroundRepeat = 'no-repeat';
        obstacle.style.position = 'absolute';
        obstacle.style.zIndex = '5';
        obstacle.style.display = 'none';
        // Safari performance optimizations
        obstacle.style.webkitTransform = 'translateZ(0)';
        obstacle.style.transform = 'translateZ(0)';
        obstacle.style.webkitBackfaceVisibility = 'hidden';
        obstacle.style.backfaceVisibility = 'hidden';
        gameArea.appendChild(obstacle);
        obstaclePool.push(obstacle);
    }
    
    // Pre-create coin elements
    for (let i = 0; i < 8; i++) {
        const coin = document.createElement('div');
        coin.classList.add('coin');
        coin.style.position = 'absolute';
        coin.style.zIndex = '5';
        coin.style.display = 'none';
        // Safari performance optimizations
        coin.style.webkitTransform = 'translateZ(0)';
        coin.style.transform = 'translateZ(0)';
        coin.style.webkitBackfaceVisibility = 'hidden';
        coin.style.backfaceVisibility = 'hidden';
        gameArea.appendChild(coin);
        coinPool.push(coin);
    }
    
    // Pre-create effect elements
    for (let i = 0; i < 6; i++) {
        const effect = document.createElement('div');
        effect.style.position = 'absolute';
        effect.style.fontWeight = 'bold';
        effect.style.fontSize = '20px';
        effect.style.zIndex = '15';
        effect.style.textShadow = '0 0 5px white';
        effect.style.pointerEvents = 'none';
        effect.style.display = 'none';
        gameArea.appendChild(effect);
        effectPool.push(effect);
    }
}

// Object pool management functions
function getObstacleFromPool() {
    if (obstaclePool.length > 0) {
        return obstaclePool.pop();
    }
    // Create new if pool is empty (shouldn't happen with proper sizing)
    const obstacle = document.createElement('div');
    obstacle.classList.add('obstacle');
    obstacle.style.backgroundSize = 'contain';
    obstacle.style.backgroundPosition = 'center bottom';
    obstacle.style.backgroundRepeat = 'no-repeat';
    obstacle.style.position = 'absolute';
    obstacle.style.zIndex = '5';
    gameArea.appendChild(obstacle);
    return obstacle;
}

function returnObstacleToPool(obstacle) {
    obstacle.style.display = 'none';
    obstacle.style.left = '0px'; // Reset position
    obstacle.style.transform = 'translateX(0px)'; // Reset transform
    obstaclePool.push(obstacle);
}

function getCoinFromPool() {
    if (coinPool.length > 0) {
        return coinPool.pop();
    }
    const coin = document.createElement('div');
    coin.classList.add('coin');
    coin.style.position = 'absolute';
    coin.style.zIndex = '5';
    gameArea.appendChild(coin);
    return coin;
}

function returnCoinToPool(coin) {
    coin.style.display = 'none';
    coin.style.left = '0px'; // Reset position
    coin.style.transform = 'translateX(0px)'; // Reset transform
    coinPool.push(coin);
}

function getEffectFromPool() {
    if (effectPool.length > 0) {
        return effectPool.pop();
    }
    const effect = document.createElement('div');
    effect.style.position = 'absolute';
    effect.style.fontWeight = 'bold';
    effect.style.fontSize = '20px';
    effect.style.zIndex = '15';
    effect.style.textShadow = '0 0 5px white';
    effect.style.pointerEvents = 'none';
    gameArea.appendChild(effect);
    return effect;
}

function returnEffectToPool(effect) {
    effect.style.display = 'none';
    effectPool.push(effect);
}

let isJumping = false;
let isGameOver = false;
let score = 0;
let gameSpeed = 5;
let groundPosition = 0;
let lastObstacleTime = 0;
let lastCoinTime = 0;
let lastScoreTime = 0;
let lastSpeedIncreaseTime = 0;
let gameStartTime = 0;
let obstacleInterval = 2200;
let coinInterval = 3000;

// Event listeners
document.addEventListener('keydown', jump);
document.addEventListener('touchstart', handleTouchStart);
restartButton.addEventListener('click', restartGame);

// Touch controls for mobile devices
function handleTouchStart(event) {
    if (!isJumping && !isGameOver) {
        event.preventDefault();
        jump({ code: 'Space' });
    }
}

// Start the game
function startGame() {
    if (!gameReady) {
        console.log('Game not ready yet, assets still loading...');
        return;
    }
    
    isGameOver = false;
    score = 0;
    gameSpeed = 6; // Increased for faster running
    obstacleInterval = 2600; // Keep good spacing between rocks
    coinInterval = 3000;
    groundPosition = 0;
    gameStartTime = performance.now();
    lastObstacleTime = gameStartTime;
    lastCoinTime = gameStartTime;
    lastScoreTime = gameStartTime;
    lastSpeedIncreaseTime = gameStartTime;
    
    scoreDisplay.textContent = `Score: ${score}`;
    gameOverScreen.classList.add('hidden');
    
    // Return all active elements to pools
    activeObstacles.forEach(obj => returnObstacleToPool(obj.element));
    activeCoins.forEach(obj => returnCoinToPool(obj.element));
    activeEffects.forEach(obj => returnEffectToPool(obj.element));
    activeObstacles.length = 0;
    activeCoins.length = 0;
    activeEffects.length = 0;
    
    // Start main animation loop
    animateGame();
}

// Main animation loop - handles everything in one efficient loop
function animateGame() {
    if (isGameOver) return;
    
    const currentTime = performance.now();
    const deltaTime = currentTime - gameStartTime;
    
    // Animate ground
    animateGround();
    
         // Update game speed every 15 seconds
     if (currentTime - lastSpeedIncreaseTime >= 15000) {
         gameSpeed += 0.3; // Slightly slower speed increase
         obstacleInterval = Math.max(obstacleInterval - 50, 1600); // Don't get too fast
         coinInterval = Math.max(coinInterval - 50, 2000);
         lastSpeedIncreaseTime = currentTime;
     }
    
    // Create obstacles based on timing and spacing
    if (currentTime - lastObstacleTime >= obstacleInterval) {
        // Check if there's enough space from the last obstacle
        if (canCreateObstacle()) {
            createObstacle();
            lastObstacleTime = currentTime;
        }
    }
    
    // Create coins based on timing
    if (currentTime - lastCoinTime >= coinInterval) {
        createCoin();
        lastCoinTime = currentTime;
    }
    
    // Update score every second
    if (currentTime - lastScoreTime >= 1000) {
        score++;
        scoreDisplay.textContent = `Score: ${score}`;
        lastScoreTime = currentTime;
    }
    
    // Update all active obstacles
    updateObstacles();
    
    // Update all active coins
    updateCoins();
    
    // Update all active effects
    updateEffects();
    
    // Continue animation
    requestAnimationFrame(animateGame);
}

// Animate ground to create scrolling effect
function animateGround() {
    const platform = document.querySelector('.platform');
    groundPosition -= gameSpeed;
    
    // Reset position when enough of the platform has scrolled
    const containerWidth = gameArea.offsetWidth;
    const resetPoint = -containerWidth;
    
    if (groundPosition <= resetPoint) {
        groundPosition = 0;
    }
    
    platform.style.transform = `translateX(${groundPosition}px)`;
}

// Check if we can create a new obstacle (enough spacing from existing ones)
function canCreateObstacle() {
    const containerWidth = gameArea.offsetWidth;
    const minSpacing = containerWidth * 0.4; // Minimum 40% screen width between rocks
    
    // Check if any active obstacle is too close to the spawn point
    for (let i = 0; i < activeObstacles.length; i++) {
        const obstacle = activeObstacles[i].element;
        const obstacleLeft = parseInt(obstacle.style.left) || containerWidth;
        
        // If any obstacle is within the minimum spacing distance, don't spawn
        if (obstacleLeft > containerWidth - minSpacing) {
            return false;
        }
    }
    
    return true;
}

// Create obstacle using object pool
function createObstacle() {
    const obstacle = getObstacleFromPool();
    
    // Random rock asset
    const randomRock = rockAssets[Math.floor(Math.random() * rockAssets.length)];
    obstacle.style.backgroundImage = `url('${randomRock}')`;
    
    // Responsive rock sizes - even bigger for new images
    const containerWidth = gameArea.offsetWidth;
    let baseSize = Math.max(32, containerWidth * 0.045); // Even bigger base size
    
    // Early game assistance
    let sizeMultiplier = 1;
    if (score < 20) {
        sizeMultiplier = 0.75; // Less reduction since we need bigger rocks
    }
    
    let size;
    if (randomRock.includes('Rock 1.png')) {
        size = Math.min(baseSize * 1.5 * sizeMultiplier, 100); // Even bigger Rock 1
    } else if (randomRock.includes('Rock 2.png')) {
        size = Math.min(baseSize * 1.2 * sizeMultiplier, 80); // Even bigger Rock 2
    } else if (randomRock.includes('Rock 3.png')) {
        size = Math.min(baseSize * 0.9 * sizeMultiplier, 60); // Even bigger Rock 3
    }
    
    obstacle.style.height = `${size}px`;
    obstacle.style.width = `${size}px`;
    obstacle.style.left = `${containerWidth}px`;
    obstacle.style.bottom = '35px'; // Lower so rocks sit on the platform
    obstacle.style.display = 'block';
    obstacle.style.transform = 'translateX(0px)'; // Initialize transform
    
    // Add to active obstacles array with initial position
    activeObstacles.push({
        element: obstacle,
        size: size,
        x: containerWidth
    });
}

// Create coin using object pool
function createCoin() {
    const coin = getCoinFromPool();
    
    // Remove any background image (now using CSS styling)
    coin.style.backgroundImage = 'none';
    
    // Responsive coin size - smaller CSS coins
    const containerHeight = gameArea.offsetHeight;
    const coinSize = Math.max(20, containerHeight * 0.04); // Smaller coins
    coin.style.width = `${coinSize}px`;
    coin.style.height = `${coinSize}px`;
    
    // Random height for coins - adjusted for 220px jump
    const minHeight = containerHeight * 0.12;
    const maxHeight = containerHeight * 0.40; // Adjusted for 220px jump height
    const height = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
    
    coin.style.left = `${gameArea.offsetWidth}px`;
    coin.style.bottom = `${height}px`;
    coin.style.display = 'block';
    coin.style.transform = 'translateX(0px)'; // Initialize transform
    
    // Add to active coins array with initial position
    activeCoins.push({
        element: coin,
        size: coinSize,
        x: gameArea.offsetWidth
    });
}

// Update all obstacles in one batch - Safari optimized
function updateObstacles() {
    const containerWidth = gameArea.offsetWidth;
    
    for (let i = activeObstacles.length - 1; i >= 0; i--) {
        const obstacleObj = activeObstacles[i];
        const obstacle = obstacleObj.element;
        const size = obstacleObj.size;
        
        // Cache position to avoid repeated style reads
        obstacleObj.x = (obstacleObj.x !== undefined) ? obstacleObj.x - gameSpeed : containerWidth - gameSpeed;
        
        if (obstacleObj.x <= -size) {
            // Remove obstacle and return to pool
            activeObstacles.splice(i, 1);
            returnObstacleToPool(obstacle);
            
            // Bonus points for successfully jumping over obstacle
            if (!isGameOver) {
                score += 2;
                scoreDisplay.textContent = `Score: ${score}`;
                createJumpEffect();
            }
        } else {
            // Use both left and transform for compatibility
            obstacle.style.left = `${obstacleObj.x}px`;
            checkCollision(obstacle);
        }
    }
}

// Update all coins in one batch - Safari optimized
function updateCoins() {
    const containerWidth = gameArea.offsetWidth;
    
    for (let i = activeCoins.length - 1; i >= 0; i--) {
        const coinObj = activeCoins[i];
        const coin = coinObj.element;
        const size = coinObj.size;
        
        // Cache position to avoid repeated style reads
        coinObj.x = (coinObj.x !== undefined) ? coinObj.x - gameSpeed : containerWidth - gameSpeed;
        
        if (coinObj.x <= -size) {
            // Remove coin and return to pool
            activeCoins.splice(i, 1);
            returnCoinToPool(coin);
        } else {
            // Use both left and transform for compatibility
            coin.style.left = `${coinObj.x}px`;
            checkCoinCollection(coin, i);
        }
    }
}

// Update all effects in one batch
function updateEffects() {
    for (let i = activeEffects.length - 1; i >= 0; i--) {
        const effectObj = activeEffects[i];
        const effect = effectObj.element;
        
        effectObj.opacity -= 0.05;
        effectObj.top -= effectObj.speed;
        
        effect.style.opacity = effectObj.opacity;
        effect.style.top = `${effectObj.top}px`;
        
        if (effectObj.opacity <= 0) {
            activeEffects.splice(i, 1);
            returnEffectToPool(effect);
        }
    }
}

// Jump function
function jump(event) {
    if (isGameOver) return;
    
    if (event.code === 'Space' && !isJumping) {
        isJumping = true;
        character.classList.add('jump');
        
        setTimeout(() => {
            character.classList.remove('jump');
            isJumping = false;
        }, 500); // Matches realistic jump duration
    }
}

// Check for collision with obstacles
function checkCollision(obstacle) {
    // Don't check collision if character is high in the air (mid-jump)
    const characterRect = character.getBoundingClientRect();
    const gameAreaRect = gameArea.getBoundingClientRect();
    const characterBottom = characterRect.bottom - gameAreaRect.top;
    const gameAreaHeight = gameArea.offsetHeight;
    
    // If character is in upper 35% of screen (220px jump), reduce collision sensitivity
    const isHighJump = characterBottom < gameAreaHeight * 0.65;
    
    const obstacleRect = obstacle.getBoundingClientRect();
    
    // Very precise collision detection for actual rock pixels only
    // Get the rock image size to calculate accurate collision area
    const rockWidth = parseInt(obstacle.style.width) || 50;
    const rockHeight = parseInt(obstacle.style.height) || 50;
    
    // Create much smaller collision box that only covers the solid rock part
    // Most rocks have significant transparent padding, so use only 35-45% of image
    const rockCollisionWidth = rockWidth * 0.35;
    const rockCollisionHeight = rockHeight * 0.45;
    
    // Position collision box at bottom-center of image (where most rocks sit)
    const rockCenterX = obstacleRect.left + (obstacleRect.width / 2);
    const rockBottomY = obstacleRect.bottom - (rockHeight * 0.15); // Closer to actual bottom
    
    const rockLeft = rockCenterX - (rockCollisionWidth / 2);
    const rockRight = rockCenterX + (rockCollisionWidth / 2);
    const rockTop = rockBottomY - rockCollisionHeight;
    const rockBottom = rockBottomY;
    
    // Extra forgiving collision during high jumps
    const jumpForgiveness = isHighJump ? 8 : 3;
    
    // Character collision area - very forgiving
    const characterCollisionBuffer = isHighJump ? 12 : 8; // Bigger buffer for character
    const charLeft = characterRect.left + characterCollisionBuffer + jumpForgiveness;
    const charRight = characterRect.right - characterCollisionBuffer - jumpForgiveness;
    const charTop = characterRect.top + characterCollisionBuffer + jumpForgiveness;
    const charBottom = characterRect.bottom - characterCollisionBuffer - jumpForgiveness;
    
    // Debug visualization (only if debug mode is enabled)
    if (debugCollisions) {
        // Remove any existing debug visuals
        document.querySelectorAll('.debug-collision').forEach(el => el.remove());
        
        // Show actual collision area for rock (only the rock shape)
        const rockDebug = document.createElement('div');
        rockDebug.className = 'debug-collision';
        rockDebug.style.position = 'absolute';
        rockDebug.style.left = `${rockLeft}px`;
        rockDebug.style.top = `${rockTop}px`;
        rockDebug.style.width = `${rockRight - rockLeft}px`;
        rockDebug.style.height = `${rockBottom - rockTop}px`;
        rockDebug.style.border = '2px solid red';
        rockDebug.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
        rockDebug.style.zIndex = '20';
        rockDebug.style.pointerEvents = 'none';
        document.body.appendChild(rockDebug);
        
        // Show character collision area
        const charDebug = document.createElement('div');
        charDebug.className = 'debug-collision';
        charDebug.style.position = 'absolute';
        charDebug.style.left = `${charLeft}px`;
        charDebug.style.top = `${charTop}px`;
        charDebug.style.width = `${charRight - charLeft}px`;
        charDebug.style.height = `${charBottom - charTop}px`;
        charDebug.style.border = '2px solid blue';
        charDebug.style.backgroundColor = 'rgba(0, 0, 255, 0.2)';
        charDebug.style.zIndex = '20';
        charDebug.style.pointerEvents = 'none';
        document.body.appendChild(charDebug);
    }
    
    if (
        charRight > rockLeft &&
        charLeft < rockRight &&
        charBottom > rockTop &&
        charTop < rockBottom
    ) {
        gameOver();
    }
}

// Check for coin collection
function checkCoinCollection(coin, index) {
    const characterRect = character.getBoundingClientRect();
    const coinRect = coin.getBoundingClientRect();
    
    if (
        characterRect.right > coinRect.left &&
        characterRect.left < coinRect.right &&
        characterRect.bottom > coinRect.top &&
        characterRect.top < coinRect.bottom
    ) {
        // Create a collection effect
        createCollectionEffect(coinRect);
        
        // Add points
        score += 1;
        scoreDisplay.textContent = `Score: ${score}`;
        activeCoins.splice(index, 1); // Remove from active coins
        returnCoinToPool(coin); // Return to pool
    }
}

// Create a visual effect when collecting a coin
function createCollectionEffect(coinRect) {
    const effect = getEffectFromPool();
    
    effect.textContent = '+1';
    effect.style.left = `${coinRect.left}px`;
    effect.style.top = `${coinRect.top}px`;
    effect.style.color = '#ffd700';
    effect.style.fontSize = '16px';
    effect.style.fontWeight = 'bold';
    effect.style.zIndex = '15';
    effect.style.textShadow = '0 0 3px rgba(0, 0, 0, 0.8)';
    effect.style.pointerEvents = 'none';
    effect.style.display = 'block';
    
    // Add to active effects array
    activeEffects.push({
        element: effect,
        opacity: 1,
        top: coinRect.top,
        speed: 2
    });
}

// Create a visual effect when successfully jumping over an obstacle
function createJumpEffect() {
    const effect = getEffectFromPool();
    
    effect.textContent = '+2 Jump!';
    effect.style.left = '10%';
    effect.style.top = '20%';
    effect.style.color = '#4CAF50';
    effect.style.fontSize = '16px';
    effect.style.zIndex = '15';
    effect.style.textShadow = '0 0 5px white';
    effect.style.pointerEvents = 'none';
    effect.style.display = 'block';
    
    // Add to active effects array with percentage-based top
    const containerHeight = gameArea.offsetHeight;
    const topPx = containerHeight * 0.2; // Convert 20% to pixels
    
    activeEffects.push({
        element: effect,
        opacity: 1,
        top: topPx,
        speed: 1
    });
}

// Game over function
function gameOver() {
    isGameOver = true;
    
    // Clean up debug visuals
    if (debugCollisions) {
        document.querySelectorAll('.debug-collision').forEach(el => el.remove());
    }
    
    // Return all active elements to pools
    activeObstacles.forEach(obj => returnObstacleToPool(obj.element));
    activeCoins.forEach(obj => returnCoinToPool(obj.element));
    activeEffects.forEach(obj => returnEffectToPool(obj.element));
    activeObstacles.length = 0;
    activeCoins.length = 0;
    activeEffects.length = 0;
    
    finalScoreDisplay.textContent = `Your score: ${score}`;
    gameOverScreen.classList.remove('hidden');
}

// Restart game
function restartGame() {
    if (!gameReady) {
        console.log('Assets still loading, please wait...');
        return;
    }
    
    startGame();
}

// Initialize the game
preloadAssets(); 