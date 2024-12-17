import { PGGImagePattern } from "./pggImage.js";

import { PMMImagePattern } from "./pmmImage.js";
export {PMMImagePattern}

import { PMGImagePattern } from "./pmgImage.js";
export {PMGImagePattern}

import { CMImagePattern } from "./cmImage.js";
export {CMImagePattern}


import { CMMImagePattern } from "./cmmImage.js";
export {CMMImagePattern}

import { P4ImagePattern } from "./p4Image.js";
export {P4ImagePattern}

import { P4MImagePattern } from "./p4mImage.js";
export {P4MImagePattern}

import { P4GImagePattern } from "./p4gImage.js";
export {P4GImagePattern}




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