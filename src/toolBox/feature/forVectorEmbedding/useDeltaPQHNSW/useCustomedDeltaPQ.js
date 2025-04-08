/**
 * DeltaPQ (Delta Product Quantization) 算法实现
 * 一种高效的向量压缩与快速检索算法
 * 支持动态插入与删除操作
 */

// 常量定义
const DEFAULT_NUM_SUBVECTORS = 8;     // 子向量数量
const DEFAULT_BITS_PER_CODE = 8;      // 每个子向量编码位数
const DEFAULT_SAMPLE_SIZE = 1000;     // 训练样本量
const DEFAULT_MAX_ITERATIONS = 25;    // K-means最大迭代次数
import {
  computeEuclideanDistance,
  computeManhattanDistance,
  computeCosineDistance,
  computeInnerProduct
} from "../../../base/forMath/forGeometry/forVectors/forDistance.js";

// 支持的距离度量类型
export const DISTANCE_METRICS = {
  EUCLIDEAN: 'euclidean',
  MANHATTAN: 'manhattan',
  CHEBYSHEV: 'chebyshev',
  COSINE: 'cosine',
  INNER_PRODUCT: 'innerProduct'
};

/**
 * 检测向量是否已经归一化
 * @param {Float32Array|Array} vector - 需要检测的向量
 * @param {number} tolerance - 误差容忍度
 * @returns {boolean} 是否已归一化
 */
function isNormalized(vector, tolerance = 1e-6) {
  if (!vector || vector.length === 0) return false;
  
  let sumSquares = 0;
  for (let i = 0; i < vector.length; i++) {
    sumSquares += vector[i] * vector[i];
  }
  
  // 模长应接近1.0
  return Math.abs(sumSquares - 1.0) < tolerance;
}

/**
 * 随机检测向量集合是否已归一化
 * @param {Array<Float32Array|Array>} vectors - 向量集合
 * @param {number} sampleCount - 抽样检测数量
 * @returns {boolean} 是否已归一化
 */
function checkVectorsNormalization(vectors, sampleCount = 5) {
  if (!vectors || vectors.length === 0) return false;
  
  // 确保抽样数量不超过向量总数
  const actualSampleCount = Math.min(sampleCount, vectors.length);
  let normalizedCount = 0;
  let totalError = 0;
  
  // 随机抽样检测
  for (let i = 0; i < actualSampleCount; i++) {
    const randomIndex = Math.floor(Math.random() * vectors.length);
    const vector = vectors[randomIndex];
    
    if (!vector) continue;
    
    let sumSquares = 0;
    for (let j = 0; j < vector.length; j++) {
      if (typeof vector[j] !== 'number' || isNaN(vector[j])) continue;
      sumSquares += vector[j] * vector[j];
    }
    
    const error = Math.abs(sumSquares - 1.0);
    totalError += error;
    
    if (error < 1e-6) {
      normalizedCount++;
    }
  }
  
  // 记录结果
  const avgError = totalError / actualSampleCount;
  console.log(`向量归一化检测: ${normalizedCount}/${actualSampleCount} 通过, 平均误差=${avgError.toFixed(8)}`);
  
  // 要求至少90%的样本通过验证
  return normalizedCount >= Math.ceil(actualSampleCount * 0.9);
}

/**
 * 获取距离函数
 * @param {string} metric - 距离度量类型
 * @returns {Function} 距离计算函数
 */
function getDistanceFunction(metric) {
  switch (metric) {
    case DISTANCE_METRICS.EUCLIDEAN:
      return computeEuclideanDistance;
    case DISTANCE_METRICS.MANHATTAN:
      return computeManhattanDistance;
  //  case DISTANCE_METRICS.CHEBYSHEV:
    //  return computeChebyshevDistance;
    case DISTANCE_METRICS.COSINE:
      return computeCosineDistance;
    case DISTANCE_METRICS.INNER_PRODUCT:
      // 内积用于相似度，需要转换为距离度量（值越小越相似）
      return (a, b) => -computeInnerProduct(a, b);
    default:
      console.warn(`未知的距离度量类型: ${metric}，使用默认的欧几里得距离`);
      return computeEuclideanDistance;
  }
}

/**
 * 随机选择数组中的一个元素
 * @param {Array} array - 输入数组
 * @returns {*} 随机选择的元素
 */
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 随机初始化聚类中心
 * @param {Array<Array|Float32Array>} data - 数据集
 * @param {number} k - 聚类数
 * @param {Function} distanceFunction - 距离计算函数
 * @returns {Array<Array|Float32Array>} 聚类中心
 */
function initializeCentroids(data, k, distanceFunction) {
  // k-means++ 初始化
  const centroids = [];
  
  // 随机选择第一个中心
  centroids.push(Array.from(getRandomElement(data)));
  
  // 选择剩余的中心
  for (let i = 1; i < k; i++) {
    // 计算每个点到最近中心的距离
    const distances = data.map(point => {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const dist = distanceFunction(point, centroid);
        minDist = Math.min(minDist, dist);
      }
      return minDist;
    });
    
    // 按距离的平方作为概率选择新中心
    const sumDistances = distances.reduce((a, b) => a + b, 0);
    const probabilities = distances.map(d => d / sumDistances);
    
    // 累积概率
    let cumulativeProb = 0;
    const cumulativeProbabilities = probabilities.map(p => {
      cumulativeProb += p;
      return cumulativeProb;
    });
    
    // 随机选择新中心
    const rand = Math.random();
    let index = 0;
    while (index < cumulativeProbabilities.length && 
           cumulativeProbabilities[index] < rand) {
      index++;
    }
    
    centroids.push(Array.from(data[index]));
  }
  
  return centroids;
}

/**
 * 对数据集执行K-means聚类
 * @param {Array<Array|Float32Array>} data - 数据集
 * @param {number} k - 聚类数
 * @param {number} maxIterations - 最大迭代次数
 * @param {Function} distanceFunction - 距离计算函数
 * @returns {Array<Array|Float32Array>} 聚类中心
 */
function kMeans(data, k, maxIterations = DEFAULT_MAX_ITERATIONS, distanceFunction) {
  // 添加防御性检查
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error('K-means错误: 无效的数据集', { dataLength: data?.length });
    return Array(k).fill().map(() => Array(10).fill(0)); // 返回默认聚类中心
  }
  
  // 过滤掉无效数据点
  const validData = data.filter(point => 
    point && point.length > 0 && 
    !Array.from(point).some(val => typeof val !== 'number' || isNaN(val))
  );
  
  if (validData.length === 0) {
    console.error('K-means错误: 数据集中没有有效的数据点');
    return Array(k).fill().map(() => Array(data[0]?.length || 10).fill(0));
  }
  
  // 标准化维度，确保所有点都具有相同的维度
  const dimension = validData[0].length;
  for (let i = 1; i < validData.length; i++) {
    if (validData[i].length !== dimension) {
      console.warn(`K-means警告: 数据点${i}的维度(${validData[i].length})与期望维度(${dimension})不匹配`);
      // 填充或截断向量以匹配维度
      const normalizedPoint = new Float32Array(dimension).fill(0);
      for (let j = 0; j < Math.min(dimension, validData[i].length); j++) {
        normalizedPoint[j] = validData[i][j];
      }
      validData[i] = normalizedPoint;
    }
  }
  
  if (validData.length <= k) {
    // 如果数据点少于聚类数，直接返回数据点并填充剩余的
    const centroids = validData.map(d => Array.from(d));
    while (centroids.length < k) {
      // 复制现有中心点或创建零向量
      if (centroids.length > 0) {
        centroids.push(Array.from(centroids[0]));
      } else {
        centroids.push(Array(dimension).fill(0));
      }
    }
    return centroids;
  }
  
  // 初始化聚类中心
  let centroids = initializeCentroids(validData, k, distanceFunction);
  let assignments = new Array(validData.length).fill(0);
  let changed = true;
  let iteration = 0;
  
  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;
    
    // 分配步骤：将每个点分配到最近的中心
    for (let i = 0; i < validData.length; i++) {
      let minDist = Infinity;
      let newCluster = 0;
      
      for (let j = 0; j < k; j++) {
        const dist = distanceFunction(validData[i], centroids[j]);
        if (dist < minDist && dist !== Infinity) { // 忽略无效距离
          minDist = dist;
          newCluster = j;
        }
      }
      
      if (assignments[i] !== newCluster) {
        assignments[i] = newCluster;
        changed = true;
      }
    }
    
    // 更新步骤：重新计算聚类中心
    const newCentroids = Array(k).fill().map(() => Array(dimension).fill(0));
    const counts = Array(k).fill(0);
    
    for (let i = 0; i < validData.length; i++) {
      const cluster = assignments[i];
      counts[cluster]++;
      
      for (let j = 0; j < validData[i].length; j++) {
        newCentroids[cluster][j] += validData[i][j];
      }
    }
    
    // 计算新中心
    for (let i = 0; i < k; i++) {
      if (counts[i] > 0) {
        for (let j = 0; j < newCentroids[i].length; j++) {
          newCentroids[i][j] /= counts[i];
        }
        centroids[i] = newCentroids[i];
      } else {
        // 处理空聚类 - 随机选择一个有效数据点
        centroids[i] = Array.from(getRandomElement(validData));
      }
    }
  }
  
  return centroids;
}

