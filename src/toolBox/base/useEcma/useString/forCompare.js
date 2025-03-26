/***
 * 用于文本比较的模块,需要实现类似git的diff算法等等,最终要求是实现能够高性能完成复杂文本diff的算法
*/

/**
 * 使用Myers差分算法实现的git风格差异比较
 * @param {string} oldText - 旧文本
 * @param {string} newText - 新文本
 * @param {Object} options - 配置选项
 * @returns {string} - 差异结果
 */
export function gitLikeDiff({ oldText, newText, options = {} }) {
    const {
        contextLines = 3,
        ignoreWhitespace = false,
        showLineNumbers = true,
        outputFormat = 'text',
        showInlineDiff = false,
        colorOutput = false
    } = options;

    const [oldLines, newLines] = preprocessTexts(oldText, newText, ignoreWhitespace);
    const hunks = computeHunks(oldLines, newLines, contextLines);
    const result = formatHunks(hunks, { showLineNumbers, outputFormat, showInlineDiff, colorOutput });

    return result;
}

/**
 * 预处理文本，将其分割为行并应用空白处理
 */
function preprocessTexts(oldText, newText, ignoreWhitespace) {
    const preprocess = (text) => ignoreWhitespace
        ? text.replace(/\s+/g, ' ').trim()
        : text;
    return [
        oldText.split('\n').map(preprocess),
        newText.split('\n').map(preprocess)
    ];
}

/**
 * 计算最长公共子序列 (Myers算法)
 */
function computeLCS(oldLines, newLines) {
    const oldLen = oldLines.length;
    const newLen = newLines.length;

    // 为提高性能，使用Map存储编辑路径
    const vMap = new Map();
    const snake = (k, x, y) => {
        while (x < oldLen && y < newLen && oldLines[x] === newLines[y]) {
            x++; y++;
        }
        return [x, y];
    };

    const MAX_EDIT = oldLen + newLen;
    let trace = [];

    vMap.set(1, 0);

    for (let d = 0; d <= MAX_EDIT; d++) {
        trace.push(new Map(vMap));

        for (let k = -d; k <= d; k += 2) {
            let x;

            if (k === -d || (k !== d && vMap.get(k - 1) < vMap.get(k + 1))) {
                x = vMap.get(k + 1);
            } else {
                x = vMap.get(k - 1) + 1;
            }

            let y = x - k;

            // 移动对角线
            [x, y] = snake(k, x, y);

            vMap.set(k, x);

            if (x >= oldLen && y >= newLen) {
                return trace;
            }
        }
    }

    return trace;
}

/**
 * 从LCS轨迹中生成编辑脚本
 */
function backtrackLCS(trace, oldLines, newLines) {
    const edits = [];
    let x = oldLines.length;
    let y = newLines.length;

    for (let d = trace.length - 1; d >= 0; d--) {
        const vMap = trace[d];
        const k = x - y;

        let prevK, prevX, prevY;

        if (k === -d || (k !== d && vMap.get(k - 1) < vMap.get(k + 1))) {
            prevK = k + 1;
        } else {
            prevK = k - 1;
        }

        prevX = vMap.get(prevK);
        prevY = prevX - prevK;

        while (x > prevX && y > prevY) {
            edits.unshift({
                type: 'equal',
                oldIndex: x - 1,
                newIndex: y - 1,
                oldLine: x,
                newLine: y,
                text: oldLines[x - 1]
            });
            x--; y--;
        }

        if (d > 0) {
            if (x > prevX) {
                edits.unshift({
                    type: 'del',
                    oldIndex: x - 1,
                    oldLine: x,
                    text: oldLines[x - 1]
                });
                x--;
            } else {
                edits.unshift({
                    type: 'add',
                    newIndex: y - 1,
                    newLine: y,
                    text: newLines[y - 1]
                });
                y--;
            }
        }
    }

    return edits;
}

/**
 * 计算差异并组织成hunks
 */
