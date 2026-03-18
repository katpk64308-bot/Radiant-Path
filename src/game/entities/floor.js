// Entidade do chao
const ENV_TEXTURE_SCALE = 1.45;

class Floor {
    constructor(width, height, bottomGap = 61) {
        this.srcTileSize = 25;
        this.tileScale = ENV_TEXTURE_SCALE;
        this.tileSize = Math.round(this.srcTileSize * this.tileScale);
        this.groundTileStartX = 1;
        this.groundTileBottomMargin = 1;
        this.waterRowOffset = 52;
        this.waterFrameCount = 5;
        this.waterFrameGap = 1;
        this.waterFrameStartX = 1;
        this.waterFrameDuration = 140;
        this.waterFrameIndex = 0;
        this.lastWaterFrameTime = performance.now();
        this.waterForegroundAlpha = 0.7;
        this.groundInset = Math.max(1, Math.round(1 * this.tileScale));
        this.cachedTextureCoords = null;

        this.x = 0;
        this.height = this.tileSize;
        this.y = height - this.height - bottomGap;
        this.width = width;
        this.color = "#2ed573";
        const idealWater = Math.round(width * 0.22);
        this.waterWidth = Math.max(160, Math.min(320, idealWater));
        this.waterInset = Math.max(1, Math.round(10 * this.tileScale));
        this.waterRampWidth = Math.min(this.tileSize, this.waterWidth);
        this.waterColorTop = "#4fc3f7";
        this.waterColorBottom = "#0288d1";

        this.spriteSheet = new Image();
        this.spriteSheet.onerror = () => {
            console.warn("Falha ao carregar texturas do chao/agua: assets/anplayer/sprites.png");
        };
        this.spriteSheet.src = "assets/anplayer/sprites.png";
    }

    getSurfaceY(playerX, playerWidth) {
        if (!this.waterWidth) return this.y + this.groundInset;
        const centerX = playerX + playerWidth / 2;
        const rampStart = Math.max(0, this.waterWidth - this.waterRampWidth);

        if (centerX <= rampStart) {
            return this.y + this.waterInset;
        }
        if (centerX >= this.waterWidth) {
            return this.y + this.groundInset;
        }

        const t = (centerX - rampStart) / (this.waterWidth - rampStart);
        return this.y + this.waterInset * (1 - t) + this.groundInset * t;
    }

    getMaxStepHeight() {
        return this.waterInset;
    }

    resolveTextureCoords() {
        if (this.cachedTextureCoords) return this.cachedTextureCoords;
        if (!this.spriteSheet.complete || this.spriteSheet.naturalWidth <= 0) return null;

        const tile = this.srcTileSize;
        const groundY = this.spriteSheet.naturalHeight - tile - this.groundTileBottomMargin;
        const waterY = groundY - this.waterRowOffset;

        if (groundY < 0 || waterY < 0) return null;

        const groundX = this.groundTileStartX;
        const waterStartX = this.waterFrameStartX;
        const rampX = waterStartX + this.waterFrameCount * (tile + this.waterFrameGap);

        this.cachedTextureCoords = {
            groundX,
            groundY,
            waterY,
            waterStartX,
            rampX,
        };

        return this.cachedTextureCoords;
    }

    updateWaterAnimation(now) {
        if (now - this.lastWaterFrameTime < this.waterFrameDuration) return;
        this.waterFrameIndex = (this.waterFrameIndex + 1) % this.waterFrameCount;
        this.lastWaterFrameTime = now;
    }

    drawTiledRow(ctx, srcX, srcY, srcW, srcH, destX, destY, destWidth, destHeight) {
        if (destWidth <= 0) return;
        const destTile = this.tileSize;
        let x = destX;
        const endX = destX + destWidth;

        while (x < endX) {
            const remaining = endX - x;
            const drawW = remaining < destTile ? remaining : destTile;
            const srcDrawW =
                drawW < destTile ? Math.max(1, Math.round((drawW / destTile) * srcW)) : srcW;

            ctx.drawImage(
                this.spriteSheet,
                srcX,
                srcY,
                srcDrawW,
                srcH,
                x,
                destY,
                drawW,
                destHeight
            );

            x += drawW;
        }
    }

