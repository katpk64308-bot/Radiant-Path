// Entidade do chão
class Floor {
    constructor(width, height) {
        this.x = 0;
        this.y = height - 50;
        this.width = width;
        this.height = 50;
        this.color = "#2ed573";
    }

    // Desenha o chão no canvas
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
