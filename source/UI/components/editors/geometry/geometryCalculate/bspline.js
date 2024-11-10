/**
 * 计算B样条基函数值
 * @param {number} i - 控制点索引
 * @param {number} k - 阶数
 * @param {number} t - 参数值
 * @param {number[]} 节点向量 - 节点向量数组
 * @returns {number} 基函数值
 */
function 计算B样条基函数(i, k, t, 节点向量) {
    if (k === 1) {
        return (t >= 节点向量[i] && t < 节点向量[i + 1]) ? 1 : 0;
    }

    const 左分母 = 节点向量[i + k - 1] - 节点向量[i];
    const 右分母 = 节点向量[i + k] - 节点向量[i + 1];
    
    let 结果 = 0;
    
    if (左分母 !== 0) {
        结果 += ((t - 节点向量[i]) / 左分母) * 
                计算B样条基函数(i, k - 1, t, 节点向量);
    }
    
    if (右分母 !== 0) {
        结果 += ((节点向量[i + k] - t) / 右分母) * 
                计算B样条基函数(i + 1, k - 1, t, 节点向量);
    }
    
    return 结果;
}

/**
 * 计算B样条曲线上的点
 * @param {Array<{x: number, y: number}>} 控制点数组 - 控制点数组
 * @param {number[]} 节点向量 - 节点向量数组
 * @param {number} 阶数 - B样条曲线的阶数（通常为4，表示3次B样条）
 * @param {number} t - 参数值，范围在[节点向量[阶数-1], 节点向量[控制点数组.length]]之间
 * @returns {{x: number, y: number}} 曲线上的点坐标
 * @example
 * const 控制点 = [{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: -1}, {x: 3, y: 0}];
 * const 节点向量 = [0, 0, 0, 0, 1, 1, 1, 1]; // 均匀B样条的节点向量
 * const 点 = 计算B样条曲线上的点(控制点, 节点向量, 4, 0.5);
 */
export function 计算B样条曲线上的点(控制点数组, 节点向量, 阶数, t) {
    let x = 0, y = 0;
    
    // 计算每个控制点的影响
    for (let i = 0; i < 控制点数组.length; i++) {
        const 基函数值 = 计算B样条基函数(i, 阶数, t, 节点向量);
        x += 控制点数组[i].x * 基函数值;
        y += 控制点数组[i].y * 基函数值;
    }
    
    return { x, y };
}

/**
 * 生成均匀B样条的节点向量
 * @param {number} 控制点数量 - 控制点的数量
 * @param {number} 阶数 - B样条的阶数
 * @returns {number[]} 节点向量数组
 */
export function 生成均匀B样条节点向量(控制点数量, 阶数) {
    const 节点数量 = 控制点数量 + 阶数;
    const 节点向量 = new Array(节点数量);
    
    // 起始节点
    for (let i = 0; i < 阶数; i++) {
        节点向量[i] = 0;
    }
    
    // 中间节点
    for (let i = 阶数; i < 控制点数量; i++) {
        节点向量[i] = i - 阶数 + 1;
    }
    
    // 结束节点
    const 最大值 = 控制点数量 - 阶数 + 1;
    for (let i = 控制点数量; i < 节点数量; i++) {
        节点向量[i] = 最大值;
    }
    
    return 节点向量;
}

/**
 * 生成B样条曲线的离散点集
 * @param {Array<{x: number, y: number}>} 控制点数组 - 控制点数组
 * @param {number} 阶数 - B样条曲线的阶数（通常为4，表示3次B样条）
 * @param {number} 精度 - 生成点的数量
 * @returns {Array<{x: number, y: number}>} 曲线上的点集
 */
export function 生成B样条曲线点集(控制点数组, 阶数 = 4, 精度 = 100) {
    // 生成节点向量
    const 节点向量 = 生成均匀B样条节点向量(控制点数组.length, 阶数);
    
    // 计算参数范围
    const t开始 = 节点向量[阶数 - 1];
    const t结束 = 节点向量[控制点数组.length];
    const t步长 = (t结束 - t开始) / (精度 - 1);
    
    // 生成点集
    const 点集 = [];
    for (let i = 0; i < 精度; i++) {
        const t = t开始 + i * t步长;
        点集.push(计算B样条曲线上的点(控制点数组, 节点向量, 阶数, t));
    }
    
    return 点集;
}