/**
 * 将向量分解为子向量
 * @param {Float32Array|Array} vector - 输入向量
 * @param {number} numSubvectors - 子向量数量
 * @returns {Array<Float32Array>} 子向量数组
 */
function splitVector(vector, numSubvectors) {
  // 添加防御性检查
  if (!vector || vector.length === 0) {
    console.error('分割向量错误: 无效的输入向量', { vector });
    return Array(numSubvectors).fill().map(() => new Float32Array(1).fill(0));
  }
  
  if (!numSubvectors || numSubvectors <= 0) {
    console.error('分割向量错误: 无效的子向量数量', { numSubvectors });
    return [new Float32Array(vector.length)].map((_, i) => vector[i] || 0);
  }
  
  const dimension = vector.length;
  // 计算子向量基本大小和需要扩展的子向量数量
  const baseSubvectorSize = Math.floor(dimension / numSubvectors);
  const extraDimensions = dimension % numSubvectors;
  
  const subvectors = [];
  let currentDim = 0;
  
  for (let i = 0; i < numSubvectors; i++) {
    // 确定当前子向量的大小，前extraDimensions个子向量额外分配1个维度
    const subvectorSize = baseSubvectorSize + (i < extraDimensions ? 1 : 0);
    
    if (currentDim >= dimension) {
      // 如果超出维度，添加空向量以保持子向量数量一致
      subvectors.push(new Float32Array(baseSubvectorSize > 0 ? baseSubvectorSize : 1).fill(0));
      continue;
    }
    
    // 确保子向量有合理的大小
    const actualSize = Math.min(subvectorSize, dimension - currentDim);
    const subvector = new Float32Array(actualSize);
    
    for (let j = 0; j < actualSize; j++) {
      // 确保值是有效数字
      const value = vector[currentDim + j];
      subvector[j] = (typeof value === 'number' && !isNaN(value)) ? value : 0;
    }
    
    subvectors.push(subvector);
    currentDim += actualSize;
  }
  
  return subvectors;
}

/**
 * 快速分割向量 - 针对性能优化
 * @param {Float32Array} vector - 输入向量 
 * @param {number} numSubvectors - 子向量数量
 * @returns {Array<Float32Array>} 子向量数组
 */
function splitVectorFast(vector, numSubvectors) {
  const dimension = vector.length;
  
  // 计算子向量基本大小和需要扩展的子向量数量
  const baseSubvectorSize = Math.floor(dimension / numSubvectors);
  const extraDimensions = dimension % numSubvectors;
  
  const subvectors = new Array(numSubvectors);
  let currentDim = 0;
  
  for (let i = 0; i < numSubvectors; i++) {
    // 确定当前子向量的大小，均匀分布额外维度
    const subvectorSize = baseSubvectorSize + (i < extraDimensions ? 1 : 0);
    
    if (currentDim >= dimension) {
      // 如果已经处理完所有维度，创建零向量
      subvectors[i] = new Float32Array(baseSubvectorSize > 0 ? baseSubvectorSize : 1).fill(0);
      continue;
    }
    
    // 确保子向量有合理的大小
    const actualSize = Math.min(subvectorSize, dimension - currentDim);
    
    // 使用subarray快速创建子向量视图（避免复制）
    // 注意：如果需要修改子向量，这里应使用slice()来创建副本
    subvectors[i] = new Float32Array(vector.buffer, 
                                    vector.byteOffset + currentDim * Float32Array.BYTES_PER_ELEMENT,
                                    actualSize);
    
    currentDim += actualSize;
  }
  
  return subvectors;
}

/**
 * 创建DeltaPQ量化器
 * 用于高效向量压缩和检索
 */
