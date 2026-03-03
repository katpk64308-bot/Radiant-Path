// Canvas base do jogo
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const orientationOverlay = document.getElementById("orientation-lock");
const miniMap = document.getElementById("miniMap");
const isMobileDevice = window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;

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

// Inicializa o jogo e comeca o loop
function startGame() {
    updateOrientationGate();
    resizeGameViewport();

    if (isMobileDevice) {
        // Ajuda a recolher a barra do navegador em alguns browsers.
        window.scrollTo(0, 1);
    }

    player = new Player();
    buildPlatforms();

    gameRunning = true;
    gameLoop();
}

// Tecla pressionada
function handleKeyDown(e) {
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
    if (player) player.jump();
});
window.addEventListener(
    "touchstart",
    () => {
        if (player) player.jump();
    },
    { passive: true }
);

window.addEventListener("resize", () => {
    if (!gameRunning) return;
    updateOrientationGate();
    resizeGameViewport();
    buildPlatforms();
});

window.addEventListener("orientationchange", updateOrientationGate);
if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
        if (!gameRunning) return;
        updateOrientationGate();
        resizeGameViewport();
        buildPlatforms();
    });
}

window.addEventListener("DOMContentLoaded", startGame);

// Loop principal
function gameLoop() {
    if (!gameRunning) return;
    updateOrientationGate();

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
