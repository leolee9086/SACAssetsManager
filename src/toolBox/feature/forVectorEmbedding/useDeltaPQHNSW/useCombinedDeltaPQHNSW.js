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
  let idCounter = 0; // 用于在batchAddVectors中生成唯一ID
  
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
    
    // 重置ID计数器
    nextId = 0;
    idCounter = 0;
    
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
    if (!isTrained) {
      throw new Error('索引未训练，无法添加向量');
    }
    
    // 检查向量格式
    const vectorArray = Array.isArray(vector) ? vector : vector instanceof Float32Array ? vector : null;
    
    if (!vectorArray) {
      throw new Error('无效的向量格式，必须是数组或Float32Array');
    }
    
    // 检查维度
    if (dimensions && vectorArray.length !== dimensions) {
      throw new Error(`向量维度不匹配：期望${dimensions}，实际${vectorArray.length}`);
    }
    
    try {
      // 生成内部ID
      const internalId = nextId++;
      
      // 使用传入的ID作为原始ID，若未提供则使用内部ID
      const originalId = id !== null ? id : internalId;
      
      // 构建向量数据结构
      const vectorData = {
        originalVector: storeOriginal ? new Float32Array(vectorArray) : null,
        userData: metadata,
        originalId: originalId  // 明确存储原始ID
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
        originalId: originalId,  // 明确存储原始ID
        userData: metadata
      };
      
      // 插入HNSW节点
      let nodeId;
      
      // 检查insertNode函数所需的参数模式
      // 先尝试直接调用hnswIndex对象的插入方法
      if (typeof hnswIndex.insertNode === 'function') {
        nodeId = hnswIndex.insertNode(vectorArray, nodeData);
      } else {
        console.error('HNSW索引不支持插入节点操作');
        return -1;
      }
      
      // 存储向量数据和ID映射
      if (nodeId !== undefined && nodeId !== null && nodeId !== -1) {
        // 建立双向ID映射关系
        vectorMap.set(nodeId, vectorData);
        if (originalId !== nodeId) {
          idMap.set(nodeId, originalId); // 内部ID到原始ID的映射
        }
        
        return nodeId; // 返回内部ID方便索引操作
      } else {
        console.error('添加向量到HNSW索引失败');
        return -1;
      }
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
   * 预处理查询向量
   * @param {Float32Array|Array<number>} queryVector - 原始查询向量
   * @returns {Float32Array} 处理后的向量
   */
  function preprocessQueryVector(queryVector) {
    // 检查向量格式和维度
    const vectorArray = Array.isArray(queryVector) ? new Float32Array(queryVector) : queryVector;
    
    if (!dimensions) {
      console.error('索引维度未设置，可能是索引未训练');
      return vectorArray;
    }
    
    if (vectorArray.length !== dimensions) {
      console.error(`查询向量维度 ${vectorArray.length} 与索引维度 ${dimensions} 不匹配`);
      return vectorArray;
    }
    
    // 克隆查询向量以防止修改原始数据
    const queryCopy = new Float32Array(vectorArray);
    
    // 对查询向量进行归一化处理，确保与索引中的向量一致
    if (distanceFunction === 'cosine') {
      normalizeVector(queryCopy);
    }
    
    return queryCopy;
  }
  
  /**
   * 处理搜索结果
   * @param {Array} searchResults - 原始搜索结果
   * @param {boolean} returnDistances - 是否返回距离值
   * @returns {Array} 处理后的结果
   */
  function processSearchResults(searchResults, returnDistances = true) {
    if (!searchResults || searchResults.length === 0) {
      return [];
    }
    
    // 格式化结果
    const finalResults = [];
    
    for (const result of searchResults) {
      // 获取内部ID
      const internalId = result.id;
      
      // 跳过无效结果
      if (internalId === undefined || internalId === null) {
        continue;
      }
      
      // 确保向量存在于vectorMap中
      if (!vectorMap.has(internalId)) {
        continue;
      }
      
      const vectorData = vectorMap.get(internalId);
      if (!vectorData) {
        continue;
      }
      
      // 获取原始ID - 修复：优先从vectorData.originalId获取，其次从idMap获取
      let originalId;
      
      if (vectorData.originalId !== undefined) {
        originalId = vectorData.originalId;
      } else if (idMap.has(internalId)) {
        originalId = idMap.get(internalId);
      } else {
        originalId = internalId; // 回退使用内部ID
        console.warn(`找不到ID ${internalId} 的原始ID映射，使用内部ID作为原始ID`);
      }
      
      // 构建结果对象 - 修复：统一使用originalId作为id，internalId作为内部标识
      const resultObj = {
        id: originalId,
        originalId: originalId, // 保持一致性
        internalId: internalId, // 添加内部ID以便调试
        distance: result.distance,
        userData: vectorData.userData
      };
      
      // 添加距离信息
      if (returnDistances && result.distance !== undefined) {
        resultObj.distance = result.distance;
      }
      
      // 添加元数据
      if (vectorData.userData) {
        resultObj.data = vectorData.userData;
      }
      
      finalResults.push(resultObj);
    }
    
    // 确保结果按距离排序
    if (returnDistances) {
      finalResults.sort((a, b) => a.distance - b.distance);
    }
    
    return finalResults;
  }
  
  /**
   * 执行K近邻搜索 - 使用最小堆优化版本, 大幅改进查询精度与召回率
   * @param {Float32Array|Array} queryVector - 查询向量
   * @param {number} k - 返回的近邻数量
   * @param {Object} options - 搜索选项
   * @returns {Array<{id: number, distance: number, data: any}>} 搜索结果
   */
  function search(queryVector, k = 10, params = {}) {
    if (!isTrained) {
      console.error('索引尚未训练，无法执行搜索');
      return [];
    }
    
    // 参数预处理
    const actualK = Math.min(Math.max(1, k), vectorMap.size);
    const { 
      ef = efSearch, 
      returnDistances = true, 
      returnVectors = false, 
      excludeIds = new Set(), 
      verbose = false, 
      useQuantization = true, 
      multipleEfSearch = false
    } = params;
    
    // 定义多EF策略变量
    const useMultiEfStrategy = multipleEfSearch;
    
    // 向量预处理
    let processedVector = preprocessQueryVector(queryVector);
    
    try {
      // 使用正确的参数顺序调用searchKNN
      // 参数顺序: queryVector, nodes, entryPoint, maxLevel, efSearch, distanceFunc, k, ef, excludeIds
      let searchResults = hnswIndex.searchKNN(
        processedVector,                // 查询向量
        hnswIndex._nodes || new Map(),  // 节点存储
        hnswIndex._entryPoint || { id: null, level: 0 }, // 入口点
        hnswIndex._maxLevel || 0,       // 最大层级
        ef,                            // efSearch
        hnswIndex._distanceFunc,       // 距离函数
        actualK,                       // k
        ef,                            // ef
        excludeIds                     // 排除ID
      );
      
      // 如果结果不足且未设置特定参数，尝试增加搜索宽度
      if (searchResults && searchResults.length < actualK && !params.ef) {
        // 再次调用searchKNN，但使用更大的ef值
        const extendedResults = hnswIndex.searchKNN(
          processedVector,
          hnswIndex._nodes || new Map(),
          hnswIndex._entryPoint || { id: null, level: 0 },
          hnswIndex._maxLevel || 0,
          ef * 2,                      // 使用更大的ef值
          hnswIndex._distanceFunc,
          actualK,
          ef * 2,                      // 使用更大的ef值
          excludeIds
        );
        
        // 合并结果
        if (extendedResults && extendedResults.length > 0) {
          searchResults.push(...extendedResults);
        }
      }
      
      // 使用多EF策略搜索
      if (multipleEfSearch && (!searchResults || searchResults.length < actualK)) {
        if (verbose) console.log('使用多EF策略搜索增强结果...');
        
        // 尝试更大的ef值（2倍、4倍、8倍）
        const efMultipliers = [2, 4, 8];
        
        for (const multiplier of efMultipliers) {
          const currentEf = ef * multiplier;
          
          if (verbose) console.log(`尝试ef=${currentEf}的搜索...`);
          
          const additionalResults = hnswIndex.searchKNN(
            processedVector,
            hnswIndex._nodes || new Map(),
            hnswIndex._entryPoint || { id: null, level: 0 },
            hnswIndex._maxLevel || 0,
            currentEf,
            hnswIndex._distanceFunc,
            actualK * 2, // 搜索更多结果以增加多样性
            currentEf,
            excludeIds
          );
          
          if (additionalResults && additionalResults.length > 0) {
            if (!searchResults) {
              searchResults = additionalResults;
            } else {
              // 合并结果，避免重复
              const existingIds = new Set(searchResults.map(r => r.id));
              
              for (const result of additionalResults) {
                if (!existingIds.has(result.id)) {
                  searchResults.push(result);
                  existingIds.add(result.id);
                }
              }
            }
            
            if (searchResults.length >= actualK) {
              if (verbose) console.log(`使用ef=${currentEf}找到足够的结果`);
              break;
            }
          }
        }
      }
      
      // 重排序和处理搜索结果 - 修复：确保ID一致性和正确性
      const processedResults = processSearchResults(searchResults, true);
      
      // 检查是否需要线性搜索回退
      if (processedResults.length < actualK) {
        if (params.verbose) {
          console.log(`HNSW搜索返回结果不足，回退到线性搜索。搜索到${processedResults.length}条，需要${actualK}条`);
        }
        
        // 创建已找到结果的ID集合以避免重复
        const foundIds = new Set(processedResults.map(r => r.originalId !== undefined ? r.originalId : r.id));
        
        // 执行线性搜索，排除已找到的结果
        const linearResults = linearSearch(
          processedVector,
          actualK - processedResults.length,
          !params.disableQuantization,
          foundIds,
          params.verbose
        );
        
        // 合并结果
        processedResults.push(...linearResults);
        
        // 重新按距离排序
        processedResults.sort((a, b) => a.distance - b.distance);
      }
      
      // 使用多EF策略搜索处理，尝试使用不同的EF值搜索并合并结果
      if (useMultiEfStrategy && processedResults.length < actualK) {
        // 尝试使用更大的ef值进行搜索
        const largerEfResults = [];
        
        // 尝试几个不同的ef值
        const efMultipliers = [3, 5, 10];
        
        for (const multiplier of efMultipliers) {
          // 增加ef值重新搜索
          const newEf = ef * multiplier;
          
          if (params.verbose) {
            console.log(`尝试使用更大的ef值: ${newEf}`);
          }
          
          // 执行新的搜索
          const newResults = hnswIndex.searchKNN(
            processedVector,
            hnswIndex._nodes || new Map(),
            hnswIndex._entryPoint || { id: null, level: 0 },
            hnswIndex._maxLevel || 0,
            newEf,
            hnswIndex._distanceFunc,
            actualK,
            newEf,
            excludeIds
          );
          
          // 处理搜索结果确保ID一致性
          const newProcessedResults = processSearchResults(newResults, true);
          
          // 添加到新结果数组
          largerEfResults.push(...newProcessedResults);
          
          // 如果已经找到足够的结果，跳出循环
          if (largerEfResults.length >= (actualK - processedResults.length)) {
            break;
          }
        }
        
        // 创建已找到结果的ID集合
        const existingIds = new Set(processedResults.map(r => r.originalId !== undefined ? r.originalId : r.id));
        
        // 过滤掉重复ID的结果
        const uniqueNewResults = largerEfResults.filter(r => {
          const resultId = r.originalId !== undefined ? r.originalId : r.id;
          return !existingIds.has(resultId);
        });
        
        // 合并结果
        processedResults.push(...uniqueNewResults);
        
        // 重新按距离排序
        processedResults.sort((a, b) => a.distance - b.distance);
      }
      
      // 返回前k个结果 - 确保仅保留需要的字段
      return processedResults.slice(0, k).map(r => ({
        id: r.id,
        originalId: r.originalId,
        distance: r.distance,
        data: r.data || r.userData
      }));
    } catch (error) {
      console.error('搜索执行失败:', error);
      
      // 当HNSW搜索失败时回退到线性搜索
      if (verbose) {
        console.warn('HNSW搜索失败，回退到线性搜索:', error.message);
      }
      
      // 执行线性搜索作为备选方案
      return linearSearch(queryVector, k, useQuantization, excludeIds, verbose);
    }
  }
  
  /**
   * 执行线性搜索作为HNSW搜索的回退方案
   * @param {Float32Array|Array} queryVector - 查询向量
   * @param {number} k - 返回的近邻数量
   * @param {boolean} useQuantization - 是否使用量化编码计算距离
   * @param {Set<number>} excludeIds - 要排除的ID集合
   * @param {boolean} verbose - 是否输出详细日志
   * @returns {Array<{id: number, originalId: number, distance: number}>} 搜索结果
   */
  function linearSearch(queryVector, k = 10, useQuantization = false, excludeIds = null, verbose = false) {
    if (!isTrained || vectorMap.size === 0) {
      if (verbose) console.warn('索引未训练或为空，无法执行线性搜索');
      return [];
    }
    
    // 预处理查询向量
    const processedQuery = preprocessQueryVector(queryVector);
    
    // 转换成数组以便排序
    const results = [];
    
    // 使用量化编码或原始向量计算距离
    if (verbose) console.time('线性搜索计算时间');
    
    // 遍历所有向量计算距离
    for (const [internalId, vectorData] of vectorMap.entries()) {
      // 跳过填充向量和排除的ID
      if (vectorData.isFiller || (excludeIds && excludeIds.has(internalId))) {
        continue;
      }
      
      let distance;
      if (useQuantization && vectorData.codes) {
        // 使用量化向量计算近似距离
        const queryCode = deltaPQ.quantizeVector(processedQuery).codes;
        distance = deltaPQ.computeApproximateDistance(vectorData.codes, queryCode);
      } else if (vectorData.originalVector) {
        // 使用原始向量计算精确距离
        distance = computeEuclideanDistance(processedQuery, vectorData.originalVector);
      } else if (vectorData.vector) {
        // 使用反量化向量
        distance = computeEuclideanDistance(processedQuery, vectorData.vector);
      } else {
        // 没有可用向量，跳过
        continue;
      }
      
      // 添加到结果列表 - 修复：确保ID一致性
      const originalId = vectorData.originalId || (idMap.has(internalId) ? idMap.get(internalId) : internalId);
      
      results.push({
        id: originalId,         // 主ID使用原始ID
        originalId: originalId, // 保持一致性
        internalId: internalId, // 添加内部ID以便调试
        distance,
        userData: vectorData.userData
      });
    }
    
    if (verbose) console.timeEnd('线性搜索计算时间');
    
    // 按距离排序
    results.sort((a, b) => a.distance - b.distance);
    
    // 返回前k个结果
    return results.slice(0, k);
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
    if (!isTrained) {
      console.error('索引尚未训练，无法添加向量');
      return [];
    }
    
    if (!vectors || !Array.isArray(vectors) || vectors.length === 0) {
      return [];
    }
    
    // 确保向量维度正确
    for (const vector of vectors) {
      if (!vector || vector.length !== dimensions) {
        console.error(`向量维度 ${vector ? vector.length : 'undefined'} 与索引维度 ${dimensions} 不匹配`);
        return [];
      }
    }
    
    // 批量预处理向量和ID
    const processedVectors = [];
    const resultIds = [];
    const vectorCodes = [];
    const nodeData = [];
    
    for (let i = 0; i < vectors.length; i++) {
      try {
        const vector = vectors[i];
        
        // 获取ID - 修复：优先使用传入的ID，否则生成新ID
        const id = ids && i < ids.length ? ids[i] : nextId++;
        
        // 获取元数据
        const userData = metadata && i < metadata.length ? metadata[i] : null;
        
        // 处理向量（归一化等）
        const processedVector = preprocessQueryVector(vector);
        
        // 量化向量
        const quantizationResult = deltaPQ.quantizeVector(processedVector);
        
        // 存储处理后的数据
        processedVectors.push(processedVector);
        resultIds.push(id);
        vectorCodes.push(quantizationResult.codes);
        nodeData.push({
          originalId: id,  // 明确在nodeData中设置originalId
          userData: userData
        });
        
        // 记录映射关系 - 修复：使用internalId明确区分内部ID
        const internalId = idCounter++;
        idMap.set(internalId, id); // 内部ID映射到原始ID
        
        // 存储向量数据 - 修复：vectorMap的key应该是internalId
        vectorMap.set(internalId, {
          codes: quantizationResult.codes,
          originalId: id,  // 显式存储原始ID
          userData,
          // 可选存储原始向量（会增加内存使用）
          originalVector: storeOriginal ? new Float32Array(vector) : undefined
        });
      } catch (error) {
        console.error(`处理批量向量 ${i} 时出错:`, error);
      }
    }
    
    // 批量插入HNSW索引
    try {
      // 检查hnswIndex是否有batch插入方法
      if (typeof hnswIndex.addItems === 'function') {
        // 使用批量添加方法
        hnswIndex.addItems(processedVectors, nodeData);
      } else if (typeof hnswIndex.batchInsertNodes === 'function') {
        // 使用batchInsertNodes方法
        hnswIndex.batchInsertNodes(processedVectors, nodeData);
      } else {
        // 回退到单个插入
        console.warn('HNSW索引不支持批量插入，回退到单个插入模式');
        for (let i = 0; i < processedVectors.length; i++) {
          let data = nodeData[i];
          hnswIndex.insertNode(processedVectors[i], data);
        }
      }
    } catch (error) {
      console.error('批量插入HNSW索引时出错:', error);
    }
    
    return resultIds;
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
  
  // 返回组合索引对象
  return {
    train,
    addVector,
    removeVector,
    search,
    linearSearch,
    getVectorCodes,
    getDecodedVector,
    batchAddVectors,
    getMetadata,
    serialize,
    deserialize,
    clear
  };
}