export function createDeltaPQ({
  numSubvectors = DEFAULT_NUM_SUBVECTORS,
  bitsPerCode = DEFAULT_BITS_PER_CODE,
  sampleSize = DEFAULT_SAMPLE_SIZE,
  maxIterations = DEFAULT_MAX_ITERATIONS,
  distanceMetric = DISTANCE_METRICS.EUCLIDEAN
} = {}) {
  // 每个子空间的聚类数
  let numClusters = Math.pow(2, bitsPerCode);
  
  // 存储子空间聚类中心
  let codebooks = null;
  
  // 计算向量维度
  let vectorDimension = null;
  
  // 子向量大小
  let subvectorSize = null;
  
  // 中心向量
  let centerVector = null;
  
  // 中心向量的范数（用于余弦距离）
  let centerVectorNorm = null;
  
  // 预计算的距离表
  let distanceTables = null;
  
  // 训练标志
  let isTrained = false;
  
  // 距离计算函数
  const distanceFunction = getDistanceFunction(distanceMetric);
  
  // 添加当前距离度量的获取方法
  function getMetric() {
    return distanceMetric;
  }
  
  /**
   * 计算量化误差
   * @param {Float32Array|Array} original - 原始向量
   * @param {Float32Array|Array} quantized - 量化向量
   * @returns {number} MSE误差
   */
  function computeQuantizationError(original, quantized) {
    let sum = 0;
    for (let i = 0; i < original.length; i++) {
      const diff = original[i] - quantized[i];
      sum += diff * diff;
    }
    return sum / original.length;
  }
  
  /**
   * 量化一个向量 - 性能优化版本
   * @param {Float32Array|Array} vector - 输入向量
   * @param {boolean} [fast=false] - 是否使用快速路径（跳过某些检查）
   * @returns {{codes: Uint8Array, deltaVector: Float32Array}} 量化结果
   */
  function quantizeVector(vector, fast = false) {
    if (!isTrained) {
      throw new Error('DeltaPQ not trained');
    }
    
    // 验证向量
    if (!vector || vector.length === 0) {
      throw new Error('无效向量');
    }
    
    // 确保向量维度正确
    if (vector.length !== vectorDimension) {
      // 如果向量维度不匹配，尝试调整
      const resized = new Float32Array(vectorDimension);
      const copyLength = Math.min(vector.length, vectorDimension);
      for (let i = 0; i < copyLength; i++) {
        resized[i] = vector[i];
      }
      vector = resized;
    }

    // 如果是余弦距离，确保向量已归一化
    if (distanceMetric === DISTANCE_METRICS.COSINE) {
      const isVectorNormalized = isNormalized(vector);
      if (!isVectorNormalized) {
        // 不直接抛出错误，而是自动进行归一化
        console.warn('量化警告: 余弦距离模式下检测到非归一化向量，进行自动归一化');
        vector = normalizeVector(vector);
      }
    }
    
    // 计算delta向量 (相对于中心向量)
    const deltaVector = new Float32Array(vectorDimension);
    for (let i = 0; i < vectorDimension; i++) {
      deltaVector[i] = vector[i] - centerVector[i];
    }
    
    // 将delta向量分割成子向量
    let subvectors;
    if (fast) {
      subvectors = splitVectorFast(deltaVector, numSubvectors);
    } else {
      subvectors = balancedSplitVector(deltaVector, numSubvectors);
    }
    
    // 存储量化编码
    const codes = new Uint8Array(numSubvectors);
    
    // 对每个子向量找到最近的码本向量
    for (let i = 0; i < numSubvectors; i++) {
      let bestCode = 0;
      let minDist = Infinity;
      const subvector = subvectors[i];
      
      // 如果使用预计算的距离表
      if (distanceTables && distanceMetric === DISTANCE_METRICS.EUCLIDEAN) {
        // 快速欧几里得距离查找
        let bestSimilarity = -Infinity;
        
        for (let j = 0; j < numClusters; j++) {
          const centroid = codebooks[i][j];
          
          if (centroid.length !== subvector.length) continue;
          
          // 对于归一化向量，直接使用点积计算相似度
          let dotProduct = 0;
          let normA = 0;
          let normB = 0;
          
          // 使用块处理优化点积计算
          const blockSize = 4;
          const length = subvector.length;
          let k = 0;
          
          // 分块计算点积
          for (; k + blockSize <= length; k += blockSize) {
            const s_k = subvector[k];
            const s_k1 = subvector[k+1];
            const s_k2 = subvector[k+2];
            const s_k3 = subvector[k+3];
            
            const c_k = centroid[k];
            const c_k1 = centroid[k+1];
            const c_k2 = centroid[k+2];
            const c_k3 = centroid[k+3];
            
            dotProduct += s_k * c_k + s_k1 * c_k1 + s_k2 * c_k2 + s_k3 * c_k3;
            normA += s_k * s_k + s_k1 * s_k1 + s_k2 * s_k2 + s_k3 * s_k3;
            normB += c_k * c_k + c_k1 * c_k1 + c_k2 * c_k2 + c_k3 * c_k3;
          }
          
          // 处理剩余元素
          for (; k < length; k++) {
            dotProduct += subvector[k] * centroid[k];
            normA += subvector[k] * subvector[k];
            normB += centroid[k] * centroid[k];
          }
          
          // 计算余弦相似度
          const normProduct = Math.sqrt(normA) * Math.sqrt(normB);
          const similarity = normProduct > 1e-10 ? dotProduct / normProduct : 0;
          
          // 选择相似度最大的聚类中心
          if (similarity > bestSimilarity) {
            bestSimilarity = similarity;
            bestCode = j;
            minDist = 1 - similarity; // 更新minDist以便兼容返回值
          }
        }
      }
      else if (distanceMetric === DISTANCE_METRICS.COSINE) {
        // 余弦距离优化 - 直接计算相似度
        let maxSimilarity = -1;
        
        for (let j = 0; j < numClusters; j++) {
          const centroid = codebooks[i][j];
          
          // 确保码本中心点和子向量维度匹配
          if (centroid.length !== subvector.length) {
            continue;
          }
          
          // 对于归一化向量，直接使用点积计算相似度
          let dotProduct = 0;
          let normA = 0;
          let normB = 0;
          
          // 使用块处理优化点积计算
          const blockSize = 4;
          const length = subvector.length;
          let k = 0;
          
          // 分块计算点积
          for (; k + blockSize <= length; k += blockSize) {
            const s_k = subvector[k];
            const s_k1 = subvector[k+1];
            const s_k2 = subvector[k+2];
            const s_k3 = subvector[k+3];
            
            const c_k = centroid[k];
            const c_k1 = centroid[k+1];
            const c_k2 = centroid[k+2];
            const c_k3 = centroid[k+3];
            
            dotProduct += s_k * c_k + s_k1 * c_k1 + s_k2 * c_k2 + s_k3 * c_k3;
            normA += s_k * s_k + s_k1 * s_k1 + s_k2 * s_k2 + s_k3 * s_k3;
            normB += c_k * c_k + c_k1 * c_k1 + c_k2 * c_k2 + c_k3 * c_k3;
          }
          
          // 处理剩余元素
          for (; k < length; k++) {
            dotProduct += subvector[k] * centroid[k];
            normA += subvector[k] * subvector[k];
            normB += centroid[k] * centroid[k];
          }
          
          // 计算余弦相似度
          const normProduct = Math.sqrt(normA) * Math.sqrt(normB);
          const similarity = normProduct > 1e-10 ? dotProduct / normProduct : 0;
          
          // 选择相似度最大的聚类中心
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            bestCode = j;
            minDist = 1 - similarity; // 更新minDist以便兼容返回值
          }
        }
      }
      else {
        // 其他距离度量
        for (let j = 0; j < numClusters; j++) {
          const centroid = codebooks[i][j];
          
          // 确保码本中心点和子向量维度匹配
          if (centroid.length !== subvector.length) {
            continue;
          }
          
          const dist = distanceFunction(subvector, centroid);
          
          if (dist < minDist) {
            minDist = dist;
            bestCode = j;
          }
        }
      }
      
      codes[i] = bestCode;
    }
    
    return { codes, deltaVector };
  }
  
  /**
   * 反量化向量（将量化编码转换回近似向量）
   * @param {Uint8Array} codes - 量化编码
   * @returns {Float32Array} 反量化向量
   */
  function dequantizeVector(codes) {
    if (!isTrained) {
      throw new Error('DeltaPQ not trained');
    }
    
    // 创建结果向量
    const result = new Float32Array(vectorDimension);
    
    // 复制中心向量
    for (let i = 0; i < vectorDimension; i++) {
      result[i] = centerVector[i];
    }
    
    // 预计算子向量大小和起始索引，提高效率
    const subvectorSizes = new Array(numSubvectors);
    const subvectorStartIndices = new Array(numSubvectors);
    
    const baseSubvectorSize = Math.floor(vectorDimension / numSubvectors);
    const extraDimensions = vectorDimension % numSubvectors;
    
    let currentDim = 0;
    for (let i = 0; i < numSubvectors; i++) {
      const subvectorSize = baseSubvectorSize + (i < extraDimensions ? 1 : 0);
      subvectorSizes[i] = subvectorSize;
      subvectorStartIndices[i] = currentDim;
      currentDim += subvectorSize;
    }
    
    // 添加每个子向量的贡献
    for (let i = 0; i < codes.length; i++) {
      const subvectorIdx = i;
      const clusterIdx = codes[i];
      const centroid = codebooks[subvectorIdx][clusterIdx];
      
      // 使用预计算的索引
      const startIdx = subvectorStartIndices[i];
      const subvectorSize = subvectorSizes[i];
      
      // 批量添加子向量贡献
      for (let j = 0; j < subvectorSize && j < centroid.length; j++) {
        if (startIdx + j < vectorDimension) {
          result[startIdx + j] += centroid[j];
        }
      }
    }
    
    // 如果使用余弦距离，确保向量被归一化
    if (distanceMetric === DISTANCE_METRICS.COSINE) {
      return normalizeVector(result);
    }
    
    return result;
  }
  
  /**
   * 向量归一化 - 优化版本
   * @param {Float32Array|Array} vector - 需要归一化的向量
   * @returns {Float32Array} 归一化后的向量
   */
  function normalizeVector(vector) {
    const normalizedVector = new Float32Array(vector.length);
    let norm = 0;
    
    // 计算向量的模长 - 使用块处理提高性能
    const blockSize = 8;
    const length = vector.length;
    let i = 0;
    
    // 分块计算模长平方和
    for (; i + blockSize <= length; i += blockSize) {
      norm += vector[i] * vector[i];
      norm += vector[i+1] * vector[i+1];
      norm += vector[i+2] * vector[i+2];
      norm += vector[i+3] * vector[i+3];
      norm += vector[i+4] * vector[i+4];
      norm += vector[i+5] * vector[i+5];
      norm += vector[i+6] * vector[i+6];
      norm += vector[i+7] * vector[i+7];
    }
    
    // 处理剩余元素
    for (; i < length; i++) {
      norm += vector[i] * vector[i];
    }
    
    norm = Math.sqrt(norm);
    
    // 防止除以零
    if (norm > 1e-10) {
      // 分块归一化
      i = 0;
      for (; i + blockSize <= length; i += blockSize) {
        normalizedVector[i] = vector[i] / norm;
        normalizedVector[i+1] = vector[i+1] / norm;
        normalizedVector[i+2] = vector[i+2] / norm;
        normalizedVector[i+3] = vector[i+3] / norm;
        normalizedVector[i+4] = vector[i+4] / norm;
        normalizedVector[i+5] = vector[i+5] / norm;
        normalizedVector[i+6] = vector[i+6] / norm;
        normalizedVector[i+7] = vector[i+7] / norm;
      }
      
      // 处理剩余元素
      for (; i < length; i++) {
        normalizedVector[i] = vector[i] / norm;
      }
    } else {
      // 如果向量几乎为零向量，返回单位向量
      normalizedVector[0] = 1.0;
    }
    
    return normalizedVector;
  }
  
  /**
   * 计算两个量化向量之间的近似距离
   * @param {Uint8Array} codes1 - 第一个向量的量化编码
   * @param {Uint8Array} codes2 - 第二个向量的量化编码
   * @returns {number} 近似距离
   */
  function computeApproximateDistance(codes1, codes2) {
    if (!isTrained) {
      throw new Error('DeltaPQ not trained');
    }
    
    // 高效的余弦距离近似计算
    if (distanceMetric === DISTANCE_METRICS.COSINE) {
      // 使用子空间内积表的方式计算近似余弦距离
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;
      
      // 中心向量对相似度的贡献
      const centerNorm = centerVectorNorm || 1.0;
      dotProduct += centerNorm * centerNorm; // 中心向量与自身的点积
      norm1 += centerNorm * centerNorm;
      norm2 += centerNorm * centerNorm;
      
      // 对每个子空间分别计算贡献
      for (let i = 0; i < codes1.length; i++) {
        const centroid1 = codebooks[i][codes1[i]];
        const centroid2 = codebooks[i][codes2[i]];
        
        // 子空间内的点积与范数贡献
        let subDotProduct = 0;
        let subNorm1 = 0;
        let subNorm2 = 0;
        
        // 使用块处理优化计算
        const blockSize = 4;
        const length = centroid1.length;
        let j = 0;
        
        // 分块计算点积
        for (; j + blockSize <= length; j += blockSize) {
          const c1_j = centroid1[j];
          const c1_j1 = centroid1[j+1];
          const c1_j2 = centroid1[j+2];
          const c1_j3 = centroid1[j+3];
          
          const c2_j = centroid2[j];
          const c2_j1 = centroid2[j+1];
          const c2_j2 = centroid2[j+2];
          const c2_j3 = centroid2[j+3];
          
          subDotProduct += c1_j * c2_j + c1_j1 * c2_j1 + c1_j2 * c2_j2 + c1_j3 * c2_j3;
          subNorm1 += c1_j * c1_j + c1_j1 * c1_j1 + c1_j2 * c1_j2 + c1_j3 * c1_j3;
          subNorm2 += c2_j * c2_j + c2_j1 * c2_j1 + c2_j2 * c2_j2 + c2_j3 * c2_j3;
        }
        
        // 处理剩余元素
        for (; j < length; j++) {
          subDotProduct += centroid1[j] * centroid2[j];
          subNorm1 += centroid1[j] * centroid1[j];
          subNorm2 += centroid2[j] * centroid2[j];
        }
        
        // 累加子空间贡献
        dotProduct += subDotProduct;
        norm1 += subNorm1;
        norm2 += subNorm2;
      }
      
      // 计算余弦相似度 (点积 / (|a| * |b|))
      const normProduct = Math.sqrt(norm1) * Math.sqrt(norm2);
      const similarity = normProduct > 1e-10 ? dotProduct / normProduct : 0;
      
      // 余弦距离 = 1 - 余弦相似度 (确保范围在 [0,2] 内)
      return 1.0 - Math.max(-1.0, Math.min(1.0, similarity));
    }
    
    // 内积距离特殊处理
    if (distanceMetric === DISTANCE_METRICS.INNER_PRODUCT) {
      let dotProduct = 0;
      
      for (let i = 0; i < codes1.length; i++) {
        const centroid1 = codebooks[i][codes1[i]];
        const centroid2 = codebooks[i][codes2[i]];
        
        for (let j = 0; j < centroid1.length; j++) {
          dotProduct += centroid1[j] * centroid2[j];
        }
      }
      
      // 内积越大表示越相似，所以返回负内积作为距离
      return -dotProduct;
    }
    
    // 欧几里得距离的优化计算
    if (distanceMetric === DISTANCE_METRICS.EUCLIDEAN) {
      let squaredDistance = 0;
      
      // 对每个子空间分别计算距离贡献
      for (let i = 0; i < codes1.length; i++) {
        const centroid1 = codebooks[i][codes1[i]];
        const centroid2 = codebooks[i][codes2[i]];
        
        // 单个子空间内的L2距离的平方
        let subSquaredDist = 0;
        for (let j = 0; j < centroid1.length; j++) {
          const diff = centroid1[j] - centroid2[j];
          subSquaredDist += diff * diff;
        }
        
        // 累加子空间的距离贡献
        squaredDistance += subSquaredDist;
      }
      
      // 返回欧几里得距离
      return Math.sqrt(squaredDistance);
    }
    
    // 其他距离度量的处理
    let distance = 0;
    
    // 对每个子向量部分计算距离
    for (let i = 0; i < codes1.length; i++) {
      const centroid1 = codebooks[i][codes1[i]];
      const centroid2 = codebooks[i][codes2[i]];
      
      // 计算子空间中心点之间的距离
      const subDist = distanceFunction(centroid1, centroid2);
      distance += subDist;
    }
    
    return distance;
  }
  
  /**
   * 使用向量样本训练DeltaPQ量化器
   * @param {Array<Float32Array|Array>} vectors - 训练样本
   * @returns {Object} 训练结果统计
   */
  function train(vectors) {
    if (!vectors || !Array.isArray(vectors) || vectors.length === 0) {
      throw new Error('Delta-PQ训练错误: 空训练集或无效数据');
    }
    
    // 过滤掉无效向量
    const validVectors = vectors.filter(vec => 
      vec && vec.length > 0 && 
      !Array.from(vec).some(val => typeof val !== 'number' || isNaN(val))
    );
    
    if (validVectors.length === 0) {
      throw new Error('Delta-PQ训练错误: 没有有效的训练向量');
    }
    
    console.log(`Delta-PQ训练: 过滤后有效向量数量 ${validVectors.length}/${vectors.length}`);
    
    // 提取维度
    vectorDimension = validVectors[0].length;
    
    // 采样训练向量
    let trainVectors = validVectors;
    if (validVectors.length > sampleSize) {
      // 随机采样
      const indices = new Set();
      while (indices.size < sampleSize) {
        indices.add(Math.floor(Math.random() * validVectors.length));
      }
      trainVectors = Array.from(indices).map(i => validVectors[i]);
      console.log(`采样 ${trainVectors.length} 向量用于训练`);
    }
    
    // 如果使用余弦距离，必须确保向量被归一化
    if (distanceMetric === DISTANCE_METRICS.COSINE) {
      // 首先检查向量是否已归一化
      const vectorsAreNormalized = checkVectorsNormalization(trainVectors, 20);
      
      if (!vectorsAreNormalized) {
        console.log('使用余弦距离进行训练，向量需要归一化 - 正在进行归一化处理');
        
        // 对所有向量进行归一化
        trainVectors = trainVectors.map(vector => normalizeVector(Array.from(vector)));
        
        // 再次验证归一化结果
        const recheckNormalized = checkVectorsNormalization(trainVectors, 20);
        
        if (!recheckNormalized) {
          throw new Error('余弦距离模式：向量归一化失败，请检查输入向量');
        }
        
        console.log('向量归一化处理完成，已通过验证');
      } else {
        console.log('使用余弦距离进行训练，检测到向量已归一化');
      }
    }
    
    // 优化子向量划分策略
    // 对于高维向量和多子向量情况，采用更均衡的划分
    // 计算最佳子向量数，确保每个子向量维度在4-32之间，子向量数不超过向量维度
    const idealSubvectorSize = 16; // 理想的子向量大小
    let adjustedNumSubvectors = numSubvectors;
    
    // 如果维度太小，减少子向量数量
    const minSubvectorSize = 4; // 每个子向量至少包含的维度数
    if (vectorDimension / numSubvectors < minSubvectorSize) {
      adjustedNumSubvectors = Math.max(1, Math.floor(vectorDimension / minSubvectorSize));
      console.log(`向量维度(${vectorDimension})较小，调整子向量数量: ${numSubvectors} -> ${adjustedNumSubvectors}`);
    }
    
    // 如果子向量数量超过维度，也需要调整
    if (adjustedNumSubvectors > vectorDimension) {
      adjustedNumSubvectors = vectorDimension;
      console.log(`子向量数(${numSubvectors})超过维度(${vectorDimension})，调整为: ${adjustedNumSubvectors}`);
    }
    
    // 更新子向量数量
    numSubvectors = adjustedNumSubvectors;
    
    // 计算子向量大小
    const baseSubvectorSize = Math.floor(vectorDimension / numSubvectors);
    const extraDimensions = vectorDimension % numSubvectors;
    subvectorSize = baseSubvectorSize + (extraDimensions > 0 ? 1 : 0);
    
    console.log(`训练配置: 向量维度=${vectorDimension}, 子向量数=${numSubvectors}, 子向量大小~${subvectorSize}`);
    
    // 计算中心向量（所有向量的平均值）
    centerVector = new Float32Array(vectorDimension).fill(0);
    for (const vec of trainVectors) {
      for (let i = 0; i < vectorDimension; i++) {
        // 处理不同长度的向量
        const value = i < vec.length ? vec[i] : 0;
        centerVector[i] += (typeof value === 'number' && !isNaN(value)) ? value / trainVectors.length : 0;
      }
    }
    
    // 余弦距离时，重新归一化中心向量
    if (distanceMetric === DISTANCE_METRICS.COSINE) {
      // 保存中心向量模长供后续计算使用
      centerVectorNorm = 0;
      for (let i = 0; i < centerVector.length; i++) {
        centerVectorNorm += centerVector[i] * centerVector[i];
      }
      centerVectorNorm = Math.sqrt(centerVectorNorm);
      
      // 归一化中心向量
      centerVector = normalizeVector(centerVector);
      console.log('已对中心向量进行归一化处理');
    }
    
    // 计算所有向量相对于中心向量的差值（Delta向量）
    const deltaVectors = trainVectors.map(vec => {
      const delta = new Float32Array(vectorDimension);
      for (let i = 0; i < vectorDimension; i++) {
        // 安全地计算差值
        const vecValue = i < vec.length ? vec[i] : 0;
        delta[i] = (typeof vecValue === 'number' && !isNaN(vecValue)) 
          ? vecValue - centerVector[i] 
          : 0;
      }
      return delta;
    });
    
    try {
      // 为每个子空间训练一个码本
      codebooks = [];
      
      // 提前计算所有子向量数据，避免重复计算
      console.log('准备子向量数据集...');
      const allSubvectors = Array(numSubvectors).fill().map(() => []);
      
      for (const deltaVec of deltaVectors) {
        // 使用改进的子向量划分策略
        const subvecs = balancedSplitVector(deltaVec, numSubvectors);
        
        for (let i = 0; i < subvecs.length; i++) {
          allSubvectors[i].push(subvecs[i]);
        }
      }
      
      console.log(`开始训练${numSubvectors}个子空间的码本...`);
      // 并行优化：逐个训练码本，但在每个码本内部最大化利用计算资源
      for (let i = 0; i < numSubvectors; i++) {
        const subvectorData = allSubvectors[i];
        
        // 对子向量执行K-means聚类，增加迭代次数提高聚类质量
        try {
          console.log(`训练子空间${i+1}/${numSubvectors}的码本...`);
          // 使用改进的K-means算法，增加迭代次数
          const subvectorCentroids = improvedKMeans(
            subvectorData, 
            numClusters, 
            maxIterations * 2, // 增加迭代次数
            distanceFunction
          );
          codebooks.push(subvectorCentroids);
        } catch (error) {
          console.error(`Delta-PQ训练错误: 子向量${i}聚类失败`, error);
          // 创建一个默认的码本
          const defaultCodebook = Array(numClusters).fill()
            .map(() => new Float32Array(subvectorData[0]?.length || 1).fill(0));
          codebooks.push(defaultCodebook);
        }
      }
      
      // 标记为已训练，在进行量化和反量化前必须设置
      isTrained = true;
      
      // 计算和缓存预计算的距离表（对于余弦距离尤其重要）
      if (distanceMetric === DISTANCE_METRICS.COSINE || distanceMetric === DISTANCE_METRICS.EUCLIDEAN) {
        console.log('预计算子空间距离表...');
        precomputeDistanceTables();
      }
      
      // 计算平均量化误差 (尝试对一个子集进行评估)
      let totalError = 0;
      const maxTestVectors = Math.min(100, trainVectors.length);
      
      for (let i = 0; i < maxTestVectors; i++) {
        try {
          const vec = trainVectors[i];
          const { codes } = quantizeVector(vec);
          const reconstructed = dequantizeVector(codes);
          totalError += computeQuantizationError(vec, reconstructed);
        } catch (error) {
          console.warn(`Delta-PQ训练警告: 评估向量${i}时出错`, error);
          // 继续处理下一个向量
        }
      }
      
      const averageError = totalError / maxTestVectors;
      
      return {
        averageError,
        numVectors: trainVectors.length,
        codebookSize: numClusters,
        compressionRatio: (32 * vectorDimension) / (bitsPerCode * numSubvectors),
        validVectorRatio: validVectors.length / vectors.length,
        distanceMetric,  // 添加所使用的距离度量
        normalizedVectors: distanceMetric === DISTANCE_METRICS.COSINE // 对于余弦距离，向量必须已归一化
      };
    } catch (error) {
      isTrained = false;
      console.error('Delta-PQ训练错误:', error);
      throw new Error(`Delta-PQ训练失败: ${error.message}`);
    }
  }
  
  /**
   * 改进的K-means聚类算法
   * 使用K-means++初始化和早停策略
   * @param {Array<Array|Float32Array>} data - 数据集
   * @param {number} k - 聚类数
   * @param {number} maxIterations - 最大迭代次数
   * @param {Function} distanceFunction - 距离计算函数
   * @returns {Array<Array|Float32Array>} 聚类中心
   */
  function improvedKMeans(data, k, maxIterations, distanceFunction) {
    // 添加防御性检查
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('K-means错误: 无效的数据集', { dataLength: data?.length });
      return Array(k).fill().map(() => Array(10).fill(0)); // 返回默认聚类中心
    }
    
    // 过滤掉无效数据点
    const validData = data.filter(point => 
      point && point.length > 0 && 
      !Array.from(point).some(val => typeof val !== 'number' || isNaN(val))
    );
    
    if (validData.length === 0) {
      console.error('K-means错误: 数据集中没有有效的数据点');
      return Array(k).fill().map(() => Array(data[0]?.length || 10).fill(0));
    }
    
    // 标准化维度，确保所有点都具有相同的维度
    const dimension = validData[0].length;
    
    if (validData.length <= k) {
      // 如果数据点少于聚类数，直接返回数据点并填充剩余的
      const centroids = validData.map(d => Array.from(d));
      while (centroids.length < k) {
        // 复制现有中心点或创建零向量
        if (centroids.length > 0) {
          centroids.push(Array.from(centroids[0]));
        } else {
          centroids.push(Array(dimension).fill(0));
        }
      }
      return centroids;
    }
    
    // 初始化聚类中心 (使用k-means++)
    let centroids = initializeCentroids(validData, k, distanceFunction);
    let assignments = new Array(validData.length).fill(0);
    let changed = true;
    let iteration = 0;
    let previousCost = Infinity;
    const earlyStoppingThreshold = 1e-4; // 早停阈值
    
    while (changed && iteration < maxIterations) {
      changed = false;
      iteration++;
      
      // 分配步骤：将每个点分配到最近的中心
      for (let i = 0; i < validData.length; i++) {
        let minDist = Infinity;
        let newCluster = 0;
        
        for (let j = 0; j < k; j++) {
          const dist = distanceFunction(validData[i], centroids[j]);
          if (dist < minDist && dist !== Infinity) { // 忽略无效距离
            minDist = dist;
            newCluster = j;
          }
        }
        
        if (assignments[i] !== newCluster) {
          assignments[i] = newCluster;
          changed = true;
        }
      }
      
      // 更新步骤：重新计算聚类中心
      const newCentroids = Array(k).fill().map(() => Array(dimension).fill(0));
      const counts = Array(k).fill(0);
      
      for (let i = 0; i < validData.length; i++) {
        const cluster = assignments[i];
        counts[cluster]++;
        
        for (let j = 0; j < validData[i].length; j++) {
          newCentroids[cluster][j] += validData[i][j];
        }
      }
      
      // 计算新中心和本次迭代的代价函数
      let currentCost = 0;
      
      for (let i = 0; i < k; i++) {
        if (counts[i] > 0) {
          for (let j = 0; j < newCentroids[i].length; j++) {
            newCentroids[i][j] /= counts[i];
          }
          centroids[i] = newCentroids[i];
        } else {
          // 处理空聚类 - 使用分裂最大簇的策略，而非随机选择
          let largestClusterIndex = 0;
          let largestClusterSize = counts[0];
          
          for (let j = 1; j < k; j++) {
            if (counts[j] > largestClusterSize) {
              largestClusterIndex = j;
              largestClusterSize = counts[j];
            }
          }
          
          // 找出最大簇中离中心最远的点
          let furthestPointIndex = -1;
          let maxDistance = -1;
          
          for (let j = 0; j < validData.length; j++) {
            if (assignments[j] === largestClusterIndex) {
              const dist = distanceFunction(validData[j], centroids[largestClusterIndex]);
              if (dist > maxDistance) {
                maxDistance = dist;
                furthestPointIndex = j;
              }
            }
          }
          
          if (furthestPointIndex !== -1) {
            centroids[i] = Array.from(validData[furthestPointIndex]);
          } else {
            // 保险措施 - 使用随机点
            centroids[i] = Array.from(getRandomElement(validData));
          }
        }
      }
      
      // 计算当前代价函数（所有点到最近中心的距离平方和）
      for (let i = 0; i < validData.length; i++) {
        const cluster = assignments[i];
        const dist = distanceFunction(validData[i], centroids[cluster]);
        currentCost += dist * dist;
      }
      
      // 检查早停条件 - 如果代价函数改善不大，提前结束
      const improvement = (previousCost - currentCost) / previousCost;
      if (improvement < earlyStoppingThreshold && iteration > 10) {
        console.log(`K-means早停: 迭代${iteration}，改善率${improvement.toFixed(6)}`);
        break;
      }
      
      previousCost = currentCost;
    }
    
    console.log(`K-means聚类完成: ${iteration}次迭代`);
    return centroids;
  }
  
  /**
   * 预计算子空间距离表，用于加速距离计算
   */
  function precomputeDistanceTables() {
    if (!codebooks || !isTrained) {
      console.warn("无法预计算距离表: 码本不存在或未训练");
      return;
    }
    
    // 为每个子空间创建距离表
    distanceTables = new Array(numSubvectors);
    
    for (let i = 0; i < numSubvectors; i++) {
      const codebook = codebooks[i];
      const codeSize = codebook.length;
      const table = new Float32Array(codeSize * codeSize);
      
      // 计算每对聚类中心之间的距离
      for (let j = 0; j < codeSize; j++) {
        for (let l = 0; l < codeSize; l++) {
          if (distanceMetric === DISTANCE_METRICS.EUCLIDEAN) {
            // 预计算欧几里得距离的平方
            let squaredDist = 0;
            for (let d = 0; d < codebook[j].length; d++) {
              const diff = codebook[j][d] - codebook[l][d];
              squaredDist += diff * diff;
            }
            table[j * codeSize + l] = squaredDist;
          } 
          else if (distanceMetric === DISTANCE_METRICS.COSINE) {
            // 预计算余弦相似度组件（点积、模长）
            let dotProduct = 0;
            let norm1 = 0;
            let norm2 = 0;
            
            for (let d = 0; d < codebook[j].length; d++) {
              dotProduct += codebook[j][d] * codebook[l][d];
              norm1 += codebook[j][d] * codebook[j][d];
              norm2 += codebook[l][d] * codebook[l][d];
            }
            
            // 存储三个值: 点积, |a|², |b|²
            // 为了节省空间，我们只存储一个值，实际计算时可以派生
            const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2) + 1e-8);
            table[j * codeSize + l] = similarity;
          }
          else {
            // 其他距离度量直接计算
            table[j * codeSize + l] = distanceFunction(codebook[j], codebook[l]);
          }
        }
      }
      
      distanceTables[i] = table;
    }
    
    console.log(`预计算了${numSubvectors}个子空间的距离表`);
  }
  
  /**
   * 平衡划分向量 - 确保子向量维度均匀分布
   * @param {Float32Array} vector - 输入向量
   * @param {number} numSubvectors - 子向量数量
   * @returns {Array<Float32Array>} 子向量数组
   */
  function balancedSplitVector(vector, numSubvectors) {
    const dimension = vector.length;
    
    // 对于高维向量，确保子向量大小均匀，维度合理
    const baseSubvectorSize = Math.floor(dimension / numSubvectors);
    const extraDimensions = dimension % numSubvectors;
    
    const subvectors = new Array(numSubvectors);
    let currentDim = 0;
    
    for (let i = 0; i < numSubvectors; i++) {
      // 确定当前子向量的大小，均匀分布额外维度
      const subvectorSize = baseSubvectorSize + (i < extraDimensions ? 1 : 0);
      
      if (currentDim >= dimension) {
        // 如果已经处理完所有维度，创建零向量
        subvectors[i] = new Float32Array(baseSubvectorSize > 0 ? baseSubvectorSize : 1).fill(0);
        continue;
      }
      
      // 确保子向量有合理的大小
      const actualSize = Math.min(subvectorSize, dimension - currentDim);
      const subvector = new Float32Array(actualSize);
      
      // 使用向量化操作复制数据
      subvector.set(vector.subarray(currentDim, currentDim + actualSize));
      
      subvectors[i] = subvector;
      currentDim += actualSize;
    }
    
    return subvectors;
  }
  
  /**
   * 一次性编码多个向量
   * @param {Array<Float32Array|Array>} vectors - 要编码的向量数组
   * @returns {Array<Uint8Array>} 编码结果数组
   */
  function batchQuantize(vectors) {
    return vectors.map(vec => quantizeVector(vec).codes);
  }
  
  /**
   * 一次性解码多个向量
   * @param {Array<Uint8Array>} codesList - 编码数组
   * @returns {Array<Float32Array>} 解码后的向量数组
   */
  function batchDequantize(codesList) {
    return codesList.map(codes => dequantizeVector(codes));
  }
  
  /**
   * 批量计算近似距离
   * @param {Uint8Array} queryCode - 查询向量编码
   * @param {Array<Uint8Array>} databaseCodes - 数据库向量编码
   * @returns {Array<number>} 距离数组
   */
  function batchComputeDistances(queryCode, databaseCodes) {
    return databaseCodes.map(code => computeApproximateDistance(queryCode, code));
  }
  
  /**
   * 序列化量化器状态
   * @returns {string} JSON序列化数据
   */
  function serialize() {
    try {
      if (!isTrained) {
        throw new Error('量化器未训练，无法序列化');
      }
      
      console.log(`开始序列化DeltaPQ量化器，状态: ${isTrained ? "已训练" : "未训练"}`);
      
      // 验证核心数据是否存在
      if (!codebooks || !centerVector || !vectorDimension || !subvectorSize) {
        console.error("序列化失败: 核心数据缺失", { 
          hasCodebooks: !!codebooks, 
          hasCenter: !!centerVector,
          vectorDim: vectorDimension,
          subVecSize: subvectorSize
        });
        throw new Error('量化器数据不完整，无法序列化');
      }
      
      // 准备序列化数据
      const data = {
        // 配置
        config: {
          numSubvectors,
          bitsPerCode,
          sampleSize,
          maxIterations,
          distanceMetric  // 添加距离度量类型
        },
        // 训练数据
        trained: {
          codebooks: null,
          centerVector: null,
          vectorDimension,
          subvectorSize
        },
        // 状态
        isTrained
      };
      
      // 序列化中心向量
      try {
        if (centerVector && centerVector.length > 0) {
          data.trained.centerVector = Array.from(centerVector);
          console.log(`中心向量序列化成功，维度: ${centerVector.length}`);
        } else {
          console.warn('中心向量无效或为空');
          data.trained.centerVector = new Array(vectorDimension).fill(0);
        }
      } catch (e) {
        console.error('中心向量序列化失败:', e);
        data.trained.centerVector = new Array(vectorDimension).fill(0);
      }
      
      // 序列化码本
      try {
        if (codebooks && Array.isArray(codebooks) && codebooks.length > 0) {
          // 验证码本结构
          const isValidCodebooks = codebooks.every(book => 
            Array.isArray(book) && book.length === numClusters &&
            book.every(centroid => centroid && centroid.length > 0)
          );
          
          if (isValidCodebooks) {
            data.trained.codebooks = codebooks.map(book => 
              book.map(centroid => Array.from(centroid))
            );
            console.log(`码本序列化成功，数量: ${codebooks.length}，每个码本聚类数: ${codebooks[0].length}`);
          } else {
            console.warn('码本结构无效，使用默认值');
            throw new Error('码本结构无效');
          }
        } else {
          console.warn('码本为空或无效');
          throw new Error('码本为空或无效');
        }
      } catch (e) {
        console.error('码本序列化失败:', e);
        return null; // 码本是必要的，如果序列化失败则返回null
      }
      
      // 序列化为JSON字符串
      const jsonString = JSON.stringify(data);
      console.log(`DeltaPQ量化器序列化完成，数据大小: ${jsonString.length} 字节`);
      
      return jsonString;
    } catch (error) {
      console.error('量化器序列化失败:', error);
      return null;
    }
  }
  
  /**
   * 从序列化数据恢复量化器状态
   * @param {string} serialized - 序列化数据
   * @returns {boolean} 是否成功
   */
  function deserialize(serialized) {
    try {
      if (!serialized || typeof serialized !== 'string') {
        console.error('反序列化DeltaPQ量化器失败: 无效的序列化数据');
        return false;
      }
      
      console.log(`开始反序列化DeltaPQ量化器，数据长度: ${serialized.length}`);
      
      const data = JSON.parse(serialized);
      
      // 防御性检查，确保数据结构完整
      if (!data || typeof data !== 'object') {
        console.error('反序列化DeltaPQ量化器失败: 无效的JSON数据结构');
        return false;
      }
      
      // 检查必要数据存在性
      if (!data.trained) {
        console.error('反序列化DeltaPQ量化器失败: 缺少训练数据');
        return false;
      }
      
      // 恢复配置
      if (data.config) {
        numSubvectors = data.config.numSubvectors || numSubvectors;
        bitsPerCode = data.config.bitsPerCode || bitsPerCode;
        sampleSize = data.config.sampleSize || sampleSize;
        maxIterations = data.config.maxIterations || maxIterations;
        
        // 恢复距离度量类型
        const restoredMetric = data.config.distanceMetric;
        if (restoredMetric && Object.values(DISTANCE_METRICS).includes(restoredMetric)) {
          distanceMetric = restoredMetric;
        } else {
          console.warn(`反序列化警告: 无效的距离度量类型 ${restoredMetric}，使用默认欧几里得距离`);
          distanceMetric = DISTANCE_METRICS.EUCLIDEAN;
        }
        
        console.log(`已恢复配置参数: numSubvectors=${numSubvectors}, bitsPerCode=${bitsPerCode}, distanceMetric=${distanceMetric}`);
      }
      
      // 更新聚类数
      numClusters = Math.pow(2, bitsPerCode);
      console.log(`使用每码本${bitsPerCode}位计算得到的码本聚类数: ${numClusters}`);
      
      // 恢复训练数据
      if (data.trained) {
        // 恢复基本参数
        vectorDimension = data.trained.vectorDimension || 0;
        subvectorSize = data.trained.subvectorSize || 0;
        
        console.log(`恢复向量维度: ${vectorDimension}, 子向量大小: ${subvectorSize}`);
        
        if (vectorDimension <= 0 || subvectorSize <= 0) {
          console.error('反序列化失败: 无效的向量维度或子向量大小');
          return false;
        }
        
        // 恢复中心向量
        let centerVectorRestored = false;
        if (data.trained.centerVector && Array.isArray(data.trained.centerVector)) {
          try {
            // 检查中心向量数据是否有效
            const validCenterVector = data.trained.centerVector.every(
              val => typeof val === 'number' && isFinite(val)
            );
            
            if (validCenterVector) {
              centerVector = new Float32Array(data.trained.centerVector);
              centerVectorRestored = true;
              console.log(`成功恢复中心向量，维度: ${centerVector.length}`);
            } else {
              console.error('中心向量包含无效数据，无法恢复');
            }
          } catch (e) {
            console.error('恢复中心向量时出错:', e);
          }
        }
        
        if (!centerVectorRestored) {
          // 如果没有中心向量或恢复失败，创建一个默认的
          if (vectorDimension > 0) {
            centerVector = new Float32Array(vectorDimension);
            console.log(`创建默认中心向量，维度: ${vectorDimension}`);
          } else {
            console.warn('反序列化警告: 无法创建中心向量，缺少维度信息');
            return false;
          }
        }
        
        // 恢复码本
        let codebooksRestored = false;
        if (data.trained.codebooks && Array.isArray(data.trained.codebooks)) {
          try {
            // 检查码本结构
            const validCodebookStructure = data.trained.codebooks.every(book => 
              Array.isArray(book) && 
              // 放宽条件，不要求每个码本都有numClusters个聚类，只要有内容且结构正确即可
              book.length > 0 && 
              book.every(centroid => Array.isArray(centroid))
            );
            
            if (validCodebookStructure) {
              codebooks = [];
              
              // 更有弹性的码本恢复机制
              for (let i = 0; i < data.trained.codebooks.length; i++) {
                const book = data.trained.codebooks[i];
                const codebook = [];
                
                // 确保每个码本都有numClusters个聚类中心
                for (let j = 0; j < numClusters; j++) {
                  if (j < book.length) {
                    const centroid = book[j];
                    // 确保每个中心点都是有效的
                    const validCentroid = centroid.every(val => 
                      typeof val === 'number' && isFinite(val)
                    );
                    
                    if (validCentroid) {
                      codebook.push(new Float32Array(centroid));
                    } else {
                      // 如果中心点数据无效，创建零向量
                      const defaultLength = centroid.length || 
                                           (book[0] && Array.isArray(book[0]) ? book[0].length : 1);
                      codebook.push(new Float32Array(defaultLength));
                    }
                  } else {
                    // 如果缺少聚类中心，添加一个零向量
                    const defaultLength = book[0] && Array.isArray(book[0]) ? 
                                       book[0].length : Math.ceil(vectorDimension / numSubvectors);
                    codebook.push(new Float32Array(defaultLength));
                  }
                }
                
                codebooks.push(codebook);
              }
              
              // 确保有足够的码本
              while (codebooks.length < numSubvectors) {
                const defaultSubvectorSize = Math.ceil(vectorDimension / numSubvectors);
                const defaultCodebook = [];
                
                for (let j = 0; j < numClusters; j++) {
                  defaultCodebook.push(new Float32Array(defaultSubvectorSize));
                }
                
                codebooks.push(defaultCodebook);
              }
              
              codebooksRestored = true;
              console.log(`成功恢复码本，数量: ${codebooks.length}，每个码本聚类数: ${codebooks[0].length}`);
            } else {
              console.error('码本结构无效，无法恢复');
            }
          } catch (e) {
            console.error('反序列化码本失败:', e);
          }
        }
        
        if (!codebooksRestored) {
          console.warn('反序列化警告: 无法恢复码本，使用默认值');
          
          // 创建默认码本
          codebooks = [];
          const defaultSubvectorSize = Math.ceil(vectorDimension / numSubvectors);
          
          for (let i = 0; i < numSubvectors; i++) {
            const subCodebook = [];
            for (let j = 0; j < numClusters; j++) {
              subCodebook.push(new Float32Array(defaultSubvectorSize));
            }
            codebooks.push(subCodebook);
          }
          
          console.log(`已创建默认码本，数量: ${codebooks.length}`);
          return false; // 无法恢复码本时返回失败
        }
      } else {
        console.warn('反序列化警告: 缺少训练数据');
        return false;
      }
      
      // 更新训练状态
      isTrained = data.isTrained === true;
      
      // 额外检查确保恢复后的状态有效
      if (isTrained) {
        if (!codebooks || !centerVector || vectorDimension <= 0 || subvectorSize <= 0) {
          console.warn('反序列化警告: 恢复的训练状态不完整');
          isTrained = false;
          return false;
        }
        
        // 验证码本大小是否符合预期
        const expectedCodebooksLength = numSubvectors;
        const expectedCentroidsPerCodebook = numClusters;
        
        if (codebooks.length !== expectedCodebooksLength) {
          console.warn(`码本数量不匹配: 期望 ${expectedCodebooksLength}, 实际 ${codebooks.length}`);
          isTrained = false;
          return false;
        }
        
        for (let i = 0; i < codebooks.length; i++) {
          if (codebooks[i].length !== expectedCentroidsPerCodebook) {
            console.warn(`码本 ${i} 的聚类数不匹配: 期望 ${expectedCentroidsPerCodebook}, 实际 ${codebooks[i].length}`);
            isTrained = false;
            return false;
          }
        }
      }
      
      console.log(`DeltaPQ量化器反序列化完成，训练状态: ${isTrained}`);
      return true;
    } catch (error) {
      console.error('反序列化DeltaPQ量化器失败:', error);
      return false;
    }
  }
  
  // 返回公共接口
  return {
    train,
    quantizeVector,
    dequantizeVector,
    computeApproximateDistance,
    getMetric,  // 添加获取当前距离度量的方法
    batchQuantize,  // 保留批量处理方法
    batchDequantize, // 保留批量处理方法
    batchComputeDistances, // 保留批量处理方法
    // 元数据访问
    getMetadata: () => ({
      isTrained,
      vectorDimension,
      subvectorSize,
      numSubvectors,
      bitsPerCode,
      distanceMetric,  // 添加距离度量类型
      compressionRatio: isTrained ? (32 * vectorDimension) / (bitsPerCode * numSubvectors) : null
    }),
    serialize,
    deserialize,
    isNormalized: (vector) => isNormalized(vector), // 暴露归一化检测方法
    normalizeVector // 暴露归一化方法
  };
}

