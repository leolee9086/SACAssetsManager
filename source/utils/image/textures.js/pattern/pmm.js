import { PGGImagePattern } from "./pggImage.js";
import { P1ImagePattern } from "./p1Image.js";

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
            this.drawFillImage(ctx);
            ctx.restore();

            // 2. 根据列号判断水平镜像
            if (i % 2 === 0) {
                ctx.save();
                ctx.scale(-1, 1); // 水平镜像
                this.drawFillImage(ctx);
                ctx.restore();
            }

            // 3. 根据行号判断垂直镜像
            if (j % 2 === 0) {
                ctx.save();
                ctx.scale(1, -1); // 垂直镜像
                this.drawFillImage(ctx);
                ctx.restore();
            }

            // 4. 如果同时满足行列条件,添加对角镜像
            if (i % 2 === 0 && j % 2 === 0) {
                ctx.save();
                ctx.scale(-1, -1); // 同时水平和垂直镜像
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

            // 2. 根据列号判断水平镜像
            if (i % 2 === 0) {
                ctx.save();
                ctx.scale(-1, 1); // 水平镜像
                this.drawNodeImage(ctx);
                ctx.restore();
            }

            // 3. 根据行号判断垂直镜像
            if (j % 2 === 0) {
                ctx.save();
                ctx.scale(1, -1); // 垂直镜像
                this.drawNodeImage(ctx);
                ctx.restore();
            }

            // 4. 如果同时满足行列条件,添加对角镜像
            if (i % 2 === 0 && j % 2 === 0) {
                ctx.save();
                ctx.scale(-1, -1); // 同时水平和垂直镜像
                this.drawNodeImage(ctx);
                ctx.restore();
            }
        }
    }
}



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


export class CMImagePattern extends P1ImagePattern {
    constructor(config) {
        super(config);
    }

    validateConfig(config) {
        super.validateConfig(config);

        const { basis1, basis2 } = config.lattice;

        // 验证两个基向量长度必须相等
        const length1 = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const length2 = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);

        if (Math.abs(length1 - length2) > 1e-6) {
            throw new Error('cm群的两个基向量长度必须相等');
        }
    }

    normalizeConfig(config) {
        const baseConfig = super.normalizeConfig(config);

        // 镜面线默认位置在棱形的中线上
        const defaultMirrorLine = {
            x: baseConfig.lattice.basis1.x / 2,
            y: baseConfig.lattice.basis1.y / 2
        };

        return {
            ...baseConfig,
            symmetry: {
                mirrorLine: config.symmetry?.mirrorLine || defaultMirrorLine
            }
        };
    }

    render(ctx, viewport) {
        if (!this.patternReady) {
            throw new Error('图案尚未准备就绪');
        }

        const { width, height } = viewport;
        const { basis1, basis2 } = this.config.lattice;

        ctx.fillStyle = this.config.render.backgroundColor;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(viewport.x || width / 2, viewport.y || height / 2);

        const gridRange = viewport.gridRange || this.calculateGridRange(width, height);

        // 绘制棱形单元及其内部镜像
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                this.drawRhombusUnit(ctx, i, j);
            }
        }

        // 绘制网格
        if (this.config.render.showGrid) {
            this.renderRhombusGrid(ctx, gridRange);
        }

        // 绘制网格点
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                ctx.save();
                ctx.translate(x, y);
                this.drawNodePattern(ctx, i, j);
                ctx.restore();
            }
        }

        ctx.restore();
    }

    drawNodePattern(ctx, i, j) {
        if (this.nodeImage && this.nodeImageLoaded) {
            // 绘制原始节点图案
            this.drawNodeImage(ctx);

            // 绘制水平镜像的节点图案
            ctx.save();
            ctx.scale(-1, 1);
            this.drawNodeImage(ctx);
            ctx.restore();
        }
    }

    drawRhombusUnit(ctx, i, j) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算棱形的四个顶点
        const x = basis1.x * i + basis2.x * j;
        const y = basis1.y * i + basis2.y * j;

        // 计算棱形的四个顶点相对坐标
        const vertices = [
            { x: 0, y: 0 },  // 左下顶点
            { x: basis1.x, y: basis1.y },  // 右下顶点
            { x: basis1.x + basis2.x, y: basis1.y + basis2.y },  // 右上顶点
            { x: basis2.x, y: basis2.y }   // 左上顶点
        ];

        // 计算形心
        const centroidX = (vertices[0].x + vertices[1].x + vertices[2].x + vertices[3].x) / 4;
        const centroidY = (vertices[0].y + vertices[1].y + vertices[2].y + vertices[3].y) / 4;

        // 绘制第一个三角形
        ctx.save();
        ctx.translate(x, y);

        // 创建第一个三角形的裁剪路径（从左上到右下的三角形）
        ctx.beginPath();
        ctx.moveTo(vertices[3].x, vertices[3].y);  // 左上顶点
        ctx.lineTo(vertices[1].x, vertices[1].y);  // 右下顶点
        ctx.lineTo(vertices[0].x, vertices[0].y);  // 左下顶点
        ctx.closePath();
        ctx.clip();

        // 绘制原始图案
        ctx.translate(centroidX, centroidY);
        this.drawFillPattern(ctx, i, j, false);
        ctx.restore();

        // 绘制第二个三角形（镜像部分）
        ctx.save();
        ctx.translate(x, y);

        // 创建第二个三角形的裁剪路径（从右上到左下的三角形）
        ctx.beginPath();
        ctx.moveTo(vertices[3].x, vertices[3].y);  // 左上顶点
        ctx.lineTo(vertices[1].x, vertices[1].y);  // 右下顶点
        ctx.lineTo(vertices[2].x, vertices[2].y);  // 右上顶点
        ctx.closePath();
        ctx.clip();

        // 计算对角线方向并进行镜像变换
        const diagonalX = vertices[1].x - vertices[3].x;
        const diagonalY = vertices[1].y - vertices[3].y;
        const angle = Math.atan2(diagonalY, diagonalX);

        // 应用镜像变换
        ctx.translate(vertices[3].x, vertices[3].y);  // 移动到对角线起点
        ctx.rotate(angle);
        ctx.scale(1, -1);
        ctx.rotate(-angle);
        ctx.translate(-vertices[3].x, -vertices[3].y);  // 移回原位

        // 绘制镜像图案
        ctx.translate(centroidX, centroidY);
        this.drawFillPattern(ctx, i, j, true);
        ctx.restore();
    }

    renderRhombusGrid(ctx, gridRange) {
        const { basis1, basis2 } = this.config.lattice;

        ctx.beginPath();
        ctx.strokeStyle = this.config.render.gridColor;
        ctx.lineWidth = this.config.render.gridWidth;

        // 绘制菱形边界
        for (let i = gridRange.minI; i <= gridRange.maxI + 1; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                ctx.moveTo(x, y);
                ctx.lineTo(x + basis2.x, y + basis2.y);
            }
        }

        for (let j = gridRange.minJ; j <= gridRange.maxJ + 1; j++) {
            for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                ctx.moveTo(x, y);
                ctx.lineTo(x + basis1.x, y + basis1.y);
            }
        }

        ctx.stroke();

        // 绘制对角线镜像线
        ctx.beginPath();
        ctx.strokeStyle = '#0000ff';
        ctx.setLineDash([5, 5]);

        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                // 计算棱形的四个顶点
                const vertices = [
                    { x, y },  // 左下顶点
                    { x: x + basis1.x, y: y + basis1.y },  // 右下顶点
                    { x: x + basis1.x + basis2.x, y: y + basis1.y + basis2.y },  // 右上顶点
                    { x: x + basis2.x, y: y + basis2.y }   // 左上顶点
                ];

                // 绘制从左上到右下的对角线
                ctx.moveTo(vertices[3].x, vertices[3].y);  // 左上顶点
                ctx.lineTo(vertices[1].x, vertices[1].y);  // 右下顶点
            }
        }

        ctx.stroke();
    }

    drawFillPattern(ctx, i, j, isMirrored) {
        if (this.fillImage && this.fillImageLoaded) {
            // 根据是否镜像调整绘制方式
            if (isMirrored) {
                ctx.save();
                //   ctx.scale(1, -1);
            }
            this.drawFillImage(ctx);
            if (isMirrored) {
                ctx.restore();
            }
        }
    }

    renderSymmetryElements(ctx) {
        super.renderSymmetryElements?.(ctx);

        const { basis1, basis2 } = this.config.lattice;

        ctx.save();

        // 绘制镜面线
        ctx.beginPath();
        ctx.strokeStyle = '#0000ff';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;

        // 在每个棱形单元中绘制镜面线
        for (let i = -2; i <= 2; i++) {
            for (let j = -2; j <= 2; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                // 计算棱形的对角线端点
                const x2 = x + basis1.x + basis2.x;
                const y2 = y + basis1.y + basis2.y;

                // 绘制从棱形一个顶点到对角顶点的镜面线
                ctx.moveTo(x, y);
                ctx.lineTo(x2, y2);
            }
        }

        ctx.stroke();
        ctx.restore();
    }
}



