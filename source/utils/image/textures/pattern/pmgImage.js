import { PGGImagePattern } from "./pggImage.js";
export class PMGImagePattern extends PGGImagePattern {
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
            this.drawFillImage(ctx);
            ctx.restore();

            // 2. 根据行列号判断镜像和旋转
            if (i % 2 === 0) {
                // 水平方向的变换
                ctx.save();
                ctx.rotate(Math.PI); // 180度旋转
                this.drawFillImage(ctx);
                ctx.restore();
            }

            if (j % 2 === 0) {
                // 垂直方向的镜像
                ctx.save();
                ctx.scale(1, -1);
                this.drawFillImage(ctx);
                ctx.restore();
            }

            // 组合变换
            if (i % 2 === 0 && j % 2 === 0) {
                ctx.save();
                ctx.scale(1, -1);
                ctx.rotate(Math.PI);
                this.drawFillImage(ctx);
                ctx.restore();
            }
        }
    }

    drawNodePattern(ctx, x, y) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算单元格的位置索引
        const i = Math.floor((x / basis1.x + 1000000));
        const j = Math.floor((y / basis2.y + 1000000));

        if (this.nodeImage && this.nodeImageLoaded) {
            // 1. 绘制原始图案
            ctx.save();
            this.drawNodeImage(ctx);
            ctx.restore();

            // 2. 根据行号判断垂直镜像
            if (j % 2 === 0) {
                ctx.save();
                ctx.scale(1, -1); // 垂直镜像
                this.drawNodeImage(ctx);
                ctx.restore();
            }

            // 3. 对每个单元格进行180度旋转
            ctx.save();
            ctx.rotate(Math.PI);
            this.drawNodeImage(ctx);
            ctx.restore();

            // 4. 结合垂直镜像和180度旋转
            if (j % 2 === 0) {
                ctx.save();
                ctx.scale(1, -1);
                ctx.rotate(Math.PI);
                this.drawNodeImage(ctx);
                ctx.restore();
            }
        }
    }
}