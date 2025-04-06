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
  computeChebyshevDistance,
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
    case DISTANCE_METRICS.CHEBYSHEV:
      return computeChebyshevDistance;
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
  const subvectorSize = Math.ceil(dimension / numSubvectors);
  const subvectors = [];
  
  for (let i = 0; i < numSubvectors; i++) {
    const start = i * subvectorSize;
    const end = Math.min((i + 1) * subvectorSize, dimension);
    
    if (start >= dimension) {
      // 如果超出维度，添加零向量以保持子向量数量一致
      subvectors.push(new Float32Array(1).fill(0));
      continue;
    }
    
    const subvector = new Float32Array(end - start);
    for (let j = start; j < end; j++) {
      // 确保值是有效数字
      const value = vector[j];
      subvector[j - start] = (typeof value === 'number' && !isNaN(value)) ? value : 0;
    }
    
    subvectors.push(subvector);
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
  
  // 训练标志
  let isTrained = false;
  
  // 距离计算函数
  const distanceFunction = getDistanceFunction(distanceMetric);
  
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
    
    // 防御性检查
    if (!vector) {
      throw new Error('输入向量为空');
    }
    
    if (vector.length !== vectorDimension && !fast) {
      console.warn(`向量维度不匹配: ${vector.length} vs ${vectorDimension}，将进行调整`);
      // 调整向量维度
      if (vector.length < vectorDimension) {
        // 扩展向量
        const extendedVector = new Float32Array(vectorDimension);
        for (let i = 0; i < vector.length; i++) {
          extendedVector[i] = vector[i];
        }
        vector = extendedVector;
      } else {
        // 截断向量
        const truncatedVector = new Float32Array(vectorDimension);
        for (let i = 0; i < vectorDimension; i++) {
          truncatedVector[i] = vector[i];
        }
        vector = truncatedVector;
      }
    }
    
    // 计算delta向量（相对于中心向量的偏差）
    const deltaVector = new Float32Array(vectorDimension);
    for (let i = 0; i < vectorDimension; i++) {
      deltaVector[i] = i < vector.length ? (vector[i] - centerVector[i]) : -centerVector[i];
    }
    
    // 分解为子向量 - 快速路径跳过一些检查
    const subvectors = fast ? 
      splitVectorFast(deltaVector, numSubvectors, subvectorSize) : 
      splitVector(deltaVector, numSubvectors);
    
    // 量化每个子向量
    const codes = new Uint8Array(numSubvectors);
    
    for (let i = 0; i < subvectors.length; i++) {
      let minDist = Infinity;
      let bestCode = 0;
      
      const subvector = subvectors[i];
      
      // 使用指定的距离函数计算
      for (let j = 0; j < numClusters; j++) {
        const centroid = codebooks[i][j];
        const dist = distanceFunction(subvector, centroid);
        
        if (dist < minDist) {
          minDist = dist;
          bestCode = j;
        }
      }
      
      codes[i] = bestCode;
    }
    
    return { codes, deltaVector };
  }
  
  /**
   * 快速分割向量 - 针对性能优化
   * @param {Float32Array} vector - 输入向量 
   * @param {number} numSubvectors - 子向量数量
   * @param {number} subvectorSize - 子向量大小
   * @returns {Array<Float32Array>} 子向量数组
   */
  function splitVectorFast(vector, numSubvectors, subvectorSize) {
    const dimension = vector.length;
    const subvectors = new Array(numSubvectors);
    
    for (let i = 0; i < numSubvectors; i++) {
      const start = i * subvectorSize;
      const end = Math.min((i + 1) * subvectorSize, dimension);
      
      if (start >= dimension) {
        subvectors[i] = new Float32Array(1).fill(0);
        continue;
      }
      
      const subvector = new Float32Array(end - start);
      
      // 使用循环展开以提高性能
      const len = end - start;
      let j = 0;
      
      // 每4个一组处理
      for (; j + 3 < len; j += 4) {
        subvector[j] = vector[start + j];
        subvector[j + 1] = vector[start + j + 1];
        subvector[j + 2] = vector[start + j + 2];
        subvector[j + 3] = vector[start + j + 3];
      }
      
      // 处理剩余的元素
      for (; j < len; j++) {
        subvector[j] = vector[start + j];
      }
      
      subvectors[i] = subvector;
    }
    
    return subvectors;
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
    
    // 添加每个子向量的贡献
    for (let i = 0; i < codes.length; i++) {
      const subvectorIdx = i;
      const clusterIdx = codes[i];
      const centroid = codebooks[subvectorIdx][clusterIdx];
      
      const startIdx = i * subvectorSize;
      const endIdx = Math.min((i + 1) * subvectorSize, vectorDimension);
      
      // 将聚类中心的值添加到结果向量
      for (let j = 0; j < endIdx - startIdx; j++) {
        result[startIdx + j] += centroid[j];
      }
    }
    
    return result;
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
    
    let distance = 0;
    
    // 对每个子向量部分计算距离
    for (let i = 0; i < codes1.length; i++) {
      const centroid1 = codebooks[i][codes1[i]];
      const centroid2 = codebooks[i][codes2[i]];
      
      // 计算子空间中心点之间的距离
      const subDist = distanceFunction(centroid1, centroid2);
      
      // 对于欧几里得距离，我们可以直接累加子距离的平方
      // 对于其他距离，我们需要直接累加距离值
      if (distanceMetric === DISTANCE_METRICS.EUCLIDEAN) {
        distance += subDist * subDist;  // 欧几里得距离的平方
      } else {
        distance += subDist;  // 其他距离直接累加
      }
    }
    
    // 对于欧几里得距离，最后需要开平方
    if (distanceMetric === DISTANCE_METRICS.EUCLIDEAN) {
      distance = Math.sqrt(distance);
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
    
    // 确定向量维度
    vectorDimension = validVectors[0].length;
    subvectorSize = Math.ceil(vectorDimension / numSubvectors);
    
    // 限制训练样本数量
    const trainVectors = validVectors.length > sampleSize 
      ? validVectors.slice(0, sampleSize) 
      : validVectors;
    
    // 计算中心向量（所有向量的平均值）
    centerVector = new Float32Array(vectorDimension);
    for (const vec of trainVectors) {
      for (let i = 0; i < vectorDimension; i++) {
        // 处理不同长度的向量
        const value = i < vec.length ? vec[i] : 0;
        centerVector[i] += (typeof value === 'number' && !isNaN(value)) ? value / trainVectors.length : 0;
      }
    }
    
    // 确保中心向量中没有非法值
    for (let i = 0; i < vectorDimension; i++) {
      if (isNaN(centerVector[i]) || !isFinite(centerVector[i])) {
        console.warn(`Delta-PQ训练警告: 中心向量在位置 ${i} 包含无效值, 替换为0`);
        centerVector[i] = 0;
      }
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
      
      for (let i = 0; i < numSubvectors; i++) {
        // 提取当前子空间的所有子向量
        const subvectorData = [];
        
        for (const deltaVec of deltaVectors) {
          const startIdx = i * subvectorSize;
          const endIdx = Math.min((i + 1) * subvectorSize, vectorDimension);
          
          if (startIdx >= vectorDimension) break;
          
          const subvector = new Float32Array(endIdx - startIdx);
          for (let j = startIdx; j < endIdx; j++) {
            subvector[j - startIdx] = deltaVec[j];
          }
          
          subvectorData.push(subvector);
        }
        
        // 对子向量执行K-means聚类
        try {
          const subvectorCentroids = kMeans(subvectorData, numClusters, maxIterations, distanceFunction);
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
        distanceMetric  // 添加所使用的距离度量
      };
    } catch (error) {
      isTrained = false;
      console.error('Delta-PQ训练错误:', error);
      throw new Error(`Delta-PQ训练失败: ${error.message}`);
    }
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
  
  // 返回公共API
  return {
    train,
    quantizeVector,
    dequantizeVector,
    computeApproximateDistance,
    batchQuantize,
    batchDequantize,
    batchComputeDistances,
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
    deserialize
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
  distanceMetric = DISTANCE_METRICS.EUCLIDEAN  // 添加距离度量类型参数
} = {}) {
  // 创建量化器
  const quantizer = createDeltaPQ({
    numSubvectors,
    bitsPerCode,
    sampleSize,
    maxIterations,
    distanceMetric  // 传递距离度量类型
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
    
    // 训练量化器
    const trainResult = quantizer.train(vectors);
    
    // 量化所有向量
    for (let i = 0; i < vectors.length; i++) {
      vectorCodes[i] = quantizer.quantizeVector(vectors[i]).codes;
    }
    
    isBuilt = true;
    
    return {
      numVectors: vectors.length,
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
    const vectorId = id !== null ? id : nextId++;
    
    vectors.push(Array.from(vector));
    vectorIds.push(vectorId);
    
    // 如果索引已构建，则同时更新量化编码
    if (isBuilt) {
      vectorCodes.push(quantizer.quantizeVector(vector).codes);
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
    
    // 计算到所有向量的距离
    const distances = vectorCodes.map((code, i) => ({
      index: i,
      id: vectorIds[i],
      distance: quantizer.computeApproximateDistance(queryCode, code)
    }));
    
    // 排序并返回前k个结果
    return distances
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k)
      .map(({ id, distance }) => ({ id, distance }));
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
      distanceMetric,  // 添加距离度量类型
      ...quantizer.getMetadata()
    })
  };
}