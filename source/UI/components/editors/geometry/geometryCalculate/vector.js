/**
 * 向量加法运算
 * @param {number[]} v1 - 第一个向量
 * @param {number[]} v2 - 第二个向量
 * @returns {number[]} 两个向量对应位置相加的结果
 * @example
 * 加([1, 2], [3, 4]) // 返回 [4, 6]
 */
export const 加 = (v1, v2) => {
    return v1.map((x, i) => x + v2[i]);
};

/**
 * 向量减法运算
 * @param {number[]} v1 - 被减向量
 * @param {number[]} v2 - 减去的向量
 * @returns {number[]} 两个向量对应位置相减的结果
 * @example
 * 减([5, 3], [2, 1]) // 返回 [3, 2]
 */
export const 减 = (v1, v2) => {
    return v1.map((x, i) => x - v2[i]);
};

/**
 * 向量数乘运算
 * @param {number[]} v - 向量
 * @param {number} k - 标量
 * @returns {number[]} 向量的每个分量乘以标量后的结果
 * @example
 * 数乘([1, 2], 3) // 返回 [3, 6]
 */
export const 数乘 = (v, k) => {
    return v.map(x => x * k);
};

/**
 * 计算两个向量的点积
 * @param {number[]} v1 - 第一个向量
 * @param {number[]} v2 - 第二个向量
 * @returns {number} 两个向量的点积
 * @example
 * 点积([1, 2], [3, 4]) // 返回 11
 */
export const 点积 = (v1, v2) => {
    return v1.reduce((sum, x, i) => sum + x * v2[i], 0);
};

/**
 * 计算向量的模长
 * @param {number[]} v - 输入向量
 * @returns {number} 向量的模长
 * @example
 * 模([3, 4]) // 返回 5
 */
export const 模 = (v) => {
    return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
};

/**
 * 向量归一化（单位化）
 * @param {number[]} v - 输入向量
 * @returns {number[]} 归一化后的向量
 * @example
 * 归一([3, 4]) // 返回 [0.6, 0.8]
 */
export const 归一 = (v) => {
    const mod = 模(v);
    return mod === 0 ? v.map(() => 0) : v.map(x => x / mod);
};

/**
 * 创建零向量：指定维度，返回所有分量为0的向量
 * @param {number} dimension - 向量维度
 * @returns {number[]} 指定维度的零向量
 * @example
 * 零(3) // 返回 [0, 0, 0]
 * 零(2) // 返回 [0, 0]
 */
export const 零 = (dimension) => {
    return Array(dimension).fill(0);
};

/**
 * 创建指定维度的单位向量
 * @param {number} dimension - 向量维度
 * @param {number} i - 指定为1的分量位置
 * @returns {number[]} 第i个分量为1，其余为0的单位向量
 * @example
 * 基(3, 1) // 返回 [0, 1, 0]
 */
export const 基 = (dimension, i) => {
    return Array(dimension).fill(0).map((_, index) => index === i ? 1 : 0);
};

/**
 * 创建指定维度的全1向量
 * @param {number} dimension - 向量维度
 * @returns {number[]} 所有分量都为1的向量
 * @example
 * 元(3) // 返回 [1, 1, 1]
 */
export const 元 = (dimension) => {
    return Array(dimension).fill(1);
};

/**
 * 创建值向量：指定维度和值，返回所有分量为该值的向量
 * @param {number} dimension - 向量维度
 * @param {number} value - 向量各分量的值
 * @returns {number[]} 所有分量都为指定值的向量
 * @example
 * 值(3, 2) // 返回 [2, 2, 2]
 */
export const 值 = (dimension, value) => {
    return Array(dimension).fill(value);
};

/**
 * 创建等差向量：从start开始，步长为step，生成dimension维向量
 * @param {number} dimension - 向量维度
 * @param {number} [start=0] - 起始值
 * @param {number} [step=1] - 步长
 * @returns {number[]} 等差数列构成的向量
 * @example
 * 等差(3, 1, 2) // 返回 [1, 3, 5]
 */
