// 辅助函数 - 使用位运算优化计算
const parent = index => (index - 1) >> 1;
const left = index => (index << 1) + 1;
const right = index => (index << 1) + 2;

// 交换辅助函数 - 内联实现以减少函数调用开销
function swap(heap, i, j) {
    const temp = heap[i];
    heap[i] = heap[j];
    heap[j] = temp;
}

// 非递归实现的堆操作函数 - 避免函数调用开销
function heapifyUp(heap, compareFn, index) {
    let currentIndex = index;
    
    while (currentIndex > 0) {
        const parentIndex = parent(currentIndex);
        // 修改比较条件，使其与$createBinaryHeap兼容
        // 当compareFn(current, parent) < 0时，current应该排在parent前面
        if (compareFn(heap[currentIndex], heap[parentIndex]) >= 0) break;
        
        // 直接交换元素，与$createBinaryHeap保持一致
        swap(heap, currentIndex, parentIndex);
        currentIndex = parentIndex;
    }
}

function heapifyDown(heap, compareFn, index) {
    const size = heap.length;
    let currentIndex = index;
    
    while (true) {
        let smallestIndex = currentIndex;
        const leftIndex = left(currentIndex);
        const rightIndex = right(currentIndex);
        
        // 修改比较条件，使其与$createBinaryHeap兼容
        if (leftIndex < size && compareFn(heap[leftIndex], heap[smallestIndex]) < 0) {
            smallestIndex = leftIndex;
        }
        
        if (rightIndex < size && compareFn(heap[rightIndex], heap[smallestIndex]) < 0) {
            smallestIndex = rightIndex;
        }
        
        if (smallestIndex === currentIndex) break;
        
        // 直接交换元素，与$createBinaryHeap保持一致
        swap(heap, currentIndex, smallestIndex);
        currentIndex = smallestIndex;
    }
}