function computeHunks(oldLines, newLines, contextLines) {
    const { trace, edits } = computeLCS(oldLines, newLines, { algorithm: 'myers' });
    const hunks = [];

    let hunk = null;
    let hunkStart = 0;

    for (let i = 0; i < edits.length; i++) {
        const edit = edits[i];

        if (edit.type !== 'equal') {
            // 如果当前没有活动的hunk，创建一个新的
            if (hunk === null) {
                const hunkStartIndex = Math.max(0, i - contextLines);
                hunkStart = hunkStartIndex;
                hunk = {
                    oldStart: edits[hunkStartIndex].oldLine || 0,
                    newStart: edits[hunkStartIndex].newLine || 0,
                    oldCount: 0,
                    newCount: 0,
                    edits: []
                };
            }

            // 当前不是相等行，需要添加到hunk
            hunk.edits.push(edit);
            if (edit.type === 'del' || edit.type === 'equal') hunk.oldCount++;
            if (edit.type === 'add' || edit.type === 'equal') hunk.newCount++;
        } else if (hunk !== null) {
            // 这是一个相等行，但我们有一个活动的hunk
            hunk.edits.push(edit);
            hunk.oldCount++;
            hunk.newCount++;

            // 判断是否需要关闭当前hunk
            const nextNonEqualIndex = findNextNonEqual(edits, i);
            if (nextNonEqualIndex === -1 || nextNonEqualIndex - i > contextLines * 2) {
                // 添加后续上下文行
                const contextEndIndex = Math.min(i + contextLines, edits.length - 1);
                for (let j = i + 1; j <= contextEndIndex; j++) {
                    hunk.edits.push(edits[j]);
                    hunk.oldCount++;
                    hunk.newCount++;
                }

                hunks.push(hunk);
                hunk = null;
                i = contextEndIndex;
            }
        }
    }

    // 如果还有未完成的hunk，添加到结果中
    if (hunk !== null) {
        hunks.push(hunk);
    }

    return hunks;
}

/**
 * 查找下一个非相等行的索引
 */
function findNextNonEqual(edits, startIndex) {
    for (let i = startIndex + 1; i < edits.length; i++) {
        if (edits[i].type !== 'equal') {
            return i;
        }
    }
    return -1;
}

/**
 * 格式化hunks为最终输出
 */
function formatHunks(hunks, options) {
    const { showLineNumbers, outputFormat, showInlineDiff, colorOutput } = options;

    if (outputFormat === 'json') {
        return hunks;
    }

    const result = [];

    for (const hunk of hunks) {
        const header = `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`;
        result.push(header);

        for (const edit of hunk.edits) {
            let prefix = '';
            let content = edit.text;

            if (edit.type === 'add') {
                prefix = '+';
                if (colorOutput && outputFormat === 'text') {
                    content = `\x1b[32m${content}\x1b[0m`;
                }
            } else if (edit.type === 'del') {
                prefix = '-';
                if (colorOutput && outputFormat === 'text') {
                    content = `\x1b[31m${content}\x1b[0m`;
                }
            } else {
                prefix = ' ';
            }

            let line = prefix;
            if (showLineNumbers) {
                if (edit.type === 'add') {
                    line += `    ${edit.newLine}\t`;
                } else if (edit.type === 'del') {
                    line += `${edit.oldLine}    \t`;
                } else {
                    line += `${edit.oldLine},${edit.newLine}\t`;
                }
            }
            line += content;

            if (outputFormat === 'html') {
                line = `<div class="diff-${edit.type}">${line}</div>`;
            }

            result.push(line);
        }
    }

    if (outputFormat === 'html') {
        return `<div class="diff-content">${result.join('')}</div>`;
    }

    return result.join('\n');
}

/**
 * 比较行内差异
 * @param {string} oldLine - 旧行
 * @param {string} newLine - 新行
 * @returns {Object} - 差异标记
 */