export class CMMImagePattern extends CMImagePattern {
    constructor(config) {
        super(config);
    }
    renderRhombusGrid(ctx, gridRange) {
        const { basis1, basis2 } = this.config.lattice;

        ctx.beginPath();
        ctx.strokeStyle = this.config.render.gridColor;
        ctx.lineWidth = this.config.render.gridWidth;

        // 绘制菱形边界
        for (let i = gridRange.minI; i <= gridRange.maxI + 1; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                ctx.moveTo(x, y);
                ctx.lineTo(x + basis2.x, y + basis2.y);
            }
        }

        for (let j = gridRange.minJ; j <= gridRange.maxJ + 1; j++) {
            for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                ctx.moveTo(x, y);
                ctx.lineTo(x + basis1.x, y + basis1.y);
            }
        }

        ctx.stroke();

        // 绘制两组对角线对称轴
        ctx.beginPath();
        ctx.strokeStyle = '#0000ff';
        ctx.setLineDash([5, 5]);

        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

                // 计算棱形的四个顶点
                const vertices = [
                    { x, y },  // 左下顶点
                    { x: x + basis1.x, y: y + basis1.y },  // 右下顶点
                    { x: x + basis1.x + basis2.x, y: y + basis1.y + basis2.y },  // 右上顶点
                    { x: x + basis2.x, y: y + basis2.y }   // 左上顶点
                ];

                // 绘制第一条对角线（从左上到右下）
                ctx.moveTo(vertices[3].x, vertices[3].y);  // 左上顶点
                ctx.lineTo(vertices[1].x, vertices[1].y);  // 右下顶点

                // 绘制第二条对角线（从左下到右上）
                ctx.moveTo(vertices[0].x, vertices[0].y);  // 左下顶点
                ctx.lineTo(vertices[2].x, vertices[2].y);  // 右上顶点
            }
        }

        ctx.stroke();
    }
    drawRhombusUnit(ctx, i, j) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算棱形的四个顶点
        const x = basis1.x * i + basis2.x * j;
        const y = basis1.y * i + basis2.y * j;

        // 计算棱形的四个顶点相对坐标
        const vertices = [
            { x: 0, y: 0 },  // 左下顶点
            { x: basis1.x, y: basis1.y },  // 右下顶点
            { x: basis1.x + basis2.x, y: basis1.y + basis2.y },  // 右上顶点
            { x: basis2.x, y: basis2.y }   // 左上顶点
        ];

        // 计算对角线交点
        const centerX = (basis1.x + basis2.x) / 2;
        const centerY = (basis1.y + basis2.y) / 2;

        // 1. 绘制第一个三角形 (原始)
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(vertices[0].x, vertices[0].y);
        ctx.lineTo(vertices[3].x, vertices[3].y);
        ctx.closePath();
        ctx.clip();

        // 计算第一个三角形的形心
        const centroid1X = (centerX + vertices[0].x + vertices[3].x) / 3;
        const centroid1Y = (centerY + vertices[0].y + vertices[3].y) / 3;
        ctx.translate(centroid1X, centroid1Y);
        this.drawFillPattern(ctx, i, j, false);
        ctx.restore();

        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(vertices[3].x, vertices[3].y);
        ctx.lineTo(vertices[2].x, vertices[2].y);
        ctx.closePath();
        ctx.clip();
        // 计算第一条对角线的角度
        const diagonal1Angle = Math.atan2(vertices[0].y - vertices[2].y, vertices[0].x - vertices[2].x);
        // 计算第二条对角线的角度
        const diagonal2Angle = Math.atan2(vertices[3].y - vertices[1].y, vertices[3].x - vertices[1].x);
        // 2. 绘制第二个三角形 (沿第一条对角线镜像)

        // 计算第二个三角形的形心
        const centroid2X = (centerX + vertices[2].x + vertices[3].x) / 3;
        const centroid2Y = (centerY + vertices[2].y + vertices[3].y) / 3;

        // 应用沿对角线的镜像变换
        ctx.translate(centroid2X, centroid2Y);
        ctx.rotate(diagonal1Angle);
        ctx.scale(-1, 1);
        ctx.rotate(-diagonal1Angle);

        this.drawFillPattern(ctx);
        ctx.restore();



        // 3. 绘制第三个三角形 (沿第二条对角线镜像)
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(vertices[2].x, vertices[2].y);
        ctx.lineTo(vertices[1].x, vertices[1].y);
        ctx.closePath();
        ctx.clip();

        // 计算第三个三角形的形心

        const centroid3X = (centerX + vertices[2].x + vertices[1].x) / 3;
        const centroid3Y = (centerY + vertices[2].y + vertices[1].y) / 3;
        ctx.translate(centroid3X, centroid3Y);
        ctx.rotate(diagonal2Angle);
        ctx.scale(-1, -1);
        ctx.rotate(-diagonal2Angle);

        this.drawFillPattern(ctx, i, j, true);
        ctx.restore();
        // 4. 绘制第四个三角形 (双重镜像)

        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(vertices[1].x, vertices[1].y);
        ctx.lineTo(vertices[0].x, vertices[0].y);
        ctx.closePath();
        ctx.clip();


        const centroid4X = (centerX + vertices[0].x + vertices[1].x) / 3;
        const centroid4Y = (centerY + vertices[0].y + vertices[1].y) / 3;
        ctx.translate(centroid4X, centroid4Y);
        ctx.rotate(diagonal1Angle);
        ctx.scale(1, -1);
        ctx.rotate(-diagonal1Angle);

        this.drawFillPattern(ctx, i, j, true);
        ctx.restore();

    }
}



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
            // 根据i,j的奇偶性确定旋转角度
            const rotation = ((i + j) % 4) * Math.PI / 2;

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

            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.clip();

            // 计算每个三角形区域的变换
            const rotation = (k * Math.PI) / 4;
            const shouldMirror = k % 2 === 1;

            // 应用变换
            ctx.translate(centerX, centerY);
            ctx.rotate(rotation);
            if (shouldMirror) {
                ctx.scale(1, -1);
            }

            // 绘制图案
            if (this.fillImage && this.fillImageLoaded) {
                this.drawFillImage(ctx);
            }

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
export class P4GImagePattern extends CMImagePattern {
    constructor(config) {
        super(config);
    }

