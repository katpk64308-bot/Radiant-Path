const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let sparks = [];

function createSpark() {
    sparks.push({
        x: Math.random() * canvas.width,
        y: canvas.height,
        vy: -1 - Math.random() * 3,
        size: Math.random() * 3 + 1,
        life: 100
    });
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    sparks.forEach((s, i) => {
        s.y += s.vy;
        s.life--;

        ctx.fillStyle = `rgba(255, ${100 + Math.random() * 155}, 0, ${s.life / 100})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();

        if (s.life <= 0) sparks.splice(i, 1);
    });

    for (let i = 0; i < 5; i++) createSpark();
    requestAnimationFrame(update);
}

update();
