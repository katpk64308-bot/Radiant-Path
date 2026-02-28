// Neblina do menu (camadas suaves)
const fogLayer = document.getElementById("fire");

const isSmallScreen = window.matchMedia("(max-width: 768px)").matches;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lowCpu = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;

let cloudCount = 30;
if (isSmallScreen) cloudCount = 18;
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