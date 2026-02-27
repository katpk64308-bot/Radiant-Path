// Entidade do jogador (movimento + física simples)
class Player {
    constructor() {
        // Tamanho e posição inicial
        this.width = 50;
        this.height = 50;
        this.x = 100;
        this.y = 200;

        // Velocidades
        this.vx = 0;
        this.vy = 0;
        this.speed = 6;

        // Física
        this.gravity = 0.8;
        this.jumpPower = -15;
        this.isGrounded = false;
    }

    // Direção horizontal: -1 (esquerda), 0 (parado), 1 (direita)
    setHorizontalInput(direction) {
        this.vx = direction * this.speed;
    }

    // Atualiza posição e resolve colisão com o chão e limites da tela
    update(floorY, canvasWidth) {
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        // Limite esquerdo
        if (this.x < 0) {
            this.x = 0;
        }

        // Limite direito
        if (this.x + this.width > canvasWidth) {
            this.x = canvasWidth - this.width;
        }

        // Chão
        if (this.y + this.height > floorY) {
            this.y = floorY - this.height;
            this.vy = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }
    }

    // Pulo simples
    jump() {
        if (this.isGrounded) {
            this.vy = this.jumpPower;
        }
    }

    // Desenho básico do jogador
    draw(ctx) {
        ctx.fillStyle = "#ff4757";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