    drawFallback(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        if (this.waterWidth > 0) {
            this.drawWaterFallback(ctx);
        }
    }

    drawWaterFallback(ctx) {
        const waterX = this.x;
        const waterY = this.y;
        const waterH = this.height;

        const waterGradient = ctx.createLinearGradient(0, waterY, 0, waterY + waterH);
        waterGradient.addColorStop(0, this.waterColorTop);
        waterGradient.addColorStop(1, this.waterColorBottom);

        ctx.fillStyle = waterGradient;
        ctx.fillRect(waterX, waterY, this.waterWidth, waterH);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const waveAmplitude = Math.max(1, Math.round(2 * this.tileScale));
        const waveLength = Math.max(6, Math.round(18 * this.tileScale));
        for (let x = waterX; x <= waterX + this.waterWidth; x += 3) {
            const phase = ((x - waterX) / waveLength) * Math.PI * 2;
            const y = waterY + 4 + Math.sin(phase) * waveAmplitude;
            if (x === waterX) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(waterX + this.waterWidth - 2, waterY, 2, waterH);
    }

    drawWaterLayer(ctx, coords) {
        if (this.waterWidth <= 0) return;

        const srcTile = this.srcTileSize;
        const destTile = this.tileSize;
        const waterX = this.x;
        const waterY = this.y;
        const waterH = this.height;
        const rampWidth = Math.min(destTile, this.waterWidth);
        const animatedWidth = Math.max(0, this.waterWidth - rampWidth);

        const frameStride = srcTile + this.waterFrameGap;
        const frameX = coords.waterStartX + this.waterFrameIndex * frameStride;

        if (animatedWidth > 0) {
            this.drawTiledRow(
                ctx,
                frameX,
                coords.waterY,
                srcTile,
                srcTile,
                waterX,
                waterY,
                animatedWidth,
                waterH
            );
        }

        if (rampWidth > 0) {
            const rampDestX = waterX + animatedWidth;
            const rampSrcW =
                rampWidth < destTile
                    ? Math.max(1, Math.round((rampWidth / destTile) * srcTile))
                    : srcTile;

            ctx.drawImage(
                this.spriteSheet,
                coords.rampX,
                coords.waterY,
                rampSrcW,
                srcTile,
                rampDestX,
                waterY,
                rampWidth,
                waterH
            );
        }
    }

    drawTextured(ctx, coords) {
        const tile = this.srcTileSize;
        const now = performance.now();
        this.updateWaterAnimation(now);

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        this.drawTiledRow(
            ctx,
            coords.groundX,
            coords.groundY,
            tile,
            tile,
            this.x,
            this.y,
            this.width,
            this.height
        );

        this.drawWaterLayer(ctx, coords);

        ctx.restore();
    }

    drawForeground(ctx, player) {
        if (!player || this.waterWidth <= 0) return;

        const waterLeft = this.x;
        const waterRight = this.x + this.waterWidth;
        const waterTop = this.y;
        const waterBottom = this.y + this.height;

        const playerLeft = player.x;
        const playerRight = player.x + player.width;
        const playerTop = player.y;
        const playerBottom = player.y + player.height;

        const clipX = Math.max(waterLeft, playerLeft);
        const clipY = Math.max(waterTop, playerTop);
        const clipW = Math.min(waterRight, playerRight) - clipX;
        const clipH = Math.min(waterBottom, playerBottom) - clipY;

        if (clipW <= 0 || clipH <= 0) return;

        const coords = this.resolveTextureCoords();
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.globalAlpha = this.waterForegroundAlpha;
        ctx.beginPath();
        ctx.rect(clipX, clipY, clipW, clipH);
        ctx.clip();

        if (!coords) {
            this.drawWaterFallback(ctx);
            ctx.restore();
            return;
        }

        this.drawWaterLayer(ctx, coords);
        ctx.restore();
    }

    // Desenha o chao no canvas
    draw(ctx) {
        const coords = this.resolveTextureCoords();
        if (!coords) {
            this.drawFallback(ctx);
            return;
        }

        this.drawTextured(ctx, coords);
    }
}

class Platform {
    constructor(x, y, width, height, color = "#2ed573") {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
    }

    getSurfaceY() {
        return this.y;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}
