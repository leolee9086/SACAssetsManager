/***
 * 增强版行级文本合并模块，支持复杂编辑历史和元数据
 */

/**
 * 增强版三向合并
 * @param {Object} base 原始文本及其元数据
 * @param {Object} local 本地修改文本及其元数据
 * @param {Object} remote 远程修改文本及其元数据
 * @param {Object} options 合并选项
 * @returns {Object} 合并结果及冲突信息
 */
export function enhancedThreeWayMerge(base, local, remote, options = {}) {
    const {
        conflictMarker = '>>>>',
        ignoreWhitespace = false,
        lineEnding = '\n',
        trackLineHistory = true,  // 是否跟踪行历史
        maxHistoryDepth = 5       // 最大历史记录深度
    } = options;

    // 预处理文本并提取元数据
    const baseData = preprocessText(base, ignoreWhitespace, trackLineHistory);
    const localData = preprocessText(local, ignoreWhitespace, trackLineHistory);
    const remoteData = preprocessText(remote, ignoreWhitespace, trackLineHistory);

    // 使用增强差异算法
    const localDiffs = computeEnhancedDiffs(baseData, localData);
    const remoteDiffs = computeEnhancedDiffs(baseData, remoteData);

    // 执行合并并返回结果对象
    return performEnhancedMerge(
        baseData,
        localData,
        remoteData,
        localDiffs,
        remoteDiffs,
        options
    );
}

/**
 * 增强的文本预处理
 */
function preprocessText(textObj, ignoreWhitespace, trackHistory) {
    const { content, metadata = {}, timestamps = {} } = textObj;
    const lines = content ? content.split(/\r?\n/) : [];
    
    return {
        lines: ignoreWhitespace 
            ? lines.map(line => line.replace(/\s+/g, ' ').trim())
            : lines,
        metadata,
        timestamps,
        lineHistory: trackHistory 
            ? lines.map((line, i) => ({
                content: line,
                versions: [{
                    content: line,
                    timestamp: timestamps[i] || Date.now(),
                    author: metadata.author || 'unknown'
                }]
            }))
            : null
    };
}

/**
 * 增强的差异计算算法
 */
function computeEnhancedDiffs(baseData, modifiedData) {
    const diffs = [];
    const baseLines = baseData.lines;
    const modifiedLines = modifiedData.lines;
    let i = 0, j = 0;

    // 使用基于内容的哈希加速比较
    const baseHashes = baseLines.map(line => hashLine(line));
    const modifiedHashes = modifiedLines.map(line => hashLine(line));

    while (i < baseLines.length || j < modifiedLines.length) {
        if (i < baseLines.length && j < modifiedLines.length && baseHashes[i] === modifiedHashes[j]) {
            diffs.push({
                type: 'equal',
                baseLine: i+1,
                modifiedLine: j+1,
                hash: baseHashes[i]
            });
            i++;
            j++;
        } else {
            // 使用LCS(最长公共子序列)算法处理复杂变更
            const lcs = findLCS(baseHashes.slice(i), modifiedHashes.slice(j));
            if (lcs.length > 0) {
                // 处理LCS之前的不同部分
                for (let k = 0; k < lcs[0].baseIndex; k++) {
                    diffs.push({
                        type: 'del',
                        baseLine: i+k+1,
                        hash: baseHashes[i+k]
                    });
                }
                for (let k = 0; k < lcs[0].modifiedIndex; k++) {
                    diffs.push({
                        type: 'add',
                        modifiedLine: j+k+1,
                        text: modifiedLines[j+k],
                        hash: modifiedHashes[j+k]
                    });
                }
                // 处理LCS部分
                for (const match of lcs) {
                    diffs.push({
                        type: 'equal',
                        baseLine: i+match.baseIndex+1,
                        modifiedLine: j+match.modifiedIndex+1,
                        hash: match.hash
                    });
                }
                i += lcs[0].baseIndex + lcs.length;
                j += lcs[0].modifiedIndex + lcs.length;
            } else {
                // 没有LCS，处理剩余所有行
                while (j < modifiedLines.length) {
                    diffs.push({
                        type: 'add',
                        modifiedLine: j+1,
                        text: modifiedLines[j],
                        hash: modifiedHashes[j]
                    });
                    j++;
                }
                while (i < baseLines.length) {
                    diffs.push({
                        type: 'del',
                        baseLine: i+1,
                        hash: baseHashes[i]
                    });
                    i++;
                }
            }
        }
    }

    return diffs;
}