export const 等差 = (dimension, start = 0, step = 1) => {
    return Array(dimension).fill(0).map((_, i) => start + i * step);
};

/**
 * Hadamard积：向量对应位置相乘
 * @param {number[]} v1 - 第一个向量
 * @param {number[]} v2 - 第二个向量
 * @returns {number[]} 两个向量对应位置相乘的结果
 * @example
 * 哈达玛积([1, 2, 3], [4, 5, 6]) // 返回 [4, 10, 18]
 */
export const 哈达玛积 = (v1, v2) => {
    return v1.map((x, i) => x * v2[i]);
};

/**
 * 向量对应位置相乘（哈达玛积的别名）
 * @param {number[]} v1 - 第一个向量
 * @param {number[]} v2 - 第二个向量
 * @returns {number[]} 两个向量对应位置相乘的结果
 * @example
 * 逐元积([1, 2, 3], [4, 5, 6]) // 返回 [4, 10, 18]
 */
export const 逐元积 = 哈达玛积;

/**
 * 向量钳制：将向量的每个分量限制在指定范围内
 * @param {number[]} v - 输入向量
 * @param {number[]} min - 最小值向量
 * @param {number[]} max - 最大值向量
 * @returns {number[]} 钳制后的向量
 * @example
 * 钳制([1, 5, 3], [0, 0, 0], [2, 4, 6]) // 返回 [1, 4, 3]
 */
export const 钳制 = (v, min, max) => {
    if (!Array.isArray(v) || !Array.isArray(min) || !Array.isArray(max)) {
        console.error('钳制输入无效:', v, min, max);
        return v;
    }
    return v.map((x, i) => Math.min(Math.max(x, min[i]), max[i]));
};

/**
 * 向量下限：将向量的每个分量限制在最小值以上
 * @param {number[]} v - 输入向量
 * @param {number[]} min - 最小值向量
 * @returns {number[]} 下限钳制后的向量
 * @example
 * 下钳制([1, -1, 0], [0, 0, 0]) // 返回 [1, 0, 0]
 */
export const 下钳制 = (v, min) => {
    if (!Array.isArray(v) || !Array.isArray(min)) {
        console.error('下限输入无效:', v, min);
        return v;
    }
    return v.map((x, i) => Math.max(x, min[i]));
};

/**
 * 向量上限：将向量的每个分量限制在最大值以下
 * @param {number[]} v - 输入向量
 * @param {number[]} max - 最大值向量
 * @returns {number[]} 上限钳制后的向量
 * @example
 * 上钳制([1, 5, 3], [2, 4, 6]) // 返回 [1, 4, 3]
 */
export const 上钳制 = (v, max) => {
    if (!Array.isArray(v) || !Array.isArray(max)) {
        console.error('上限输入无效:', v, max);
        return v;
    }
    return v.map((x, i) => Math.min(x, max[i]));
};

/**
 * 标量版本钳制：使用单个数值作为限制
 * @param {number[]} v - 输入向量
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number[]} 钳制后的向量
 * @example
 * 标量钳制([1, 5, 3], 0, 4) // 返回 [1, 4, 3]
 */
export const 标量钳制 = (v, min, max) => {
    if (!Array.isArray(v)) {
        console.error('标量钳制输入无效:', v);
        return v;
    }
    return v.map(x => Math.min(Math.max(x, min), max));
};

/**
 * 标量下限钳制：使用单个数值作为下限
 * @param {number[]} v - 输入向量
 * @param {number} min - 最小值
 * @returns {number[]} 下限钳制后的向量
 * @example
 * 标量下钳制([1, -1, 0], 0) // 返回 [1, 0, 0]
 */
