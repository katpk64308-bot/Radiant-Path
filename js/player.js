class Player {
    constructor() {
        this.width = 50;
        this.height = 50;
        this.x = 100;
        this.y = 200;
        this.vy = 0; // Velocidade vertical
        this.gravity = 0.8;
        this.jumpPower = -15;
        this.isGrounded = false;
    }

    update(floorY) {
        // Aplica gravidade
        this.vy += this.gravity;
        this.y += this.vy;

        // Colisão com o chão
        if (this.y + this.height > floorY) {
            this.y = floorY - this.height;
            this.vy = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }
    }

    jump() {
        if (this.isGrounded) {
            this.vy = this.jumpPower;
        }
    }

    draw(ctx) {
        ctx.fillStyle = "#ff4757";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}