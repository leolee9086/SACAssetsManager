/**
 * 最长公共子序列(LCS)算法模块
 * 提供不同实现方式的LCS算法，用于文本比较和合并操作
 */

/**
 * 安全获取Map值的辅助函数
 * @param {Map} map - 要访问的Map
 * @param {any} key - 键
 * @param {any} defaultValue - 默认值
 * @returns {any} 值或默认值
 */
function safeGet(map, key, defaultValue = -1) {
    return map.has(key) ? map.get(key) : defaultValue;
}

/**
 * 计算最长公共子序列 (Myers算法实现)
 * 适用于行级别比较，性能较好
 * 
 * @param {Array} oldItems - 旧序列的项目数组
 * @param {Array} newItems - 新序列的项目数组
 * @returns {Array} 计算的轨迹数组
 */
export function computeLCSMyers(oldItems, newItems) {
    // 增加边界检查
    if (!oldItems || !newItems || !oldItems.length || !newItems.length) {
        return [new Map()];  // 返回一个包含空Map的数组，避免后续处理出错
    }

    // 优化：先处理序列头尾相同的部分，减少计算量
    let startOffset = 0;
    while (startOffset < oldItems.length && 
           startOffset < newItems.length && 
           oldItems[startOffset] === newItems[startOffset]) {
        startOffset++;
    }
    
    if (startOffset === oldItems.length || startOffset === newItems.length) {
        // 一个序列是另一个的前缀
        const trace = [new Map()];
        trace[0].set(0, startOffset);
        return trace;
    }
    
    let oldTrimmed = oldItems.slice(startOffset);
    let newTrimmed = newItems.slice(startOffset);
    
    // 从尾部也处理相同部分
    let endOffset = 0;
    while (endOffset < oldTrimmed.length && 
           endOffset < newTrimmed.length && 
           oldTrimmed[oldTrimmed.length - 1 - endOffset] === 
           newTrimmed[newTrimmed.length - 1 - endOffset]) {
        endOffset++;
    }
    
    if (endOffset > 0) {
        oldTrimmed = oldTrimmed.slice(0, oldTrimmed.length - endOffset);
        newTrimmed = newTrimmed.slice(0, newTrimmed.length - endOffset);
    }

    const oldLen = oldTrimmed.length;
    const newLen = newTrimmed.length;

    // 为提高性能，使用Map存储编辑路径
    const vMap = new Map();
    const snake = (k, x, y) => {
        // 修复：恢复必要的边界检查
        while (x < oldLen && y < newLen && 
               x >= 0 && y >= 0 && 
               oldTrimmed[x] === newTrimmed[y]) {
            x++; y++;
        }
        return [x, y];
    };

    const MAX_EDIT = oldLen + newLen;
    let trace = [];

    // 更严格的初始化 vMap
    vMap.set(1, 0);
    vMap.set(0, 0);
    vMap.set(-1, 0);

    for (let d = 0; d <= MAX_EDIT; d++) {
        trace.push(new Map(vMap));

        for (let k = -d; k <= d; k += 2) {
            let x;

            if (k === -d || (k !== d && safeGet(vMap, k - 1) < safeGet(vMap, k + 1))) {
                x = safeGet(vMap, k + 1, 0);
            } else {
                x = safeGet(vMap, k - 1, 0) + 1;
            }

            let y = x - k;

            // 移动对角线
            [x, y] = snake(k, x, y);

            vMap.set(k, x);

            if (x >= oldLen && y >= newLen) {
                // 修复：正确调整轨迹以同时考虑startOffset和endOffset
                if (startOffset > 0 || endOffset > 0) {
                    // 创建新的轨迹数组，调整所有x值
                    return trace.map(t => {
                        const newT = new Map();
                        t.forEach((v, k) => {
                            // 只对x值加上startOffset，不需要考虑endOffset
                            // 因为我们已经在计算前裁剪了相同的尾部
                            newT.set(k, v + startOffset);
                        });
                        return newT;
                    });
                }
                return trace;
            }
        }
    }

    return trace;
}

/**
 * 从LCS轨迹中回溯生成编辑脚本
 * 
 * @param {Array} trace - LCS计算的轨迹
 * @param {Array} oldItems - 旧序列的项目数组
 * @param {Array} newItems - 新序列的项目数组
 * @returns {Array} 编辑操作数组
 */
