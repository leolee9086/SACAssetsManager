import { CMImagePattern } from "./cmImage.js";
export class P4MImagePattern extends CMImagePattern {
    constructor(config) {
        super(config);
    }
    //这里之后可以提供参数判断变换中心使用晶格还是子晶格中心
    drawRhombusUnit(ctx, i, j) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算单元格的基准位置
        const x = basis1.x * i + basis2.x * j;
        const y = basis1.y * i + basis2.y * j;

        // 计算正方形的边长和中心点
        const sideLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const centerX = sideLength / 2;
        const centerY = sideLength / 2;

        // 将正方形分成8个三角形区域
        for (let k = 0; k < 8; k++) {
            ctx.save();
            ctx.translate(x, y);

            // 裁剪三角形区域
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);

            const startAngle = (k * Math.PI) / 4;
            const endAngle = ((k + 1) * Math.PI) / 4;
            const radius = sideLength / Math.sqrt(2);

            // 确保所有点都在正方形内
            const x1 = Math.min(Math.max(centerX + radius * Math.cos(startAngle), 0), sideLength);
            const y1 = Math.min(Math.max(centerY + radius * Math.sin(startAngle), 0), sideLength);
            const x2 = Math.min(Math.max(centerX + radius * Math.cos(endAngle), 0), sideLength);
            const y2 = Math.min(Math.max(centerY + radius * Math.sin(endAngle), 0), sideLength);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.clip();

            // 计算每个三角形区域的变换
            const rotation = (k * Math.PI) / 4;
            const shouldMirror = k % 2 === 1;

            // 应用变换
            ctx.translate((centerX + x1 + x2) / 3, (centerY + y1 + y2) / 3);
            const baseRotation = Math.floor(k / 2) * (Math.PI / 2);
            ctx.rotate(baseRotation);

            // 对奇数索引的三角形进行镜像
            if (k % 2 === 1) {
                // 先抵消基本旋转
                ctx.rotate(-baseRotation);

                // 计算镜像线角度
                const mirrorAngle = (k * Math.PI) / 4;

                // 应用镜像变换
                ctx.rotate(mirrorAngle);
                ctx.scale(1, -1);
                ctx.rotate(-mirrorAngle);

                // 重新应用基本旋转
                ctx.rotate(baseRotation);
            }

            // 绘制图案
            this.drawFillPattern(ctx, i, j);

            ctx.restore();
        }
    }


    renderRhombusGrid(ctx, gridRange) {
        const { basis1, basis2 } = this.config.lattice;

        // 绘制主网格线
        ctx.beginPath();
        ctx.strokeStyle = this.config.render.gridColor;
        ctx.lineWidth = this.config.render.gridWidth;
        ctx.setLineDash([]);

        // 绘制正方形网格
        for (let i = gridRange.minI; i <= gridRange.maxI + 1; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ + 1; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                // 绘制正方形的边
                if (j <= gridRange.maxJ) {
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + basis1.x, y + basis1.y);
                }
                if (i <= gridRange.maxI) {
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + basis2.x, y + basis2.y);
                }
            }
        }
        ctx.stroke();

        // 绘制对称轴
        ctx.beginPath();
        ctx.strokeStyle = '#0000ff';
        ctx.setLineDash([5, 5]);

        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                // 正方形的边长
                const sideLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);

                // 绘制正方形的中线（水平和垂直对称轴）
                ctx.moveTo(x, y + sideLength / 2);
                ctx.lineTo(x + sideLength, y + sideLength / 2);
                ctx.moveTo(x + sideLength / 2, y);
                ctx.lineTo(x + sideLength / 2, y + sideLength);

                // 绘制对角线（对角对称轴）
                ctx.moveTo(x, y);
                ctx.lineTo(x + sideLength, y + sideLength);
                ctx.moveTo(x + sideLength, y);
                ctx.lineTo(x, y + sideLength);
            }
        }
        ctx.stroke();
    }
}
