(function () {
// Canvas base do jogo
const canvas = document.getElementById("gameCanvas");
if (!canvas) return;

const ctx = canvas.getContext("2d");
const orientationOverlay = document.getElementById("orientation-lock");
const miniMap = document.getElementById("miniMap");
const gameScreen = document.getElementById("game-screen");
const menuScreen = document.getElementById("menu-screen");
const isMobileDevice = window.matchMedia("(pointer: coarse)").matches;
const touchControls = document.getElementById("touch-controls");
const analogBase = document.getElementById("analog-base");
const analogKnob = document.getElementById("analog-knob");
const touchJump = document.getElementById("touch-jump");
const confirmMenu = document.getElementById("confirm-menu");
const confirmMenuYes = document.getElementById("confirm-menu-yes");
const confirmMenuNo = document.getElementById("confirm-menu-no");
const BASE_GAME_WIDTH = 1366;
const BASE_GAME_HEIGHT = 768;
const SCENE_DARKNESS = 0.1; // 0.10 = cenario ~90% visivel
const LIGHT_INNER_RADIUS_FACTOR = 0.18;
const LIGHT_OUTER_RADIUS_FACTOR = 0.6;

// Estado principal do jogo
let player;
let platforms = [];
let gameRunning = false;
let forceLandscapeView = false;

// Mapa simples de controles
const controls = {
    left: false,
    right: false,
    down: false,
};

let touchControlsReady = false;
let analogActive = false;
let analogPointerId = null;
let fullscreenRequested = false;
let allowBackNavigation = false;

function isMenuConfirmOpen() {
    return !!(confirmMenu && confirmMenu.classList.contains("is-open"));
}

function clearControls() {
    controls.left = false;
    controls.right = false;
    controls.down = false;
}

function blockPlayerInputs() {
    resetAnalogStick();
    clearControls();
    if (player) {
        player.setHorizontalInput(0);
    }
}

function closeMenuConfirm() {
    if (confirmMenu) {
        confirmMenu.classList.remove("is-open");
    }
    blockPlayerInputs();
}

function openMenuConfirm() {
    if (confirmMenu) {
        confirmMenu.classList.add("is-open");
    }
    blockPlayerInputs();
}

function isEventInsideTouchControls(event) {
    if (!touchControls || !event || !event.target) return false;
    return touchControls.contains(event.target);
}

function resetAnalogStick() {
    analogActive = false;
    analogPointerId = null;

    if (analogKnob) {
        analogKnob.style.transform = "translate(-50%, -50%)";
    }

    clearControls();
}

function setAnalogFromPoint(clientX, clientY) {
    if (!analogBase || !analogKnob) return;

    const rect = analogBase.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxRadius = rect.width * 0.34;

    let dx = clientX - cx;
    let dy = clientY - cy;
    const distance = Math.hypot(dx, dy);

    if (distance > maxRadius && distance > 0) {
        const scale = maxRadius / distance;
        dx *= scale;
        dy *= scale;
    }

    analogKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    const normX = dx / maxRadius;
    controls.left = normX < -0.22;
    controls.right = normX > 0.22;
}

function setupTouchControls() {
    if (touchControlsReady || !isMobileDevice) return;
    if (!analogBase || !analogKnob || !touchJump) return;

    touchControlsReady = true;

    analogBase.addEventListener("pointerdown", (event) => {
        if (isMenuConfirmOpen()) return;

        analogActive = true;
        analogPointerId = event.pointerId;
        analogBase.setPointerCapture(event.pointerId);
        setAnalogFromPoint(event.clientX, event.clientY);
        event.preventDefault();
    });

    analogBase.addEventListener("pointermove", (event) => {
        if (!analogActive) return;
        if (event.pointerId !== analogPointerId) return;

        setAnalogFromPoint(event.clientX, event.clientY);
        event.preventDefault();
    });

    analogBase.addEventListener("pointerup", (event) => {
        if (event.pointerId !== analogPointerId) return;
        resetAnalogStick();
    });

    analogBase.addEventListener("pointercancel", () => {
        resetAnalogStick();
    });

    touchJump.addEventListener("pointerdown", (event) => {
        if (isMenuConfirmOpen()) return;
        if (player) player.jump();
        event.preventDefault();
    });
}

async function tryEnterFullscreen() {
    if (!isMobileDevice) return;
    if (fullscreenRequested && document.fullscreenElement) return;
    if (document.fullscreenElement) return;
    if (!document.documentElement.requestFullscreen) return;

    try {
        await document.documentElement.requestFullscreen();
        fullscreenRequested = true;
    } catch (_) {
        // Nem todo navegador mobile permite fullscreen por script.
    }
}

function installMobileBackGuard() {
    if (!isMobileDevice || !window.history || !window.history.pushState) return;

    history.pushState({ mobileBackGuard: true }, "", window.location.href);

    window.addEventListener("popstate", () => {
        if (allowBackNavigation) return;

        openMenuConfirm();
        history.pushState({ mobileBackGuard: true }, "", window.location.href);
        tryEnterFullscreen();
    });
}

// Cria o layout das plataformas
function buildPlatforms() {
    const floorBottomGap = 0;

    const floor = new Floor(canvas.width, canvas.height, floorBottomGap);

    const endWallWidth = 20;
    const endWallHeight = Math.min(240, Math.max(140, Math.round(canvas.height * 0.3)));
    const endWallX = floor.width - endWallWidth;
    const endWallY = floor.y - endWallHeight;
    const endWall = new Platform(endWallX, endWallY, endWallWidth, endWallHeight, "#1e9f4a");

    platforms = [
        floor, // chao
        endWall, // rapinha no final
    ];
}

function isPortraitMode() {
    return window.innerHeight > window.innerWidth;
}

function updateOrientationGate() {
    forceLandscapeView = isMobileDevice && isPortraitMode();
    document.body.classList.toggle("force-landscape", forceLandscapeView);

    if (orientationOverlay) {
        orientationOverlay.classList.remove("is-visible");
    }

    if (miniMap) {
        miniMap.style.display = forceLandscapeView ? "none" : "block";
    }
}

function getViewportSize() {
    if (window.visualViewport) {
        return {
            width: Math.round(window.visualViewport.width),
            height: Math.round(window.visualViewport.height),
        };
    }

    return {
        width: window.innerWidth,
        height: window.innerHeight,
    };
}

function resizeGameViewport() {
    const viewport = getViewportSize();
    const rawWidth = forceLandscapeView ? viewport.height : viewport.width;
    const rawHeight = forceLandscapeView ? viewport.width : viewport.height;
    const isSmallMobileScreen = isMobileDevice && (rawWidth <= 950 || rawHeight <= 600);
    const minGameWidth = isSmallMobileScreen ? rawWidth : BASE_GAME_WIDTH;
    const minGameHeight = isSmallMobileScreen ? rawHeight : BASE_GAME_HEIGHT;
    const targetWidth = Math.max(minGameWidth, rawWidth);
    const targetHeight = Math.max(minGameHeight, rawHeight);
    const zoomOutFactor = 1;
    const renderWidth = Math.round(targetWidth * zoomOutFactor);
    const renderHeight = Math.round(targetHeight * zoomOutFactor);

    canvas.width = renderWidth;
    canvas.height = renderHeight;
    canvas.style.width = rawWidth + "px";
    canvas.style.height = rawHeight + "px";
}

function syncPlayerToResizedViewport(prevWidth, prevHeight, nextWidth, nextHeight) {
    if (!player) return;
    if (!prevWidth || !prevHeight || !nextWidth || !nextHeight) return;

    const scaleX = nextWidth / prevWidth;
    const scaleY = nextHeight / prevHeight;

    player.x *= scaleX;
    player.y *= scaleY;

    // Mantem o jogador dentro da tela apos resize agressivo.
    const maxX = Math.max(0, nextWidth - player.width);
    const maxY = Math.max(0, nextHeight - player.height);
    if (player.x < 0) player.x = 0;
    if (player.y < 0) player.y = 0;
    if (player.x > maxX) player.x = maxX;
    if (player.y > maxY) player.y = maxY;
}

function findNearestSupportTopForPlayer() {
    if (!player || !platforms || platforms.length === 0) return null;

    const playerBottom = player.y + player.height;
    let bestTop = null;
    let bestDistance = Infinity;

    for (const p of platforms) {
        const horizontalOverlap =
            player.x < p.x + p.width &&
            player.x + player.width > p.x;

        if (!horizontalOverlap) continue;

        const surfaceY = typeof p.getSurfaceY === "function" ? p.getSurfaceY(player.x, player.width) : p.y;
        const distance = Math.abs(playerBottom - surfaceY);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestTop = surfaceY;
        }
    }

    return bestTop;
}

function handleGameResize() {
    if (!gameRunning) return;

    const prevWidth = canvas.width;
    const prevHeight = canvas.height;
    const wasGrounded = !!(player && player.isGrounded);

    updateOrientationGate();
    resizeGameViewport();
    buildPlatforms();
    syncPlayerToResizedViewport(prevWidth, prevHeight, canvas.width, canvas.height);

    if (player) {
        const supportTop = findNearestSupportTopForPlayer();

        if (wasGrounded && supportTop !== null) {
            player.y = supportTop - player.height;
            player.vy = 0;
            player.isGrounded = true;
        } else if (supportTop !== null && player.y + player.height > supportTop) {
            player.y = supportTop - player.height;
            player.vy = 0;
            player.isGrounded = true;
        }
    }
}

function drawSceneLighting() {
    if (!player) return;

    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    const minDim = Math.min(canvas.width, canvas.height);
    const innerRadius = Math.max(player.width, player.height, minDim * LIGHT_INNER_RADIUS_FACTOR);
    const outerRadius = Math.max(innerRadius + 1, minDim * LIGHT_OUTER_RADIUS_FACTOR);

    const gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(1, `rgba(0, 0, 0, ${SCENE_DARKNESS})`);

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

// Inicializa o jogo e comeca o loop
function startGame() {
    if (gameRunning) {
        handleGameResize();
        return;
    }

    tryEnterFullscreen();
    installMobileBackGuard();
    updateOrientationGate();
    resizeGameViewport();

    if (isMobileDevice) {
        // Ajuda a recolher a barra do navegador em alguns browsers.
        window.scrollTo(0, 1);
    }

    player = new Player();
    buildPlatforms();
    setupTouchControls();

    gameRunning = true;
    gameLoop();
}

function showGameScreen() {
    if (gameScreen) gameScreen.style.display = "block";
}

function hideGameScreen() {
    if (gameScreen) gameScreen.style.display = "none";
}

function returnToMenuScreen() {
    closeMenuConfirm();
    gameRunning = false;
    blockPlayerInputs();
    hideGameScreen();
    if (menuScreen) {
        menuScreen.style.display = "block";
    }
    if (window.MenuScreenAPI && typeof window.MenuScreenAPI.onReturnFromGame === "function") {
        window.MenuScreenAPI.onReturnFromGame();
    }
}

function openGameFromMenu() {
    if (menuScreen) {
        menuScreen.style.display = "none";
    }
    showGameScreen();
    startGame();
}

// Tecla pressionada
function handleKeyDown(e) {
    if (isMenuConfirmOpen()) {
        blockPlayerInputs();
        e.preventDefault();
        return;
    }

    switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
            controls.left = true;
            break;
        case "ArrowRight":
        case "KeyD":
            controls.right = true;
            break;
        case "ArrowDown":
        case "KeyS":
            controls.down = true;
            break;
        case "ArrowUp":
        case "Space":
            if (player) player.jump();
            break;
        default:
            return;
    }

    e.preventDefault();
}

// Tecla solta
function handleKeyUp(e) {
    if (isMenuConfirmOpen()) {
        blockPlayerInputs();
        e.preventDefault();
        return;
    }

    switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
            controls.left = false;
            break;
        case "ArrowRight":
        case "KeyD":
            controls.right = false;
            break;
        case "ArrowDown":
        case "KeyS":
            controls.down = false;
            break;
        default:
            return;
    }

    e.preventDefault();
}

