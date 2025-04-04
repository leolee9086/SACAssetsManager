import GPU from '../../../../../static/gpu.js'
import { projectAndSortPixels } from './projectAndSort.js';
let gpu;
try {
    gpu = new GPU.GPU();
} catch (e) {
    gpu = new GPU();
}

// Calculate covariance matrix
const covKernel = gpu.createKernel(function (dataR, dataG, dataB, meanR, meanG, meanB, totalPixels) {
    const row = Math.floor(this.thread.x / 3);
    const col = this.thread.x % 3;
    let sum = 0;

    for (let i = 0; i < totalPixels; i++) {
        const r = dataR[i] - meanR;
        const g = dataG[i] - meanG;
        const b = dataB[i] - meanB;

        if (row === 0 && col === 0) sum += r * r;
        else if (row === 0 && col === 1) sum += r * g;
        else if (row === 0 && col === 2) sum += r * b;
        else if (row === 1 && col === 0) sum += g * r;
        else if (row === 1 && col === 1) sum += g * g;
        else if (row === 1 && col === 2) sum += g * b;
        else if (row === 2 && col === 0) sum += b * r;
        else if (row === 2 && col === 1) sum += b * g;
        else if (row === 2 && col === 2) sum += b * b;
    }
    return sum / (totalPixels - 1);
}, {
    output: [9]
});
// Calculate means
const meanKernel = gpu.createKernel(function (dataR, dataG, dataB, totalPixels) {
    const idx = this.thread.x;
    let sum = 0;
    for (let i = 0; i < totalPixels; i++) {
        if (idx === 0) sum += dataR[i];
        if (idx === 1) sum += dataG[i];
        if (idx === 2) sum += dataB[i];
    }
    return sum / totalPixels;
}, {
    output: [3]
});

function initializeEigenVectors() {
    let eigenVectors = [];
    for (var i = 0; i < 3; i++) {
        eigenVectors[i] = [0, 0, 0];
    }
    return eigenVectors;
}

function mapUniformToGaussian(input, Rsorted, Gsorted, Bsorted, output) {
    const t0 = performance.now();
    
    const width = input.width;
    const height = input.height;
    const totalPixels = width * height;
    
    // 创建三个独立的内核，每个内核处理一个颜色通道
    const mapKernel = gpu.createKernel(function (totalPixels) {
        const index = this.thread.x;
        function erfinv(x) {
            let w = 0
            let p = 0
            w = - Math.log((1.0 - x) * (1.0 + x));
            if (w < 5.000000) {
                w = w - 2.500000;
                p = 2.81022636e-08;
                p = 3.43273939e-07 + p * w;
                p = -3.5233877e-06 + p * w;
                p = -4.39150654e-06 + p * w;
                p = 0.00021858087 + p * w;
                p = -0.00125372503 + p * w;
                p = -0.00417768164 + p * w;
                p = 0.246640727 + p * w;
                p = 1.50140941 + p * w;
            }
            else {
                w = Math.sqrt(w) - 3.000000;
                p = -0.000200214257;
                p = 0.000100950558 + p * w;
                p = 0.00134934322 + p * w;
                p = -0.00367342844 + p * w;
                p = 0.00573950773 + p * w;
                p = -0.0076224613 + p * w;
                p = 0.00943887047 + p * w;
                p = 1.00167406 + p * w;
                p = 2.83297682 + p * w;
            }
            return p * x;
        }
        const U = (index + 0.5) / totalPixels;
        const G = Math.sqrt(2.0) * erfinv(2 * U - 1.0);
        return G;
    }, {
        output: [totalPixels]
    });
    const t4 = performance.now();
    console.log('核函数创建时间:', t4 - t0, 'ms');

    // 运行内核并获取结果
    const resultsR = mapKernel(totalPixels);
    const resultsG = mapKernel(totalPixels);
    const resultsB = mapKernel(totalPixels);

    const t1 = performance.now();
    console.log('高斯映射计算时间:', t1 - t0, 'ms');

    // 将结果映射回输出数组
    for (let i = 0; i < totalPixels; i++) {
        const Rj = Rsorted[i].index_j;
        const Ri = Rsorted[i].index_i;
        const Gj = Gsorted[i].index_j;
        const Gi = Gsorted[i].index_i;
        const Bj = Bsorted[i].index_j;
        const Bi = Bsorted[i].index_i;
        output.dataR[Rj][Ri] = resultsR[i];
        output.dataG[Gj][Gi] = resultsG[i];
        output.dataB[Bj][Bi] = resultsB[i];
    }

    const t2 = performance.now();
    console.log('结果重组时间:', t2 - t1, 'ms');
    console.log('高斯映射总时间:', t2 - t0, 'ms');
}
function allocateAndComputeOutput(input, eigenVectors) {
    let { Rsorted, Gsorted, Bsorted } = projectAndSortPixels(input, eigenVectors);

    var output = { dataR: [], dataG: [], dataB: [], width: input.width, height: input.height };
    for (var j = 0; j < input.height; ++j) {
        output.dataR[j] = [];
        output.dataG[j] = [];
        output.dataB[j] = [];
        for (var i = 0; i < input.width; ++i) {
            output.dataR[j][i] = 0;
            output.dataG[j][i] = 0;
            output.dataB[j][i] = 0;
        }
    }

    mapUniformToGaussian(input, Rsorted, Gsorted, Bsorted, output);

    return output;
}