export function backtrackLCS(trace, oldItems, newItems) {
    // 增强输入验证
    if (!trace || !trace.length || !oldItems || !newItems) {
        return [];
    }
    
    // 处理空数组特殊情况
    if (oldItems.length === 0) {
        return newItems.map((item, i) => ({
            type: 'add',
            newIndex: i,
            newLine: i + 1,
            text: item
        }));
    }
    
    if (newItems.length === 0) {
        return oldItems.map((item, i) => ({
            type: 'del',
            oldIndex: i,
            oldLine: i + 1,
            text: item
        }));
    }

    const edits = [];
    let x = oldItems.length;
    let y = newItems.length;

    for (let d = trace.length - 1; d >= 0; d--) {
        const vMap = trace[d];
        const k = x - y;

        let prevK, prevX, prevY;

        // 修复: 使用一致的默认值，与safeGet函数保持一致性
        if (k === -d || (k !== d && safeGet(vMap, k - 1) < safeGet(vMap, k + 1))) {
            prevK = k + 1;
        } else {
            prevK = k - 1;
        }

        prevX = safeGet(vMap, prevK, 0);  // 这里使用0更合理，因为索引不应为负
        prevY = prevX - prevK;

        while (x > prevX && y > prevY) {
            edits.unshift({
                type: 'equal',
                oldIndex: x - 1,
                newIndex: y - 1,
                oldLine: x,
                newLine: y,
                text: oldItems[x - 1]
            });
            x--; y--;
        }

        if (d > 0) {
            if (x > prevX) {
                edits.unshift({
                    type: 'del',
                    oldIndex: x - 1,
                    oldLine: x,
                    text: oldItems[x - 1]
                });
                x--;
            } else {
                edits.unshift({
                    type: 'add',
                    newIndex: y - 1,
                    newLine: y,
                    text: newItems[y - 1]
                });
                y--;
            }
        }
    }

    return edits;
}

/**
 * 使用动态规划算法查找最长公共子序列
 * 适用于哈希值或小数据集比较
 * 空间优化版本 - 只使用两行存储
 * 
 * @param {Array} itemsA - 第一个序列的项目数组
 * @param {Array} itemsB - 第二个序列的项目数组
 * @returns {Array} 匹配结果数组，包含二者的索引对应关系
 */
export function findLCSDP(itemsA, itemsB) {
    const m = itemsA.length;
    const n = itemsB.length;
    
    // 空序列快速返回
    if (m === 0 || n === 0) {
        return [];
    }
    
    // 创建两行DP表格，而不是完整矩阵
    let prevRow = new Array(n + 1).fill(0);
    let currRow = new Array(n + 1).fill(0);
    
    // 跟踪每个位置的来源以便回溯
    const directions = Array.from({ length: m }, () => new Array(n));
    
    // 填充DP表格，每次只保留两行
    for (let i = 1; i <= m; i++) {
        // 交换行，重用内存
        [prevRow, currRow] = [currRow, prevRow];
        currRow[0] = 0;
        
        for (let j = 1; j <= n; j++) {
            if (itemsA[i-1] === itemsB[j-1]) {
                currRow[j] = prevRow[j-1] + 1;
                directions[i-1][j-1] = 'diagonal';
            } else if (prevRow[j] >= currRow[j-1]) {
                currRow[j] = prevRow[j];
                directions[i-1][j-1] = 'up';
            } else {
                currRow[j] = currRow[j-1];
                directions[i-1][j-1] = 'left';
            }
        }
    }
    
    // 使用方向矩阵回溯构建结果
    const result = [];
    let i = m - 1, j = n - 1;
    
    while (i >= 0 && j >= 0) {
        if (!directions[i][j]) break;
        
        if (directions[i][j] === 'diagonal') {
            result.unshift({
                aIndex: i,
                bIndex: j,
                value: itemsA[i]
            });
            i--; j--;
        } else if (directions[i][j] === 'up') {
            i--;
        } else {
            j--;
        }
    }
    
    return result;
}

