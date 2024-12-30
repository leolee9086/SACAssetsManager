import { PGGImagePattern } from "./pggImage.js";
export class PMMImagePattern extends PGGImagePattern {
    constructor(config) {
        super(config);
    }
    drawFillPattern(ctx, x, y) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算单元格的位置索引
        const i = Math.floor((x / basis1.x + 1000000));
        const j = Math.floor((y / basis2.y + 1000000));

        if (this.fillImage && this.fillImageLoaded) {
            // 1. 绘制原始图案
            ctx.save();
            // 根据行列索引决定使用哪种变换
            if (i % 2 === 0 && j % 2 === 0) {
                ctx.scale(-1, -1); // 对角镜像
            } else if (i % 2 === 0) {
                ctx.scale(-1, 1); // 水平镜像
            } else if (j % 2 === 0) {
                ctx.scale(1, -1); // 垂直镜像
            }

            // 只绘制一次
            this.drawFillImage(ctx);
            ctx.restore();
        }
    }

    drawNodePattern(ctx, x, y) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算单元格的位置索引
        const i = Math.floor((x / basis1.x + 1000000));
        const j = Math.floor((y / basis2.y + 1000000));

        if (this.nodeImage && this.nodeImageLoaded) {
            ctx.save();
            // 根据行列索引决定使用哪种变换
            if (i % 2 === 0 && j % 2 === 0) {
                ctx.scale(-1, -1); // 对角镜像
            } else if (i % 2 === 0) {
                ctx.scale(-1, 1); // 水平镜像
            } else if (j % 2 === 0) {
                ctx.scale(1, -1); // 垂直镜像
            }

            // 只绘制一次
            this.drawNodeImage(ctx);
            ctx.restore();
        }
    }
}
