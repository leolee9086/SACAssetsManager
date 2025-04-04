import { drawImageWithConfig } from "../../../canvas/draw/simpleDraw/images.js";
import { PGGImagePattern } from "./pggImage.js";
export class P4ImagePattern extends PGGImagePattern {
    constructor(config) {
        super(config);
    }
    validateConfig(config) {
        super.validateConfig(config);

        const { basis1, basis2 } = config.lattice;

        // 验证基向量长度相等
        const length1 = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const length2 = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);

        if (Math.abs(length1 - length2) > 1e-6) {
            throw new Error('p4要求两个基向量长度必须相等');
        }

        // 验证基向量垂直
        const dotProduct = basis1.x * basis2.x + basis1.y * basis2.y;
        if (Math.abs(dotProduct) > 1e-6) {
            throw new Error('p4群要求两个基向量必须垂直');
        }
    }

    drawFillPattern(ctx, x, y) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算单元格的位置索引
        const i = Math.floor((x / basis1.x + 1000000));
        const j = Math.floor((y / basis2.y + 1000000));

        if (this.fillImage && this.fillImageLoaded) {
            // 修正旋转方向
            // i和j都为偶数时：0度
            // i为奇数，j为偶数时：90度
            // i为偶数，j为奇数时：270度
            // i和j都为奇数时：180度
            const iMod = i % 2;
            const jMod = j % 2;
            let rotation = 0;
            
            if (iMod && !jMod) rotation = -Math.PI / 2;      // 90度
            else if (!iMod && jMod) rotation = Math.PI / 2; // 270度
            else if (iMod && jMod) rotation = -Math.PI;       // 180度

            ctx.save();
            ctx.rotate(rotation);
            drawImageWithConfig(
                ctx,
                this.fillImage,
                this.config.lattice,
                this.config.fillImage,
                this.config.lattice.clipMotif
            );
            ctx.restore();
        }
    }
    drawNodePattern(ctx, x, y) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算单元格的位置索引
        const i = Math.floor((x / basis1.x + 1000000));
        const j = Math.floor((y / basis2.y + 1000000));

        if (this.nodeImage && this.nodeImageLoaded) {
            // 根据i,j的奇偶性确定旋转角度
            const rotation = ((i + j) % 4) * Math.PI / 2;

            ctx.save();
            ctx.rotate(rotation);
            drawImageWithConfig(
                ctx,
                this.fillImage,
                this.config.lattice,
                this.config.fillImage,
            ); ctx.restore();
        }
    }

}
