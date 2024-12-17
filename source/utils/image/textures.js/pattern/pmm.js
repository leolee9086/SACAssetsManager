import { PGGImagePattern } from "./pggImage.js";
import { PMMImagePattern } from "./pmmImage.js";



export {PMMImagePattern}
import { PMGImagePattern } from "./pmgImage.js";
export {PMGImagePattern}

import { CMImagePattern } from "./cmImage.js";
export {CMImagePattern}


import { CMMImagePattern } from "./cmmImage.js";
export {CMMImagePattern}




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


    drawNodePattern(ctx, x, y) {
        const { basis1, basis2 } = this.config.lattice;
        const rotatedBasis1 = {
            x: -basis1.y,
            y: basis1.x
        };
        const rotatedBasis2 = {
            x: -basis2.y,
            y: basis2.x
        };
        // 计算单元格的位置索引
        const i = Math.floor((x / basis1.x + 1000000));
        const j = Math.floor((y / basis2.y + 1000000));
        const centerX = i * rotatedBasis1.x + j * rotatedBasis2.x;
        const centerY = i * rotatedBasis1.y + j * rotatedBasis2.y;


        if (this.nodeImage && this.nodeImageLoaded) {
            // 绘制原始图案
        //    ctx.save();
          //  this.drawNodeImage(ctx);
           // ctx.restore();


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
                if (this.nodeImage && this.nodeImageLoaded) {
                    // 绘制原始图案
                    ctx.save();
                    ctx.translate(centerX, centerY);

                    this.drawNodeImage(ctx);
                    ctx.restore();
        
        
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

            ctx.beginPath();
            const startAngle = k * Math.PI / 3;
            const endAngle = (k + 1) * Math.PI / 3;
            const theta = Math.PI / 3;  // 60度扇形的角度

            // 计算两个半径端点的坐标
            const x1 = hexRadius * Math.cos(startAngle);
            const y1 = hexRadius * Math.sin(startAngle);
            const x2 = hexRadius * Math.cos(endAngle);
            const y2 = hexRadius * Math.sin(endAngle);

            // 使用直线连接形成三角形边界
            ctx.moveTo(0, 0);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.closePath();
            ctx.clip();

            // 计算扇形形心
            const centroidRadius = (4 * hexRadius) / (3 * theta) * Math.sin(theta / 2);
            const centroidAngle = startAngle + theta / 2;
            const centroidX = centroidRadius * Math.cos(centroidAngle);
            const centroidY = centroidRadius * Math.sin(centroidAngle);

            // 移动到形心位置
            ctx.translate(centroidX, centroidY);

            if (k % 2 === 0) {
                // 偶数扇区只需要旋转
                ctx.rotate(k * Math.PI / 3);
            } else {
                // 奇数扇区需要镜像
                const rotation = (k + 1) * Math.PI / 3;
                ctx.rotate(rotation);
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
            // 1. 计算扇形的中心角
            const centerAngle = (startAngle + endAngle) / 2;

            // 2. 计算扇形角度的一半
            const halfAngle = (endAngle - startAngle) / 2;

            // 3. 计算棱形的四个顶点
            // A点：在圆弧上，位于中心角位置
            const ax = hexRadius * Math.cos(centerAngle);
            const ay = hexRadius * Math.sin(centerAngle);

            // B点和C点：在扇形边上
            const bx = hexRadius * Math.cos(startAngle) * Math.cos(halfAngle)*2;
            const by = hexRadius * Math.sin(startAngle) * Math.cos(halfAngle)*2;

            const cx = hexRadius * Math.cos(endAngle) * Math.cos(halfAngle)*2;
            const cy = hexRadius * Math.sin(endAngle) * Math.cos(halfAngle)*2;

            // 绘制棱形
            ctx.beginPath();
            ctx.moveTo(ax, ay);     // 移动到A点
            ctx.lineTo(bx, by);     // 连接到B点
            ctx.lineTo(0, 0);       // 连接到圆心
            ctx.lineTo(cx, cy);     // 连接到C点
            ctx.closePath();        // 闭合路径
            ctx.clip();           // 描边
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

      
    // 将六边形分成6个正三角形
    for (let k = 0; k < 6; k++) {
        ctx.save();
        ctx.translate(centerX, centerY);

        // 计算当前三角形的三个顶点
        const angle1 = k * Math.PI / 3;  // 第一个顶点角度
        const angle2 = (k + 1) * Math.PI / 3;  // 第二个顶点角度

        // 创建三角形裁剪路径
        ctx.beginPath();
        ctx.moveTo(0, 0);  // 中心点
        ctx.lineTo(
            hexRadius * Math.cos(angle1),  // 第一个外顶点
            hexRadius * Math.sin(angle1)
        );
        ctx.lineTo(
            hexRadius * Math.cos(angle2),  // 第二个外顶点
            hexRadius * Math.sin(angle2)
        );
        ctx.closePath();
        ctx.clip();

        // 计算三角形形心
        const centroidX = (0 + hexRadius * Math.cos(angle1) + hexRadius * Math.cos(angle2)) / 3;
        const centroidY = (0 + hexRadius * Math.sin(angle1) + hexRadius * Math.sin(angle2)) / 3;

        // 移动到三角形形心并应用旋转
        ctx.translate(centroidX, centroidY);
        ctx.rotate(k * Math.PI / 3);  // 旋转60度

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
    
            // 计算当前区域的边界点
            const sectorIndex = Math.floor(k / 2);  // 确定在哪个60度扇区
            const isSecondHalf = k % 2 === 1;       // 是否是扇区的第二半部分
    
            // 计算扇区的顶点坐标
            const angle1 = sectorIndex * (Math.PI / 3);
            const angle2 = ((sectorIndex + 1) % 6) * (Math.PI / 3);
            
            // 计算扇区边界上的点
            const x1 = hexRadius * Math.cos(angle1);
            const y1 = hexRadius * Math.sin(angle1);
            const x2 = hexRadius * Math.cos(angle2);
            const y2 = hexRadius * Math.sin(angle2);
            
            // 计算边的中点
            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
    
            // 创建裁剪路径
            ctx.beginPath();
            if (!isSecondHalf) {
                // 第一个三角形：中心点-顶点-边中点
                ctx.moveTo(0, 0);
                ctx.lineTo(x1, y1);
                ctx.lineTo(midX, midY);
            } else {
                // 第二个三角形：中心点-边中点-下一个顶点
                ctx.moveTo(0, 0);
                ctx.lineTo(midX, midY);
                ctx.lineTo(x2, y2);
            }
            ctx.closePath();
            ctx.clip();
    
            // 计算三角形形心
            let centroidX, centroidY;
            if (!isSecondHalf) {
                centroidX = (0 + x1 + midX) / 3;
                centroidY = (0 + y1 + midY) / 3;
            } else {
                centroidX = (0 + midX + x2) / 3;
                centroidY = (0 + midY + y2) / 3;
            }
            // 移动到扇形重心
            ctx.translate(centroidX, centroidY);

            // 计算基本旋转角度(每60度)
            const baseRotation = Math.floor(k / 2) * (Math.PI / 3);
            ctx.rotate(baseRotation);

            if (k % 2 !== 0) {
                // 先抵消基本旋转
                ctx.rotate(-baseRotation);

                // 计算镜像线角度 - 关键修改在这里
                const mirrorAngle = ((k) / 2) * (Math.PI / 3);

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

                // 1. 绘制6条连接到顶点的线
                for (let k = 0; k < 6; k++) {
                    const angle = k * (Math.PI / 3);
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(
                        centerX + hexRadius * Math.cos(angle),
                        centerY + hexRadius * Math.sin(angle)
                    );
                }

                // 2. 绘制6条连接到边中点的线
                for (let k = 0; k < 6; k++) {
                    // 计算相邻两个顶点
                    const angle1 = k * (Math.PI / 3);
                    const angle2 = ((k + 1) % 6) * (Math.PI / 3);

                    // 计算这两个顶点的坐标
                    const x1 = centerX + hexRadius * Math.cos(angle1);
                    const y1 = centerY + hexRadius * Math.sin(angle1);
                    const x2 = centerX + hexRadius * Math.cos(angle2);
                    const y2 = centerY + hexRadius * Math.sin(angle2);

                    // 计算边的中点
                    const midX = (x1 + x2) / 2;
                    const midY = (y1 + y2) / 2;

                    // 连接中心到边的中点
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(midX, midY);
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

        const centerX = i * rotatedBasis1.x + j * rotatedBasis2.x;
        const centerY = i * rotatedBasis1.y + j * rotatedBasis2.y;
        const basisLength = Math.sqrt(basis1.x * basis1.x + basis1.y * basis1.y);
        const hexRadius = basisLength / Math.sqrt(3);

        const calculateTriangleCentroid = (p1, p2, p3) => {
            return {
                x: (p1.x + p2.x + p3.x) / 3,
                y: (p1.y + p2.y + p3.y) / 3
            };
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

            // 计算主三角形的形心
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

                if (k % 2 === 0) {
                    // 偶数大三角形：正常旋转
                    ctx.rotate(Math.floor(k / 2) * (2 * Math.PI / 3));  // 基本旋转
                    ctx.rotate(m * (2 * Math.PI / 3));  // 小三角形旋转
                } else {
                    // 奇数大三角形：先镜像，再反向旋转
                    ctx.rotate(Math.floor(k / 2) * (2 * Math.PI / 3));  // 基本旋转
                    ctx.scale(1, -1);  // 镜像
                    ctx.rotate(2 * Math.PI / 3);  // 额外旋转90度补偿镜像带来的方向变化

                    ctx.rotate(-m * (2 * Math.PI / 3));  // 小三角形反向旋转
                }

                this.drawFillPattern(ctx, i, j);
                ctx.restore();
            }
        }
    }
}