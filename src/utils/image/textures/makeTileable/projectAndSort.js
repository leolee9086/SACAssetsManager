import GPU from '../../../../../static/gpu.js'
let gpu;
try {
    gpu = new GPU.GPU();
} catch (e) {
    gpu = new GPU();
}

// 将数据扁平化为 Uint8Arrays
function flattenInputData(input) {
    const totalPixels = input.width * input.height;
    const dataR = new Uint8Array(totalPixels);
    const dataG = new Uint8Array(totalPixels);
    const dataB = new Uint8Array(totalPixels);
    
    let idx = 0;
    for (let i = 0; i < input.dataR.length; i++) {
        for (let j = 0; j < input.dataR[i].length; j++) {
            dataR[idx] = input.dataR[i][j];
            dataG[idx] = input.dataG[i][j];
            dataB[idx] = input.dataB[i][j];
            idx++;
        }
    }
    return { dataR, dataG, dataB };
}

// 创建并执行 GPU 投影计算
function createProjectionKernel(input, flatData, flatEigenVectors) {
    const gpuKernel = gpu.createKernel(function (dataR, dataG, dataB, eigenVectors) {
        const idx = this.thread.x;
        const pixelR = dataR[idx];
        const pixelG = dataG[idx];
        const pixelB = dataB[idx];
        function _dot(px, py, pz, ev) { return px * ev[0] + py * ev[1] + pz * ev[2]; }
        const values = [
            _dot(pixelR, pixelG, pixelB, [eigenVectors[0], eigenVectors[1], eigenVectors[2]]),
            _dot(pixelR, pixelG, pixelB, [eigenVectors[3], eigenVectors[4], eigenVectors[5]]),
            _dot(pixelR, pixelG, pixelB, [eigenVectors[6], eigenVectors[7], eigenVectors[8]])
        ];
        return values;
    }, {
        constants: { width: input.width },
        output: [input.width * input.height],
        returnType: 'Array(3)'
    });
    
    return gpuKernel(flatData.dataR, flatData.dataG, flatData.dataB, flatEigenVectors);
}

// 创建排序后的数组
function createSortedArrays(result, totalPixels, width) {
    const createSortedArray = (channelIndex) => {
        const arr = new Array(totalPixels);
        for (let index = 0; index < totalPixels; index++) {
            arr[index] = {
                index_i: index % width,
                index_j: Math.floor(index / width),
                value: result[index][channelIndex]
            };
        }
        return arr.sort((a, b) => a.value - b.value);
    };

    return {
        Rsorted: createSortedArray(0),
        Gsorted: createSortedArray(1),
        Bsorted: createSortedArray(2)
    };
}

export function projectAndSortPixels(input, eigenVectors) {
    const t0 = performance.now();
    
    const flatData = flattenInputData(input);
    const t1 = performance.now();
    console.log('数据扁平化时间:', t1 - t0, 'ms');

    const flatEigenVectors = eigenVectors.flat();
    const result = createProjectionKernel(input, flatData, flatEigenVectors);
    const t2 = performance.now();
    console.log('GPU投影计算时间:', t2 - t1, 'ms');

    const totalPixels = input.width * input.height;
    const sortedArrays = createSortedArrays(result, totalPixels, input.width);
    const t3 = performance.now();
    console.log('数据重组和排序时间:', t3 - t2, 'ms');

    return sortedArrays;
}