    drawRhombusUnit(ctx, i, j) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算单元格的基准位置
        const x = basis1.x * i + basis2.x * j;
        const y = basis1.y * i + basis2.y * j;

        // 计算正方形的边长和中心点
        const sideLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const halfSide = sideLength / 2;

        // 将正方形分成8个三角形区域
        for (let k = 0; k < 4; k++) {
            let points1 = []; // 存储内侧三角形的顶点
            let points2 = []; // 存储外侧三角形的顶点

            if (k === 0) {
                points1 = [
                    { x: 0, y: halfSide },      // 左边中点
                    { x: halfSide, y: halfSide },// 中心点
                    { x: halfSide, y: 0 }        // 上边中点
                ];
                points2 = [
                    { x: 0, y: halfSide },    // 左边中点
                    { x: 0, y: 0 },           // 左上角顶点
                    { x: halfSide, y: 0 }     // 上边中点
                ];
            } else if (k === 1) {
                points1 = [
                    { x: halfSide, y: 0 },        // 上边中点
                    { x: halfSide, y: halfSide }, // 中心点
                    { x: sideLength, y: halfSide } // 右边中点
                ];
                points2 = [
                    { x: halfSide, y: 0 },        // 上边中点
                    { x: sideLength, y: 0 },      // 右上角顶点
                    { x: sideLength, y: halfSide } // 右边中点
                ];
            } else if (k === 2) {
                points1 = [
                    { x: sideLength, y: halfSide },  // 右边中点
                    { x: halfSide, y: halfSide },    // 中心点
                    { x: halfSide, y: sideLength }   // 下边中点
                ];
                points2 = [
                    { x: sideLength, y: halfSide },    // 右边中点
                    { x: sideLength, y: sideLength },  // 右下角顶点
                    { x: halfSide, y: sideLength }     // 下边中点
                ];
            } else {
                points1 = [
                    { x: halfSide, y: sideLength },  // 下边中点
                    { x: halfSide, y: halfSide },    // 中心点
                    { x: 0, y: halfSide }            // 左边中点
                ];
                points2 = [
                    { x: halfSide, y: sideLength },  // 下边中点
                    { x: 0, y: sideLength },         // 左下角顶点
                    { x: 0, y: halfSide }            // 左边中点
                ];
            }

            // 绘制内侧三角形
            ctx.save();
            ctx.translate(x, y);
            ctx.beginPath();
            ctx.moveTo(points1[0].x, points1[0].y);
            ctx.lineTo(points1[1].x, points1[1].y);
            ctx.lineTo(points1[2].x, points1[2].y);
            ctx.closePath();
            ctx.clip();

            const centroid1X = (points1[0].x + points1[1].x + points1[2].x) / 3;
            const centroid1Y = (points1[0].y + points1[1].y + points1[2].y) / 3;

            ctx.translate(centroid1X, centroid1Y);
            ctx.rotate(k * Math.PI / 2);
            this.drawFillPattern(ctx, i, j);
            ctx.restore();

            // 绘制外侧三角形（沿对角线镜像）
            ctx.save();
            ctx.translate(x, y);
            ctx.beginPath();
            ctx.moveTo(points2[0].x, points2[0].y);
            ctx.lineTo(points2[1].x, points2[1].y);
            ctx.lineTo(points2[2].x, points2[2].y);
            ctx.closePath();
            ctx.clip();

            const centroid2X = (points2[0].x + points2[1].x + points2[2].x) / 3;
            const centroid2Y = (points2[0].y + points2[1].y + points2[2].y) / 3;

            // 计算对角线角度
            const diagonalAngle = k * Math.PI / 2 + Math.PI / 4;

            // 应用对角线镜像变换
            ctx.translate(centroid2X, centroid2Y);
            ctx.rotate(diagonalAngle);
            ctx.scale(-1, 1);
            ctx.rotate(-diagonalAngle);
            ctx.rotate(k * Math.PI / 2);
            this.drawFillPattern(ctx, i, j);
            ctx.restore();
        }
    }

    renderRhombusGrid(ctx, gridRange) {
        const { basis1, basis2 } = this.config.lattice;

        // 绘制主网格线（正方形边界）
        ctx.beginPath();
        ctx.strokeStyle = this.config.render.gridColor;
        ctx.lineWidth = this.config.render.gridWidth;
        ctx.setLineDash([]);

        // 绘制正方形网格的外边界
        for (let i = gridRange.minI; i <= gridRange.maxI + 1; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ + 1; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;

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
        // 绘制反射轴（十字和对角线）
        ctx.beginPath();
        ctx.strokeStyle = '#0000ff';
        ctx.setLineDash([5, 5]);
        for (let i = gridRange.minI; i <= gridRange.maxI; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;
                const sideLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
                const halfSide = sideLength / 2;
                // 绘制中心十字（连接边中点）
                ctx.moveTo(x + halfSide, y);  // 上边中点
                ctx.lineTo(x + halfSide, y + sideLength);  // 下边中点
                ctx.moveTo(x, y + halfSide);  // 左边中点
                ctx.lineTo(x + sideLength, y + halfSide);  // 右边中点
                // 绘制对角线（连接顶点和中心）
                ctx.moveTo(x, y + halfSide);
                ctx.lineTo(x + halfSide, y);  // 左上顶点

                ctx.moveTo(x + halfSide, y);  // 左下顶点
                ctx.lineTo(x + sideLength, y + halfSide);  // 左上顶点

                ctx.moveTo(x + sideLength, y + halfSide);
                ctx.lineTo(x + halfSide, y + sideLength);

                ctx.moveTo(x + halfSide, y + sideLength);
                ctx.lineTo(x, y + halfSide);


            }
        }
        ctx.stroke();

        // 标记旋转中心点（可选）
        ctx.fillStyle = '#ff0000';
        for (let i = gridRange.minI; i <= gridRange.maxI + 1; i++) {
            for (let j = gridRange.minJ; j <= gridRange.maxJ + 1; j++) {
                const x = basis1.x * i + basis2.x * j;
                const y = basis1.y * i + basis2.y * j;
                const sideLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
                const halfSide = sideLength / 2;

                // 四重旋转中心（正方形顶点和中心）
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.arc(x + halfSide, y + halfSide, 3, 0, Math.PI * 2);
                ctx.fill();

                // 二重旋转中心（正方形边的中点）
                ctx.beginPath();
                ctx.arc(x + halfSide, y, 3, 0, Math.PI * 2);
                ctx.arc(x, y + halfSide, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}





export class P3M1ImagePattern extends CMImagePattern {
    constructor(config) {
        super(config);
    }

    validateConfig(config) {
        super.validateConfig(config);

        const { basis1, basis2 } = config.lattice;

        // 验证基向量长度必须相等
        const length1 = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const length2 = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);

        if (Math.abs(length1 - length2) > 1e-6) {
            throw new Error('p3群的两个基向量长度必须相等');
        }

        // 验证夹角为120度
        const dotProduct = basis1.x * basis2.x + basis1.y * basis2.y;
        const angle = Math.acos(dotProduct / (length1 * length2));

        if (Math.abs(angle - (2 * Math.PI / 3)) > 1e-6) {
            throw new Error('p3群的基向量夹角必须为120度');
        }
    }

    drawFillPattern(ctx, x, y) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算单元格的位置索引
        const i = Math.floor((x / basis1.x + 1000000));
        const j = Math.floor((y / basis2.y + 1000000));

        if (this.fillImage && this.fillImageLoaded) {
            // 绘制原始图案
            ctx.save();
            this.drawFillImage(ctx);
            ctx.restore();

            // 绘制120度旋转的图案
            ctx.save();
            ctx.rotate(2 * Math.PI / 3);
            this.drawFillImage(ctx);
            ctx.restore();

            // 绘制240度旋转的图案
            ctx.save();
            ctx.rotate(4 * Math.PI / 3);
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
            // 绘制原始图案
            ctx.save();
            this.drawNodeImage(ctx);
            ctx.restore();

            // 绘制120度旋转的图案
            ctx.save();
            ctx.rotate(2 * Math.PI / 3);
            this.drawNodeImage(ctx);
            ctx.restore();

            // 绘制240度旋转的图案
            ctx.save();
            ctx.rotate(4 * Math.PI / 3);
            this.drawNodeImage(ctx);
            ctx.restore();
        }
    }


    renderRhombusGrid(ctx, gridRange) {
        const { basis1, basis2 } = this.config.lattice;

        // 旋转基向量90度
        const rotatedBasis1 = {
            x: -basis1.y,
            y: basis1.x
        };
        const rotatedBasis2 = {
            x: -basis2.y,
            y: basis2.x
        };

        // 计算基向量长度
        const basisLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        // 六边形半径应该是基向量长度的 1/√3
        const hexRadius = basisLength / Math.sqrt(3);

        // 计算六边形的顶点
        const getHexPoints = (centerX, centerY) => {
            const points = [];
            for (let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3;
                points.push({
                    x: centerX + hexRadius * Math.cos(angle),
                    y: centerY + hexRadius * Math.sin(angle)
                });
            }
            return points;
        };

        // 使用旋转后的基向量计算位置
        for (let i = gridRange.minI - 1; i <= gridRange.maxI + 1; i++) {
            for (let j = gridRange.minJ - 1; j <= gridRange.maxJ + 1; j++) {
                const centerX = i * rotatedBasis1.x + j * rotatedBasis2.x;
                const centerY = i * rotatedBasis1.y + j * rotatedBasis2.y;

                const points = getHexPoints(centerX, centerY);

                // 绘制六边形边界
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let k = 1; k < points.length; k++) {
                    ctx.lineTo(points[k].x, points[k].y);
                }
                ctx.closePath();
                ctx.stroke();

                // 绘制三条对称线
                ctx.beginPath();
                ctx.strokeStyle = '#0000ff';
                ctx.lineWidth = this.config.render.gridWidth;
                ctx.setLineDash([5, 5]);

                // 绘制三条120度间隔的对称线
                for (let k = 0; k < 3; k++) {
                    const angle = k * (2 * Math.PI / 3);
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(
                        centerX + hexRadius * Math.cos(angle),
                        centerY + hexRadius * Math.sin(angle)
                    );
                }
                ctx.stroke();

                // 标记三重旋转中心
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
    drawRhombusUnit(ctx, i, j) {
        const { basis1, basis2 } = this.config.lattice;

        // 旋转基向量90度
        const rotatedBasis1 = {
            x: -basis1.y,
            y: basis1.x
        };
        const rotatedBasis2 = {
            x: -basis2.y,
            y: basis2.x
        };

        // 计算中心点位置
        const centerX = i * rotatedBasis1.x + j * rotatedBasis2.x;
        const centerY = i * rotatedBasis1.y + j * rotatedBasis2.y;

        // 计算基向量长度和六边形半径
        const basisLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const hexRadius = basisLength / Math.sqrt(3);

        // 将六边形分成6个扇形区域
        for (let k = 0; k < 6; k++) {
            ctx.save();
            ctx.translate(centerX, centerY);

            // 创建扇形裁剪区域
            ctx.beginPath();
            const startAngle = k * Math.PI / 3;
            const endAngle = (k + 1) * Math.PI / 3;
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, hexRadius, startAngle, endAngle);
            ctx.closePath();
            ctx.clip();

            // 计算扇形区域重心
            const centroidRadius = (2 * hexRadius) / 3;  // 扇形重心到中心的距离
            const centroidAngle = startAngle + Math.PI / 6;  // 扇形重心的角度
            const centroidX = centroidRadius * Math.cos(centroidAngle);
            const centroidY = centroidRadius * Math.sin(centroidAngle);

            // 移动到扇形重心并应用变换
            ctx.translate(centroidX, centroidY);

            // 每个扇形旋转120度
            const rotation = Math.floor(k / 2) * (2 * Math.PI / 3);
            ctx.rotate(rotation);

            // 根据k的奇偶性决定是否需要镜像
            if (k % 2 === 1) {
                ctx.scale(1, -1);
            }

            // 绘制图案
            this.drawFillPattern(ctx, i, j);

            ctx.restore();
        }
    }
}



export class P3ImagePattern extends CMImagePattern {
    constructor(config) {
        super(config);
    }

    validateConfig(config) {
        super.validateConfig(config);

        const { basis1, basis2 } = config.lattice;

        // 验证基向量长度必须相等
        const length1 = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const length2 = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);

        if (Math.abs(length1 - length2) > 1e-6) {
            throw new Error('p3群的两个基向量长度必须相等');
        }

        // 验证夹角为120度
        const dotProduct = basis1.x * basis2.x + basis1.y * basis2.y;
        const angle = Math.acos(dotProduct / (length1 * length2));

        if (Math.abs(angle - (2 * Math.PI / 3)) > 1e-6) {
            throw new Error('p3群的基向量夹角必须为120度');
        }
    }

    drawFillPattern(ctx, x, y) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算单元格的位置索引
        const i = Math.floor((x / basis1.x + 1000000));
        const j = Math.floor((y / basis2.y + 1000000));

        if (this.fillImage && this.fillImageLoaded) {
            // 绘制原始图案
            ctx.save();
            this.drawFillImage(ctx);
            ctx.restore();

            // 绘制120度旋转的图案
            ctx.save();
            ctx.rotate(2 * Math.PI / 3);
            this.drawFillImage(ctx);
            ctx.restore();

            // 绘制240度旋转的图案
            ctx.save();
            ctx.rotate(4 * Math.PI / 3);
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
            // 绘制原始图案
            ctx.save();
            this.drawNodeImage(ctx);
            ctx.restore();

            // 绘制120度旋转的图案
            ctx.save();
            ctx.rotate(2 * Math.PI / 3);
            this.drawNodeImage(ctx);
            ctx.restore();

            // 绘制240度旋转的图案
            ctx.save();
            ctx.rotate(4 * Math.PI / 3);
            this.drawNodeImage(ctx);
            ctx.restore();
        }
    }


    renderRhombusGrid(ctx, gridRange) {
        const { basis1, basis2 } = this.config.lattice;

        // 旋转基向量90度
        const rotatedBasis1 = {
            x: -basis1.y,
            y: basis1.x
        };
        const rotatedBasis2 = {
            x: -basis2.y,
            y: basis2.x
        };

        // 计算基向量长度
        const basisLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        // 六边形半径应该是基向量长度的 1/√3
        const hexRadius = basisLength / Math.sqrt(3);

        // 计算六边形的顶点
        const getHexPoints = (centerX, centerY) => {
            const points = [];
            for (let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3;
                points.push({
                    x: centerX + hexRadius * Math.cos(angle),
                    y: centerY + hexRadius * Math.sin(angle)
                });
            }
            return points;
        };

        // 使用旋转后的基向量计算位置
        for (let i = gridRange.minI - 1; i <= gridRange.maxI + 1; i++) {
            for (let j = gridRange.minJ - 1; j <= gridRange.maxJ + 1; j++) {
                const centerX = i * rotatedBasis1.x + j * rotatedBasis2.x;
                const centerY = i * rotatedBasis1.y + j * rotatedBasis2.y;

                const points = getHexPoints(centerX, centerY);

                // 绘制六边形边界
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let k = 1; k < points.length; k++) {
                    ctx.lineTo(points[k].x, points[k].y);
                }
                ctx.closePath();
                ctx.stroke();

                // 绘制三条对称线
                ctx.beginPath();
                ctx.strokeStyle = '#0000ff';
                ctx.lineWidth = this.config.render.gridWidth;
                ctx.setLineDash([5, 5]);

                // 绘制三条120度间隔的对称线
                for (let k = 0; k < 3; k++) {
                    const angle = k * (2 * Math.PI / 3);
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(
                        centerX + hexRadius * Math.cos(angle),
                        centerY + hexRadius * Math.sin(angle)
                    );
                }
                ctx.stroke();

                // 标记三重旋转中心
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
    drawRhombusUnit(ctx, i, j) {
        const { basis1, basis2 } = this.config.lattice;

        // 旋转基向量90度
        const rotatedBasis1 = {
            x: -basis1.y,
            y: basis1.x
        };
        const rotatedBasis2 = {
            x: -basis2.y,
            y: basis2.x
        };

        // 计算中心点位置
        const centerX = i * rotatedBasis1.x + j * rotatedBasis2.x;
        const centerY = i * rotatedBasis1.y + j * rotatedBasis2.y;

        // 计算基向量长度和六边形半径
        const basisLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const hexRadius = basisLength / Math.sqrt(3);

        // 将六边形分成3个120度的区域
        for (let k = 0; k < 3; k++) {
            ctx.save();
            ctx.translate(centerX, centerY);

            // 创建120度的裁剪区域
            ctx.beginPath();
            const startAngle = k * (2 * Math.PI / 3);
            const endAngle = (k + 1) * (2 * Math.PI / 3);
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, hexRadius, startAngle, endAngle);
            ctx.closePath();
            ctx.clip();

            // 修正120度扇形区域重心计算
            // 扇形形心到圆心的距离 = (4 * r) / (3 * θ) * sin(θ/2)
            // 其中 r 是半径, θ 是弧度(这里是 2π/3)
            const theta = 2 * Math.PI / 3;  // 120度
            const centroidRadius = (4 * hexRadius) / (3 * theta) * Math.sin(theta / 2);
            const centroidAngle = startAngle + theta / 2;  // 扇形的角平分线方向
            const centroidX = centroidRadius * Math.cos(centroidAngle);
            const centroidY = centroidRadius * Math.sin(centroidAngle);

            // 移动到扇形重心并应用旋转
            ctx.translate(centroidX, centroidY);
            ctx.rotate(k * (2 * Math.PI / 3));  // 旋转120度

            // 绘制图案
            this.drawFillPattern(ctx, i, j);

            ctx.restore();
        }
    }
}






export class P6ImagePattern extends CMImagePattern {
    constructor(config) {
        super(config);
    }

    validateConfig(config) {
        super.validateConfig(config);

        const { basis1, basis2 } = config.lattice;

        // 验证基向量长度必须相等
        const length1 = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const length2 = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);

        if (Math.abs(length1 - length2) > 1e-6) {
            throw new Error('p6群的两个基向量长度必须相等');
        }

        // 验证夹角为120度
        const dotProduct = basis1.x * basis2.x + basis1.y * basis2.y;
        const angle = Math.acos(dotProduct / (length1 * length2));

        if (Math.abs(angle - (2 * Math.PI / 3)) > 1e-6) {
            throw new Error('p6群的基向量夹角必须为120度');
        }
    }


    drawNodePattern(ctx, x, y) {
        if (this.nodeImage && this.nodeImageLoaded) {
            // 绘制6个60度旋转的节点图案
            for (let k = 0; k < 6; k++) {
                ctx.save();
                ctx.rotate(k * Math.PI / 3); // 每次旋转60度
                this.drawNodeImage(ctx);
                ctx.restore();
            }
        }
    }

    drawRhombusUnit(ctx, i, j) {
        const { basis1, basis2 } = this.config.lattice;

        // 旋转基向量90度
        const rotatedBasis1 = {
            x: -basis1.y,
            y: basis1.x
        };
        const rotatedBasis2 = {
            x: -basis2.y,
            y: basis2.x
        };

        // 计算中心点位置
        const centerX = i * rotatedBasis1.x + j * rotatedBasis2.x;
        const centerY = i * rotatedBasis1.y + j * rotatedBasis2.y;

        // 计算基向量长度和六边形半径
        const basisLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const hexRadius = basisLength / Math.sqrt(3);

        // 将六边形分成6个60度的区域
        for (let k = 0; k < 6; k++) {
            ctx.save();
            ctx.translate(centerX, centerY);

            // 创建60度的裁剪区域
            ctx.beginPath();
            const startAngle = k * (Math.PI / 3);
            const endAngle = (k + 1) * (Math.PI / 3);
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, hexRadius, startAngle, endAngle);
            ctx.closePath();
            ctx.clip();

            // 计算60度扇形区域重心
            const theta = Math.PI / 3;  // 60度
            const centroidRadius = (4 * hexRadius) / (3 * theta) * Math.sin(theta / 2);
            const centroidAngle = startAngle + theta / 2;
            const centroidX = centroidRadius * Math.cos(centroidAngle);
            const centroidY = centroidRadius * Math.sin(centroidAngle);

            // 移动到扇形重心并应用旋转
            ctx.translate(centroidX, centroidY);
            ctx.rotate(k * (Math.PI / 3));  // 旋转60度

            // 绘制图案
            this.drawFillPattern(ctx, i, j);

            ctx.restore();
        }
    }

    renderRhombusGrid(ctx, gridRange) {
        const { basis1, basis2 } = this.config.lattice;

        // 旋转基向量90度
        const rotatedBasis1 = {
            x: -basis1.y,
            y: basis1.x
        };
        const rotatedBasis2 = {
            x: -basis2.y,
            y: basis2.x
        };

        const basisLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const hexRadius = basisLength / Math.sqrt(3);

        // 计算六边形的顶点
        const getHexPoints = (centerX, centerY) => {
            const points = [];
            for (let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3;
                points.push({
                    x: centerX + hexRadius * Math.cos(angle),
                    y: centerY + hexRadius * Math.sin(angle)
                });
            }
            return points;
        };

        // 绘制网格
        for (let i = gridRange.minI - 1; i <= gridRange.maxI + 1; i++) {
            for (let j = gridRange.minJ - 1; j <= gridRange.maxJ + 1; j++) {
                const centerX = i * rotatedBasis1.x + j * rotatedBasis2.x;
                const centerY = i * rotatedBasis1.y + j * rotatedBasis2.y;

                const points = getHexPoints(centerX, centerY);

                // 绘制六边形边界
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let k = 1; k < points.length; k++) {
                    ctx.lineTo(points[k].x, points[k].y);
                }
                ctx.closePath();
                ctx.stroke();

                // 绘制六条对称线
                ctx.beginPath();
                ctx.strokeStyle = '#0000ff';
                ctx.lineWidth = this.config.render.gridWidth;
                ctx.setLineDash([5, 5]);

                // 绘制六条60度间隔的对称线
                for (let k = 0; k < 6; k++) {
                    const angle = k * (Math.PI / 3);
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(
                        centerX + hexRadius * Math.cos(angle),
                        centerY + hexRadius * Math.sin(angle)
                    );
                }
                ctx.stroke();

                // 标记六重旋转中心
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
}





export class P6MImagePattern extends P6ImagePattern {
    constructor(config) {
        super(config);
    }

    drawRhombusUnit(ctx, i, j) {
        const { basis1, basis2 } = this.config.lattice;

        // 旋转基向量90度
        const rotatedBasis1 = {
            x: -basis1.y,
            y: basis1.x
        };
        const rotatedBasis2 = {
            x: -basis2.y,
            y: basis2.x
        };

        // 计算中心点位置
        const centerX = i * rotatedBasis1.x + j * rotatedBasis2.x;
        const centerY = i * rotatedBasis1.y + j * rotatedBasis2.y;

        // 计算基向量长度和六边形半径
        const basisLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const hexRadius = basisLength / Math.sqrt(3);

        // 将六边形分成12个30度的区域（6个扇区，每个扇区再分成2个镜像区域）
        for (let k = 0; k < 12; k++) {
            ctx.save();
            ctx.translate(centerX, centerY);

            // 创建30度的裁剪区域
            ctx.beginPath();
            const startAngle = k * (Math.PI / 6);
            const endAngle = (k + 1) * (Math.PI / 6);
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, hexRadius, startAngle, endAngle);
            ctx.closePath();
            ctx.clip();

            // 计算扇形区域重心
            const theta = Math.PI / 6;  // 30度
            const centroidRadius = (4 * hexRadius) / (3 * theta) * Math.sin(theta / 2);
            const centroidAngle = startAngle + theta / 2;
            const centroidX = centroidRadius * Math.cos(centroidAngle);
            const centroidY = centroidRadius * Math.sin(centroidAngle);

            // 移动到扇形重心
            ctx.translate(centroidX, centroidY);

            // 计算基本旋转角度(每60度)
            const baseRotation = Math.floor(k / 2) * (Math.PI / 3);
            ctx.rotate(baseRotation);

            if (k % 2 !== 0) {
                // 先抵消基本旋转
                ctx.rotate(-baseRotation);
                
                // 计算镜像线角度 - 关键修改在这里
                const mirrorAngle = ((k ) / 2) * (Math.PI / 3);
                
                // 应用镜像变换
                ctx.rotate(mirrorAngle);
                ctx.scale(1, -1);
                ctx.rotate(-mirrorAngle);
                
                // 重新应用基本旋转
                ctx.rotate(baseRotation);
            }

            this.drawFillPattern(ctx, i, j);
            ctx.restore();
        }
    }

    renderRhombusGrid(ctx, gridRange) {
        const { basis1, basis2 } = this.config.lattice;

        // 旋转基向量90度
        const rotatedBasis1 = {
            x: -basis1.y,
            y: basis1.x
        };
        const rotatedBasis2 = {
            x: -basis2.y,
            y: basis2.x
        };

        const basisLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const hexRadius = basisLength / Math.sqrt(3);

        // 计算六边形的顶点
        const getHexPoints = (centerX, centerY) => {
            const points = [];
            for (let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3;
                points.push({
                    x: centerX + hexRadius * Math.cos(angle),
                    y: centerY + hexRadius * Math.sin(angle)
                });
            }
            return points;
        };

        // 绘制网格
        for (let i = gridRange.minI - 1; i <= gridRange.maxI + 1; i++) {
            for (let j = gridRange.minJ - 1; j <= gridRange.maxJ + 1; j++) {
                const centerX = i * rotatedBasis1.x + j * rotatedBasis2.x;
                const centerY = i * rotatedBasis1.y + j * rotatedBasis2.y;

                const points = getHexPoints(centerX, centerY);

                // 绘制六边形边界
                ctx.beginPath();
                ctx.strokeStyle = this.config.render.gridColor;
                ctx.lineWidth = this.config.render.gridWidth;
                ctx.setLineDash([]);
                ctx.moveTo(points[0].x, points[0].y);
                for (let k = 1; k < points.length; k++) {
                    ctx.lineTo(points[k].x, points[k].y);
                }
                ctx.closePath();
                ctx.stroke();

                // 绘制对称线（6条旋转轴和6条镜面）
                ctx.beginPath();
                ctx.strokeStyle = '#0000ff';
                ctx.setLineDash([5, 5]);

                // 绘制12条30度间隔的对称线
                for (let k = 0; k < 12; k++) {
                    const angle = k * (Math.PI / 6);
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(
                        centerX + hexRadius * Math.cos(angle),
                        centerY + hexRadius * Math.sin(angle)
                    );
                }
                ctx.stroke();

                // 标记六重旋转中心
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
}








export class P31MImagePattern extends CMImagePattern {
    constructor(config) {
        super(config);
    }

    validateConfig(config) {
        super.validateConfig(config);

        const { basis1, basis2 } = config.lattice;

        // 验证基向量长度必须相等
        const length1 = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const length2 = Math.sqrt(basis2.x * basis2.x + basis2.y * basis2.y);

        if (Math.abs(length1 - length2) > 1e-6) {
            throw new Error('p3群的两个基向量长度必须相等');
        }

        // 验证夹角为120度
        const dotProduct = basis1.x * basis2.x + basis1.y * basis2.y;
        const angle = Math.acos(dotProduct / (length1 * length2));

        if (Math.abs(angle - (2 * Math.PI / 3)) > 1e-6) {
            throw new Error('p3群的基向量夹角必须为120度');
        }
    }

    drawFillPattern(ctx, x, y) {
        const { basis1, basis2 } = this.config.lattice;

        // 计算单元格的位置索引
        const i = Math.floor((x / basis1.x + 1000000));
        const j = Math.floor((y / basis2.y + 1000000));

        if (this.fillImage && this.fillImageLoaded) {
            // 绘制原始图案
            ctx.save();
            this.drawFillImage(ctx);
            ctx.restore();

            // 绘制120度旋转的图案
            ctx.save();
            ctx.rotate(2 * Math.PI / 3);
            this.drawFillImage(ctx);
            ctx.restore();

            // 绘制240度旋转的图案
            ctx.save();
            ctx.rotate(4 * Math.PI / 3);
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
            // 绘制原始图案
            ctx.save();
            this.drawNodeImage(ctx);
            ctx.restore();

            // 绘制120度旋转的图案
            ctx.save();
            ctx.rotate(2 * Math.PI / 3);
            this.drawNodeImage(ctx);
            ctx.restore();

            // 绘制240度旋转的图案
            ctx.save();
            ctx.rotate(4 * Math.PI / 3);
            this.drawNodeImage(ctx);
            ctx.restore();
        }
    }


    renderRhombusGrid(ctx, gridRange) {
        const { basis1, basis2 } = this.config.lattice;

        // 旋转基向量90度
        const rotatedBasis1 = {
            x: -basis1.y,
            y: basis1.x
        };
        const rotatedBasis2 = {
            x: -basis2.y,
            y: basis2.x
        };

        // 计算基向量长度
        const basisLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        // 六边形半径应该是基向量长度的 1/√3
        const hexRadius = basisLength / Math.sqrt(3);

        // 计算六边形的顶点
        const getHexPoints = (centerX, centerY) => {
            const points = [];
            for (let i = 0; i < 6; i++) {
                const angle = i * Math.PI / 3;
                points.push({
                    x: centerX + hexRadius * Math.cos(angle),
                    y: centerY + hexRadius * Math.sin(angle)
                });
            }
            return points;
        };

        // 使用旋转后的基向量计算位置
        for (let i = gridRange.minI - 1; i <= gridRange.maxI + 1; i++) {
            for (let j = gridRange.minJ - 1; j <= gridRange.maxJ + 1; j++) {
                const centerX = i * rotatedBasis1.x + j * rotatedBasis2.x;
                const centerY = i * rotatedBasis1.y + j * rotatedBasis2.y;

                const points = getHexPoints(centerX, centerY);

                // 绘制六边形边界
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let k = 1; k < points.length; k++) {
                    ctx.lineTo(points[k].x, points[k].y);
                }
                ctx.closePath();
                ctx.stroke();

                // 绘制三条对称线
                ctx.beginPath();
                ctx.strokeStyle = '#0000ff';
                ctx.lineWidth = this.config.render.gridWidth;
                ctx.setLineDash([5, 5]);

                // 绘制六条120度间隔的对称线
                for (let k = 0; k < 6; k++) {
                    const angle = k * (2 * Math.PI / 6);
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(
                        centerX + hexRadius * Math.cos(angle),
                        centerY + hexRadius * Math.sin(angle)
                    );
                }
                ctx.stroke();

                // 标记三重旋转中心
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
                ctx.fill();
                // 添加六个小三角形中间的旋转中心
                // 添加六个小三角形中间的旋转中心
                for (let k = 0; k < 6; k++) {
                    // 计算当前三角形的三个顶点
                    const angle1 = k * Math.PI / 3;  // 第一个顶点角度
                    const angle2 = (k + 1) * Math.PI / 3;  // 第二个顶点角度

                    // 三个顶点坐标
                    const x1 = centerX;  // 中心点
                    const y1 = centerY;
                    const x2 = centerX + hexRadius * Math.cos(angle1);  // 第一个外顶点
                    const y2 = centerY + hexRadius * Math.sin(angle1);
                    const x3 = centerX + hexRadius * Math.cos(angle2);  // 第二个外顶点
                    const y3 = centerY + hexRadius * Math.sin(angle2);

                    // 计算形心 (三个顶点坐标的平均值)
                    const rotCenterX = (x1 + x2 + x3) / 3;
                    const rotCenterY = (y1 + y2 + y3) / 3;

                    ctx.beginPath();
                    ctx.arc(rotCenterX, rotCenterY, 2, 0, 2 * Math.PI);
                    ctx.fill();

                    // 绘制从形心到三个顶点的线段
                    ctx.beginPath();
                    ctx.setLineDash([3, 3]); // 使用更短的虚线
                    ctx.strokeStyle = '#0000ff'; // 使用蓝色

                    // 连接形心到三个顶点
                    ctx.moveTo(rotCenterX, rotCenterY);
                    ctx.lineTo(x1, y1); // 到中心点

                    ctx.moveTo(rotCenterX, rotCenterY);
                    ctx.lineTo(x2, y2); // 到第一个外顶点

                    ctx.moveTo(rotCenterX, rotCenterY);
                    ctx.lineTo(x3, y3); // 到第二个外顶点

                    ctx.stroke();
                }
            }
        }
    }
    drawRhombusUnit(ctx, i, j) {
        const { basis1, basis2 } = this.config.lattice;
        // 旋转基向量90度
        const rotatedBasis1 = {
            x: -basis1.y,
            y: basis1.x
        };
        const rotatedBasis2 = {
            x: -basis2.y,
            y: basis2.x
        };
        // 计算中心点和六边形参数
        const centerX = i * rotatedBasis1.x + j * rotatedBasis2.x;
        const centerY = i * rotatedBasis1.y + j * rotatedBasis2.y;
        // 计算基向量长度
        const basisLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);

        const hexRadius = basisLength / Math.sqrt(3);
        // 计算三角形形心的辅助函数
        const calculateTriangleCentroid = (p1, p2, p3) => {
            return {
                x: (p1.x + p2.x + p3.x) / 3,
                y: (p1.y + p2.y + p3.y) / 3
            };
        };

        // 判断是否需要镜像的辅助函数
        const needsMirroring = (k, m) => {
            // 根据位置判断是否需要镜像
            // 这里的逻辑需要根据具体的对称要求调整
            return (k % 2 === 1) || (m === 1);
        };

        // 首先将六边形分成6个主三角形
        for (let k = 0; k < 6; k++) {
            const angle1 = k * Math.PI / 3;
            const angle2 = (k + 1) * Math.PI / 3;

            // 主三角形的三个顶点
            const center = { x: centerX, y: centerY };
            const vertex1 = {
                x: centerX + hexRadius * Math.cos(angle1),
                y: centerY + hexRadius * Math.sin(angle1)
            };
            const vertex2 = {
                x: centerX + hexRadius * Math.cos(angle2),
                y: centerY + hexRadius * Math.sin(angle2)
            };

            // 计算主三角形的形心(第一个三重旋转中心)
            const mainCentroid = calculateTriangleCentroid(center, vertex1, vertex2);

            // 将主三角形分成3个小三角形
            for (let m = 0; m < 3; m++) {
                ctx.save();

                let trianglePoints;
                // 定义小三角形的顶点
                if (m === 0) {
                    trianglePoints = [center, vertex1, mainCentroid];
                } else if (m === 1) {
                    trianglePoints = [vertex1, vertex2, mainCentroid];
                } else {
                    trianglePoints = [vertex2, center, mainCentroid];
                }

                // 裁剪小三角形区域
                ctx.beginPath();
                ctx.moveTo(trianglePoints[0].x, trianglePoints[0].y);
                ctx.lineTo(trianglePoints[1].x, trianglePoints[1].y);
                ctx.lineTo(trianglePoints[2].x, trianglePoints[2].y);
                ctx.closePath();
                ctx.clip();

                // 计算小三角形的形心
                const smallCentroid = calculateTriangleCentroid(
                    trianglePoints[0],
                    trianglePoints[1],
                    trianglePoints[2]
                );

                // 应用变换
                ctx.translate(smallCentroid.x, smallCentroid.y);

                // 基本旋转(60度的整数倍)
                ctx.rotate(k * Math.PI / 3);

                // 根据位置决定是否需要镜像
                if (needsMirroring(k, m)) {
                    ctx.scale(1, -1);
                }

                // 绘制基本图案
                this.drawFillPattern(ctx, i, j);

                ctx.restore();
            }
        }
    }
}