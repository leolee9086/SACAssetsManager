import GPU from '../../../../../static/gpu.js'
let gpu;
try {
    gpu = new GPU.GPU();
} catch (e) {
    gpu = new GPU();
}

function initializeEigenVectors() {
    let eigenVectors = [];
    for (var i = 0; i < 3; i++) {
        eigenVectors[i] = [0, 0, 0];
    }
    return eigenVectors;
}

function mapUniformToGaussian(input, Rsorted, Gsorted, Bsorted, output) {
    const width = input.width;
    const height = input.height;
    const totalPixels = width * height;
    // 创建三个独立的内核，每个内核处理一个颜色通道
    const kernel = gpu.createKernel(function (totalPixels) {
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
    // 运行内核并获取结果
    const resultsR = kernel(totalPixels);
    const resultsG = kernel(totalPixels);
    const resultsB = kernel(totalPixels);

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

function projectAndSortPixels(input, eigenVectors) {
    // Flatten input data and eigenVectors for GPU processing
    const dataR = input.dataR.flat();
    const dataG = input.dataG.flat();
    const dataB = input.dataB.flat();
    const flatEigenVectors = eigenVectors.flat();
    const gpuKernel = gpu.createKernel(function (dataR, dataG, dataB, eigenVectors) {
        const idx = this.thread.x;
        const i = idx % this.constants.width;
        const j = Math.floor(idx / this.constants.width);
        const pixelR = dataR[idx];
        const pixelG = dataG[idx];
        const pixelB = dataB[idx];
        function _dot(px, py, pz, ev) { return px * ev[0] + py * ev[1] + pz * ev[2]; }
        const values = [
            _dot(pixelR, pixelG, pixelB, [eigenVectors[0], eigenVectors[1], eigenVectors[2]]),
            _dot(pixelR, pixelG, pixelB, [eigenVectors[3], eigenVectors[4], eigenVectors[5]]),
            _dot(pixelR, pixelG, pixelB, [eigenVectors[6], eigenVectors[7], eigenVectors[8]])
        ];
        return values

    }, {
        constants: { width: input.width },
        output: [input.width * input.height],
        returnType: 'Array(3)'
    });
    const result = gpuKernel(dataR, dataG, dataB, flatEigenVectors)
    const Rsorted = [];
    const Gsorted = [];
    const Bsorted = [];
    for (let index = 0; index < result.length; index++) {
        const i = index % input.width;
        const j = Math.floor(index / input.width);
        Rsorted.push({ index_i: i, index_j: j, value: result[index][0] });
        Gsorted.push({ index_i: i, index_j: j, value: result[index][1] });
        Bsorted.push({ index_i: i, index_j: j, value: result[index][2] });
    }
    Rsorted.sort((a, b) => a.value - b.value);
    Gsorted.sort((a, b) => a.value - b.value);
    Bsorted.sort((a, b) => a.value - b.value);
    return { Rsorted, Gsorted, Bsorted };
}

export async function makeHistoGaussianEigen(input) {
    let eigenVectors = initializeEigenVectors();
    eigenVectors = await getImageRGBEigenVectors(input, eigenVectors);
    let output = allocateAndComputeOutput(input, eigenVectors);
    return { output, eigenVectors };
}

function addVector3(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function mulVector3(a, b) {
    return [a[0] * b, a[1] * b, a[2] * b];
}
function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
async function getImageRGBEigenVectors(input, eigenVectors) {
    const width = input.width;
    const height = input.height;
    const totalPixels = width * height;

    // 使用 GPU.js 计算均值
    const meanKernel = gpu.createKernel(function(dataR, dataG, dataB, totalPixels) {
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

    // 计算均值
    const flatR = input.dataR.flat();
    const flatG = input.dataG.flat();
    const flatB = input.dataB.flat();
    const means = meanKernel(flatR, flatG, flatB, totalPixels);

    // 计算协方差矩阵
    const covKernel = gpu.createKernel(function(dataR, dataG, dataB, meanR, meanG, meanB, totalPixels) {
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

    const covarMatrix = covKernel(flatR, flatG, flatB, means[0], means[1], means[2], totalPixels);
    
    // 重构3x3协方差矩阵
    const covarMat = [
        [covarMatrix[0], covarMatrix[1], covarMatrix[2]],
        [covarMatrix[3], covarMatrix[4], covarMatrix[5]],
        [covarMatrix[6], covarMatrix[7], covarMatrix[8]]
    ];

    // 计算特征向量
    eigenVectors = await computeEigenValuesAndVectors(covarMat);
    return eigenVectors;
}

async function computeEigenValuesAndVectors(covarMat) {
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

    return eigenVectors;
}


export function unmakeHistoGaussianEigen(input, target, eigenVectors) {
    // sort target values
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
    //  Rsorted=  Float32Array.from(Rsorted).sort(function (a, b) { return a - b; });
    // Gsorted= Float32Array.from(Gsorted).sort(function (a, b) { return a - b; });
    // Bsorted=  Float32Array.from(Bsorted).sort(function (a, b) { return a - b; });
    Rsorted = Float32Array.from(Rsorted).toSorted();
    Gsorted = Float32Array.from(Gsorted).toSorted();
    Bsorted = Float32Array.from(Bsorted).toSorted();
    // allocate output
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
    // Reconstruct the output image
    var outputData = { dataR: [], dataG: [], dataB: [], width: input.width, height: input.height };
    for (var j = 0; j < input.height; ++j) {
        outputData.dataR[j] = output.slice(j * input.width, (j + 1) * input.width).map(pixel => pixel[0]);
        outputData.dataG[j] = output.slice(j * input.width, (j + 1) * input.width).map(pixel => pixel[1]);
        outputData.dataB[j] = output.slice(j * input.width, (j + 1) * input.width).map(pixel => pixel[2]);
    }
    return outputData;
}