export function compareLineContent(oldLine, newLine) {
    const MAX_CHAR = 1000; // 避免过长文本处理时性能问题

    if (oldLine === newLine) return { old: oldLine, new: newLine };
    if (!oldLine) return { old: '', new: newLine };
    if (!newLine) return { old: oldLine, new: '' };

    // 截断过长文本
    const safeOldLine = oldLine.length > MAX_CHAR ? oldLine.substring(0, MAX_CHAR) + '...' : oldLine;
    const safeNewLine = newLine.length > MAX_CHAR ? newLine.substring(0, MAX_CHAR) + '...' : newLine;

    // 简单字符级别diff
    const oldChars = [...safeOldLine];
    const newChars = [...safeNewLine];

    // 使用LCS算法找出共同字符序列
    const matrix = Array(oldChars.length + 1).fill().map(() => Array(newChars.length + 1).fill(0));

    for (let i = 1; i <= oldChars.length; i++) {
        for (let j = 1; j <= newChars.length; j++) {
            if (oldChars[i - 1] === newChars[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1] + 1;
            } else {
                matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
            }
        }
    }

    // 回溯找出差异
    const oldMarked = [], newMarked = [];
    let i = oldChars.length, j = newChars.length;

    while (i > 0 && j > 0) {
        if (oldChars[i - 1] === newChars[j - 1]) {
            oldMarked.unshift(oldChars[i - 1]);
            newMarked.unshift(newChars[j - 1]);
            i--; j--;
        } else if (matrix[i - 1][j] > matrix[i][j - 1]) {
            oldMarked.unshift(`[-${oldChars[i - 1]}-]`);
            i--;
        } else {
            newMarked.unshift(`{+${newChars[j - 1]}+}`);
            j--;
        }
    }

    while (i > 0) {
        oldMarked.unshift(`[-${oldChars[i - 1]}-]`);
        i--;
    }

    while (j > 0) {
        newMarked.unshift(`{+${newChars[j - 1]}+}`);
        j--;
    }

    return {
        old: oldMarked.join(''),
        new: newMarked.join('')
    };
}

/**
 * 优化文本比较，使用更高效的字典树检测重复内容
 * @param {string} oldText - 旧文本
 * @param {string} newText - 新文本
 * @returns {Object} - 优化后的文本比较结果
 */
export function optimizedTextDiff(oldText, newText) {
    // 对于非常长的文本，先进行分块处理
    if (oldText.length > 10000 || newText.length > 10000) {
        return chunkedTextDiff(oldText, newText);
    }

    return gitLikeDiff({ oldText, newText });
}

/**
 * 对大文本进行分块处理
 */
