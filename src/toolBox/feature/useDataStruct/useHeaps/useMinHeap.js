// 辅助函数 - 使用位运算优化计算
const parent = index => (index - 1) >> 1;
const left = index => (index << 1) + 1;
const right = index => (index << 1) + 2;

// 交换辅助函数
function swap(heap, i, j) {
    const temp = heap[i];
    heap[i] = heap[j];
    heap[j] = temp;
}

// 非递归实现的堆操作函数 - 避免函数调用开销
function heapifyUp(heap, compareFn, index) {
    const value = heap[index];
    let currentIndex = index;
    let parentIndex = parent(currentIndex);
    
    while (currentIndex > 0 && compareFn(heap[parentIndex], value) > 0) {
        heap[currentIndex] = heap[parentIndex];
        currentIndex = parentIndex;
        parentIndex = parent(currentIndex);
    }
    
    // 只有在最终位置不同时才赋值，减少不必要的操作
    if (currentIndex !== index) {
        heap[currentIndex] = value;
    }
}

function heapifyDown(heap, compareFn, index) {
    const size = heap.length;
    const value = heap[index];
    let currentIndex = index;
    
    while (true) {
        let smallestIndex = currentIndex;
        const leftIndex = left(currentIndex);
        const rightIndex = right(currentIndex);
        
        if (leftIndex < size && compareFn(heap[leftIndex], heap[smallestIndex]) < 0) {
            smallestIndex = leftIndex;
        }
        
        if (rightIndex < size && compareFn(heap[rightIndex], heap[smallestIndex]) < 0) {
            smallestIndex = rightIndex;
        }
        
        if (smallestIndex === currentIndex) break;
        
        heap[currentIndex] = heap[smallestIndex];
        currentIndex = smallestIndex;
    }
    
    // 只有在最终位置不同时才赋值
    if (currentIndex !== index) {
        heap[currentIndex] = value;
    }
}

// 优化的异步堆操作 - 批量处理减少异步开销
async function asyncHeapifyUp(heap, compareFn, index) {
    // 计算所有可能的交换操作，然后批量执行
    const swaps = [];
    let currentIndex = index;
    let parentIndex = parent(currentIndex);
    
    while (currentIndex > 0 && compareFn(heap[parentIndex], heap[currentIndex]) > 0) {
        swaps.push([currentIndex, parentIndex]);
        currentIndex = parentIndex;
        parentIndex = parent(currentIndex);
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
    const heap = [];
    const transactionSystem = createTransactionSystem();
    
    // 内部帮助方法
    const validateValue = (value) => {
        if (value === undefined) {
            throw new Error('Cannot push undefined value');
        }
    };
    
    return {
        push: (value) => {
            validateValue(value);
            
            heap.push(value);
            heapifyUp(heap, compareFn, heap.length - 1);
        },
        
        pop: () => {
            if (heap.length === 0) return null;
            
            const min = heap[0];
            const last = heap.pop();
            
            if (heap.length > 0) {
                heap[0] = last;
                heapifyDown(heap, compareFn, 0);
            }
            
            return min;
        },
        
        // 带事务的操作
        withTransaction: async (operation, options) => {
            return transactionSystem.withTransaction(heap, operation, options);
        },
        
        // 安全模式的异步操作 - 需要事务安全性时使用
        pushAsyncSafe: async (value) => {
            validateValue(value);
            
            return transactionSystem.withTransaction(heap, async (data) => {
                data.push(value);
                await asyncHeapifyUp(data, compareFn, data.length - 1);
                return value;
            });
        },
        
        popAsyncSafe: async () => {
            if (heap.length === 0) return null;
            
            return transactionSystem.withTransaction(heap, async (data) => {
                const min = data[0];
                const last = data.pop();
                
                if (data.length > 0) {
                    data[0] = last;
                    await asyncHeapifyDown(data, compareFn, 0);
                }
                
                return min;
            });
        },
        
        // 高性能的异步操作 - 默认使用这个版本
        pushAsync: async (value) => {
            validateValue(value);
            
            heap.push(value);
            await asyncHeapifyUp(heap, compareFn, heap.length - 1);
        },
        
        popAsync: async () => {
            if (heap.length === 0) return null;
            
            const min = heap[0];
            const last = heap.pop();
            
            if (heap.length > 0) {
                heap[0] = last;
                await asyncHeapifyDown(heap, compareFn, 0);
            }
            
            return min;
        },
        
        peek: () => heap.length > 0 ? heap[0] : null,
        size: () => heap.length,
        isEmpty: () => heap.length === 0,
        getHeap: () => [...heap],
        
        setCompareFn: (newCompareFn) => {
            if (typeof newCompareFn !== 'function') {
                throw new Error('compareFn must be a function');
            }
            compareFn = newCompareFn;
        },
        
        // 批量操作 - 高效处理多个元素
        pushBulk: (values) => {
            if (!Array.isArray(values) || values.length === 0) return;
            
            // 先添加所有元素
            const originalSize = heap.length;
            heap.push(...values);
            
            // 从倒数第一个非叶子节点开始向下调整整个堆
            for (let i = Math.max(0, parent(heap.length - 1)); i >= 0; i--) {
                heapifyDown(heap, compareFn, i);
            }
        },
        
        // 高效地清空堆
        clear: () => {
            heap.length = 0;
        },
        
        // 事务系统接口
        registerTransactionHook: (hookType, callback) => {
            return transactionSystem.registerHook(hookType, callback);
        },
        
        getTransactionTypes: () => {
            return { ...transactionSystem.transactionTypes };
        },
        
        getWorst: () => {
            if (heap.length === 0) return null;
            
            // 在最小堆中，最差（最大）的元素通常在叶节点中
            // 找出所有叶节点中的最大值
            let maxElement = heap[0];
            let maxIndex = 0;
            
            for (let i = 1; i < heap.length; i++) {
                if (compareFn(heap[i], maxElement) > 0) {
                    maxElement = heap[i];
                    maxIndex = i;
                }
            }
            
            return maxElement;
        },
        
        popWorst: () => {
            if (heap.length === 0) return null;
            if (heap.length === 1) return heap.pop();
            
            // 找出最大元素的索引
            let maxIndex = 0;
            for (let i = 1; i < heap.length; i++) {
                if (compareFn(heap[i], heap[maxIndex]) > 0) {
                    maxIndex = i;
                }
            }
            
            // 交换最大元素和最后一个元素，然后移除最后一个元素
            const worst = heap[maxIndex];
            const lastElement = heap.pop();
            
            // 如果移除的是最后一个元素，就直接返回
            if (maxIndex === heap.length) {
                return worst;
            }
            
            // 否则，用最后一个元素替换最大元素的位置
            heap[maxIndex] = lastElement;
            
            // 从替换位置向下堆化，确保堆的性质
            heapifyDown(heap, compareFn, maxIndex);
            
            return worst;
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
        await this.heap.pushAsync(value);
    }
    
    async popAsync() {
        return await this.heap.popAsync();
    }
    
    // 提供安全版本的异步操作
    async pushAsyncSafe(value) {
        await this.heap.pushAsyncSafe(value);
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
}

export { createMinHeap, MinHeap };