// Eventos de entrada e de janela
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("mousedown", () => {
    if (isMenuConfirmOpen()) return;
    if (player) player.jump();
});
window.addEventListener(
    "touchstart",
    (event) => {
        tryEnterFullscreen();
        if (isMenuConfirmOpen()) return;
        if (isEventInsideTouchControls(event)) return;
        if (player) player.jump();
    },
    { passive: true }
);
window.addEventListener(
    "pointerdown",
    () => {
        tryEnterFullscreen();
    },
    { passive: true }
);
document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
        fullscreenRequested = false;
        if (!isMenuConfirmOpen()) {
            tryEnterFullscreen();
        }
    }
});
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !isMenuConfirmOpen()) {
        tryEnterFullscreen();
    }
});

window.addEventListener("resize", handleGameResize);

window.addEventListener("orientationchange", updateOrientationGate);
if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", handleGameResize);
}

if (confirmMenuYes) {
    confirmMenuYes.addEventListener("click", (event) => {
        event.preventDefault();
        allowBackNavigation = true;
        returnToMenuScreen();
    });
}

if (confirmMenuNo) {
    confirmMenuNo.addEventListener("click", (event) => {
        event.preventDefault();
        closeMenuConfirm();
        tryEnterFullscreen();
    });
}

const backMenuButton = document.getElementById("back-menu");
if (backMenuButton) {
    backMenuButton.addEventListener("click", (event) => {
        event.preventDefault();
        openMenuConfirm();
    });
}

window.addEventListener("keydown", (event) => {
    if (event.code === "Escape" && isMenuConfirmOpen()) {
        event.preventDefault();
        closeMenuConfirm();
        tryEnterFullscreen();
    }
});

window.GameScreenAPI = {
    openGameFromMenu,
    returnToMenuScreen,
};

// Loop principal
function gameLoop() {
    if (!gameRunning) return;
    updateOrientationGate();

    if (isMenuConfirmOpen()) {
        blockPlayerInputs();
        requestAnimationFrame(gameLoop);
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const horizontalDirection = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    player.setHorizontalInput(horizontalDirection);

    if (controls.down && !player.isGrounded) {
        player.vy += 0.35;
    }

    // Atualiza e desenha
    player.update(platforms, canvas.width, canvas.height);
    platforms.forEach((p) => p.draw(ctx));
    player.draw(ctx);
    platforms.forEach((p) => {
        if (typeof p.drawForeground === "function") {
            p.drawForeground(ctx, player);
        }
    });
    drawSceneLighting();

    requestAnimationFrame(gameLoop);
}
})();
