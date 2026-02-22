const fire = document.getElementById("fire");

const isSmallScreen = window.matchMedia("(max-width: 768px)").matches;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lowCpu = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;

let particleCount = 90;
if (isSmallScreen) particleCount = 60;
if (lowCpu || prefersReducedMotion) particleCount = 35;

for (let i = 0; i < particleCount; i++) {
    const spark = document.createElement("div");
    spark.className = "spark";
    spark.style.left = Math.random() * 100 + "vw";
    spark.style.animationDuration = (2 + Math.random() * 4) + "s";
    spark.style.animationDelay = Math.random() * 5 + "s";
    fire.appendChild(spark);
}