/**
 * 执行增强合并
 */
function performEnhancedMerge(baseData, localData, remoteData, localDiffs, remoteDiffs, options) {
    const result = {
        content: [],
        conflicts: [],
        lineMeta: [],
        stats: {
            totalLines: 0,
            conflictLines: 0,
            localChanges: 0,
            remoteChanges: 0
        }
    };

    // 使用基于哈希的合并策略
    const baseHashes = baseData.lines.map(line => hashLine(line));
    const localHashes = localData.lines.map(line => hashLine(line));
    const remoteHashes = remoteData.lines.map(line => hashLine(line));

    // 创建行映射表
    const lineMap = createLineMap(baseHashes, localHashes, remoteHashes);

    // 执行合并
    for (const mapEntry of lineMap) {
        const { baseHash, localHash, remoteHash } = mapEntry;
        const baseLine = mapEntry.baseIndex !== undefined ? baseData.lines[mapEntry.baseIndex] : null;
        const localLine = mapEntry.localIndex !== undefined ? localData.lines[mapEntry.localIndex] : null;
        const remoteLine = mapEntry.remoteIndex !== undefined ? remoteData.lines[mapEntry.remoteIndex] : null;

        // 判断合并情况
        if (localHash === remoteHash) {
            addMergedLine(result, localLine || remoteLine, 'both');
        } else if (localHash === baseHash) {
            addMergedLine(result, remoteLine, 'remote');
            result.stats.remoteChanges++;
        } else if (remoteHash === baseHash) {
            addMergedLine(result, localLine, 'local');
            result.stats.localChanges++;
        } else {
            // 冲突处理
            handleConflict(result, localLine, remoteLine, options);
            result.stats.conflictLines++;
        }
        result.stats.totalLines++;
    }

    // 合并行历史（如果启用）
    if (baseData.lineHistory) {
        result.lineHistory = mergeLineHistories(
            baseData.lineHistory,
            localData.lineHistory,
            remoteData.lineHistory,
            lineMap,
            options.maxHistoryDepth
        );
    }

    // 生成最终内容
    result.content = result.content.join(options.lineEnding);
    return result;
}

/**
 * 行内容哈希函数
 */
function hashLine(line) {
    // 使用简单的哈希算法，实际应用中可以使用更复杂的算法
    if (!line) return 0;
    let hash = 0;
    for (let i = 0; i < line.length; i++) {
        hash = ((hash << 5) - hash) + line.charCodeAt(i);
        hash |= 0; // 转换为32位整数
    }
    return hash;
}

/**
 * 查找最长公共子序列(LCS)
 */
function findLCS(baseHashes, modifiedHashes) {
    const result = findLCSDP(baseHashes, modifiedHashes);
    
    // 转换结果格式以兼容原始代码
    return result.map(match => ({
        baseIndex: match.aIndex,
        modifiedIndex: match.bIndex,
        hash: match.value
    }));
}

/**
 * 创建行映射表，建立三个版本间的行对应关系
 * @param {Array} baseHashes 原始文本行的哈希数组
 * @param {Array} localHashes 本地修改文本行的哈希数组 
 * @param {Array} remoteHashes 远程修改文本行的哈希数组
 * @returns {Array} 行映射表，包含每个行的三版本对应关系
 */
