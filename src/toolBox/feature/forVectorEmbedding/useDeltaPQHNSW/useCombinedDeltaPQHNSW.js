/**
 * DeltaPQ-HNSW 结合实现
 * 将DeltaPQ向量压缩与HNSW图索引结合，实现高压缩比与高性能的向量检索系统
 */

import { createDeltaPQ, createDeltaPQIndex } from './useCustomedDeltaPQ.js';
import { createHNSWIndex } from './useCustomedHNSW.js';
import { createMinHeap } from '../../../feature/useDataStruct/useHeaps/useMinHeap.js';
import { computeEuclideanDistance } from '../../../base/forMath/forGeometry/forVectors/forDistance.js';

// 常量定义
const DEFAULT_NUM_SUBVECTORS = 8;
const DEFAULT_BITS_PER_CODE = 8;
const DEFAULT_M = 16;
const DEFAULT_EF_CONSTRUCTION = 200;
const DEFAULT_EF_SEARCH = 200;

// 搜索放大策略配置
const SEARCH_AMPLIFICATION_FACTOR = 10; // 初始搜索结果数量放大倍数
const EF_AMPLIFICATION_FACTOR = 50;     // ef参数放大倍数
const RERANK_AMPLIFICATION_FACTOR = 3;  // 重排放大倍数

/**
 * 最小堆实现，用于高效地维护K近邻结果
 * @param {Function} comparator - 比较函数，定义堆的排序方式
 * @returns {Object} 最小堆对象
 */
function createBinaryHeap(comparator = (a, b) => a - b) {
  const elements = [];
  
  /**
   * 获取当前堆中元素数量
   * @returns {number} 元素数量
   */
  function size() {
    return elements.length;
  }
  
  /**
   * 获取堆顶元素但不移除
   * @returns {*} 堆顶元素
   */
  function peek() {
    if (elements.length === 0) return null;
    return elements[0];
  }
  
  /**
   * 向堆中添加元素
   * @param {*} element - 要添加的元素
   */
  function push(element) {
    // 添加元素到堆底
    elements.push(element);
    
    // 上浮新元素到合适位置
    bubbleUp(elements.length - 1);
  }
  
  /**
   * 移除并返回堆顶元素
   * @returns {*} 堆顶元素
   */
  function pop() {
    if (elements.length === 0) return null;
    
    const top = elements[0];
    const bottom = elements.pop();
    
    if (elements.length > 0) {
      elements[0] = bottom;
      bubbleDown(0);
    }
    
    return top;
  }
  
  /**
   * 元素上浮操作
   * @param {number} index - 开始上浮的元素索引
   */
  function bubbleUp(index) {
    const element = elements[index];
    
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = elements[parentIndex];
      
      if (comparator(element, parent) >= 0) break;
      
      // 交换元素
      elements[parentIndex] = element;
      elements[index] = parent;
      index = parentIndex;
    }
  }
  
  /**
   * 元素下沉操作
   * @param {number} index - 开始下沉的元素索引
   */
  function bubbleDown(index) {
    const length = elements.length;
    const element = elements[index];
    
    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let swapIndex = null;
      
      // 与左子节点比较
      if (leftChildIndex < length) {
        const leftChild = elements[leftChildIndex];
        if (comparator(leftChild, element) < 0) {
          swapIndex = leftChildIndex;
        }
      }
      
      // 与右子节点比较
      if (rightChildIndex < length) {
        const rightChild = elements[rightChildIndex];
        if (
          (swapIndex === null && comparator(rightChild, element) < 0) ||
          (swapIndex !== null && comparator(rightChild, elements[swapIndex]) < 0)
        ) {
          swapIndex = rightChildIndex;
        }
      }
      
      if (swapIndex === null) break;
      
      // 交换元素
      elements[index] = elements[swapIndex];
      elements[swapIndex] = element;
      index = swapIndex;
    }
  }
  
  return {
    size,
    peek,
    push,
    pop
  };
}

/**
 * 创建结合DeltaPQ压缩和HNSW索引的向量检索系统
 * 优势：显著降低内存占用的同时保持高效检索性能
 * 
 * @param {Object} options - 配置选项
 * @returns {Object} 结合索引API
 */
