
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
            throw new Error('p4���要求两个基向量长度必须相等');
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
            // 分别根据 i 和 j 的奇偶性确定旋转角度
            // i 为奇数时旋转 90 度，j 为奇数时旋转 90 度
            // 两个旋转角度相加得到最终旋转角度
            const rotationI = (i % 2) * Math.PI / 2;
            const rotationJ = (j % 2) * Math.PI / 2;
            const rotation = rotationI + rotationJ;
    
            ctx.save();
            ctx.rotate(rotation);
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
            // 根据i,j的奇偶性确定旋转角度
            const rotation = ((i + j) % 4) * Math.PI / 2;

            ctx.save();
            ctx.rotate(rotation);
            this.drawNodeImage(ctx);
            ctx.restore();
        }
    }

}