function createLineMap(baseHashes, localHashes, remoteHashes) {
    const lineMap = [];
    
    // 创建哈希到索引的映射表
    const createHashIndexMap = (hashes) => {
        const map = new Map();
        hashes.forEach((hash, index) => {
            if (!map.has(hash)) {
                map.set(hash, []);
            }
            map.get(hash).push(index);
        });
        return map;
    };

    const baseMap = createHashIndexMap(baseHashes);
    const localMap = createHashIndexMap(localHashes);
    const remoteMap = createHashIndexMap(remoteHashes);

    // 合并所有唯一哈希值
    const allHashes = new Set([
        ...baseHashes,
        ...localHashes,
        ...remoteHashes
    ]);

    // 构建行映射表
    for (const hash of allHashes) {
        const baseIndices = baseMap.get(hash) || [];
        const localIndices = localMap.get(hash) || [];
        const remoteIndices = remoteMap.get(hash) || [];

        // 处理所有可能的组合情况
        const maxLength = Math.max(
            baseIndices.length,
            localIndices.length,
            remoteIndices.length
        );

        for (let i = 0; i < maxLength; i++) {
            lineMap.push({
                baseHash: hash,
                localHash: hash,
                remoteHash: hash,
                baseIndex: baseIndices[i] !== undefined ? baseIndices[i] : undefined,
                localIndex: localIndices[i] !== undefined ? localIndices[i] : undefined,
                remoteIndex: remoteIndices[i] !== undefined ? remoteIndices[i] : undefined
            });
        }
    }

    // 按原始顺序排序
    lineMap.sort((a, b) => {
        const aIndex = a.baseIndex !== undefined ? a.baseIndex : 
                      a.localIndex !== undefined ? a.localIndex : a.remoteIndex;
        const bIndex = b.baseIndex !== undefined ? b.baseIndex : 
                      b.localIndex !== undefined ? b.localIndex : b.remoteIndex;
        return aIndex - bIndex;
    });

    return lineMap;
}

/**
 * 添加合并后的行到结果中
 * @param {Object} result 合并结果对象
 * @param {string} line 要添加的行内容
 * @param {string} source 行来源('local'|'remote'|'both')
 */
function addMergedLine(result, line, source) {
    // 添加行内容
    result.content.push(line || '');  // 处理可能的null/undefined
    
    // 记录行元数据
    result.lineMeta.push({
        source,
        timestamp: Date.now(),
        // 可以根据需要添加更多元数据
        // 例如: author, changeType等
    });
}

/**
 * 处理合并冲突
 * @param {Object} result 合并结果对象
 * @param {string} localLine 本地修改的行内容
 * @param {string} remoteLine 远程修改的行内容 
 * @param {Object} options 合并选项
 */
function handleConflict(result, localLine, remoteLine, options) {
    const { conflictMarker = '>>>>' } = options;
    
    // 添加冲突标记和本地修改
    result.content.push(`${conflictMarker} LOCAL`);
    result.content.push(localLine || '');
    
    // 添加冲突标记和远程修改
    result.content.push(`${conflictMarker} REMOTE`);
    result.content.push(remoteLine || '');
    
    // 添加冲突结束标记
    result.content.push(`${conflictMarker} END`);
    
    // 记录冲突元数据
    result.conflicts.push({
        localLine: localLine || '',
        remoteLine: remoteLine || '',
        lineNumber: result.content.length, // 冲突在结果中的行号
        resolved: false, // 标记是否已解决
        timestamp: Date.now()
    });
}

/**
 * 合并行历史记录
 * @param {Array} baseHistory 原始文本的行历史
 * @param {Array} localHistory 本地修改的行历史
 * @param {Array} remoteHistory 远程修改的行历史
 * @param {Array} lineMap 行映射表
 * @param {number} maxDepth 最大历史记录深度
 * @returns {Array} 合并后的行历史记录
 */
function mergeLineHistories(baseHistory, localHistory, remoteHistory, lineMap, maxDepth) {
    const mergedHistory = [];
    
    for (const mapEntry of lineMap) {
        const { baseIndex, localIndex, remoteIndex } = mapEntry;
        const entryHistory = {
            content: '',
            versions: []
        };

        // 收集所有版本的历史记录
        if (baseIndex !== undefined && baseHistory[baseIndex]) {
            entryHistory.versions.push(...baseHistory[baseIndex].versions);
        }
        if (localIndex !== undefined && localHistory[localIndex]) {
            entryHistory.versions.push(...localHistory[localIndex].versions);
        }
        if (remoteIndex !== undefined && remoteHistory[remoteIndex]) {
            entryHistory.versions.push(...remoteHistory[remoteIndex].versions);
        }

        // 按时间戳排序并限制历史深度
        entryHistory.versions.sort((a, b) => b.timestamp - a.timestamp);
        if (maxDepth > 0 && entryHistory.versions.length > maxDepth) {
            entryHistory.versions = entryHistory.versions.slice(0, maxDepth);
        }

        // 设置当前内容
        if (entryHistory.versions.length > 0) {
            entryHistory.content = entryHistory.versions[0].content;
        }

        mergedHistory.push(entryHistory);
    }

    return mergedHistory;
}

