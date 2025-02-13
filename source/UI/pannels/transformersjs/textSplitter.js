// 定义标点符号和分隔符
const PUNCTUATION = {
    sentence: /(?<=[。.!?！？])/,
    subSentence: /(?<=[,，;；])/,
    hardBreak: /\n{2,}/,
    softBreak: /\n/
};

// 定义特殊标记
const SPECIAL_MARKERS = {
    codeBlock: /```[\s\S]*?```/g,
    mathBlock: /\$\$[\s\S]*?\$\$/g,
    inlineCode: /`[^`]+`/g,
    inlineMath: /\$[^$]+\$/g
};

/**
 * 保护特殊内容，避免被错误分割
 * @param {string} text 原始文本
 * @returns {{text: string, markers: Map<string, string>}} 处理后的文本和标记映射
 */
function protectSpecialContent(text) {
    const markers = new Map();
    let processedText = text;
    let counter = 0;

    // 保护所有特殊内容
    for (const [type, pattern] of Object.entries(SPECIAL_MARKERS)) {
        processedText = processedText.replace(pattern, (match) => {
            const marker = `__${type}_${counter++}__`;
            markers.set(marker, match);
            return marker;
        });
    }

    return { text: processedText, markers };
}

/**
 * 恢复特殊内容
 * @param {string} text 带标记的文本
 * @param {Map<string, string>} markers 标记映射
 * @returns {string} 恢复后的文本
 */
function restoreSpecialContent(text, markers) {
    let restoredText = text;
    for (const [marker, content] of markers) {
        restoredText = restoredText.replace(marker, content);
    }
    return restoredText;
}

/**
 * 智能计算最佳分割点
 * @param {string} text 文本内容
 * @param {number} targetLength 目标长度
 * @returns {number} 最佳分割位置
 */
function findBestSplitPosition(text, targetLength) {
    try {
        if (!text || typeof text !== 'string') {
            return targetLength;
        }

        if (text.length <= targetLength) {
            return text.length;
        }

        const searchRange = Math.floor(targetLength * 0.2);
        const start = Math.max(targetLength - searchRange, 0);
        const end = Math.min(targetLength + searchRange, text.length);
        
        const breakPoints = [
            { pattern: /\n{2,}/g, priority: 4 },
            { pattern: /[。.!?！？]/g, priority: 3 },
            { pattern: /[,，;；]/g, priority: 2 },
            { pattern: /\s/g, priority: 1 }
        ];

        let bestPosition = targetLength;
        let highestPriority = -1;

        const searchText = text.slice(start, end);
        
        for (const { pattern, priority } of breakPoints) {
            try {
                const matches = [...searchText.matchAll(pattern)];
                for (const match of matches) {
                    const position = start + match.index + 1;
                    if (priority > highestPriority) {
                        bestPosition = position;
                        highestPriority = priority;
                    }
                }
                if (highestPriority >= 0) break;
            } catch (error) {
                console.warn('查找分割点时出错:', error);
                continue;
            }
        }

        return bestPosition;
    } catch (error) {
        console.error('findBestSplitPosition: 查找分割位置失败:', error);
        return targetLength;  // 发生错误时返回目标长度
    }
}

/**
 * 智能文本拆分
 * @param {string} text 要拆分的文本
 * @param {Object} options 配置选项
 * @param {number} [options.maxLength=512] 最大长度
 * @param {number} [options.minLength=50] 最小长度
 * @param {number} [options.overlap=0] 重叠长度
 * @param {boolean} [options.verbose=false] 详细模式
 * @returns {(string|Object)[]} 拆分后的文本数组或对象数组
 */
export function splitText(text, {
    maxLength = 512,
    minLength = 50,
    overlap = 0,
    verbose = false  // 新增verbose参数
} = {}) {
    try {
        // 空文本处理
        if (!text || typeof text !== 'string') {
            console.warn('splitText: 输入为空或非字符串，返回空数组');
            return [''];  // 返回包含空字符串的数组，而不是空数组
        }

        // 如果文本长度小于最小长度，直接返回
        if (text.length <= minLength) {
            return [text];
        }
        
        // 保护特殊内容
        const { text: processedText, markers } = protectSpecialContent(text);
        
        const chunks = [];
        let currentPosition = 0;
        let originalOffset = 0;  // 新增原始偏移量追踪

        while (currentPosition < processedText.length) {
            try {
                // 计算当前片段的最佳结束位置
                const endPosition = findBestSplitPosition(
                    processedText.slice(currentPosition),
                    maxLength
                );

                // 提取当前片段
                let chunk = processedText.slice(
                    currentPosition,
                    currentPosition + endPosition
                );

                // 计算原始文本偏移量
                const originalStart = originalOffset;
                const originalEnd = Math.min(originalStart + endPosition, text.length);
                
                // 恢复特殊内容
                const restoredChunk = restoreSpecialContent(chunk, markers);
                
                // 根据模式构建返回结果
                if (verbose) {
                    chunks.push({
                        text: restoredChunk.trim(),
                        offset: originalStart,
                        length: restoredChunk.length,
                        originalLength: chunk.length  // 处理前的长度
                    });
                } else {
                    chunks.push(restoredChunk.trim());
                }

                // 更新偏移量 (处理标记替换导致的长度变化)
                originalOffset += restoredChunk.length - (chunk.length - (endPosition - overlap));
                currentPosition += Math.max(endPosition - overlap, minLength);
            } catch (error) {
                console.error('splitText: 处理文本片段时出错:', error);
                // 如果处理某个片段失败，尝试简单分割
                const remainingText = processedText.slice(currentPosition);
                if (remainingText.length > 0) {
                    chunks.push(remainingText.slice(0, maxLength));
                    currentPosition += maxLength;
                }
            }
        }

        // 处理最后一个片段
        if (currentPosition < processedText.length) {
            let lastChunk = processedText.slice(currentPosition);
            if (lastChunk.length >= minLength) {
                lastChunk = restoreSpecialContent(lastChunk, markers);
                chunks.push(lastChunk.trim());
            } else if (chunks.length > 0) {
                // 如果最后一段太短，将其合并到前一段
                const lastIndex = chunks.length - 1;
                chunks[lastIndex] = restoreSpecialContent(
                    chunks[lastIndex] + ' ' + lastChunk,
                    markers
                ).trim();
            }
        }

        // 确保至少返回一个片段
        if (chunks.length === 0) {
            return [text];  // 如果无法分割，返回原始文本
        }

        return chunks;
    } catch (error) {
        console.error('splitText: 文本拆分失败:', error);
        // 在完全失败的情况下，返回原始文本作为单个块
        return [text];
    }
}

/**
 * 计算文本的语义完整性分数
 * @param {string} text 文本内容
 * @returns {number} 完整性分数（0-1）
 */
export function calculateSemanticCompleteness(text) {
    // 计算完整句子的比例
    const sentences = text.match(/[^。.!?！？]+[。.!?！？]/g) || [];
    const incompleteSentences = text.split(/[。.!?！？]/).filter(s => s.trim());
    
    // 计算标点符号的平衡性
    const openBrackets = (text.match(/[【「『（]/g) || []).length;
    const closeBrackets = (text.match(/[】」』）]/g) || []).length;
    const bracketBalance = 1 - Math.abs(openBrackets - closeBrackets) / 
        Math.max(openBrackets + closeBrackets, 1);

    // 计算段落的完整性
    const paragraphs = text.split(/\n{2,}/);
    const paragraphCompleteness = paragraphs.length > 0 ? 
        paragraphs.filter(p => p.trim().length > 50).length / paragraphs.length : 0;

    // 综合评分
    const sentenceCompleteness = sentences.length / 
        Math.max(sentences.length + incompleteSentences.length, 1);
    
    return (sentenceCompleteness * 0.4 + 
            bracketBalance * 0.3 + 
            paragraphCompleteness * 0.3);
} 