// 修复：优化内存使用的convertDPResultToEdits实现
function convertDPResultToEdits(matches, itemsA, itemsB) {
    const edits = [];
    
    // 处理matches为空的情况
    if (!matches || matches.length === 0) {
        // 全部是删除和添加
        const deletes = itemsA.map((item, i) => ({
            type: 'del',
            oldIndex: i,
            oldLine: i + 1,
            text: item
        }));
        
        const adds = itemsB.map((item, i) => ({
            type: 'add',
            newIndex: i, 
            newLine: i + 1,
            text: item
        }));
        
        return [...deletes, ...adds];
    }
    
    let lastAIndex = -1;
    let lastBIndex = -1;
    
    // 处理每个匹配项
    for (const match of matches) {
        // 处理A中的删除
        for (let i = lastAIndex + 1; i < match.aIndex; i++) {
            edits.push({
                type: 'del',
                oldIndex: i,
                oldLine: i + 1,
                text: itemsA[i]
            });
        }
        
        // 处理B中的添加
        for (let j = lastBIndex + 1; j < match.bIndex; j++) {
            edits.push({
                type: 'add',
                newIndex: j,
                newLine: j + 1,
                text: itemsB[j]
            });
        }
        
        // 添加相等项
        edits.push({
            type: 'equal',
            oldIndex: match.aIndex,
            newIndex: match.bIndex,
            oldLine: match.aIndex + 1,
            newLine: match.bIndex + 1,
            text: match.value
        });
        
        lastAIndex = match.aIndex;
        lastBIndex = match.bIndex;
    }
    
    // 处理剩余的删除项
    for (let i = lastAIndex + 1; i < itemsA.length; i++) {
        edits.push({
            type: 'del',
            oldIndex: i,
            oldLine: i + 1,
            text: itemsA[i]
        });
    }
    
    // 处理剩余的添加项
    for (let j = lastBIndex + 1; j < itemsB.length; j++) {
        edits.push({
            type: 'add',
            newIndex: j,
            newLine: j + 1,
            text: itemsB[j]
        });
    }
    
    // 修复：对edits数组排序，确保按照原始序列顺序输出结果
    return edits.sort((a, b) => {
        // 先按类型排序：删除、相等、添加
        const typeOrder = { 'del': 0, 'equal': 1, 'add': 2 };
        if (typeOrder[a.type] !== typeOrder[b.type]) {
            return typeOrder[a.type] - typeOrder[b.type];
        }
        
        // 同类型按索引排序
        if (a.type === 'del') return a.oldIndex - b.oldIndex;
        if (a.type === 'add') return a.newIndex - b.newIndex;
        return a.oldIndex - b.oldIndex;
    });
}

/**
 * 通用LCS计算接口函数
 * 根据数据规模和类型自动选择最合适的算法
 * 
 * @param {Array} sequenceA - 第一个序列
 * @param {Array} sequenceB - 第二个序列
 * @param {Object} options - 配置选项
 * @returns {Object} LCS结果
 */
export function computeLCS(sequenceA, sequenceB, options = {}) {
    // 增加输入验证和类型转换
    const seqA = Array.isArray(sequenceA) ? sequenceA : [];
    const seqB = Array.isArray(sequenceB) ? sequenceB : [];
    
    if (!Array.isArray(sequenceA) || !Array.isArray(sequenceB)) {
        return { error: '输入必须是数组', length: 0, edits: [] };
    }
    
    // 特殊情况处理：两个空数组
    if (seqA.length === 0 && seqB.length === 0) {
        return {
            algorithm: 'identical',
            length: 0,
            edits: []
        };
    }
    
    // 快速处理：完全相同的序列
    if (seqA.length === seqB.length && 
        seqA.every((val, idx) => val === seqB[idx])) {
        return {
            algorithm: 'identical',
            length: seqA.length,
            edits: seqA.map((text, idx) => ({
                type: 'equal',
                oldIndex: idx,
                newIndex: idx,
                oldLine: idx + 1,
                newLine: idx + 1,
                text
            }))
        };
    }
    
    const {
        algorithm = 'auto',  // 'auto', 'myers', 'dp'
        maxSize = 1000       // 当超过此大小时，默认使用Myers算法
    } = options;
    
    // 自动选择算法
    let selectedAlgorithm = algorithm;
    if (algorithm === 'auto') {
        // 对于大数据集，Myers算法通常更高效
        if (seqA.length > maxSize || seqB.length > maxSize) {
            selectedAlgorithm = 'myers';
        } else {
            selectedAlgorithm = 'dp';
        }
    }
    
    // 统一返回结构
    const result = { algorithm: selectedAlgorithm };
    
    try {
        // 修复：添加超时保护
        const startTime = Date.now();
        const TIMEOUT = options.timeout || 10000; // 默认10秒超时
        
        const checkTimeout = () => {
            if (Date.now() - startTime > TIMEOUT) {
                throw new Error('计算超时，输入可能过大或过于复杂');
            }
        };
        
        if (selectedAlgorithm === 'myers') {
            // 每处理一定数量的编辑步骤检查一次超时
            let checkCounter = 0;
            const trace = computeLCSMyers(seqA, seqB);
            if (++checkCounter % 100 === 0) checkTimeout();
            
            // 添加安全检查
            if (!trace || !Array.isArray(trace)) {
                throw new Error('无效的轨迹结果');
            }
            const edits = backtrackLCS(trace, seqA, seqB);
            result.trace = trace;
            result.edits = edits;
            result.length = edits.filter(edit => edit.type === 'equal').length;
        } else { // 'dp'
            const matches = findLCSDP(seqA, seqB);
            result.matches = matches;
            // 转换为统一的edits格式
            result.edits = convertDPResultToEdits(matches, seqA, seqB);
            result.length = matches.length;
            checkTimeout(); // DP算法完成后检查一次超时
        }
    } catch (error) {
        // 增加错误处理，保证即使算法失败也返回一致的结构
        result.error = `算法执行错误: ${error.message}`;
        result.edits = [];
        result.length = 0;
    }
    
    return result;
}
