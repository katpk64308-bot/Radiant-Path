const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let player;
let floor;
let gameRunning = false;

function startGame() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    player = new Player();
    floor = new Floor(canvas.width, canvas.height);
    gameRunning = true;

    gameLoop();
}

window.addEventListener("keydown", (e) => {
    if (e.code === "Space") player.jump();
});
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

function gameLoop() {
    if (!gameRunning) return;

    // Limpar tela
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Atualizar e Desenhar
    player.update(floor.y);
    floor.draw(ctx);
    player.draw(ctx);

    requestAnimationFrame(gameLoop);
}
