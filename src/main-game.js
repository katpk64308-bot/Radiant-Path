// Canvas base do jogo
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Estado principal do jogo
let player;
let floor;
let gameRunning = false;

// Mapa simples de controles
const controls = {
    left: false,
    right: false,
    down: false,
};

// Inicializa o jogo e começa o loop
function startGame() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    player = new Player();
    floor = new Floor(canvas.width, canvas.height);
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

window.addEventListener("resize", () => {
    if (!gameRunning) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    floor = new Floor(canvas.width, canvas.height);
});

window.addEventListener("DOMContentLoaded", startGame);

// Loop principal
function gameLoop() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const horizontalDirection = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    player.setHorizontalInput(horizontalDirection);

    if (controls.down && !player.isGrounded) {
        player.vy += 0.35;
    }

    // Atualiza e desenha
    player.update(floor.y, canvas.width);
    floor.draw(ctx);
    player.draw(ctx);

    requestAnimationFrame(gameLoop);
}
