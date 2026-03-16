(function () {
// Neblina do menu (camadas suaves)
const fogLayer = document.getElementById("fire");
if (!fogLayer) return;

const orientationOverlay = document.getElementById("orientation-lock-menu");
const uiContainer = document.getElementById("ui-container");
const menuScreen = document.getElementById("menu-screen");
const startGameButton = document.getElementById("start-game");
const confirmExitYes = document.getElementById("confirm-exit-yes");

const isMobileViewport = window.matchMedia("(pointer: coarse)").matches;
const isSmallScreen = window.matchMedia("(max-width: 768px)").matches;
const isVeryTallPhone = window.innerWidth <= 900 && window.innerHeight >= 1700;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lowCpu = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
let fullscreenRequested = false;
let allowBackNavigation = false;
const exitConfirmHash = "#confirm-exit";
const shouldBlockContextMenu =
    window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(max-width: 900px)").matches;

function blockContextMenu(event) {
    if (!shouldBlockContextMenu) return;
    event.preventDefault();
}

function isPortraitMode() {
    return window.innerHeight > window.innerWidth;
}

function updateOrientationGate() {
    const blocked = isMobileViewport && isPortraitMode();

    if (orientationOverlay) {
        orientationOverlay.classList.toggle("is-visible", blocked);
    }

    if (uiContainer) {
        uiContainer.style.visibility = blocked ? "hidden" : "visible";
    }
}

async function tryLockLandscape() {
    if (!isMobileViewport) return;
    if (!window.screen || !screen.orientation || !screen.orientation.lock) return;

    try {
        await screen.orientation.lock("landscape");
    } catch (_) {
        // Alguns navegadores exigem fullscreen/gesto do usuario.
    }
}

async function tryEnterFullscreen() {
    if (!isMobileViewport) return;
    if (fullscreenRequested && document.fullscreenElement) return;
    if (document.fullscreenElement) return;
    if (!document.documentElement.requestFullscreen) return;

    try {
        await document.documentElement.requestFullscreen();
        fullscreenRequested = true;
        await tryLockLandscape();
    } catch (_) {
        // Nem todo navegador mobile permite fullscreen via script.
    }
}

function closeExitConfirm() {
    if (window.location.hash === exitConfirmHash) {
        history.replaceState(history.state, "", window.location.pathname + window.location.search);
    }
    if (window.location.hash) {
        window.location.hash = "";
    }
}

function openExitConfirm() {
    if (window.location.hash !== exitConfirmHash) {
        window.location.hash = exitConfirmHash;
    }
}

function installMobileBackGuard() {
    if (!isMobileViewport || !window.history || !window.history.pushState) return;

    history.pushState({ mobileBackGuard: true }, "", window.location.href);

    window.addEventListener("popstate", () => {
        if (allowBackNavigation) return;

        openExitConfirm();
        history.pushState({ mobileBackGuard: true }, "", window.location.href);
        tryEnterFullscreen();
    });
}

function showMenuScreen() {
    if (menuScreen) menuScreen.style.display = "block";
    updateOrientationGate();
}

function hideMenuScreen() {
    if (menuScreen) menuScreen.style.display = "none";
}

updateOrientationGate();
tryLockLandscape();
installMobileBackGuard();
if (shouldBlockContextMenu) {
    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("selectstart", blockContextMenu);
    document.addEventListener("dragstart", blockContextMenu);
    document.addEventListener("copy", blockContextMenu);
    document.addEventListener("cut", blockContextMenu);
}

window.addEventListener("resize", updateOrientationGate);
window.addEventListener("orientationchange", updateOrientationGate);
document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
        fullscreenRequested = false;
        tryEnterFullscreen();
    }
});
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        tryEnterFullscreen();
    }
});
window.addEventListener(
    "touchstart",
    () => {
        tryEnterFullscreen();
        tryLockLandscape();
    },
    { passive: true }
);

let cloudCount = 30;
if (isMobileViewport) cloudCount = 14;
if (isSmallScreen) cloudCount = 12;
if (isVeryTallPhone) cloudCount = 10;
if (lowCpu || prefersReducedMotion) cloudCount = 10;

for (let i = 0; i < cloudCount; i++) {
    const cloud = document.createElement("div");
    cloud.className = "fog-cloud";

    cloud.style.left = Math.random() * 100 + "vw";
    cloud.style.top = 10 + Math.random() * 80 + "%";

    const size = 220 + Math.random() * 340;
    cloud.style.width = size + "px";
    cloud.style.height = size * (0.42 + Math.random() * 0.2) + "px";

    cloud.style.setProperty("--drift-x", (28 + Math.random() * 60) + "vw");
    cloud.style.animationDuration = (12 + Math.random() * 14) + "s";
    cloud.style.animationDelay = (-1 * Math.random() * 20) + "s";
    cloud.style.opacity = (0.28 + Math.random() * 0.27).toFixed(2);

    fogLayer.appendChild(cloud);
}

async function handleExitClick() {
    try {
        if (document.fullscreenElement && document.exitFullscreen) {
            await document.exitFullscreen();
        }
    } catch (_) {
        // Ignora falhas de saida de fullscreen.
    }

    try {
        window.open("", "_self");
        window.close();
    } catch (_) {
        // Alguns navegadores bloqueiam window.close em abas nao abertas via script.
    }

    // Fallback: remove o jogo da tela atual.
    setTimeout(() => {
        if (!window.closed) {
            window.location.href = "about:blank";
        }
    }, 80);
}

if (confirmExitYes) {
    confirmExitYes.addEventListener("click", (event) => {
        event.preventDefault();
        allowBackNavigation = true;
        handleExitClick();
    });
}

if (startGameButton) {
    startGameButton.addEventListener("click", (event) => {
        event.preventDefault();
        closeExitConfirm();
        hideMenuScreen();

        if (window.GameScreenAPI && typeof window.GameScreenAPI.openGameFromMenu === "function") {
            window.GameScreenAPI.openGameFromMenu();
        }
    });
}

document.querySelectorAll("#confirm-exit .confirm-no").forEach((button) => {
    button.addEventListener("click", (event) => {
        if (!button.getAttribute("href") || button.getAttribute("href") !== "#") return;
        event.preventDefault();
        closeExitConfirm();
        tryEnterFullscreen();
    });
});

window.MenuScreenAPI = {
    showMenuScreen,
    onReturnFromGame: showMenuScreen,
};
})();
