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
import {computeEuclideanDistance} from "../../../base/forMath/forGeometry/forVectors/forDistance.js";


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
 * @returns {Array<Array|Float32Array>} 聚类中心
 */
function initializeCentroids(data, k) {
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
        const dist = computeEuclideanDistance(point, centroid);
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
 * @returns {Array<Array|Float32Array>} 聚类中心
 */
function kMeans(data, k, maxIterations = DEFAULT_MAX_ITERATIONS) {
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
  let centroids = initializeCentroids(validData, k);
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
        const dist = computeEuclideanDistance(validData[i], centroids[j]);
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
  maxIterations = DEFAULT_MAX_ITERATIONS
} = {}) {
  // 每个子空间的聚类数
  const numClusters = Math.pow(2, bitsPerCode);
  
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
   * 量化一个向量
   * @param {Float32Array|Array} vector - 输入向量
   * @returns {{codes: Uint8Array, deltaVector: Float32Array}} 量化结果
   */
  function quantizeVector(vector) {
    if (!isTrained) {
      throw new Error('DeltaPQ not trained');
    }
    
    // 计算delta向量（相对于中心向量的偏差）
    const deltaVector = new Float32Array(vector.length);
    for (let i = 0; i < vector.length; i++) {
      deltaVector[i] = vector[i] - centerVector[i];
    }
    
    // 分解为子向量
    const subvectors = splitVector(deltaVector, numSubvectors);
    
    // 量化每个子向量
    const codes = new Uint8Array(numSubvectors);
    
    for (let i = 0; i < subvectors.length; i++) {
      let minDist = Infinity;
      let bestCode = 0;
      
      // 找到最接近的聚类中心
      for (let j = 0; j < numClusters; j++) {
        const centroid = codebooks[i][j];
        const dist = computeEuclideanDistance(subvectors[i], centroid);
        
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
      let subDist = 0;
      for (let j = 0; j < centroid1.length; j++) {
        const diff = centroid1[j] - centroid2[j];
        subDist += diff * diff;
      }
      
      distance += subDist;
    }
    
    return Math.sqrt(distance);
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
          const subvectorCentroids = kMeans(subvectorData, numClusters, maxIterations);
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
        validVectorRatio: validVectors.length / vectors.length
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
      numSubvectors,
      bitsPerCode,
      compressionRatio: isTrained ? (32 * vectorDimension) / (bitsPerCode * numSubvectors) : null
    })
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
  maxIterations = DEFAULT_MAX_ITERATIONS
} = {}) {
  // 创建量化器
  const quantizer = createDeltaPQ({
    numSubvectors,
    bitsPerCode,
    sampleSize,
    maxIterations
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
      ...quantizer.getMetadata()
    })
  };
}