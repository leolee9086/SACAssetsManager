
let gpu;
try {
    gpu = new GPU.GPU();
} catch (e) {
    gpu = new GPU();
}

export function bitonicSort(data, chunkSize=10000) {
    const numChunks = Math.ceil(data.length / chunkSize);
    const sortedData = new Float32Array(data.length);

    // 创建并运行每个块的排序内核
    for (let c = 0; c < numChunks; c++) {
        const startIdx = c * chunkSize;
        const endIdx = Math.min((c + 1) * chunkSize, data.length);
        const chunkLength = endIdx - startIdx;
        const chunkData = data.slice(startIdx, endIdx);

        const bitonicSortKernel = gpu.createKernel(function(data) {
            let i = this.thread.x;
            let j = this.thread.y;
            let ixj = i ^ j;

            if ((ixj) > i) {
                if ((i & this.constants.k) == 0 && data[i] > data[j]) {
                    let temp = data[i];
                    data[i] = data[j];
                    data[j] = temp;
                }
                if ((i & this.constants.k) != 0 && data[i] < data[j]) {
                    let temp = data[i];
                    data[i] = data[j];
                    data[j] = temp;
                }
            }
            return data[i];  // 返回处理后的单个元素
        }, {
            output: [chunkLength,chunkLength],
            constants: { k: 1 }  // 确保 k 常量在内核中定义
        });

        const sortedChunk = bitonicSortKernel(chunkData);
        sortedData.set(sortedChunk, startIdx);
    }

    // 合并块
    // 这里可以使用任何合适的多路归并排序算法来合并这些块
    mergeSortedChunks(sortedData, numChunks, chunkSize);

    return sortedData;
}

function mergeSortedChunks(data, numChunks, chunkSize) {
    console.log(data)
    const output = new Float32Array(data.length);
    const indices = new Array(numChunks).fill(0); // 记录每个块的当前索引
    const minHeap = [];

    // 初始化堆
    for (let i = 0; i < numChunks; i++) {
        const startIdx = i * chunkSize;
        if (startIdx < data.length) {
            minHeap.push({ value: data[startIdx], chunkIndex: i });
        }
    }

    // 创建最小堆的比较函数
    function heapify(index) {
        let smallest = index;
        const left = 2 * index + 1;
        const right = 2 * index + 2;

        if (left < minHeap.length && minHeap[left].value < minHeap[smallest].value) {
            smallest = left;
        }
        if (right < minHeap.length && minHeap[right].value < minHeap[smallest].value) {
            smallest = right;
        }

        if (smallest !== index) {
            [minHeap[index], minHeap[smallest]] = [minHeap[smallest], minHeap[index]];
            heapify(smallest);
        }
    }

    // 构建初始堆
    for (let i = Math.floor(minHeap.length / 2) - 1; i >= 0; i--) {
        heapify(i);
    }

    let outputIndex = 0;
    while (minHeap.length > 0) {
        // 弹出最小元素
        const smallest = minHeap[0];
        output[outputIndex++] = smallest.value;

        // 获取下一个元素
        const chunkIdx = smallest.chunkIndex;
        indices[chunkIdx]++;
        const nextIndex = chunkIdx * chunkSize + indices[chunkIdx];

        if (nextIndex < (chunkIdx + 1) * chunkSize && nextIndex < data.length) {
            minHeap[0] = { value: data[nextIndex], chunkIndex: chunkIdx };
        } else {
            minHeap[0] = minHeap[minHeap.length - 1];
            minHeap.pop();
        }

        heapify(0);
    }

    return output;
}



function generateBitonicSortKernel(maxLength) {
    return gpu.createKernel(function(data, stage, passOfStage) {
        const index = this.thread.x;
        const pairIndex = index ^ (1 << passOfStage);
        let value = data[index];

        if (pairIndex > index) {
            if ((index & (1 << stage)) === 0) {
                if (data[index] > data[pairIndex]) {
                    value = data[pairIndex];
                }
            } else {
                if (data[index] < data[pairIndex]) {
                    value = data[pairIndex];
                }
            }
        }
        return value;
    }, {
        output: [maxLength],
        pipeline: true,
        immutable:true
    });
}

function _bitonicSort(data) {
    const length = data.length;
    const bitonicSortKernel = generateBitonicSortKernel(length);

    let log2Length = Math.log2(length);
    if (Math.floor(log2Length) !== log2Length) {
        throw new Error('Array length must be a power of 2');
    }

    let sortedData = data;

    for (let stage = 0; stage < log2Length; stage++) {
        for (let passOfStage = 0; passOfStage <= stage; passOfStage++) {
            sortedData = bitonicSortKernel(sortedData, stage, passOfStage);
        }
    }

    // 将 GPU 输出转换为 JavaScript 数组
    if (sortedData.toArray) {
        sortedData = sortedData.toArray();
    }

    return sortedData;
}

// 示例数据
const length = 1024 * 1024; // 1M elements
const data = new Float32Array(length).fill().map(() => Math.random());

// 排序
const sortedData = _bitonicSort(data);
console.log(sortedData);