// 纯函数 - 获取父节点索引
function getParentIndex(i) { 
  return Math.floor((i - 1) / 2); 
}

// 纯函数 - 获取左子节点索引
function getLeftChildIndex(i) { 
  return 2 * i + 1; 
}

// 纯函数 - 获取右子节点索引
function getRightChildIndex(i) { 
  return 2 * i + 2; 
}

// 纯函数 - 默认比较函数
function defaultCompare(a) {
  const [item1, item2] = a;
  return item1 - item2;
}

// 纯函数 - 检查是否为数组
function isValidArray(arr) {
  return Array.isArray(arr);
}

// 纯函数 - 获取堆大小
function getHeapSize(heap) {
  return heap.length;
}

// 纯函数 - 检查堆是否为空
function isHeapEmpty(heap) {
  return getHeapSize(heap) === 0;
}

// 纯函数 - 获取顶部元素
function peekHeapTop(heap) {
  return heap[0] || null;
}

// 非纯函数 - 交换堆中的两个节点
function forHeapSwap(context, options) {
  const { i, j } = options;
  [context[i], context[j]] = [context[j], context[i]];
}

// 非纯函数 - 堆化过程
function forHeapify(context, options) {
  const { targetIndex, compareFn } = options;
  
  let leftIndex = getLeftChildIndex(targetIndex);
  let rightIndex = getRightChildIndex(targetIndex);
  let smallestIndex = targetIndex;
  
  if (leftIndex < getHeapSize(context) && 
      compareFn([context[leftIndex], context[smallestIndex]]) < 0) {
    smallestIndex = leftIndex;
  }
  
  if (rightIndex < getHeapSize(context) && 
      compareFn([context[rightIndex], context[smallestIndex]]) < 0) {
    smallestIndex = rightIndex;
  }
  
  if (smallestIndex !== targetIndex) {
    forHeapSwap(context, { i: targetIndex, j: smallestIndex });
    forHeapify(context, { targetIndex: smallestIndex, compareFn });
  }
}

// 非纯函数 - 添加元素到堆
function forHeapPush(context, options) {
  const { value, compareFn } = options;
  
  context.push(value);
  
  let index = context.length - 1;
  let parent = getParentIndex(index);
  
  while (index > 0 && compareFn([context[parent], context[index]]) > 0) {
    forHeapSwap(context, { i: parent, j: index });
    index = parent;
    parent = getParentIndex(index);
  }
}

// 非纯函数 - 批量添加元素
function forHeapBatchPush(context, options) {
  const { values, compareFn } = options;
  
  // 直接将所有元素添加到堆数组中
  for (const value of values) {
    context.push(value);
  }
  
  // 从最后一个非叶子节点开始向上构造最小堆
  const startIndex = getParentIndex(context.length - 1);
  for (let i = startIndex; i >= 0; i--) {
    forHeapify(context, { targetIndex: i, compareFn });
  }
}

// 非纯函数 - 取出堆顶元素
function forHeapPop(context, options) {
  const { compareFn } = options;
  
  if (isHeapEmpty(context)) return null;
  if (getHeapSize(context) === 1) return context.pop();
  
  const min = context[0];
  context[0] = context.pop();
  forHeapify(context, { targetIndex: 0, compareFn });
  
  return min;
}

// 创建新的最小堆
function useMinHeap(compareFn = defaultCompare, initialArray = []) {
  if (!isValidArray(initialArray)) {
    throw '只能堆化数组';
  }
  
  const heapData = [...initialArray];
  
  if (heapData.length) {
    forHeapify(heapData, { targetIndex: 0, compareFn });
  }
  
  return {
    push: (value) => forHeapPush(heapData, { value, compareFn }),
    batchPush: (values) => forHeapBatchPush(heapData, { values, compareFn }),
    pop: () => forHeapPop(heapData, { compareFn }),
    peek: () => peekHeapTop(heapData),
    size: () => getHeapSize(heapData),
    isEmpty: () => isHeapEmpty(heapData),
    toArray: () => heapData,
    map: (...args) => heapData.map(...args)
  };
}

// 兼容层 - 保留原有类接口
export class MinHeap {
  constructor(比较函数 = (a, b) => a - b, 目标数组 = []) {
    // 转换比较函数格式以适应我们的函数式API
    const adaptedCompareFn = ([a, b]) => 比较函数(a, b);
    
    // 创建函数式最小堆实例
    const heap = useMinHeap(adaptedCompareFn, 目标数组);
    
    // 保存原始比较函数
    this.比较函数 = 比较函数;
    
    // 使用代理存储数据，以便支持中文方法名
    this.数据堆 = 目标数组;
    
    // 绑定方法
    this.添加 = this.push = (value) => {
      heap.push(value);
      this.数据堆 = heap.toArray(); // 更新内部数据
    };
    
    this.批量插入 = this.batchPush = (valueArray) => {
      heap.batchPush(valueArray);
      this.数据堆 = heap.toArray(); // 更新内部数据
    };
    
    this.取出顶部元素 = this.pop = () => {
      const result = heap.pop();
      this.数据堆 = heap.toArray(); // 更新内部数据
      return result;
    };
    
    this.查看顶部元素 = this.peek = () => heap.peek();
    
    this.获取堆大小 = this.size = () => heap.size();
    
    this.是否空堆 = this.isEmpty = () => heap.isEmpty();
    
    this.转化为数组 = this.toArray = () => heap.toArray();
    
    this.map = (...args) => heap.map(...args);
  }
  
  获取父节点索引(i) { return getParentIndex(i); }
  获取左侧子节点索引(i) { return getLeftChildIndex(i); }
  获取右侧子节点索引(i) { return getRightChildIndex(i); }
  
  交换节点(i, j) { 
    forHeapSwap(this.数据堆, { i, j }); 
  }
  
  堆化(目标索引) {
    forHeapify(this.数据堆, { 
      targetIndex: 目标索引,
      compareFn: ([a, b]) => this.比较函数(a, b)
    });
  }
}

export { MinHeap as 最小堆 };