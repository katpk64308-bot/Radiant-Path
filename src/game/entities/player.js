// Entidade do jogador (movimento + fisica simples)
class Player {
    constructor() {
        // Tamanho e posicao inicial
        this.width = 60;
        this.height = 68;
        this.x = 100;
        this.y = 200;

        // Velocidades
        this.vx = 0;
        this.vy = 0;
        this.speed = 5.2;

        // Fisica
        this.gravity = 0.8;
        this.jumpPower = -17;
        this.isGrounded = false;

        // Direcao atual do sprite (right | left)
        this.facing = "right";

        // Controle de animacao
        this.idleFrameDuration = 200; // 0.2s
        this.walkFrameDuration = 70; // 0.07s
        this.frameIndex = 0;
        this.lastFrameTime = performance.now();
        this.currentAnimation = "idle";

        this.spriteSheet = new Image();
        this.spriteSheet.onerror = () => {
            console.warn("Falha ao carregar sprite sheet: assets/anplayer/sprites.png");
        };
        this.spriteSheet.src = "assets/anplayer/sprites.png";

        const walkRowFrames = this.buildWalkRowFrames();
        const idleRowFrames = this.buildIdleRowFrames();

        this.animations = {
            idle: {
                right: idleRowFrames,
                left: idleRowFrames,
            },
            walk: {
                right: walkRowFrames,
                left: walkRowFrames,
            },
        };
    }

    buildWalkRowFrames() {
        const top = 2;
        const leftStart = 2;
        const frameHeight = 48;
        const gap = 2;
        const frameWidths = [43, 42, 44, 43, 44, 44];

        let currentX = leftStart;
        return frameWidths.map((width) => {
            const frame = { x: currentX, y: top, width, height: frameHeight };
            currentX += width + gap;
            return frame;
        });
    }

    buildIdleRowFrames() {
        // Linha abaixo da animacao de andar:
        // y base = 2 (topo da sheet) + 48 (altura andar) + 2 (gap) = 52
        const baseY = 52;
        const gap = 2;

        const frames = [
            { x: 2, y: baseY, width: 41, height: 49 },
            { x: 45, y: baseY, width: 40, height: 49 },
            { x: 87, y: baseY, width: 42, height: 49 },
            // Ultimo frame padronizado com a mesma linha e altura dos demais
            { x: 131, y: baseY, width: 42, height: 49 },
        ];

        // Validacao leve para manter os gaps de 2px entre os frames
        for (let i = 1; i < frames.length; i++) {
            const prev = frames[i - 1];
            const curr = frames[i];
            const expectedX = prev.x + prev.width + gap;
            if (curr.x !== expectedX) {
                frames[i].x = expectedX;
            }
        }

        return frames;
    }

    // Direcao horizontal: -1 (esquerda), 0 (parado), 1 (direita)
    setHorizontalInput(direction) {
        this.vx = direction * this.speed;

        if (direction < 0) this.facing = "left";
        if (direction > 0) this.facing = "right";
    }

    // Atualiza posicao e resolve colisao com plataformas e limites da tela
    update(platforms, canvasWidth, canvasHeight) {
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
            const horizontalOverlap =
                this.x < p.x + p.width &&
                this.x + this.width > p.x;

            const prevBottom = prevY + this.height;
            const prevTop = prevY;
            const prevRight = prevX + this.width;
            const prevLeft = prevX;

            // Evita atravessar plataforma/chao em quedas rapidas (comum em telas altas)
            if (horizontalOverlap && this.vy >= 0 && prevBottom <= p.y && this.y + this.height >= p.y) {
                this.y = p.y - this.height;
                this.vy = 0;
                this.isGrounded = true;
                continue;
            }

            if (horizontalOverlap && this.vy < 0 && prevTop >= p.y + p.height && this.y <= p.y + p.height) {
                this.y = p.y + p.height;
                this.vy = 0;
                continue;
            }

            const intersects =
                this.x < p.x + p.width &&
                this.x + this.width > p.x &&
                this.y < p.y + p.height &&
                this.y + this.height > p.y;

            if (!intersects) continue;

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

        // Fallback de seguranca caso nao exista plataforma de chao
        if (typeof canvasHeight === "number" && this.y + this.height > canvasHeight) {
            this.y = canvasHeight - this.height;
            this.vy = 0;
            this.isGrounded = true;
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
        const frame = frames[this.frameIndex];

        if (frame && this.spriteSheet.complete && this.spriteSheet.naturalWidth > 0) {
            if (this.facing === "left") {
                ctx.save();
                ctx.translate(this.x + this.width, this.y);
                ctx.scale(-1, 1);
                ctx.drawImage(
                    this.spriteSheet,
                    frame.x,
                    frame.y,
                    frame.width,
                    frame.height,
                    0,
                    0,
                    this.width,
                    this.height
                );
                ctx.restore();
                return;
            }

            ctx.drawImage(
                this.spriteSheet,
                frame.x,
                frame.y,
                frame.width,
                frame.height,
                this.x,
                this.y,
                this.width,
                this.height
            );
            return;
        }

        // Fallback se a imagem ainda nao carregou
        ctx.fillStyle = "#ff4757";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