/**
 * 创建使用DeltaPQ的查询索引
 * @param {Object} options - 配置选项
 * @returns {Object} 索引API
 */
export function createDeltaPQIndex({
  numSubvectors = DEFAULT_NUM_SUBVECTORS,
  bitsPerCode = DEFAULT_BITS_PER_CODE,
  sampleSize = DEFAULT_SAMPLE_SIZE,
  maxIterations = DEFAULT_MAX_ITERATIONS,
  distanceMetric = DISTANCE_METRICS.EUCLIDEAN
} = {}) {
  // 自动调整为高维向量的参数
  let adjustedNumSubvectors = numSubvectors;
  let adjustedBitsPerCode = bitsPerCode;
  
  // 创建量化器
  const quantizer = createDeltaPQ({
    numSubvectors: adjustedNumSubvectors,
    bitsPerCode: adjustedBitsPerCode,
    sampleSize,
    maxIterations,
    distanceMetric
  });
  
  // 存储索引中的向量
  const vectors = [];
  const vectorCodes = [];
  const vectorIds = [];
  let nextId = 0;
  
  // 是否已构建索引
  let isBuilt = false;
  
  /**
   * 构建索引
   * @returns {Object} 构建结果
   */
  function buildIndex() {
    if (vectors.length === 0) {
      throw new Error('Cannot build index with empty dataset');
    }
    
    console.log(`开始构建DeltaPQ索引，数据量: ${vectors.length}向量`);
    
    // 训练量化器
    const startTime = performance.now();
    const trainResult = quantizer.train(vectors);
    const trainTime = performance.now() - startTime;
    
    console.log(`量化器训练完成，耗时: ${trainTime.toFixed(2)}ms`);
    
    // 量化所有向量
    console.log('开始量化所有向量...');
    const quantizeStartTime = performance.now();
    
    // 批量处理向量，避免过多的GC
    const batchSize = 1000;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const endIdx = Math.min(i + batchSize, vectors.length);
      for (let j = i; j < endIdx; j++) {
        vectorCodes[j] = quantizer.quantizeVector(vectors[j]).codes;
      }
    }
    
    const quantizeTime = performance.now() - quantizeStartTime;
    console.log(`向量量化完成，耗时: ${quantizeTime.toFixed(2)}ms，平均每向量: ${(quantizeTime / vectors.length).toFixed(3)}ms`);
    
    isBuilt = true;
    
    return {
      numVectors: vectors.length,
      buildTime: trainTime + quantizeTime,
      ...trainResult
    };
  }
  
  /**
   * 添加向量到索引
   * @param {Float32Array|Array} vector - 要添加的向量
   * @param {any} [id] - 向量ID（可选）
   * @returns {number} 分配的向量ID
   */
  function addVector(vector, id = null) {
    // 确保输入是有效向量
    if (!vector || !(vector.length > 0)) {
      console.error('添加向量错误: 无效的向量数据');
      return null;
    }
    
    // 使用提供的ID或生成新ID
    const vectorId = id !== null ? id : nextId++;
    
    // 存储原始向量
    vectors.push(vector instanceof Float32Array ? vector : new Float32Array(vector));
    vectorIds.push(vectorId);
    
    // 如果索引已构建，则同时更新量化编码
    if (isBuilt) {
      try {
        vectorCodes.push(quantizer.quantizeVector(vector).codes);
      } catch (error) {
        console.error('量化向量错误:', error);
        // 添加一个默认编码
        const metadata = quantizer.getMetadata();
        vectorCodes.push(new Uint8Array(metadata.numSubvectors));
      }
    }
    
    return vectorId;
  }
  
  /**
   * 从索引中移除向量
   * @param {any} id - 向量ID
   * @returns {boolean} 是否成功删除
   */
  function removeVector(id) {
    const index = vectorIds.indexOf(id);
    
    if (index === -1) {
      return false;
    }
    
    // 移除向量
    vectors.splice(index, 1);
    vectorIds.splice(index, 1);
    
    // 如果索引已构建，则同时移除量化编码
    if (isBuilt) {
      vectorCodes.splice(index, 1);
    }
    
    return true;
  }
  
  /**
   * 执行最近邻搜索
   * @param {Float32Array|Array} queryVector - 查询向量
   * @param {number} k - 返回的最近邻数量
   * @returns {Array<{id: any, distance: number}>} 最近邻结果
   */
  function search(queryVector, k = 10) {
    if (!isBuilt) {
      throw new Error('Index not built');
    }
    
    if (vectors.length === 0) {
      return [];
    }
    
    // 限制k不超过向量数量
    k = Math.min(k, vectors.length);
    
    // 量化查询向量
    const queryCode = quantizer.quantizeVector(queryVector).codes;
    
    // 高效计算到所有向量的距离
    const distanceStartTime = performance.now();
    const distances = new Array(vectorCodes.length);
    
    for (let i = 0; i < vectorCodes.length; i++) {
      distances[i] = {
        index: i,
        id: vectorIds[i],
        distance: quantizer.computeApproximateDistance(queryCode, vectorCodes[i])
      };
    }
    
    // 使用部分排序找出前k个最近邻（比完全排序更高效）
    // 对于较小的k值，这比完全排序更快
    if (k < distances.length / 10) { // 当k远小于总数时使用部分排序
      for (let i = 0; i < k; i++) {
        let minIdx = i;
        for (let j = i + 1; j < distances.length; j++) {
          if (distances[j].distance < distances[minIdx].distance) {
            minIdx = j;
          }
        }
        if (minIdx !== i) {
          // 交换元素
          const temp = distances[i];
          distances[i] = distances[minIdx];
          distances[minIdx] = temp;
        }
      }
      
      // 只返回前k个结果
      return distances.slice(0, k).map(({ id, distance }) => ({ id, distance }));
    } else {
      // 对于较大的k，使用完全排序
      return distances
        .sort((a, b) => a.distance - b.distance)
        .slice(0, k)
        .map(({ id, distance }) => ({ id, distance }));
    }
  }
  
  // 返回公共API
  return {
    addVector,
    removeVector,
    buildIndex,
    search,
    // 元数据访问
    getMetadata: () => ({
      isBuilt,
      numVectors: vectors.length,
      distanceMetric,
      ...quantizer.getMetadata()
    })
  };
}