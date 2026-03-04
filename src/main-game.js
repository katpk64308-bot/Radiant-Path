// Canvas base do jogo
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const orientationOverlay = document.getElementById("orientation-lock");
const miniMap = document.getElementById("miniMap");
const isMobileDevice = window.matchMedia("(pointer: coarse)").matches;
const touchControls = document.getElementById("touch-controls");
const analogBase = document.getElementById("analog-base");
const analogKnob = document.getElementById("analog-knob");
const touchJump = document.getElementById("touch-jump");
const confirmMenuYes = document.getElementById("confirm-menu-yes");

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
const menuConfirmHash = "#confirm-menu";

function isMenuConfirmOpen() {
    return window.location.hash === menuConfirmHash;
}

function closeMenuConfirm() {
    if (window.location.hash === menuConfirmHash) {
        history.replaceState(history.state, "", window.location.pathname + window.location.search);
    }
}

function openMenuConfirm() {
    if (window.location.hash !== menuConfirmHash) {
        window.location.hash = menuConfirmHash;
    }
}

function clearControls() {
    controls.left = false;
    controls.right = false;
    controls.down = false;
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
    platforms = [
        new Floor(canvas.width, canvas.height), // chao
        new Platform(300, canvas.height - 180, 220, 20),
        new Platform(620, canvas.height - 280, 180, 20),
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
    const targetWidth = forceLandscapeView ? viewport.height : viewport.width;
    const targetHeight = forceLandscapeView ? viewport.width : viewport.height;

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    canvas.style.width = targetWidth + "px";
    canvas.style.height = targetHeight + "px";
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

        const distance = Math.abs(playerBottom - p.y);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestTop = p.y;
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

// Tecla pressionada
function handleKeyDown(e) {
    if (isMenuConfirmOpen()) {
        clearControls();
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
        clearControls();
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
    confirmMenuYes.addEventListener("click", () => {
        allowBackNavigation = true;
    });
}

document.querySelectorAll("#confirm-menu .confirm-no").forEach((button) => {
    button.addEventListener("click", (event) => {
        if (!button.getAttribute("href") || button.getAttribute("href") !== "#") return;
        event.preventDefault();
        closeMenuConfirm();
        tryEnterFullscreen();
    });
});

window.addEventListener("DOMContentLoaded", startGame);

// Loop principal
function gameLoop() {
    if (!gameRunning) return;
    updateOrientationGate();

    if (isMenuConfirmOpen()) {
        resetAnalogStick();
        clearControls();
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

    requestAnimationFrame(gameLoop);
}