export async function makeHistoGaussianEigen(input) {
    console.log('开始处理图像:', input.width, 'x', input.height);
    const totalStart = performance.now();

    let eigenVectors = initializeEigenVectors();
    eigenVectors = await getImageRGBEigenVectors(input, eigenVectors);

    const t1 = performance.now();
    console.log('特征向量总计算时间:', t1 - totalStart, 'ms');

    let output =await allocateAndComputeOutput(input, eigenVectors);

    const t2 = performance.now();
    console.log('高斯映射时间:', t2 - t1, 'ms');
    console.log('总处理时间:', t2 - totalStart, 'ms');

    return { output, eigenVectors };
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}




async function getImageRGBEigenVectors(input, eigenVectors) {
    const t0 = performance.now();

    const width = input.width;
    const height = input.height;
    const totalPixels = width * height;

    // 使用 Uint8Array 替代 Float32Array，因为8位足够
    const flatR = new Uint8Array(totalPixels);
    const flatG = new Uint8Array(totalPixels);
    const flatB = new Uint8Array(totalPixels);
    
    for (let j = 0; j < height; j++) {
        const offset = j * width;
        for (let i = 0; i < width; i++) {
            flatR[offset + i] = input.dataR[j][i];
            flatG[offset + i] = input.dataG[j][i];
            flatB[offset + i] = input.dataB[j][i];
        }
    }

    const t1 = performance.now();
    console.log('数据准备时间:', t1 - t0, 'ms');
    const means = meanKernel(flatR, flatG, flatB, totalPixels);
    const t2 = performance.now();
    console.log('均值计算时间:', t2 - t1, 'ms');
    const covarMatrix = covKernel(flatR, flatG, flatB, means[0], means[1], means[2], totalPixels);
    const t3 = performance.now();
    console.log('协方差矩阵计算时间:', t3 - t2, 'ms');
    // Reconstruct covariance matrix
    const covarMat = [
        [covarMatrix[0], covarMatrix[1], covarMatrix[2]],
        [covarMatrix[3], covarMatrix[4], covarMatrix[5]],
        [covarMatrix[6], covarMatrix[7], covarMatrix[8]]
    ];

    // Calculate eigenvectors
    eigenVectors = await computeEigenValuesAndVectors(covarMat);

    const t4 = performance.now();
    console.log('特征向量计算时间:', t4 - t3, 'ms');

    return eigenVectors;
}

async function computeEigenValuesAndVectors(covarMat) {
    const t0 = performance.now();
    const n = 3; // 3x3 矩阵
    let A = covarMat;
    let eigenVectors = Array(n).fill().map((_, i) =>
        Array(n).fill().map((_, j) => i === j ? 1 : 0)
    );

    // Jacobi 迭代
    for (let nIter = 0; nIter < 10; nIter++) {
        for (let p = 0; p < n - 1; p++) {
            for (let q = p + 1; q < n; q++) {
                const Apq = A[p][q];
                const App = A[p][p];
                const Aqq = A[q][q];

                if (Apq !== 0) {
                    const phi = 0.5 * Math.atan2(2 * Apq, Aqq - App);
                    const c = Math.cos(phi);
                    const s = Math.sin(phi);

                    // 构建旋转矩阵 S
                    let S = Array(n).fill().map((_, i) =>
                        Array(n).fill().map((_, j) => {
                            if (i === p && j === p) return c;
                            if (i === q && j === q) return c;
                            if (i === p && j === q) return -s;
                            if (i === q && j === p) return s;
                            return i === j ? 1 : 0;
                        })
                    );

                    // 计算 S^T * A * S
                    let newA = Array(n).fill().map(() => Array(n).fill(0));
                    let newEigenVectors = Array(n).fill().map(() => Array(n).fill(0));

                    // 矩阵乘法: S^T * A
                    let temp = Array(n).fill().map(() => Array(n).fill(0));
                    for (let i = 0; i < n; i++) {
                        for (let j = 0; j < n; j++) {
                            for (let k = 0; k < n; k++) {
                                temp[i][j] += S[k][i] * A[k][j];
                            }
                        }
                    }

                    // 矩阵乘法: (S^T * A) * S
                    for (let i = 0; i < n; i++) {
                        for (let j = 0; j < n; j++) {
                            for (let k = 0; k < n; k++) {
                                newA[i][j] += temp[i][k] * S[k][j];
                            }
                        }
                    }

                    // 更新特征向量: eigenVectors * S
                    for (let i = 0; i < n; i++) {
                        for (let j = 0; j < n; j++) {
                            for (let k = 0; k < n; k++) {
                                newEigenVectors[i][j] += eigenVectors[i][k] * S[k][j];
                            }
                        }
                    }

                    A = newA;
                    eigenVectors = newEigenVectors;
                }
            }
        }
    }

    const t1 = performance.now();
    console.log('Jacobi迭代计算时间:', t1 - t0, 'ms');

    return eigenVectors;
}