export function createCombinedDeltaPQHNSW({
  // DeltaPQ配置
  numSubvectors = DEFAULT_NUM_SUBVECTORS,
  bitsPerCode = DEFAULT_BITS_PER_CODE,
  sampleSize = 1000,
  maxIterations = 25,
  
  // HNSW配置
  distanceFunction = 'euclidean',
  M = DEFAULT_M,
  efConstruction = DEFAULT_EF_CONSTRUCTION,
  efSearch = DEFAULT_EF_SEARCH,
  ml = 16,
  useDistanceCache = true,

  // 增强图连接性配置
  randomFillCount = 0 // 指定多少随机填充向量来增强图连接性
} = {}) {
  // 初始化
  const deltaPQ = createDeltaPQ({
    numSubvectors,
    bitsPerCode,
    sampleSize,
    maxIterations
  });
  
  // 创建HNSW索引
  const hnswIndex = createHNSWIndex({
    distanceFunction,
    M,
    efConstruction,
    efSearch,
    ml,
    useDistanceCache
  });
  
  // 内部状态
  let isTrained = false;
  let trainingVectors = [];
  let vectorMap = new Map(); // 存储所有向量及其量化信息的映射
  let idMap = new Map(); // 内部ID到原始ID的映射
  let nextId = 0; // 用于生成唯一的内部ID
  
  // 保存索引维度，解决查询维度匹配问题
  let dimensions = null;
  
  /**
   * 训练组合索引
   * @param {Array<Float32Array>} vectors - 训练向量数组
   * @returns {Object} 训练结果
   */
  function train(vectors) {
    if (!vectors || vectors.length === 0) {
      throw new Error('训练向量不能为空');
    }
    
    // 获取向量维度
    const sampleVector = vectors[0];
    dimensions = sampleVector.length;
    
    // 训练DeltaPQ量化器 - 可以处理训练集比较小的情况
    let deltaPQResult;
    const effectiveSampleSize = Math.min(vectors.length, sampleSize);
    try {
      // 随机选择训练样本以提高模型泛化能力
      const trainingSamples = vectors.length <= sampleSize 
        ? vectors 
        : selectRandomSamples(vectors, sampleSize);
        
      deltaPQResult = deltaPQ.train(trainingSamples);
    } catch (error) {
      console.error('DeltaPQ训练失败:', error);
      throw new Error(`DeltaPQ训练失败: ${error.message}`);
    }
    
    isTrained = true;
    
    // 缓存训练向量以便后续添加
    trainingVectors = [...vectors];
    
    // 添加随机填充向量以增强图连接性
    if (randomFillCount > 0 && vectors.length > 0) {
      const randomFillVectors = generateRandomFillVectors(vectors[0].length, randomFillCount);
      for (let i = 0; i < randomFillVectors.length; i++) {
        // 将随机向量添加到HNSW图中，并添加到vectorMap中
        const nodeId = hnswIndex.insertNode(randomFillVectors[i], { isFiller: true });
        if (nodeId >= 0) {
          console.log(`添加了填充向量 ${i+1}/${randomFillCount}`);
          // 将填充向量也添加到vectorMap中，这样搜索时能够正确处理
          vectorMap.set(nodeId, { 
            originalVector: randomFillVectors[i],
            isFiller: true 
          });
        }
      }
    }
    
    return {
      numVectors: vectors.length,
      dimensions: dimensions,
      numSubvectors: numSubvectors,
      bitsPerCode: bitsPerCode,
      compressionRatio: (32 * dimensions) / (numSubvectors * bitsPerCode / 8),
      trained: isTrained
    };
  }
  
  /**
   * 生成随机填充向量以增强图连接性
   * @param {number} dimensions - 向量维度
   * @param {number} count - 要生成的向量数量
   * @returns {Array<Float32Array>} 随机填充向量数组
   */
  function generateRandomFillVectors(dimensions, count) {
    const result = [];
    for (let i = 0; i < count; i++) {
      const vector = new Float32Array(dimensions);
      for (let j = 0; j < dimensions; j++) {
        vector[j] = Math.random() * 2 - 1; // 生成[-1,1]范围的随机值
      }
      // 对向量进行归一化处理，使其分布更均匀
      normalizeVector(vector);
      result.push(vector);
    }
    return result;
  }
  
  /**
   * 对向量进行归一化处理
   * @param {Float32Array} vector - 需要归一化的向量
   */
  function normalizeVector(vector) {
    let norm = 0;
    for (let i = 0; i < vector.length; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }
  }
  
  /**
   * 从数组中随机选择样本
   * @param {Array} array - 要选择的数组
   * @param {number} sampleSize - 要选择的样本数量
   * @returns {Array} 随机选择的样本
   */
  function selectRandomSamples(array, sampleSize) {
    if (array.length <= sampleSize) return [...array];
    
    const result = [];
    const indices = new Set();
    
    while (indices.size < sampleSize) {
      const index = Math.floor(Math.random() * array.length);
      if (!indices.has(index)) {
        indices.add(index);
        result.push(array[index]);
      }
    }
    
    return result;
  }
  
  /**
   * 内部方法：插入向量到索引
   * @param {Float32Array|Array} vector - 原始向量
   * @param {Uint8Array} codes - 量化编码
   * @param {any} [data] - 关联数据
   * @returns {number} 分配的向量ID
   */
  function insertVectorInternal(vector, codes, data) {
    try {
      // 创建自定义节点数据，包含量化编码
      const nodeData = {
        originalVector: null, // 不存储原始向量以节省内存
        codes,
        userData: data
      };
      
      if (!vector || vector.length === 0) {
        throw new Error('插入向量为空');
      }
      
      if (!codes) {
        if (isTrained) {
          // 量化向量
          const result = deltaPQ.quantizeVector(vector);
          codes = result.codes;
          nodeData.codes = codes;
        } else {
          throw new Error('索引未训练，无法量化向量');
        }
      }
      
      // 插入HNSW节点（向量已量化，节点数据中包含压缩编码）
      const id = hnswIndex.insertNode(vector, nodeData);
      
      // 记录向量与ID的映射
      vectorMap.set(id, {
        codes,
        userData: data
      });
      
      return id;
    } catch (error) {
      console.error('插入向量内部错误:', error);
      throw error;
    }
  }
  
  /**
   * 添加向量到索引 - 改进ID映射处理逻辑
   * @param {Float32Array|Array} vector - 要添加的向量
   * @param {any} id - 向量的外部ID (可选)
   * @param {Object} metadata - 向量的元数据 (可选)
   * @param {boolean} storeOriginal - 是否存储原始向量 (可选，默认为false以节省内存)
   * @returns {number} 成功返回内部ID，失败返回-1
   */
  function addVector(vector, id = null, metadata = null, storeOriginal = true) {
    if (!vector || vector.length === 0) {
      console.error('无法添加空向量');
      return -1;
    }
    
    // 克隆向量以防止外部修改
    const vectorArray = Array.isArray(vector) ? new Float32Array(vector) : new Float32Array(vector);
    
    try {
      // 如果索引未训练，将向量添加到训练集
      if (!isTrained) {
        console.log('索引尚未训练，将向量添加到待训练集');
        trainingVectors.push(vectorArray);
        return -1;
      }
      
      // 生成内部ID
      const internalId = nextId++;
      
      // 构建向量数据结构
      const vectorData = {
        originalVector: storeOriginal ? new Float32Array(vectorArray) : null,
        userData: metadata,
        originalId: id  // 明确存储原始ID
      };
      
      // 量化向量
      if (isTrained) {
        try {
          const quantizeResult = deltaPQ.quantizeVector(vectorArray);
          if (quantizeResult && quantizeResult.codes) {
            vectorData.codes = quantizeResult.codes;
            // 为了后续查询，也保存反量化的向量
            vectorData.vector = deltaPQ.dequantizeVector(quantizeResult.codes);
          }
        } catch (e) {
          console.warn('向量量化失败，将只使用原始向量:', e);
          // 确保即使量化失败，也至少有向量数据可用
          if (!vectorData.originalVector) {
            vectorData.originalVector = new Float32Array(vectorArray);
          }
        }
      }
      
      // 构建节点数据对象 - 明确包含完整的originalId
      const nodeData = {
        originalId: id,  // 直接将原始ID作为主键存储，确保ID映射正确
        userData: metadata
      };
      
      // 插入HNSW节点 - 这会返回内部节点ID
      const nodeId = hnswIndex.insertNode(vectorArray, nodeData);
      
      // 存储向量数据和ID映射
      vectorMap.set(nodeId, vectorData);
      if (id !== null) {
        // 双向映射，提高查找速度和可靠性
        idMap.set(nodeId, id);
      }
      
      return nodeId;
    } catch (error) {
      console.error('添加向量失败:', error);
      return -1;
    }
  }
  
  /**
   * 从索引中移除向量
   * @param {number} id - 向量ID
   * @returns {boolean} 是否成功删除
   */
  function removeVector(id) {
    const success = hnswIndex.removeNode(id);
    if (success) {
      vectorMap.delete(id);
      idMap.delete(id);
    }
    return success;
  }
  
  /**
   * 自定义距离计算函数，使用量化编码计算近似距离
   * @param {number} id1 - 第一个向量ID
   * @param {number} id2 - 第二个向量ID
   * @returns {number} 距离
   */
  function computeQuantizedDistance(id1, id2) {
    const node1 = vectorMap.get(id1);
    const node2 = vectorMap.get(id2);
    
    if (!node1 || !node2) {
      throw new Error('无效的向量ID');
    }
    
    return deltaPQ.computeApproximateDistance(node1.codes, node2.codes);
  }
  
  /**
   * 执行K近邻搜索 - 使用最小堆优化版本, 大幅改进查询精度与召回率
   * @param {Float32Array|Array} queryVector - 查询向量
   * @param {number} k - 返回的近邻数量
   * @param {Object} options - 搜索选项
   * @returns {Array<{id: number, distance: number, data: any}>} 搜索结果
   */
  function search(queryVector, k = 10, { ef = efSearch, useQuantization = true, verbose = false } = {}) {
    if (!isTrained) {
      console.error('索引尚未训练，无法执行搜索');
      return [];
    }

    // 检查HNSW索引是否有效
    if (!hnswIndex) {
      console.error('HNSW索引不存在，无法执行搜索');
      return [];
    }

    // 添加填充向量使用说明
    if (verbose && randomFillCount > 0) {
      console.log(`注意: 索引中包含 ${randomFillCount} 个随机填充向量，这些向量仅用于维持图结构的连接性，不会出现在最终搜索结果中`);
    }

    // 检查向量格式和维度
    const vectorArray = Array.isArray(queryVector) ? new Float32Array(queryVector) : queryVector;
    if (!dimensions) {
      console.error('索引维度未设置，可能是索引未训练');
      return [];
    }
    
    if (vectorArray.length !== dimensions) {
      console.error(`查询向量维度 ${vectorArray.length} 与索引维度 ${dimensions} 不匹配`);
      return [];
    }

    // 克隆查询向量以防止修改原始数据
    const queryCopy = new Float32Array(vectorArray);
    
    // 对查询向量进行归一化处理，确保与索引中的向量一致
    if (distanceFunction === 'cosine') {
      normalizeVector(queryCopy);
    }
    
    // 使用搜索放大策略：大幅提高ef参数以增加搜索质量
    const effectiveEf = Math.max(ef, k * EF_AMPLIFICATION_FACTOR);
    
    if (verbose) {
      console.log(`搜索参数: k=${k}, ef=${effectiveEf}, useQuantization=${useQuantization}`);
      console.log(`当前索引中向量数量: ${vectorMap.size}`);
      console.log(`搜索放大策略: 初始搜索放大倍数=${SEARCH_AMPLIFICATION_FACTOR}, ef放大倍数=${EF_AMPLIFICATION_FACTOR}`);
    }

    try {
      // 对查询向量进行量化
      let queryCode = null;
      if (useQuantization) {
        try {
          const quantizationResult = deltaPQ.quantizeVector(queryCopy);
          queryCode = quantizationResult.codes;
          
          if (verbose) {
            console.log('查询向量量化成功');
          }
        } catch (error) {
          console.warn('量化查询向量失败，将退回到使用原始向量:', error);
          useQuantization = false;
        }
      }

      // 搜索HNSW索引 - 大幅扩大初始搜索范围以提高召回率
      const searchParams = { ef: effectiveEf };
      
      // 执行HNSW搜索，使用更高的EF确保结果质量 - 使用SEARCH_AMPLIFICATION_FACTOR放大搜索范围
      const initialResults = hnswIndex.searchKNN(queryCopy, k * SEARCH_AMPLIFICATION_FACTOR, searchParams);
      
      if (verbose) {
        console.log(`HNSW初始搜索结果数量: ${initialResults.length}`);
      }
      
      if (initialResults.length === 0) {
        console.warn('HNSW索引未返回任何结果，可能需要增加ef参数或重建索引');
        
        // 如果索引搜索失败，尝试使用线性搜索作为备份 - 这对小数据集很有效
        if (vectorMap.size < 1000) {
          console.log('尝试使用线性搜索作为备份...');
          
          return linearSearch(queryCopy, k, useQuantization, queryCode, verbose);
        }
        
        return [];
      }

      // 创建最小堆用于存储最终结果 - 这确保我们始终保持k个最近的结果
      const resultHeap = createBinaryHeap((a, b) => b.distance - a.distance);
      
      // 首先进行一次距离计算矫正 - 改进ID处理和距离计算逻辑
      const recalculatedResults = [];
      
      // 检查结果中是否包含不合法的节点ID，及早发现问题
      const invalidNodeIds = initialResults.filter(r => !vectorMap.has(r.id)).map(r => r.id);
      if (invalidNodeIds.length > 0 && verbose) {
        console.warn(`发现${invalidNodeIds.length}个无效节点ID: ${invalidNodeIds.join(', ')}`);
        console.warn('注意,填充向量被用于维持良好的图结构,搜索结果中应予以剔除');
      }
      
      for (const result of initialResults) {
        try {
          // 获取内部节点，提取原始ID
          const nodeId = result.id;
          
          // 确保向量存在于vectorMap中
          if (!vectorMap.has(nodeId)) {
            if (verbose) {
              console.warn(`无法找到内部ID为 ${nodeId} 的向量数据`);
            }
            continue;
          }
          
          const vectorData = vectorMap.get(nodeId);
          
          // 防御性检查确保有向量数据
          if (!vectorData) {
            if (verbose) {
              console.warn(`内部ID为 ${nodeId} 的数据为空`);
            }
            continue;
          }
          
          // 获取节点，检查是否为填充向量
          const node = hnswIndex.getNode ? hnswIndex.getNode(nodeId) : 
                     (hnswIndex._nodes && hnswIndex._nodes.get(nodeId));
          
          // 跳过填充向量
          if (node && node.data && node.data.isFiller === true) {
            if (verbose) {
              console.log(`跳过填充向量，ID=${nodeId}`);
            }
            continue;
          }
          
          // 获取原始ID - 改进ID查找顺序，确保匹配精确查询结果
          let originalId = null;
          
          // 1. 首先尝试从向量数据中获取原始ID
          if (vectorData.originalId !== undefined) {
            originalId = vectorData.originalId;
          } 
          // 2. 然后尝试从idMap中获取
          else if (idMap.has(nodeId)) {
            originalId = idMap.get(nodeId);
          }
          
          // 尝试获取向量数据，优先使用原始向量
          let vector = null;
          if (vectorData.originalVector) {
            vector = vectorData.originalVector;
          } else if (vectorData.vector) {
            vector = vectorData.vector;
          } else if (vectorData.codes) {
            // 如果只有编码，尝试解码
            vector = deltaPQ.dequantizeVector(vectorData.codes);
          }
          
          // 如果无法获取向量数据，记录警告并跳过
          if (!vector) {
            if (verbose) {
              console.warn(`无法为内部ID ${nodeId} 获取有效的向量数据`);
            }
            continue;
          }
          
          // 重新计算精确距离，确保排序准确性
          const exactDistance = computeEuclideanDistance(queryCopy, vector);
          
          recalculatedResults.push({
            id: nodeId,
            originalId: originalId,
            distance: exactDistance,
            vector: vector // 临时存储向量以便后续使用
          });
        } catch (error) {
          console.warn(`无法重新计算内部ID为 ${result.id} 的距离:`, error);
        }
      }
      
      // 根据精确距离重新排序，确保最接近的结果排在前面
      recalculatedResults.sort((a, b) => a.distance - b.distance);
      
      // 取前k*RERANK_AMPLIFICATION_FACTOR个结果，进行第二阶段过滤
      const topRecalculated = recalculatedResults.slice(0, k * RERANK_AMPLIFICATION_FACTOR);
      
      if (verbose) {
        console.log(`重新计算距离后的结果数量: ${topRecalculated.length}`);
        console.log(`使用重排放大倍数: ${RERANK_AMPLIFICATION_FACTOR}倍`);
      }

      // 将结果插入最小堆并保持堆的大小不超过k
      for (const result of topRecalculated) {
        try {
          // 获取节点数据 - 改进节点数据访问方式
          const node = hnswIndex.getNode ? hnswIndex.getNode(result.id) : 
                      (hnswIndex._nodes && hnswIndex._nodes.get(result.id));
                      
          if (!node) {
            if (verbose) {
              console.warn(`找不到节点ID ${result.id} 的数据`);
            }
            continue;
          }
          
          // 获取原始ID - 更全面的ID提取策略, 大幅提高ID映射准确性
          let originalId = result.originalId; // 优先使用之前计算的结果
          
          // 如果之前没有找到，再次尝试从各种可能的地方提取
          if (originalId === undefined || originalId === null) {
            // 1. 从idMap中查找
            if (idMap.has(result.id)) {
              originalId = idMap.get(result.id);
            } 
            // 2. 从节点数据中查找
            else if (node.data && typeof node.data === 'object') {
              if (node.data.originalId !== undefined) {
                originalId = node.data.originalId;
              } else if (node.data.userData && typeof node.data.userData === 'object') {
                if (node.data.userData.originalId !== undefined) {
                  originalId = node.data.userData.originalId;
                } else if (node.data.userData.id !== undefined) {
                  originalId = node.data.userData.id;
                } else if (node.data.userData.index !== undefined) {
                  originalId = node.data.userData.index;
                }
              } else if (node.data.userData !== undefined && node.data.userData !== null) {
                // 直接使用userData作为原始ID的情况
                originalId = node.data.userData;
              }
            }
            
            // 3. 最后尝试从向量数据中查找
            if ((originalId === undefined || originalId === null) && vectorMap.has(result.id)) {
              const vData = vectorMap.get(result.id);
              if (vData && vData.originalId !== undefined) {
                originalId = vData.originalId;
              }
            }
            
            // 4. 如果仍然找不到，使用内部ID作为最后的备选
            if (originalId === undefined || originalId === null) {
              originalId = result.id;
            }
          }
          
          if (verbose && originalId !== undefined) {
            console.log(`节点ID映射: 内部ID=${result.id} -> 原始ID=${originalId}`);
          }
          
          // 构建结果对象
          const resultObj = {
            id: originalId, // 直接使用原始ID作为主ID - 关键修改
            internalId: result.id, // 保留内部ID以便调试
            originalId: originalId,
            distance: result.distance,
            data: node && node.data ? node.data.userData : null
          };
          
          // 最小堆中当前元素数量小于k，直接添加
          if (resultHeap.size() < k) {
            resultHeap.push(resultObj);
            
            if (verbose && resultHeap.size() === 1) {
              console.log(`添加首个元素到堆: ID=${resultObj.id}, 距离=${resultObj.distance}`);
            }
          } 
          // 如果当前元素距离小于堆顶元素距离，替换堆顶
          else if (result.distance < resultHeap.peek().distance) {
            if (verbose) {
              console.log(`替换堆顶元素: 旧=${resultHeap.peek().id}(${resultHeap.peek().distance}) -> 新=${resultObj.id}(${resultObj.distance})`);
            }
            
            resultHeap.pop(); // 移除距离最远的元素
            resultHeap.push(resultObj); // 添加新元素
          }
        } catch (error) {
          console.warn(`处理搜索结果 ${result.id} 时出错:`, error);
          // 继续处理下一个结果
        }
      }

      // 将最小堆转换为数组并按距离排序
      const finalResults = [];
      while (resultHeap.size() > 0) {
        finalResults.push(resultHeap.pop());
      }
      
      // 倒序排列，确保距离最近的在前面
      finalResults.reverse();
      
      if (verbose) {
        console.log(`最终返回 ${finalResults.length} 个结果`);
        if (finalResults.length > 0) {
          console.log('首个结果:', finalResults[0]);
        }
      }
      
      return finalResults;
    } catch (error) {
      console.error('执行搜索时出错:', error);
      return [];
    }
  }
  
  /**
   * 执行线性搜索作为HNSW索引搜索的后备方案
   * 适用于小型数据集或HNSW召回率不足的情况
   */
  function linearSearch(queryVector, k, useQuantization, queryCode, verbose) {
    if (verbose) {
      console.log(`执行线性搜索, 向量数: ${vectorMap.size}`);
    }
    
    const results = [];
    
    // 遍历所有向量计算距离
    for (const [internalId, vectorData] of vectorMap.entries()) {
      try {
        // 获取节点，检查是否为填充向量
        const node = hnswIndex.getNode ? hnswIndex.getNode(internalId) : 
                   (hnswIndex._nodes && hnswIndex._nodes.get(internalId));
        
        // 跳过填充向量
        if (node && node.data && node.data.isFiller === true) {
          if (verbose) {
            console.log(`线性搜索：跳过填充向量，ID=${internalId}`);
          }
          continue;
        }
        
        let distance;
        
        // 根据是否启用量化选择距离计算方法
        if (useQuantization && queryCode && vectorData.codes) {
          // 使用量化向量计算近似距离 (更快但精度较低)
          distance = deltaPQ.computeApproximateDistance(queryCode, vectorData.codes);
        } else if (vectorData.originalVector) {
          // 使用原始向量计算精确距离 (较慢但精度高)
          distance = computeEuclideanDistance(queryVector, vectorData.originalVector);
        } else if (vectorData.vector) {
          // 使用还原的向量计算距离 (折中方案)
          distance = computeEuclideanDistance(queryVector, vectorData.vector);
        } else {
          // 跳过没有向量数据的条目
          if (verbose) {
            console.warn(`向量映射中ID=${internalId}没有有效的向量数据`);
          }
          continue;
        }
        
        // 获取原始ID
        const originalId = idMap.get(internalId);
        
        results.push({
          id: originalId !== undefined ? originalId : internalId,
          originalId: originalId,
          internalId: internalId,
          distance: distance,
          data: vectorData.userData
        });
      } catch (error) {
        console.warn(`线性搜索计算ID=${internalId}的距离时出错:`, error);
      }
    }
    
    // 按距离排序并取前k个
    results.sort((a, b) => a.distance - b.distance);
    const topResults = results.slice(0, k);
    
    if (verbose) {
      console.log(`线性搜索返回 ${topResults.length} 个结果`);
    }
    
    return topResults;
  }
  
  /**
   * 获取向量的量化编码
   * @param {number} id - 向量ID
   * @returns {Uint8Array|null} 量化编码
   */
  function getVectorCodes(id) {
    const entry = vectorMap.get(id);
    return entry ? entry.codes : null;
  }
  
  /**
   * 根据ID获取解码后的向量
   * @param {number} id - 向量ID
   * @returns {Float32Array|null} 解码后的向量
   */
  function getDecodedVector(id) {
    const entry = vectorMap.get(id);
    if (!entry) return null;
    
    return deltaPQ.dequantizeVector(entry.codes);
  }
  
  /**
   * 批量添加向量到索引
   * @param {Array<Float32Array|Array>} vectors - 向量数组
   * @param {Array} [ids] - 向量ID数组，与vectors一一对应
   * @param {Array} [metadata] - 向量元数据数组，与vectors一一对应
   * @param {boolean} [storeOriginal=true] - 是否存储原始向量
   * @returns {Array<number>} 添加的向量ID数组
   */
  function batchAddVectors(vectors, ids = null, metadata = null, storeOriginal = true) { // 默认为true
    if (!vectors || vectors.length === 0) {
      console.error('无法添加空向量数组');
      return [];
    }
    
    const results = [];
    
    // 如果没有ID或元数据，创建空数组
    const idsArray = ids || Array(vectors.length).fill(null);
    const metadataArray = metadata || Array(vectors.length).fill(null);
    
    // 逐个添加向量
    for (let i = 0; i < vectors.length; i++) {
      try {
        const id = idsArray[i];
        const meta = metadataArray[i];
        const addedId = addVector(vectors[i], id, meta, storeOriginal);
        results.push(addedId);
      } catch (error) {
        console.error(`批量添加向量失败，索引: ${i}`, error);
        results.push(-1);
      }
    }
    
    return results;
  }
  
  /**
   * 获取索引元数据信息
   * @returns {Object} 元数据
   */
  function getMetadata() {
    // 获取量化器元数据
    let quantizerMetadata = null;
    if (isTrained && deltaPQ && typeof deltaPQ.getMetadata === 'function') {
      quantizerMetadata = deltaPQ.getMetadata();
    }
    
    return {
      isTrained,
      numVectors: vectorMap.size,
      pendingTrainingVectors: trainingVectors.length,
      // 配置信息
      config: {
        numSubvectors,
        bitsPerCode,
        distanceFunction,
        M,
        efConstruction,
        efSearch
      },
      // 量化器信息
      quantizer: isTrained ? {
        vectorDimension: quantizerMetadata ? quantizerMetadata.vectorDimension : null,
        subvectorSize: quantizerMetadata ? quantizerMetadata.subvectorSize : null,
        compressionRatio: quantizerMetadata ? 
          quantizerMetadata.compressionRatio : 
          (quantizerMetadata && quantizerMetadata.vectorDimension) ? 
            (32 * quantizerMetadata.vectorDimension) / (bitsPerCode * numSubvectors) : 
            null
      } : null,
      // HNSW索引信息
      hnsw: isTrained ? hnswIndex.getStats() : null
    };
  }
  
  /**
   * 序列化索引状态
   * @returns {string} JSON序列化数据
   */
  function serialize() {
    try {
      if (!isTrained) {
        throw new Error('无法序列化未训练的索引');
      }
      
      console.log('开始序列化组合索引...');
      
      // 准备要序列化的数据
      const data = {
        // 基本元数据
        version: "1.0",
        timestamp: Date.now(),
        
        // 配置信息
        config: {
          numSubvectors,
          bitsPerCode,
          distanceFunction,
          M,
          efConstruction,
          efSearch,
          ml
        },
        
        // 状态信息
        nextId,
        isTrained
      };
      
      // 序列化量化器 - 直接存储字符串格式
      if (deltaPQ && typeof deltaPQ.serialize === 'function') {
        try {
          data.quantizerData = deltaPQ.serialize();
          console.log(`量化器序列化成功，数据长度: ${data.quantizerData ? data.quantizerData.length : 0}`);
        } catch (err) {
          console.error('量化器序列化失败:', err);
          data.quantizerData = null;
        }
      } else {
        console.warn('量化器不支持序列化');
        data.quantizerData = null;
      }
      
      // 序列化HNSW索引 - 先获取对象再转换为字符串
      try {
        const hnswObject = hnswIndex.serialize();
        if (hnswObject) {
          data.hnswData = JSON.stringify(hnswObject);
          console.log(`HNSW索引序列化成功，数据长度: ${data.hnswData ? data.hnswData.length : 0}`);
        } else {
          console.warn('HNSW索引序列化返回空数据');
          data.hnswData = null;
        }
      } catch (error) {
        console.error('HNSW索引序列化失败:', error);
        data.hnswData = null;
      }
      
      // 序列化向量映射 - 简化版本，只保留必要数据
      try {
        // 转换Uint8Array为普通数组，避免序列化问题
        const mappings = [];
        
        for (const [id, mapData] of vectorMap.entries()) {
          if (mapData) {
            mappings.push([
              id, 
              {
                codes: mapData.codes ? Array.from(mapData.codes) : null,
                userData: mapData.userData || null,
                pendingTrain: !!mapData.pendingTrain
              }
            ]);
          }
        }
        
        data.vectorMapData = mappings;
        console.log(`向量映射序列化成功，包含 ${mappings.length} 个映射项`);
      } catch (error) {
        console.error('向量映射序列化失败:', error);
        data.vectorMapData = [];
      }
      
      // 序列化ID映射 - 简化版本
      try {
        data.idMapData = Array.from(idMap.entries());
        console.log(`ID映射序列化成功，包含 ${data.idMapData.length} 个映射项`);
      } catch (error) {
        console.error('ID映射序列化失败:', error);
        data.idMapData = [];
      }
      
      // 序列化为JSON字符串
      const jsonString = JSON.stringify(data);
      console.log(`完整序列化成功，总数据大小: ${jsonString.length} 字节`);
      
      return jsonString;
    } catch (error) {
      console.error('组合索引序列化失败:', error);
      throw new Error(`组合索引序列化失败: ${error.message}`);
    }
  }
  
  /**
   * 从序列化数据恢复索引
   * @param {string} serialized - 序列化数据
   * @returns {boolean} 反序列化是否成功
   */
  function deserialize(serialized) {
    try {
      if (!serialized || typeof serialized !== 'string') {
        console.error('反序列化失败: 无效的序列化数据');
        return false;
      }
      
      console.log(`开始反序列化组合索引，数据大小: ${serialized.length} 字节`);
      
      // 解析JSON数据
      let data;
      try {
        data = JSON.parse(serialized);
      } catch (e) {
        console.error('JSON解析失败:', e);
        return false;
      }
      
      if (!data || typeof data !== 'object') {
        console.error('反序列化失败: 无效的数据结构');
        return false;
      }
      
      // 检查数据版本
      console.log(`数据版本: ${data.version || '未知'}, 时间戳: ${data.timestamp || '未知'}`);
      
      // 恢复配置
      if (data.config) {
        numSubvectors = data.config.numSubvectors || numSubvectors;
        bitsPerCode = data.config.bitsPerCode || bitsPerCode;
        distanceFunction = data.config.distanceFunction || distanceFunction;
        M = data.config.M || M;
        efConstruction = data.config.efConstruction || efConstruction;
        efSearch = data.config.efSearch || efSearch;
        ml = data.config.ml || ml;
        console.log(`已恢复配置: numSubvectors=${numSubvectors}, bitsPerCode=${bitsPerCode}, M=${M}`);
      } else {
        console.warn('缺少配置数据，使用默认值');
      }
      
      // 记录反序列化结果
      let quantizerSuccess = false;
      let hnswSuccess = false;
      
      // 分步骤反序列化，任何一步失败都打印详细信息但继续执行
      
      // 1. 恢复量化器
      if (data.quantizerData) {
        try {
          console.log(`尝试反序列化量化器，数据长度: ${data.quantizerData.length}`);
          
          // 量化器的数据已经是序列化后的字符串，可以直接传入
          quantizerSuccess = deltaPQ.deserialize(data.quantizerData);
          
          if (quantizerSuccess) {
            console.log('量化器反序列化成功');
          } else {
            console.error('量化器反序列化失败: deserialize方法返回false');
            
            // 尝试打印量化器数据结构
            try {
              const qData = JSON.parse(data.quantizerData);
              console.log('量化器数据结构:', {
                hasConfig: !!qData.config,
                hasTrained: !!qData.trained,
                hasCodebooks: qData.trained && !!qData.trained.codebooks,
                codebooksLength: qData.trained && qData.trained.codebooks ? qData.trained.codebooks.length : 0
              });
            } catch (e) {
              console.error('无法解析量化器数据:', e);
            }
          }
        } catch (err) {
          console.error('量化器反序列化异常:', err);
        }
      } else {
        console.warn('缺少量化器数据');
      }
      
      // 2. 恢复HNSW索引
      if (data.hnswData) {
        try {
          console.log(`尝试反序列化HNSW索引，数据长度: ${data.hnswData.length}`);
          
          // HNSW索引数据需要先解析为对象
          const hnswObject = JSON.parse(data.hnswData);
          
          if (hnswObject && typeof hnswObject === 'object') {
            console.log('HNSW数据结构有效，开始反序列化...');
            hnswSuccess = hnswIndex.restore(hnswObject);
            
            if (hnswSuccess) {
              console.log('HNSW索引反序列化成功');
            } else {
              console.error('HNSW索引反序列化失败: restore方法返回false');
            }
          } else {
            console.error('HNSW索引数据无效');
          }
        } catch (err) {
          console.error('HNSW索引反序列化异常:', err);
        }
      } else {
        console.warn('缺少HNSW索引数据');
      }
      
      // 3. 恢复向量映射
      vectorMap.clear();
      if (data.vectorMapData && Array.isArray(data.vectorMapData)) {
        let successCount = 0;
        
        for (const item of data.vectorMapData) {
          try {
            if (Array.isArray(item) && item.length === 2) {
              const [id, mapData] = item;
              
              if (mapData && typeof mapData === 'object') {
                // 将普通数组转回Uint8Array
                const codes = mapData.codes ? new Uint8Array(mapData.codes) : null;
                
                vectorMap.set(Number(id), {
                  codes,
                  userData: mapData.userData,
                  pendingTrain: !!mapData.pendingTrain
                });
                
                successCount++;
              }
            }
          } catch (err) {
            console.warn('向量映射项反序列化失败:', err);
          }
        }
        
        console.log(`向量映射反序列化: 成功 ${successCount}/${data.vectorMapData.length} 项`);
      } else {
        console.warn('缺少向量映射数据或格式无效');
      }
      
      // 4. 恢复ID映射
      idMap.clear();
      if (data.idMapData && Array.isArray(data.idMapData)) {
        let successCount = 0;
        
        for (const item of data.idMapData) {
          try {
            if (Array.isArray(item) && item.length === 2) {
              const [nodeId, originalId] = item;
              idMap.set(Number(nodeId), originalId);
              successCount++;
            }
          } catch (err) {
            console.warn('ID映射项反序列化失败:', err);
          }
        }
        
        console.log(`ID映射反序列化: 成功 ${successCount}/${data.idMapData.length} 项`);
      } else {
        console.warn('缺少ID映射数据或格式无效');
      }
      
      // 5. 恢复其他元数据
      nextId = data.nextId || 0;
      
      // 确定训练状态 - 只要量化器或HNSW索引有一个成功就认为已训练
      const wasTrainedInData = !!data.isTrained;
      isTrained = wasTrainedInData && (quantizerSuccess || hnswSuccess);
      
      console.log(`反序列化完成，索引训练状态: ${isTrained}`);
      console.log(`量化器反序列化: ${quantizerSuccess ? '成功' : '失败'}`);
      console.log(`HNSW索引反序列化: ${hnswSuccess ? '成功' : '失败'}`);
      
      // 清空训练向量列表，这些不需要反序列化
      trainingVectors = [];
      
      // 只要有一个核心组件反序列化成功，就返回成功
      return quantizerSuccess || hnswSuccess;
    } catch (error) {
      console.error('组合索引反序列化失败:', error);
      return false;
    }
  }
  
  /**
   * 清理索引并释放内存
   * 注意：调用此方法后，索引将不再可用，需要重新训练
   */
  function clear() {
    // 清理向量映射
    vectorMap.clear();
    
    // 清理ID映射
    idMap.clear();
    
    // 清理训练向量
    trainingVectors = [];
    
    // 重置状态
    nextId = 0;
    isTrained = false;
    
    // 尝试手动触发垃圾回收
    if (typeof global !== 'undefined' && global.gc) {
      try {
        global.gc();
      } catch (e) {
        console.warn('无法手动触发垃圾回收:', e);
      }
    }
    
    return true;
  }
  
  // 返回公共API
  return {
    train,
    addVector,
    batchAddVectors,
    removeVector,
    search,
    clear,
    getDecodedVector,
    getVectorCodes,
    getMetadata,
    serialize,
    deserialize
  };
}