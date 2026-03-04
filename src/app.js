if (!window.__APP_VIEW) {
    window.__APP_VIEW = "menu";
}

const menuScreen = document.getElementById("menu-screen");
const gameScreen = document.getElementById("game-screen");
const startGameLink = document.getElementById("start-game-link");
const confirmMenuYes = document.getElementById("confirm-menu-yes");

function setAppView(view) {
    const isGame = view === "game";

    window.__APP_VIEW = isGame ? "game" : "menu";

    if (menuScreen) {
        menuScreen.hidden = isGame;
    }

    if (gameScreen) {
        gameScreen.hidden = !isGame;
    }
}

function openGame(event) {
    if (event) event.preventDefault();

    setAppView("game");
    history.replaceState(history.state, "", window.location.pathname + window.location.search);

    // Espera a tela de jogo ficar realmente visivel antes de inicializar o canvas.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (typeof window.startEmbeddedGame === "function") {
                window.startEmbeddedGame();
            }
            window.dispatchEvent(new Event("resize"));
        });
    });
}

function backToMenu(event) {
    if (event) event.preventDefault();

    if (window.location.hash === "#confirm-menu") {
        history.replaceState(history.state, "", window.location.pathname + window.location.search);
    }

    setAppView("menu");
}

if (startGameLink) {
    startGameLink.addEventListener("click", openGame);
}

if (confirmMenuYes) {
    confirmMenuYes.addEventListener("click", backToMenu);
}

setAppView("menu");
