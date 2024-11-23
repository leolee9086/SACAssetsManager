/**
 * 从数组中删除指定范围的元素并返回新数组
 * 
 * @param {Array} array - 要操作的源数组
 * @param {number} start - 开始删除的位置索引（包含）
 * @param {number} end - 结束删除的位置索引（不包含）
 * @throws {TypeError} 当参数类型不正确时抛出错误
 * @throws {RangeError} 当索引超出数组范围时抛出错误
 * @returns {Array} 返回删除指定范围元素后的新数组
 * 
 * @example
 * // 删除数组中索引1到3（不包含）的元素
 * const arr = [1, 2, 3, 4, 5];
 * const result = sliceDelete(arr, 1, 3);
 * console.log(result); // [1, 4, 5]
 * console.log(arr); // [1, 2, 3, 4, 5] (原数组不变)
 */
export function sliceDelete(array, start, end) {
    // 类型检查
    if (!Array.isArray(array)) {
        throw new TypeError('第一个参数必须是数组');
    }
    if (typeof start !== 'number' || typeof end !== 'number') {
        throw new TypeError('起始和结束索引必须是数字');
    }
    // 处理负数索引
    const actualStart = start < 0 ? Math.max(array.length + start, 0) : start;
    const actualEnd = end < 0 ? Math.max(array.length + end, 0) : end;
    // 边界检查
    if (actualStart < 0 || actualEnd < 0) {
        throw new RangeError('索引不能小于0');
    }
    if (actualStart >= array.length || actualEnd > array.length) {
        throw new RangeError('索引超出数组范围');
    }
    if (actualStart > actualEnd) {
        throw new RangeError('起始索引不能大于结束索引');
    }

    // 快速路径：如果是空数组或无需删除，直接返回
    if (array.length === 0 || actualStart === actualEnd) {
        return array.slice();
    }

    // 性能优化：使用预分配长度的新数组
    const newLength = array.length - (actualEnd - actualStart);
    const result = new Array(newLength);
    
    // 复制前半部分
    let index = 0;
    for (let i = 0; i < actualStart; i++) {
        result[index++] = array[i];
    }
    
    // 复制后半部分
    for (let i = actualEnd; i < array.length; i++) {
        result[index++] = array[i];
    }

    return result;
}
/**
 * 异步从数组中删除指定范围的元素并返回新数组
 * 
 * @param {Array} array - 要操作的源数组
 * @param {number} start - 开始删除的位置索引（包含）
 * @param {number} end - 结束删除的位置索引（不包含）
 * @param {Object} options - 配置选项
 * @param {number} [options.chunkSize=1000] - 每次处理的数组块大小
 * @throws {TypeError} 当参数类型不正确时抛出错误
 * @throws {RangeError} 当索引超出数组范围时抛出错误
 * @returns {Promise<Array>} 返回删除指定范围元素后的新数组的 Promise
 * 
 * @example
 * const arr = Array.from({ length: 10000 }, (_, i) => i);
 * const result = await sliceDeleteAsync(arr, 1000, 3000);
 * console.log(result.length); // 8000
 */
export async function sliceDeleteAsync(array, start, end, options = {}) {
    // 类型检查
    if (!Array.isArray(array)) {
        throw new TypeError('第一个参数必须是数组');
    }
    if (typeof start !== 'number' || typeof end !== 'number') {
        throw new TypeError('起始和结束索引必须是数字');
    }

    // 处理负数索引
    const actualStart = start < 0 ? Math.max(array.length + start, 0) : start;
    const actualEnd = end < 0 ? Math.max(array.length + end, 0) : end;

    // 边界检查
    if (actualStart < 0 || actualEnd < 0) {
        throw new RangeError('索引不能小于0');
    }
    if (actualStart >= array.length || actualEnd > array.length) {
        throw new RangeError('索引超出数组范围');
    }
    if (actualStart > actualEnd) {
        throw new RangeError('起始索引不能大于结束索引');
    }

    // 快速路径：如果是空数组或无需删除，直接返回
    if (array.length === 0 || actualStart === actualEnd) {
        return array.slice();
    }

    const { chunkSize = 1000 } = options;
    const newLength = array.length - (actualEnd - actualStart);
    const result = new Array(newLength);
    
    // 异步处理函数
    const processChunk = async (startIndex, endIndex, targetIndex) => {
        return new Promise(resolve => {
            for (let i = startIndex; i < endIndex; i++) {
                result[targetIndex + (i - startIndex)] = array[i];
            }
            // 使用 setTimeout 让出执行线程，防止长时间阻塞
            setTimeout(resolve, 0);
        });
    };

    try {
        // 异步处理前半部分
        let processedIndex = 0;
        for (let i = 0; i < actualStart; i += chunkSize) {
            const chunkEnd = Math.min(i + chunkSize, actualStart);
            await processChunk(i, chunkEnd, processedIndex);
            processedIndex += (chunkEnd - i);
        }

        // 异步处理后半部分
        for (let i = actualEnd; i < array.length; i += chunkSize) {
            const chunkEnd = Math.min(i + chunkSize, array.length);
            await processChunk(i, chunkEnd, processedIndex);
            processedIndex += (chunkEnd - i);
        }

        return result;
    } catch (error) {
        throw new Error(`处理数组时发生错误: ${error.message}`);
    }
}