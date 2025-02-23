export function 从晶格获取最小重复单元(lattice) {
    const { basis1, basis2 } = lattice;

    // 计算基向量的分量比
    const ratioX = Math.abs(basis2.x / basis1.x);
    const ratioY = Math.abs(basis2.y / basis1.y);

    // 找到最小的整数倍数使得两个基向量的分量比接近整数
    const findMinimalMultiple = (ratio) => {
        if (Math.abs(ratio) < 0.001) return 1;
        const precision = 1e-6;
        let i = 1;
        while (i < 10) {
            if (Math.abs(Math.round(ratio * i) - ratio * i) < precision) {
                return i;
            }
            i++;
        }
        return 1;
    };

    const mx = findMinimalMultiple(ratioX);
    const my = findMinimalMultiple(ratioY);

    // 计算最小无缝单元的尺寸
    return {
        width: Math.abs(basis1.x * mx) + Math.abs(basis2.x * my),
        height: Math.abs(basis1.y * mx) + Math.abs(basis2.y * my)
    };
}
/**
* 生成晶格网格线数据
* @param {Object} 基向量1 - 晶格基向量1 {x: number, y: number}
* @param {Object} 基向量2 - 晶格基向量2 {x: number, y: number}
* @param {Object} 网格范围 - 网格索引范围 {minI: number, maxI: number, minJ: number, maxJ: number}
* @returns {Array<{startX: number, startY: number, endX: number, endY: number}>} 网格线数组
*/
export function 以基向量对生成网格线数据(基向量1, 基向量2, 网格范围) {
    const 网格线 = [];

    // 生成基向量1方向的平行线族
    for (let i = 网格范围.minI; i <= 网格范围.maxI; i++) {
        网格线.push({
            startX: 基向量1.x * i + 基向量2.x * 网格范围.minJ,
            startY: 基向量1.y * i + 基向量2.y * 网格范围.minJ,
            endX: 基向量1.x * i + 基向量2.x * 网格范围.maxJ,
            endY: 基向量1.y * i + 基向量2.y * 网格范围.maxJ
        });
    }

    // 生成基向量2方向的平行线族
    for (let j = 网格范围.minJ; j <= 网格范围.maxJ; j++) {
        网格线.push({
            startX: 基向量1.x * 网格范围.minI + 基向量2.x * j,
            startY: 基向量1.y * 网格范围.minI + 基向量2.y * j,
            endX: 基向量1.x * 网格范围.maxI + 基向量2.x * j,
            endY: 基向量1.y * 网格范围.maxI + 基向量2.y * j
        });
    }

    return 网格线;
}



export function 以高度和宽度在画布上下文创建正六边形路径(ctx, 区域宽度, 区域高度) {
    const 半径 = Math.min(区域宽度, 区域高度) / 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const 角度 = (i * Math.PI) / 3;
        const x = 半径 * Math.cos(角度);
        const y = 半径 * Math.sin(角度);
        ctx[i === 0 ? 'moveTo' : 'lineTo'](x, y);
    }
    ctx.closePath();
}

export function 以基向量对在画布上下文创建平行四边形路径(ctx, basis1, basis2) {
    const points = [
        { x: -basis1.x / 2 - basis2.x / 2, y: -basis1.y / 2 - basis2.y / 2 }, // 左上
        { x: basis1.x / 2 - basis2.x / 2, y: basis1.y / 2 - basis2.y / 2 },   // 右上
        { x: basis1.x / 2 + basis2.x / 2, y: basis1.y / 2 + basis2.y / 2 },   // 右下
        { x: -basis1.x / 2 + basis2.x / 2, y: -basis1.y / 2 + basis2.y / 2 }  // 左下
    ];
    // 绘制裁剪路径
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
}
export function 在画布上下文应用变换(ctx, 适配比例, 平移量, 旋转角度, 缩放系数) {
    ctx.translate(平移量.x, 平移量.y);
    ctx.rotate((旋转角度 * Math.PI) / 180);
    ctx.scale(缩放系数 * 适配比例, 缩放系数 * 适配比例);
}

export function 蒙版到节点形状(ctx, 形状配置){
    const {width, height, shape,basis1,basis2 } = 形状配置;
    ctx.beginPath();
    switch (shape) {
        case 'parallelogram':
            以基向量对在画布上下文创建平行四边形路径(ctx, basis1, basis2)
            break;
        case 'hexagon':
            以高度和宽度在画布上下文创建正六边形路径(ctx, width, height);
            break;
        case 'rectangle':
        default:
            ctx.rect(0, 0, width, height);
    }
    ctx.clip();
}

export const 纯色填充画布 = (ctx, option = { color: "#ffffff", width: 300, height: 150 }) => {
    // 解构参数并设置默认值
    const { color, width, height } = {
        color: "#ffffff",
        width: 300,
        height: 150,
        ...option
    };
    
    // 设置填充样式并绘制矩形
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    // 返回上下文以支持链式调用
    return ctx;
};