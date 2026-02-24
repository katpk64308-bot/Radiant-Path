class Player {
    constructor() {
        this.width = 50;
        this.height = 50;
        this.x = 100;
        this.y = 200;

        this.vx = 0;
        this.vy = 0;
        this.speed = 6;

        this.gravity = 0.8;
        this.jumpPower = -15;
        this.isGrounded = false;
    }

    setHorizontalInput(direction) {
        this.vx = direction * this.speed;
    }

    update(floorY, canvasWidth) {
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0) {
            this.x = 0;
        }

        if (this.x + this.width > canvasWidth) {
            this.x = canvasWidth - this.width;
        }

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