export const 标量下钳制 = (v, min) => {
    if (!Array.isArray(v)) {
        console.error('标量下限输入无效:', v);
        return v;
    }
    return v.map(x => Math.max(x, min));
};

/**
 * 标量上限钳制：使用单个数值作为上限
 * @param {number[]} v - 输入向量
 * @param {number} max - 最大值
 * @returns {number[]} 上限钳制后的向量
 * @example
 * 标量上钳制([1, 5, 3], 4) // 返回 [1, 4, 3]
 */
export const 标量上钳制 = (v, max) => {
    if (!Array.isArray(v)) {
        console.error('标量上限输入无效:', v);
        return v;
    }
    return v.map(x => Math.min(x, max));
};

/**
 * 区间映射：将向量从一个区间线性映射到另一个区间
 * @param {number[]} v - 输入向量
 * @param {number[]} 源区间开始 - 源区间起始向量
 * @param {number[]} 源区间结束 - 源区间结束向量
 * @param {number[]} 目标区间开始 - 目标区间起始向量
 * @param {number[]} 目标区间结束 - 目标区间结束向量
 * @returns {number[]} 映射后的向量
 * @example
 * 区间映射([5, 5], [0, 0], [10, 10], [0, 0], [100, 100]) // 返回 [50, 50]
 */
export const 区间映射 = (v, 源区间开始, 源区间结束, 目标区间开始, 目标区间结束) => {
    if (!Array.isArray(v) || 
        !Array.isArray(源区间开始) || !Array.isArray(源区间结束) ||
        !Array.isArray(目标区间开始) || !Array.isArray(目标区间结束)) {
        console.error('区间映射输入无效');
        return v;
    }
    return v.map((x, i) => {
        const 源范围 = 源区间结束[i] - 源区间开始[i];
        const 目标范围 = 目标区间结束[i] - 目标区间开始[i];
        const 归一化值 = (x - 源区间开始[i]) / 源范围;
        return 目标区间开始[i] + 归一化值 * 目标范围;
    });
};

/**
 * 向量逐元比较，比较两个向量对应位置的元素是否相等
 * @param {number[]} v1 - 第一个向量
 * @param {number[]} v2 - 第二个向量
 * @returns {boolean[]} 返回布尔向量，表示对应位置的元素是否相等
 * @example
 * 逐元比较([1, 2, 3], [1, 0, 3]) // 返回 [true, false, true]
 */
export const 逐元比较 = (v1, v2) => {
    if (!Array.isArray(v1) || !Array.isArray(v2)) {
        console.error('逐元比较输入无效:', v1, v2);
        return v1;
    }
    return v1.map((x, i) => x === v2[i]);
};

/**
 * 根据条件在两个向量之间进行选择
 * @param {boolean} condition - 选择条件
 * @param {number[]} v1 - 条件为真时选择的向量
 * @param {number[]} v2 - 条件为假时选择的向量
 * @returns {number[]} 根据条件返回选中的向量
 * @example
 * 条件选择(true, [1, 2], [3, 4]) // 返回 [1, 2]
 */
export const 条件选择 = (condition, v1, v2) => {
    return condition ? v1 : v2;
};

/**
 * 基于布尔向量对两个向量进行逐元素选择
 * @param {boolean[]} 条件向量 - 控制选择的布尔向量
 * @param {number[]} v1 - 条件为真时选择的向量
 * @param {number[]} v2 - 条件为假时选择的向量
 * @returns {number[]} 根据条件向量逐元素选择后的新向量
 * @example
 * 逐元选择([true, false], [1, 2], [3, 4]) // 返回 [1, 4]
 */
export const 逐元选择 = (条件向量, v1, v2) => {
    if (!Array.isArray(条件向量) || !Array.isArray(v1) || !Array.isArray(v2)) {
        console.error('逐元选择输入无效:', 条件向量, v1, v2);
        return v1;
    }
    return 条件向量.map((c, i) => c ? v1[i] : v2[i]);
};