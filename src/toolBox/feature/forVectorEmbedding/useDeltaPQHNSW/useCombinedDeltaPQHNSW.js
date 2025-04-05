/**
 * DeltaPQ-HNSW 结合实现
 * 将DeltaPQ向量压缩与HNSW图索引结合，实现高压缩比与高性能的向量检索系统
 */

import { createDeltaPQ, createDeltaPQIndex } from './useCustomedDeltaPQ.js';
import { createHNSWIndex } from './useCustomedHNSW.js';

// 常量定义
const DEFAULT_NUM_SUBVECTORS = 8;
const DEFAULT_BITS_PER_CODE = 8;
const DEFAULT_M = 16;
const DEFAULT_EF_CONSTRUCTION = 200;
const DEFAULT_EF_SEARCH = 50;

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
  useDistanceCache = true
} = {}) {
  // 创建DeltaPQ量化器
  const quantizer = createDeltaPQ({
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
  
  // 存储原始向量与编码的映射
  const vectorMap = new Map();
  const idMap = new Map();
  let nextId = 0;
  
  // 训练状态
  let isTrained = false;
  let trainingVectors = [];
  
  /**
   * 使用原始向量训练量化器和构建索引
   * @param {Array<Float32Array|Array>} vectors - 训练向量
   * @returns {Object} 训练结果统计
   */
  function train(vectors) {
    if (vectors.length === 0) {
      throw new Error('Empty training set');
    }
    
    // 存储训练向量以备插入使用
    trainingVectors = vectors.map(v => Array.from(v));
    
    // 训练DeltaPQ量化器
    const trainResult = quantizer.train(vectors);
    
    // 量化所有训练向量
    const quantizedVectors = vectors.map((vector, index) => {
      const { codes } = quantizer.quantizeVector(vector);
      return { vector, codes, index };
    });
    
    // 将量化后的向量插入HNSW索引
    for (const { vector, codes, index } of quantizedVectors) {
      const id = insertVectorInternal(vector, codes, null);
      // 保存原始ID映射
      idMap.set(id, index);
    }
    
    isTrained = true;
    
    return {
      numVectors: vectors.length,
      averageError: trainResult.averageError,
      compressionRatio: trainResult.compressionRatio,
      hnswStats: hnswIndex.getStats()
    };
  }
  
  /**
   * 内部方法：插入向量到索引
   * @param {Float32Array|Array} vector - 原始向量
   * @param {Uint8Array} codes - 量化编码
   * @param {any} [data] - 关联数据
   * @returns {number} 分配的向量ID
   */
  function insertVectorInternal(vector, codes, data) {
    // 创建自定义节点数据，包含量化编码
    const nodeData = {
      originalVector: null, // 不存储原始向量以节省内存
      codes,
      userData: data
    };
    
    // 插入HNSW节点（使用虚拟向量，实际距离计算会使用量化编码）
    const id = hnswIndex.insertNode(vector, nodeData);
    
    // 记录向量与ID的映射
    vectorMap.set(id, {
      codes,
      userData: data
    });
    
    return id;
  }
  
  /**
   * 添加向量到索引
   * @param {Float32Array|Array} vector - 要添加的向量
   * @param {any} [data] - 关联数据
   * @param {boolean} [storeOriginal=false] - 是否保留原始向量（会增加内存占用）
   * @returns {number} 分配的向量ID
   */
  function addVector(vector, data = null, storeOriginal = false) {
    if (!isTrained) {
      throw new Error('索引未训练，请先调用train方法');
    }
    
    // 量化向量
    const { codes } = quantizer.quantizeVector(vector);
    
    // 创建节点数据
    const nodeData = {
      originalVector: storeOriginal ? Array.from(vector) : null,
      codes,
      userData: data
    };
    
    // 插入HNSW节点
    const id = hnswIndex.insertNode(vector, nodeData);
    
    // 记录向量与ID的映射
    vectorMap.set(id, {
      codes,
      userData: data
    });
    
    return id;
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
    
    return quantizer.computeApproximateDistance(node1.codes, node2.codes);
  }
  
  /**
   * 执行K近邻搜索
   * @param {Float32Array|Array} queryVector - 查询向量
   * @param {number} k - 返回的近邻数量
   * @param {Object} options - 搜索选项
   * @returns {Array<{id: number, distance: number, data: any}>} 搜索结果
   */
  function search(queryVector, k = 10, { ef = efSearch, useQuantization = true } = {}) {
    if (!isTrained) {
      throw new Error('索引未训练，请先调用train方法');
    }
    
    // 量化查询向量
    const { codes: queryCodes } = quantizer.quantizeVector(queryVector);
    
    let results;
    
    if (useQuantization) {
      // 使用HNSW执行搜索
      results = hnswIndex.searchKNN(queryVector, k, ef);
    } else {
      // 使用原始向量精确搜索（更慢但更准确）
      results = hnswIndex.searchKNN(queryVector, k, ef);
      
      // 重新计算精确距离（如果保存了原始向量）
      results = results.map(result => {
        const node = hnswIndex._nodes.get(result.id);
        if (node && node.data.originalVector) {
          // 使用原始向量计算精确距离
          const rawDistanceFunc = hnswIndex._getRawDistanceFunc();
          const exactDistance = rawDistanceFunc(queryVector, node.data.originalVector);
          return { ...result, distance: exactDistance };
        }
        return result;
      });
    }
    
    // 格式化结果
    return results.map(result => {
      const nodeData = hnswIndex._nodes.get(result.id).data;
      return {
        id: result.id,
        originalId: idMap.get(result.id),
        distance: result.distance,
        data: nodeData.userData
      };
    });
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
    
    return quantizer.dequantizeVector(entry.codes);
  }
  
  /**
   * 批量添加向量
   * @param {Array<Float32Array|Array>} vectors - 向量数组
   * @param {Array} [dataList] - 数据数组
   * @returns {Array<number>} ID数组
   */
  function batchAddVectors(vectors, dataList = null) {
    const ids = [];
    for (let i = 0; i < vectors.length; i++) {
      const data = dataList ? dataList[i] : null;
      ids.push(addVector(vectors[i], data));
    }
    return ids;
  }
  
  /**
   * 获取索引元数据
   * @returns {Object} 索引元数据
   */
  function getMetadata() {
    return {
      isTrained,
      vectorCount: vectorMap.size,
      hnswStats: hnswIndex.getStats(),
      quantizerMetadata: quantizer.getMetadata(),
      memoryUsage: {
        // 粗略估计内存使用（以字节为单位）
        quantizedVectors: vectorMap.size * numSubvectors,
        hnswGraph: hnswIndex.getStats().nodeCount * (16 + M * 4) // 估计值
      }
    };
  }
  
  // 返回公开API
  return {
    train,
    addVector,
    batchAddVectors,
    removeVector,
    search,
    getVectorCodes,
    getDecodedVector,
    getMetadata,
    
    // 暴露底层组件以便高级用法
    _quantizer: quantizer,
    _hnswIndex: hnswIndex
  };
} 