/**
 * 增强版双向合并
 * @param {Object} local 本地修改文本及其元数据
 * @param {Object} remote 远程修改文本及其元数据 
 * @param {Object} options 合并选项
 * @returns {Object} 合并结果及冲突信息
 */
export function enhancedTwoWayMerge(local, remote, options = {}) {
    const {
        conflictMarker = '>>>>',
        ignoreWhitespace = false,
        lineEnding = '\n',
        trackLineHistory = true,
        maxHistoryDepth = 5
    } = options;

    // 预处理文本
    const localData = preprocessText(local, ignoreWhitespace, trackLineHistory);
    const remoteData = preprocessText(remote, ignoreWhitespace, trackLineHistory);

    // 计算差异
    const localHashes = localData.lines.map(hashLine);
    const remoteHashes = remoteData.lines.map(hashLine);
    
    // 创建行映射表(简化版)
    const lineMap = [];
    const allHashes = new Set([...localHashes, ...remoteHashes]);
    
    for (const hash of allHashes) {
        const localIndices = localHashes.reduce((arr, h, i) => h === hash ? [...arr, i] : arr, []);
        const remoteIndices = remoteHashes.reduce((arr, h, i) => h === hash ? [...arr, i] : arr, []);
        
        const maxLength = Math.max(localIndices.length, remoteIndices.length);
        for (let i = 0; i < maxLength; i++) {
            lineMap.push({
                localHash: hash,
                remoteHash: hash,
                localIndex: localIndices[i] !== undefined ? localIndices[i] : undefined,
                remoteIndex: remoteIndices[i] !== undefined ? remoteIndices[i] : undefined
            });
        }
    }

    // 按原始顺序排序
    lineMap.sort((a, b) => {
        const aIndex = a.localIndex !== undefined ? a.localIndex : a.remoteIndex;
        const bIndex = b.localIndex !== undefined ? b.localIndex : b.remoteIndex;
        return aIndex - bIndex;
    });

    // 执行合并
    const result = {
        content: [],
        conflicts: [],
        lineMeta: [],
        stats: {
            totalLines: 0,
            conflictLines: 0,
            localChanges: 0,
            remoteChanges: 0
        }
    };

    for (const mapEntry of lineMap) {
        const { localHash, remoteHash } = mapEntry;
        const localLine = mapEntry.localIndex !== undefined ? localData.lines[mapEntry.localIndex] : null;
        const remoteLine = mapEntry.remoteIndex !== undefined ? remoteData.lines[mapEntry.remoteIndex] : null;

        if (localHash === remoteHash) {
            addMergedLine(result, localLine || remoteLine, 'both');
        } else if (localLine && !remoteLine) {
            addMergedLine(result, localLine, 'local');
            result.stats.localChanges++;
        } else if (remoteLine && !localLine) {
            addMergedLine(result, remoteLine, 'remote');
            result.stats.remoteChanges++;
        } else {
            handleConflict(result, localLine, remoteLine, options);
            result.stats.conflictLines++;
        }
        result.stats.totalLines++;
    }

    // 合并行历史(如果启用)
    if (localData.lineHistory && remoteData.lineHistory) {
        result.lineHistory = mergeLineHistories(
            [], // 双向合并没有base历史
            localData.lineHistory,
            remoteData.lineHistory,
            lineMap,
            maxHistoryDepth
        );
    }

    // 生成最终内容
    result.content = result.content.join(options.lineEnding);
    return result;
}