export async function unmakeHistoGaussianEigen(input, target, eigenVectors) {
    const t0 = performance.now();

    // Sort target values
    let Rsorted = [];
    let Gsorted = [];
    let Bsorted = [];
    for (var j = 0; j < target.height; ++j)
        for (var i = 0; i < target.width; ++i) {
            var p = [target.dataR[j][i], target.dataG[j][i], target.dataB[j][i]];
            Rsorted[i + j * target.width] = dot(p, eigenVectors[0]);
            Gsorted[i + j * target.width] = dot(p, eigenVectors[1]);
            Bsorted[i + j * target.width] = dot(p, eigenVectors[2]);
        }
    Rsorted = Float32Array.from(Rsorted).toSorted();
    Gsorted = Float32Array.from(Gsorted).toSorted();
    Bsorted = Float32Array.from(Bsorted).toSorted();

    const t1 = performance.now();
    console.log('目标值排序时间:', t1 - t0, 'ms');

    // GPU processing
    const targetSize = target.width * target.height;
    const gpuKernel = gpu.createKernel(function (dataR, dataG, dataB, Rsorted, Gsorted, Bsorted, eigenVectors) {
        const idx = this.thread.x;
        const j = Math.floor(idx / this.constants.width);
        const i = idx % this.constants.width;

        function erf(x) {
            var a1 = 0.254829592;
            var a2 = -0.284496736;
            var a3 = 1.421413741;
            var a4 = -1.453152027;
            var a5 = 1.061405429;
            var p = 0.3275911;
            var sign = x < 0 ? -1 : 1;
            x = Math.abs(x);
            var t = 1.0 / (1.0 + p * x);
            var y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
            return sign * y;
        }

        function mapValue(value, sorted) {
            var U = 0.5 + 0.5 * erf(value / Math.sqrt(2.0));
            var index = Math.floor(U * this.constants.targetSize);
            return sorted[index];
        }
        let r = mapValue(dataR[j][i], Rsorted) * eigenVectors[0] + mapValue(dataG[j][i], Gsorted) * eigenVectors[3] + mapValue(dataB[j][i], Bsorted) * eigenVectors[6];
        let g = mapValue(dataR[j][i], Rsorted) * eigenVectors[1] + mapValue(dataG[j][i], Gsorted) * eigenVectors[4] + mapValue(dataB[j][i], Bsorted) * eigenVectors[7];
        let b = mapValue(dataR[j][i], Rsorted) * eigenVectors[2] + mapValue(dataG[j][i], Gsorted) * eigenVectors[5] + mapValue(dataB[j][i], Bsorted) * eigenVectors[8];
        return [r, g, b];
    }, {
        constants: { width: input.width, height: input.height, targetSize: targetSize },
        output: [input.width * input.height],
        returnType: 'Array(3)'
    });
    const output = gpuKernel(input.dataR, input.dataG, input.dataB, Rsorted, Gsorted, Bsorted, eigenVectors.flat());

    const t2 = performance.now();
    console.log('GPU反向映射时间:', t2 - t1, 'ms');

    // Reconstruct output
    var outputData = { dataR: [], dataG: [], dataB: [], width: input.width, height: input.height };
    for (var j = 0; j < input.height; ++j) {
        outputData.dataR[j] = output.slice(j * input.width, (j + 1) * input.width).map(pixel => pixel[0]);
        outputData.dataG[j] = output.slice(j * input.width, (j + 1) * input.width).map(pixel => pixel[1]);
        outputData.dataB[j] = output.slice(j * input.width, (j + 1) * input.width).map(pixel => pixel[2]);
    }

    const t3 = performance.now();
    console.log('输出重构时间:', t3 - t2, 'ms');
    console.log('总反向映射时间:', t3 - t0, 'ms');

    return outputData;
}