function chunkedTextDiff(oldText, newText) {
    const CHUNK_SIZE = 5000;
    const oldChunks = [];
    const newChunks = [];

    // 分块
    for (let i = 0; i < oldText.length; i += CHUNK_SIZE) {
        oldChunks.push(oldText.substring(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < newText.length; i += CHUNK_SIZE) {
        newChunks.push(newText.substring(i, i + CHUNK_SIZE));
    }

    // 先比较块级别差异，再细化到行级别
    const results = [];

    for (let i = 0; i < Math.max(oldChunks.length, newChunks.length); i++) {
        const oldChunk = i < oldChunks.length ? oldChunks[i] : '';
        const newChunk = i < newChunks.length ? newChunks[i] : '';

        if (oldChunk === newChunk) {
            // 块相同，跳过详细比较
            results.push({
                type: 'equal',
                content: oldChunk
            });
        } else {
            // 块不同，进行行级比较
            results.push(gitLikeDiff({
                oldText: oldChunk,
                newText: newChunk,
                options: {
                    contextLines: 1,
                    outputFormat: 'json'
                }
            }));
        }
    }

    // 合并结果
    return {
        chunked: true,
        chunks: results
    };
}

/**
 * 多文本源比较函数
 * @param {Array<string>} textSources - 待比较的多个文本源
 * @param {Object} options - 配置选项
 * @returns {Object} - 比较结果
 */
export function multiSourceDiff(textSources, options = {}) {
    if (!Array.isArray(textSources) || textSources.length < 2) {
        return { error: "至少需要两个文本源进行比较" };
    }
    
    const {
        contextLines = 3,
        ignoreWhitespace = false,
        showLineNumbers = true,
        outputFormat = 'text',
        colorOutput = false,
        baseSourceIndex = 0  // 基准文本源索引
    } = options;

    // 预处理所有文本源
    const processedSources = textSources.map(
        text => text.split('\n').map(line => 
            ignoreWhitespace ? line.replace(/\s+/g, ' ').trim() : line
        )
    );
    
    // 以基准文本源为参照进行比较
    const baseSource = processedSources[baseSourceIndex];
    const comparisons = [];
    
    for (let i = 0; i < textSources.length; i++) {
        if (i === baseSourceIndex) continue;
        
        const comparisonResult = compareSourcePair(
            baseSource, 
            processedSources[i], 
            { ...options, sourceIndex: i }
        );
        
        comparisons.push(comparisonResult);
    }
    
    // 合并比较结果
    return formatMultiSourceResults(comparisons, textSources, options);
}

/**
 * 比较两个文本源并返回结果
 * @private
 */
function compareSourcePair(source1, source2, options) {
    const { trace, edits } = computeLCS(source1, source2, { algorithm: 'myers' });
    const hunks = computeHunks(source1, source2, options.contextLines);
    
    return {
        sourceIndex: options.sourceIndex,
        hunks,
        edits
    };
}

/**
 * 格式化多文本源比较结果
 * @private
 */
function formatMultiSourceResults(comparisons, textSources, options) {
    const { outputFormat, baseSourceIndex } = options;
    
    if (outputFormat === 'json') {
        return {
            baseSource: baseSourceIndex,
            sources: textSources.length,
            comparisons
        };
    }
    
    // 文本格式输出
    const result = [];
    result.push(`基准文本: 源 #${baseSourceIndex + 1}`);
    result.push(`共比较 ${textSources.length} 个文本源`);
    result.push('');
    
    comparisons.forEach(comparison => {
        result.push(`=== 源 #${comparison.sourceIndex + 1} 与基准文本比较 ===`);
        
        comparison.hunks.forEach(hunk => {
            const formattedHunk = formatHunk(hunk, options);
            result.push(formattedHunk);
        });
        
        result.push('');
    });
    
    return result.join('\n');
}

/**
 * 格式化单个比较块
 * @private
 */
function formatHunk(hunk, options) {
    // 复用现有的格式化逻辑
    const singleHunkFormat = formatHunks([hunk], options);
    return singleHunkFormat;
}

/**
 * 多文本源优化比较
 * @param {Array<string>} textSources - 待比较的多个文本源
 * @param {Object} options - 配置选项
 * @returns {Object} - 比较结果
 */
export function optimizedMultiSourceDiff(textSources, options = {}) {
    // 对于大文本进行优化处理
    const isLargeText = textSources.some(text => text.length > 10000);
    
    if (isLargeText) {
        return chunkedMultiSourceDiff(textSources, options);
    }
    
    return multiSourceDiff(textSources, options);
}

/**
 * 分块处理多文本源比较
 * @private
 */
function chunkedMultiSourceDiff(textSources, options) {
    const CHUNK_SIZE = 5000;
    const chunks = textSources.map(text => {
        const textChunks = [];
        for (let i = 0; i < text.length; i += CHUNK_SIZE) {
            textChunks.push(text.substring(i, i + CHUNK_SIZE));
        }
        return textChunks;
    });
    
    // 计算最大块数
    const maxChunks = Math.max(...chunks.map(c => c.length));
    const results = [];
    
    // 逐块比较
    for (let i = 0; i < maxChunks; i++) {
        const currentChunks = chunks.map(sourceChunks => 
            i < sourceChunks.length ? sourceChunks[i] : ''
        );
        
        // 检查所有块是否相同
        const allEqual = currentChunks.every(chunk => chunk === currentChunks[0]);
        
        if (allEqual && currentChunks[0] !== '') {
            results.push({
                type: 'equal',
                content: currentChunks[0],
                chunkIndex: i
            });
        } else {
            // 块不同，进行详细比较
            results.push({
                type: 'diff',
                content: multiSourceDiff(currentChunks, {
                    ...options,
                    contextLines: 1,
                    outputFormat: 'json'
                }),
                chunkIndex: i
            });
        }
    }
    
    return {
        chunked: true,
        chunks: results
    };
}

/**
 * 查找多文本源中的共同内容
 * @param {Array<string>} textSources - 多个文本源
 * @returns {Object} - 共同内容信息
 */
export function findCommonContent(textSources) {
    if (!Array.isArray(textSources) || textSources.length < 2) {
        return { error: "至少需要两个文本源" };
    }
    
    // 将所有文本分割为行
    const sourcesLines = textSources.map(text => text.split('\n'));
    
    // 查找所有源中都存在的行
    const commonLines = [];
    const firstSourceLines = sourcesLines[0];
    
    for (const line of firstSourceLines) {
        if (sourcesLines.every(sourceLines => sourceLines.includes(line))) {
            commonLines.push(line);
        }
    }
    
    return {
        commonLineCount: commonLines.length,
        commonLines,
        commonContent: commonLines.join('\n')
    };
}