// Entidade do jogador (movimento + fisica simples)
class Player {
    constructor() {
        // Tamanho e posicao inicial
        this.width = 50;
        this.height = 80;
        this.x = 100;
        this.y = 200;

        // Velocidades
        this.vx = 0;
        this.vy = 0;
        this.speed = 3.5;

        // Fisica
        this.gravity = 0.8;
        this.jumpPower = -15;
        this.isGrounded = false;

        // Direcao atual do sprite (right | left)
        this.facing = "right";

        // Controle de animacao
        this.idleFrameDuration = 200; // 0.2s
        this.walkFrameDuration = 70; // 0.07s
        this.frameIndex = 0;
        this.lastFrameTime = performance.now();
        this.currentAnimation = "idle";

        this.animations = {
            idle: {
                right: this.loadFrames([
                    "assets/animacao/parado/parado1.png",
                    "assets/animacao/parado/parado2.png",
                    "assets/animacao/parado/parado3.png",
                    "assets/animacao/parado/parado4.png",
                ]),
                left: this.loadFrames([
                    "assets/animacao/parado/parado_1.png",
                    "assets/animacao/parado/parado_2.png",
                    "assets/animacao/parado/parado_3.png",
                    "assets/animacao/parado/parado_4.png",
                ]),
            },
            walk: {
                right: this.loadFrames([
                    "assets/animacao/andar/andar1.png",
                    "assets/animacao/andar/andar2.png",
                    "assets/animacao/andar/andar3.png",
                    "assets/animacao/andar/andar4.png",
                    "assets/animacao/andar/andar5.png",
                    "assets/animacao/andar/andar6.png",
                ]),
                left: this.loadFrames([
                    "assets/animacao/andar/andar_1.png",
                    "assets/animacao/andar/andar_2.png",
                    "assets/animacao/andar/andar_3.png",
                    "assets/animacao/andar/andar_4.png",
                    "assets/animacao/andar/andar_5.png",
                    "assets/animacao/andar/andar_6.png",
                ]),
            },
        };
    }

    loadFrames(paths) {
        return paths.map((path) => {
            const img = new Image();
            img.onerror = () => {
                console.warn("Falha ao carregar sprite:", path);
            };
            img.src = encodeURI(path);
            return img;
        });
    }

    // Direcao horizontal: -1 (esquerda), 0 (parado), 1 (direita)
    setHorizontalInput(direction) {
        this.vx = direction * this.speed;

        if (direction < 0) this.facing = "left";
        if (direction > 0) this.facing = "right";
    }

    // Atualiza posicao e resolve colisao com plataformas e limites da tela
    update(platforms, canvasWidth) {
        const prevX = this.x;
        const prevY = this.y;

        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvasWidth) {
            this.x = canvasWidth - this.width;
        }

        this.isGrounded = false;

        for (const p of platforms) {
            const intersects =
                this.x < p.x + p.width &&
                this.x + this.width > p.x &&
                this.y < p.y + p.height &&
                this.y + this.height > p.y;

            if (!intersects) continue;

            const prevBottom = prevY + this.height;
            const prevTop = prevY;
            const prevRight = prevX + this.width;
            const prevLeft = prevX;

            if (prevBottom <= p.y) {
                // caiu em cima
                this.y = p.y - this.height;
                this.vy = 0;
                this.isGrounded = true;
            } else if (prevTop >= p.y + p.height) {
                // bateu por baixo
                this.y = p.y + p.height;
                if (this.vy < 0) this.vy = 0;
            } else if (prevRight <= p.x) {
                // bateu na esquerda da plataforma
                this.x = p.x - this.width;
                if (this.vx > 0) this.vx = 0;
            } else if (prevLeft >= p.x + p.width) {
                // bateu na direita da plataforma
                this.x = p.x + p.width;
                if (this.vx < 0) this.vx = 0;
            }
        }
    }

    // Pulo simples
    jump() {
        if (this.isGrounded) {
            this.vy = this.jumpPower;
        }
    }

    getCurrentFrames() {
        const nextAnimation = Math.abs(this.vx) > 0.01 ? "walk" : "idle";

        if (nextAnimation !== this.currentAnimation) {
            this.currentAnimation = nextAnimation;
            this.frameIndex = 0;
            this.lastFrameTime = performance.now();
        }

        const frames = this.animations[this.currentAnimation][this.facing] || [];
        if (this.frameIndex >= frames.length) {
            this.frameIndex = 0;
        }

        return frames;
    }

    updateAnimation(now) {
        const frames = this.getCurrentFrames();
        if (!frames || frames.length === 0) return;

        const frameDuration =
            this.currentAnimation === "walk"
                ? this.walkFrameDuration
                : this.idleFrameDuration;

        if (now - this.lastFrameTime >= frameDuration) {
            this.frameIndex = (this.frameIndex + 1) % frames.length;
            this.lastFrameTime = now;
        }
    }

    // Desenha o jogador com sprite animado
    draw(ctx) {
        const now = performance.now();
        this.updateAnimation(now);

        const frames = this.getCurrentFrames();
        const sprite = frames[this.frameIndex];

        if (sprite && sprite.complete && sprite.naturalWidth > 0) {
            ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
            return;
        }

        // Fallback se a imagem ainda nao carregou
        ctx.fillStyle = "#ff4757";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}