// 优化的异步堆操作 - 批量处理减少异步开销
async function asyncHeapifyUp(heap, compareFn, index) {
    // 计算所有可能的交换操作，然后批量执行
    const swaps = [];
    let currentIndex = index;
    
    while (currentIndex > 0) {
        const parentIndex = parent(currentIndex);
        // 修改比较条件，使其与$createBinaryHeap兼容
        if (compareFn(heap[currentIndex], heap[parentIndex]) >= 0) break;
        
        swaps.push([currentIndex, parentIndex]);
        currentIndex = parentIndex;
    }
    
    // 批量执行交换，每10次操作让出一次事件循环
    for (let i = 0; i < swaps.length; i++) {
        swap(heap, swaps[i][0], swaps[i][1]);
        if (i % 10 === 9) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
}

async function asyncHeapifyDown(heap, compareFn, index) {
    const size = heap.length;
    const swaps = [];
    let currentIndex = index;
    
    while (true) {
        let smallestIndex = currentIndex;
        const leftIndex = left(currentIndex);
        const rightIndex = right(currentIndex);
        
        // 修改比较条件，使其与$createBinaryHeap兼容
        if (leftIndex < size && compareFn(heap[leftIndex], heap[smallestIndex]) < 0) {
            smallestIndex = leftIndex;
        }
        
        if (rightIndex < size && compareFn(heap[rightIndex], heap[smallestIndex]) < 0) {
            smallestIndex = rightIndex;
        }
        
        if (smallestIndex === currentIndex) break;
        
        swaps.push([currentIndex, smallestIndex]);
        currentIndex = smallestIndex;
    }
    
    // 批量执行交换，每10次操作让出一次事件循环
    for (let i = 0; i < swaps.length; i++) {
        swap(heap, swaps[i][0], swaps[i][1]);
        if (i % 10 === 9) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
}

// 增强的事务系统 - 提供可拦截和自定义的事务处理机制
const createTransactionSystem = () => {
    // 事务钩子
    const hooks = {
        beforeTransaction: [],      // 事务开始前
        afterTransaction: [],       // 事务成功完成后
        onError: [],               // 事务发生错误时
        beforeRollback: [],         // 回滚前
        afterRollback: []           // 回滚后
    };
    
    // 允许注册多个钩子
    const registerHook = (hookType, callback) => {
        if (!hooks[hookType]) {
            throw new Error(`不支持的钩子类型: ${hookType}`);
        }
        
        if (typeof callback !== 'function') {
            throw new Error('钩子必须是函数');
        }
        
        hooks[hookType].push(callback);
        
        // 返回取消注册的函数
        return () => {
            const index = hooks[hookType].indexOf(callback);
            if (index !== -1) {
                hooks[hookType].splice(index, 1);
                return true;
            }
            return false;
        };
    };
    
    // 触发钩子
    const triggerHooks = async (hookType, context) => {
        if (!hooks[hookType]) return;
        
        for (const hook of hooks[hookType]) {
            await Promise.resolve(hook(context));
        }
    };
    
    // 标准事务处理
    const withTransaction = async (data, operation, options = {}) => {
        const context = {
            data,
            snapshot: options.deepCopy ? JSON.parse(JSON.stringify(data)) : [...data],
            metadata: options.metadata || {},
            startTime: Date.now()
        };
        
        try {
            // 事务开始前触发钩子
            await triggerHooks('beforeTransaction', context);
            
            // 执行操作
            const result = await Promise.resolve(operation(data));
            
            // 事务成功完成后触发钩子
            context.endTime = Date.now();
            context.duration = context.endTime - context.startTime;
            context.result = result;
            await triggerHooks('afterTransaction', context);
            
            return result;
        } catch (error) {
            // 发生错误时触发钩子
            context.error = error;
            context.endTime = Date.now();
            context.duration = context.endTime - context.startTime;
            await triggerHooks('onError', context);
            
            // 准备回滚
            await triggerHooks('beforeRollback', context);
            
            // 执行回滚
            if (options.deepCopy) {
                // 深拷贝情况下的回滚
                while (data.length > 0) data.pop();
                for (const item of context.snapshot) {
                    data.push(JSON.parse(JSON.stringify(item)));
                }
            } else {
                // 普通情况的回滚
                data.splice(0, data.length, ...context.snapshot);
            }
            
            // 回滚后触发钩子
            await triggerHooks('afterRollback', context);
            
            // 重新抛出错误或者返回自定义错误
            if (options.customErrorHandler) {
                return options.customErrorHandler(error, context);
            }
            throw error;
        }
    };
    
    return {
        withTransaction,
        registerHook,
        // 暴露预定义的事务类型
        transactionTypes: {
            STANDARD: { deepCopy: false },
            DEEP_COPY: { deepCopy: true },
            CUSTOM: (metadata) => ({ metadata })
        }
    };
};

// 优化的函数式最小堆实现
const createMinHeap = (compareFn = (a, b) => a - b) => {
    // 使用TypedArray存储数值类型数据，提高性能
    // 对于非数值类型，回退到普通数组
    let heap = [];
    let isNumericHeap = false;
    let numericHeap = null;
    
    // 检测是否为数值类型堆
    const checkNumericHeap = (value) => {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    };
    
    // 初始化数值类型堆
    const initNumericHeap = () => {
        if (isNumericHeap) return;
        
        // 检查堆中是否都是数值
        for (let i = 0; i < heap.length; i++) {
            if (!checkNumericHeap(heap[i])) {
                return; // 如果有非数值，不转换为TypedArray
            }
        }
        
        // 创建TypedArray并复制数据
        numericHeap = new Float64Array(heap.length);
        for (let i = 0; i < heap.length; i++) {
            numericHeap[i] = heap[i];
        }
        
        isNumericHeap = true;
    };
    
    // 获取当前使用的堆
    const getCurrentHeap = () => {
        return isNumericHeap ? numericHeap : heap;
    };
    
    // 获取堆长度
    const getHeapLength = () => {
        return isNumericHeap ? numericHeap.length : heap.length;
    };
    
    // 设置堆长度
    const setHeapLength = (length) => {
        if (isNumericHeap) {
            // 创建新的TypedArray并复制数据
            const newHeap = new Float64Array(length);
            const copyLength = Math.min(length, numericHeap.length);
            for (let i = 0; i < copyLength; i++) {
                newHeap[i] = numericHeap[i];
            }
            numericHeap = newHeap;
        } else {
            heap.length = length;
        }
    };
    
    // 获取堆元素
    const getHeapElement = (index) => {
        return isNumericHeap ? numericHeap[index] : heap[index];
    };
    
    // 设置堆元素
    const setHeapElement = (index, value) => {
        if (isNumericHeap) {
            numericHeap[index] = value;
        } else {
            heap[index] = value;
        }
    };
    
    // 添加堆元素
    const addHeapElement = (value) => {
        if (isNumericHeap) {
            // 检查是否为数值
            if (!checkNumericHeap(value)) {
                // 如果不是数值，回退到普通数组
                isNumericHeap = false;
                heap = Array.from(numericHeap);
                heap.push(value);
                return;
            }
            
            // 扩展TypedArray
            const newHeap = new Float64Array(numericHeap.length + 1);
            for (let i = 0; i < numericHeap.length; i++) {
                newHeap[i] = numericHeap[i];
            }
            newHeap[numericHeap.length] = value;
            numericHeap = newHeap;
        } else {
            heap.push(value);
        }
    };
    
    // 移除堆元素
    const removeHeapElement = () => {
        if (isNumericHeap) {
            // 创建新的TypedArray并复制数据
            const newHeap = new Float64Array(numericHeap.length - 1);
            for (let i = 0; i < newHeap.length; i++) {
                newHeap[i] = numericHeap[i];
            }
            numericHeap = newHeap;
        } else {
            heap.pop();
        }
    };
    
    // 获取堆副本
    const getHeapCopy = () => {
        return isNumericHeap ? Array.from(numericHeap) : [...heap];
    };
    
    const transactionSystem = createTransactionSystem();
    
    // 用于跟踪最大值的最大堆
    let maxHeap = null; // 初始化为null，表示尚未创建
    const maxCompareFn = (a, b) => -compareFn(a, b); // 反转比较函数
    let maxHeapSynced = false; // 标记最大堆是否已同步
    let maxHeapInitialized = false; // 标记最大堆是否已初始化
    
    // 内部帮助方法
    const validateValue = (value) => {
        if (value === undefined) {
            throw new Error('Cannot push undefined value');
        }
    };
    
    // 初始化最大堆
    const initializeMaxHeap = () => {
        if (maxHeapInitialized) return;
        
        // 创建最大堆
        maxHeap = [];
        
        // 如果主堆为空，则清空最大堆
        if (getHeapLength() === 0) {
            maxHeapSynced = true;
            maxHeapInitialized = true;
            return;
        }
        
        // 将最小堆中的所有元素复制到最大堆
        for (let i = 0; i < getHeapLength(); i++) {
            maxHeap.push(getHeapElement(i));
        }
        
        // 构建最大堆
        for (let i = Math.max(0, parent(maxHeap.length - 1)); i >= 0; i--) {
            heapifyDown(maxHeap, maxCompareFn, i);
        }
        
        maxHeapSynced = true;
        maxHeapInitialized = true;
    };
    
    // 同步最大堆中的元素
    const syncMaxHeap = () => {
        // 如果最大堆尚未初始化，则初始化它
        if (!maxHeapInitialized) {
            initializeMaxHeap();
            return;
        }
        
        // 重建最大堆
        maxHeap = [];
        
        // 如果主堆为空，则清空最大堆
        if (getHeapLength() === 0) {
            maxHeapSynced = true;
            return;
        }
        
        // 将最小堆中的所有元素复制到最大堆
        for (let i = 0; i < getHeapLength(); i++) {
            maxHeap.push(getHeapElement(i));
        }
        
        // 构建最大堆
        for (let i = Math.max(0, parent(maxHeap.length - 1)); i >= 0; i--) {
            heapifyDown(maxHeap, maxCompareFn, i);
        }
        
        maxHeapSynced = true;
    };
    
    // 确保最大堆已同步
    const ensureMaxHeapSynced = () => {
        if (!maxHeapInitialized) {
            initializeMaxHeap();
            return;
        }
        
        if (!maxHeapSynced) {
            syncMaxHeap();
        }
    };
    
    // 优化的堆操作函数 - 针对当前堆类型
    const optimizedHeapifyUp = (index) => {
        let currentIndex = index;
        
        while (currentIndex > 0) {
            const parentIndex = parent(currentIndex);
            if (compareFn(getHeapElement(currentIndex), getHeapElement(parentIndex)) >= 0) break;
            
            // 直接交换元素
            const temp = getHeapElement(currentIndex);
            setHeapElement(currentIndex, getHeapElement(parentIndex));
            setHeapElement(parentIndex, temp);
            currentIndex = parentIndex;
        }
    };
    
    const optimizedHeapifyDown = (index) => {
        const size = getHeapLength();
        let currentIndex = index;
        
        while (true) {
            let smallestIndex = currentIndex;
            const leftIndex = left(currentIndex);
            const rightIndex = right(currentIndex);
            
            if (leftIndex < size && compareFn(getHeapElement(leftIndex), getHeapElement(smallestIndex)) < 0) {
                smallestIndex = leftIndex;
            }
            
            if (rightIndex < size && compareFn(getHeapElement(rightIndex), getHeapElement(smallestIndex)) < 0) {
                smallestIndex = rightIndex;
            }
            
            if (smallestIndex === currentIndex) break;
            
            // 直接交换元素
            const temp = getHeapElement(currentIndex);
            setHeapElement(currentIndex, getHeapElement(smallestIndex));
            setHeapElement(smallestIndex, temp);
            currentIndex = smallestIndex;
        }
    };
    
    return {
        push: (value) => {
            validateValue(value);
            
            // 检查是否为数值类型堆
            if (getHeapLength() === 0) {
                isNumericHeap = checkNumericHeap(value);
                if (isNumericHeap) {
                    numericHeap = new Float64Array(1);
                    numericHeap[0] = value;
                } else {
                    heap = [value];
                }
            } else {
                addHeapElement(value);
                optimizedHeapifyUp(getHeapLength() - 1);
            }
            
            // 如果最大堆已初始化，则同步更新
            if (maxHeapInitialized && maxHeapSynced && maxHeap.length > 0) {
                maxHeap.push(value);
                heapifyUp(maxHeap, maxCompareFn, maxHeap.length - 1);
            } else if (maxHeapInitialized) {
                // 标记最大堆需要重新同步
                maxHeapSynced = false;
            }
        },
        
        pop: () => {
            if (getHeapLength() === 0) return null;
            
            const min = getHeapElement(0);
            const last = getHeapElement(getHeapLength() - 1);
            setHeapLength(getHeapLength() - 1);
            
            if (getHeapLength() > 0) {
                setHeapElement(0, last);
                optimizedHeapifyDown(0);
            }
            
            // 如果最大堆已初始化，标记需要重新同步
            if (maxHeapInitialized) {
                maxHeapSynced = false;
            }
            
            return min;
        },
        
        // 带事务的操作
        withTransaction: async (operation, options) => {
            return transactionSystem.withTransaction(getCurrentHeap(), operation, options);
        },
        
        // 安全模式的异步操作 - 需要事务安全性时使用
        pushAsyncSafe: async (value) => {
            validateValue(value);
            
            return transactionSystem.withTransaction(getCurrentHeap(), async (data) => {
                if (isNumericHeap) {
                    // 检查是否为数值
                    if (!checkNumericHeap(value)) {
                        // 如果不是数值，回退到普通数组
                        isNumericHeap = false;
                        heap = Array.from(numericHeap);
                        heap.push(value);
                        asyncHeapifyUp(heap, compareFn, heap.length - 1);
                        return value;
                    }
                    
                    // 扩展TypedArray
                    const newHeap = new Float64Array(numericHeap.length + 1);
                    for (let i = 0; i < numericHeap.length; i++) {
                        newHeap[i] = numericHeap[i];
                    }
                    newHeap[numericHeap.length] = value;
                    numericHeap = newHeap;
                    await asyncHeapifyUp(numericHeap, compareFn, numericHeap.length - 1);
                } else {
                    data.push(value);
                    await asyncHeapifyUp(data, compareFn, data.length - 1);
                }
                return value;
            });
        },
        
        popAsyncSafe: async () => {
            if (getHeapLength() === 0) return null;
            
            return transactionSystem.withTransaction(getCurrentHeap(), async (data) => {
                const min = getHeapElement(0);
                const last = getHeapElement(getHeapLength() - 1);
                setHeapLength(getHeapLength() - 1);
                
                if (getHeapLength() > 0) {
                    setHeapElement(0, last);
                    await asyncHeapifyDown(getCurrentHeap(), compareFn, 0);
                }
                
                return min;
            });
        },
        
        // 高性能的异步操作 - 默认使用这个版本
        pushAsync: async (value) => {
            validateValue(value);
            
            // 使用事务系统确保操作的一致性
            return transactionSystem.withTransaction(getCurrentHeap(), async (data) => {
                if (isNumericHeap) {
                    // 检查是否为数值
                    if (!checkNumericHeap(value)) {
                        // 如果不是数值，回退到普通数组
                        isNumericHeap = false;
                        heap = Array.from(numericHeap);
                        heap.push(value);
                        asyncHeapifyUp(heap, compareFn, heap.length - 1);
                        return value;
                    }
                    
                    // 扩展TypedArray
                    const newHeap = new Float64Array(numericHeap.length + 1);
                    for (let i = 0; i < numericHeap.length; i++) {
                        newHeap[i] = numericHeap[i];
                    }
                    newHeap[numericHeap.length] = value;
                    numericHeap = newHeap;
                    await asyncHeapifyUp(numericHeap, compareFn, numericHeap.length - 1);
                } else {
                    data.push(value);
                    await asyncHeapifyUp(data, compareFn, data.length - 1);
                }
                return value;
            });
        },
        
        popAsync: async () => {
            if (getHeapLength() === 0) return null;
            
            // 使用事务系统确保操作的一致性
            return transactionSystem.withTransaction(getCurrentHeap(), async (data) => {
                const min = getHeapElement(0);
                const last = getHeapElement(getHeapLength() - 1);
                setHeapLength(getHeapLength() - 1);
                
                if (getHeapLength() > 0) {
                    setHeapElement(0, last);
                    await asyncHeapifyDown(getCurrentHeap(), compareFn, 0);
                }
                
                return min;
            });
        },
        
        peek: () => getHeapLength() > 0 ? getHeapElement(0) : null,
        size: () => getHeapLength(),
        isEmpty: () => getHeapLength() === 0,
        getHeap: () => getHeapCopy(),
        
        setCompareFn: (newCompareFn) => {
            if (typeof newCompareFn !== 'function') {
                throw new Error('compareFn must be a function');
            }
            compareFn = newCompareFn;
        },
        
        // 批量操作 - 高效处理多个元素
        pushBulk: (values) => {
            if (!Array.isArray(values) || values.length === 0) return;
            
            // 检查是否所有元素都是数值
            const allNumeric = values.every(checkNumericHeap);
            
            if (isNumericHeap && allNumeric) {
                // 扩展TypedArray
                const newHeap = new Float64Array(getHeapLength() + values.length);
                for (let i = 0; i < getHeapLength(); i++) {
                    newHeap[i] = getHeapElement(i);
                }
                for (let i = 0; i < values.length; i++) {
                    newHeap[getHeapLength() + i] = values[i];
                }
                numericHeap = newHeap;
                
                // 从倒数第一个非叶子节点开始向下调整整个堆
                for (let i = Math.max(0, parent(getHeapLength() - 1)); i >= 0; i--) {
                    optimizedHeapifyDown(i);
                }
            } else {
                // 如果有非数值元素，回退到普通数组
                if (isNumericHeap) {
                    isNumericHeap = false;
                    heap = Array.from(numericHeap);
                }
                
                heap.push(...values);
                
                // 从倒数第一个非叶子节点开始向下调整整个堆
                for (let i = Math.max(0, parent(heap.length - 1)); i >= 0; i--) {
                    heapifyDown(heap, compareFn, i);
                }
            }
        },
        
        // 高效地清空堆
        clear: () => {
            if (isNumericHeap) {
                numericHeap = new Float64Array(0);
            } else {
                heap.length = 0;
            }
            
            if (maxHeapInitialized) {
                maxHeap = [];
                maxHeapSynced = true;
            }
        },
        
        // 事务系统接口
        registerTransactionHook: (hookType, callback) => {
            return transactionSystem.registerHook(hookType, callback);
        },
        
        getTransactionTypes: () => {
            return { ...transactionSystem.transactionTypes };
        },
        
        getWorst: () => {
            if (getHeapLength() === 0) return null;
            if (getHeapLength() === 1) return getHeapElement(0);
            
            // 确保最大堆已同步
            ensureMaxHeapSynced();
            
            // 最大堆的根节点就是最大值（最差的元素）
            return maxHeap[0];
        },
        
        popWorst: () => {
            if (getHeapLength() === 0) return null;
            if (getHeapLength() === 1) return pop();
            
            // 确保最大堆已同步
            ensureMaxHeapSynced();
            
            // 从最大堆中获取最大值并移除
            const worst = maxHeap[0];
            const maxHeapLast = maxHeap.pop();
            if (maxHeap.length > 0) {
                maxHeap[0] = maxHeapLast;
                heapifyDown(maxHeap, maxCompareFn, 0);
            }
            
            // 从主堆中找到并删除该元素 - 使用更可靠的查找方法
            let index = -1;
            
            // 改进的对象比较逻辑
            if (typeof worst === 'object' && worst !== null) {
                // 尝试多种比较策略
                // 1. 首先尝试使用严格相等比较对象引用
                for (let i = 0; i < getHeapLength(); i++) {
                    if (getHeapElement(i) === worst) {
                        index = i;
                        break;
                    }
                }
                
                // 2. 如果找不到，尝试使用id属性比较
                if (index === -1 && worst.id !== undefined) {
                    for (let i = 0; i < getHeapLength(); i++) {
                        const item = getHeapElement(i);
                        if (item && item.id === worst.id) {
                            index = i;
                            break;
                        }
                    }
                }
                
                // 3. 如果仍然找不到，尝试使用JSON字符串比较（适用于简单对象）
                if (index === -1) {
                    try {
                        const worstStr = JSON.stringify(worst);
                        for (let i = 0; i < getHeapLength(); i++) {
                            const item = getHeapElement(i);
                            try {
                                if (JSON.stringify(item) === worstStr) {
                                    index = i;
                                    break;
                                }
                            } catch (e) {
                                // JSON序列化失败，忽略此比较方法
                            }
                        }
                    } catch (e) {
                        // JSON序列化失败，忽略此比较方法
                    }
                }
            } else {
                // 基本类型或null可以使用标准比较
                for (let i = 0; i < getHeapLength(); i++) {
                    if (compareFn(worst, getHeapElement(i)) === 0 && worst === getHeapElement(i)) {
                        index = i;
                        break;
                    }
                }
            }
            
            if (index !== -1) {
                // 移除该元素并维护堆属性
                const last = getHeapElement(getHeapLength() - 1);
                setHeapLength(getHeapLength() - 1);
                
                if (index < getHeapLength()) {
                    setHeapElement(index, last);
                    
                    // 确保堆性质在删除后仍然保持
                    optimizedHeapifyDown(index);
                    optimizedHeapifyUp(index); // 可能需要上移
                }
            } else {
                // 如果在最小堆中找不到元素（不应该发生），重新同步两个堆
                console.warn('在最小堆中找不到最差元素，重新同步堆');
                syncMaxHeap();
            }
            
            // 标记最大堆需要重新同步，因为我们已经修改了最大堆
            maxHeapSynced = false;
            
            return worst;
        },
        
        // 添加intoSortedVec方法，与useCustomedHNSW.js中的createBinaryHeap兼容
        intoSortedVec: () => {
            // 如果堆为空，直接返回空数组
            if (getHeapLength() === 0) return [];
            
            // 创建堆的副本，避免修改原始堆
            const heapCopy = getHeapCopy();
            const result = [];
            
            // 使用堆排序算法，逐个提取最小元素
            while (heapCopy.length > 0) {
                // 提取堆顶元素（最小值）
                const min = heapCopy[0];
                result.push(min);
                
                // 将最后一个元素移到堆顶
                const last = heapCopy.pop();
                if (heapCopy.length > 0) {
                    heapCopy[0] = last;
                    // 向下调整堆
                    heapifyDown(heapCopy, compareFn, 0);
                }
            }
            
            return result;
        }
    };
};

// 优化的类式最小堆实现
class MinHeap {
    constructor(compareFn) {
        this.heap = createMinHeap(compareFn);
        
        // 添加事务相关方法
        this.transactionTypes = this.heap.getTransactionTypes();
    }
    
    push(value) {
        this.heap.push(value);
    }
    
    pop() {
        return this.heap.pop();
    }
    
    peek() {
        return this.heap.peek();
    }
    
    size() {
        return this.heap.size();
    }
    
    isEmpty() {
        return this.heap.isEmpty();
    }
    
    getHeap() {
        return this.heap.getHeap();
    }

    async pushAsync(value) {
        return await this.heap.pushAsync(value);
    }
    
    async popAsync() {
        return await this.heap.popAsync();
    }
    
    // 提供安全版本的异步操作
    async pushAsyncSafe(value) {
        return await this.heap.pushAsyncSafe(value);
    }
    
    async popAsyncSafe() {
        return await this.heap.popAsyncSafe();
    }
    
    // 批量操作
    pushBulk(values) {
        this.heap.pushBulk(values);
    }
    
    clear() {
        this.heap.clear();
    }
    
    setCompareFn(newCompareFn) {
        this.heap.setCompareFn(newCompareFn);
    }
    
    // 事务相关方法
    async withTransaction(operation, options) {
        return await this.heap.withTransaction(operation, options);
    }
    
    registerTransactionHook(hookType, callback) {
        return this.heap.registerTransactionHook(hookType, callback);
    }

    getWorst() {
        return this.heap.getWorst();
    }
    
    popWorst() {
        return this.heap.popWorst();
    }
    
    /**
     * 返回堆中的所有元素，保持堆的结构不变
     * @returns {Array} 堆中的所有元素数组
     */
    toArray() {
        // 获取原始堆的副本
        const elements = this.getHeap();
        return elements;
    }
    
    /**
     * 将堆转换为排序数组，与useCustomedHNSW.js中的createBinaryHeap兼容
     * @returns {Array} 排序后的数组
     */
    intoSortedVec() {
        return this.heap.intoSortedVec();
    }
}

/**
 * 创建专门用于HNSW搜索的最大堆
 * 对标准MinHeap的封装，简化了最大堆的使用
 * 完全兼容$createBinaryHeap接口
 */
export function createMaxHeap(compareFunc = (a, b) => a - b) {
    // 反转比较函数，将最小堆转为最大堆
    const maxHeapCompare = (a, b) => compareFunc(b, a);
    const heap = createMinHeap(maxHeapCompare);
    
    // 包装返回的堆，统一API
    return {
      push: (item) => heap.push(item),
      pop: () => heap.pop(),
      peek: () => heap.peek(),
      size: () => heap.size(),
      isEmpty: () => heap.size() === 0,
      clear: () => heap.clear(),
      toArray: () => {
        // 直接返回堆的副本，不改变堆的状态
        return [...heap.getHeap()];
      },
      getWorst: () => {
        if (heap.size() === 0) return null;
        // 这里会触发最大堆的初始化（如果尚未初始化）
        return heap.getWorst();
      },
      // 添加intoSortedVec方法，与useCustomedHNSW.js中的createBinaryHeap兼容
      intoSortedVec: () => {
        return heap.intoSortedVec();
      }
    };
  }

// 明确导出接口，同时保持与useCustomedHNSW.js的兼容性
export { createMinHeap, MinHeap };
export { createMaxHeap as createBinaryHeap };
