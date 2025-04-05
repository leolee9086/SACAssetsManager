/**
 * 分区式HNSW索引实现
 * 支持动态增删、无缝分区加载与卸载的HNSW索引算法
 */

import { createHNSWIndex } from '../forVectorEmbedding/useDeltaPQHNSW/useCustomedHNSW.js';

// 常量定义
const DEFAULT_PARTITION_SIZE = 100000; // 每个分区的最大向量数量
const DEFAULT_PARTITIONS_IN_MEMORY = 5; // 内存中保留的分区数量
const DEFAULT_M = 16; // 每个节点最大连接数
const DEFAULT_EF_CONSTRUCTION = 200; // 构建时的候选集大小
const DEFAULT_EF_SEARCH = 50; // 搜索时的候选集大小

/**
 * 创建分区HNSW索引
 * 通过分区管理实现大规模索引的动态加载与卸载
 * 
 * @param {Object} options 配置选项
 * @returns {Object} 分区索引API
 */
export function createPartitionedHNSW({
  // 分区配置
  partitionSize = DEFAULT_PARTITION_SIZE,
  partitionsInMemory = DEFAULT_PARTITIONS_IN_MEMORY,
  persistCallback = null, // 持久化回调函数(partitionId, partitionData) => Promise
  loadCallback = null,    // 加载回调函数(partitionId) => Promise<partitionData>
  
  // HNSW配置
  distanceFunction = 'euclidean',
  M = DEFAULT_M,
  efConstruction = DEFAULT_EF_CONSTRUCTION,
  efSearch = DEFAULT_EF_SEARCH,
  ml = 16
} = {}) {
  // 分区管理
  const partitions = new Map(); // 分区ID -> 分区索引
  const partitionMetadata = new Map(); // 分区ID -> 分区元数据
  const vectorToPartition = new Map(); // 向量ID -> 分区ID
  
  // LRU缓存管理
  const partitionUsage = []; // 分区使用情况的LRU队列
  
  // 全局状态
  let nextVectorId = 0;
  let nextPartitionId = 0;
  let currentPartitionId = 0;
  
  /**
   * 获取向量所在分区
   * @param {number} vectorId 向量ID
   * @returns {number|null} 分区ID或null
   */
  function getVectorPartition(vectorId) {
    return vectorToPartition.get(vectorId) ?? null;
  }
  
  /**
   * 更新分区使用状态
   * @param {number} partitionId 分区ID
   */
  function updatePartitionUsage(partitionId) {
    // 从当前位置移除
    const index = partitionUsage.indexOf(partitionId);
    if (index !== -1) {
      partitionUsage.splice(index, 1);
    }
    
    // 添加到最近使用队列的开头
    partitionUsage.unshift(partitionId);
  }
  
  /**
   * 确保分区加载到内存
   * @param {number} partitionId 分区ID
   * @returns {Promise<Object>} 分区索引对象
   */
  async function ensurePartitionLoaded(partitionId) {
    // 如果分区已在内存中，直接返回
    if (partitions.has(partitionId)) {
      updatePartitionUsage(partitionId);
      return partitions.get(partitionId);
    }
    
    // 如果达到内存限制，卸载最不常用的分区
    while (partitions.size >= partitionsInMemory && partitions.size > 0) {
      const leastUsedPartitionId = partitionUsage.pop();
      await unloadPartition(leastUsedPartitionId);
    }
    
    // 加载请求的分区
    return await loadPartition(partitionId);
  }
  
  /**
   * 创建新分区
   * @param {number} partitionId 分区ID
   * @returns {Object} 新分区索引
   */
  function createPartition(partitionId) {
    const partition = createHNSWIndex({
      distanceFunction,
      M,
      efConstruction,
      efSearch,
      ml
    });
    
    partitions.set(partitionId, partition);
    partitionMetadata.set(partitionId, {
      id: partitionId,
      size: 0,
      created: Date.now(),
      lastModified: Date.now()
    });
    
    updatePartitionUsage(partitionId);
    return partition;
  }
  
  /**
   * 加载分区到内存
   * @param {number} partitionId 分区ID
   * @returns {Promise<Object>} 加载的分区索引
   */
  async function loadPartition(partitionId) {
    // 如果没有加载回调，创建新的空分区
    if (!loadCallback) {
      return createPartition(partitionId);
    }
    
    try {
      // 调用加载回调获取分区数据
      const partitionData = await loadCallback(partitionId);
      
      // 如果没有数据，创建新分区
      if (!partitionData) {
        return createPartition(partitionId);
      }
      
      // 重建分区索引
      const partition = createHNSWIndex({
        distanceFunction,
        M,
        efConstruction,
        efSearch,
        ml
      });
      
      // 恢复分区数据
      partition._restore(partitionData.indexData);
      
      // 更新元数据
      partitions.set(partitionId, partition);
      partitionMetadata.set(partitionId, partitionData.metadata);
      
      // 恢复向量到分区的映射
      for (const vectorId of partitionData.vectorIds) {
        vectorToPartition.set(vectorId, partitionId);
      }
      
      updatePartitionUsage(partitionId);
      return partition;
    } catch (error) {
      console.error(`加载分区 ${partitionId} 失败:`, error);
      return createPartition(partitionId);
    }
  }
  
  /**
   * 卸载分区并持久化
   * @param {number} partitionId 分区ID
   * @returns {Promise<boolean>} 操作是否成功
   */
  async function unloadPartition(partitionId) {
    // 获取分区
    const partition = partitions.get(partitionId);
    if (!partition) return false;
    
    // 如果有持久化回调，保存分区数据
    if (persistCallback) {
      try {
        const metadata = partitionMetadata.get(partitionId);
        const indexData = partition._serialize();
        
        // 获取分区中的所有向量ID
        const vectorIds = [];
        for (const [vectorId, pId] of vectorToPartition.entries()) {
          if (pId === partitionId) {
            vectorIds.push(vectorId);
          }
        }
        
        // 调用持久化回调
        await persistCallback(partitionId, {
          metadata,
          indexData,
          vectorIds
        });
      } catch (error) {
        console.error(`持久化分区 ${partitionId} 失败:`, error);
        return false;
      }
    }
    
    // 从内存中移除分区
    partitions.delete(partitionId);
    return true;
  }
  
  /**
   * 获取或创建当前活动分区
   * @returns {Promise<Object>} 当前分区索引
   */
  async function getCurrentPartition() {
    // 获取当前分区
    let partition = await ensurePartitionLoaded(currentPartitionId);
    const metadata = partitionMetadata.get(currentPartitionId);
    
    // 检查分区是否已满
    if (metadata && metadata.size >= partitionSize) {
      // 创建新分区
      currentPartitionId = nextPartitionId++;
      partition = createPartition(currentPartitionId);
    }
    
    return partition;
  }
  
  /**
   * 添加向量到索引
   * @param {Float32Array|Array} vector 要添加的向量
   * @param {any} data 关联数据
   * @returns {Promise<number>} 向量ID
   */
  async function addVector(vector, data = null) {
    // 获取当前分区
    const partition = await getCurrentPartition();
    const metadata = partitionMetadata.get(currentPartitionId);
    
    // 分配向量ID
    const vectorId = nextVectorId++;
    
    // 将向量添加到分区
    partition.insertNode(vector, { originalId: vectorId, data });
    
    // 更新映射和元数据
    vectorToPartition.set(vectorId, currentPartitionId);
    metadata.size++;
    metadata.lastModified = Date.now();
    
    return vectorId;
  }
  
  /**
   * 批量添加向量
   * @param {Array<Float32Array|Array>} vectors 向量数组
   * @param {Array<any>} dataList 数据数组
   * @returns {Promise<Array<number>>} 向量ID数组
   */
  async function batchAddVectors(vectors, dataList = null) {
    const vectorIds = [];
    
    for (let i = 0; i < vectors.length; i++) {
      const data = dataList ? dataList[i] : null;
      const id = await addVector(vectors[i], data);
      vectorIds.push(id);
    }
    
    return vectorIds;
  }
  
  /**
   * 从索引中移除向量
   * @param {number} vectorId 向量ID
   * @returns {Promise<boolean>} 操作是否成功
   */
  async function removeVector(vectorId) {
    // 获取向量所在分区
    const partitionId = getVectorPartition(vectorId);
    if (partitionId === null) return false;
    
    // 确保分区已加载
    const partition = await ensurePartitionLoaded(partitionId);
    const metadata = partitionMetadata.get(partitionId);
    
    // 在分区中查找并移除向量
    let removed = false;
    for (const node of partition._nodes.values()) {
      if (node.data && node.data.originalId === vectorId) {
        removed = partition.removeNode(node.id);
        break;
      }
    }
    
    if (removed) {
      // 更新映射和元数据
      vectorToPartition.delete(vectorId);
      metadata.size--;
      metadata.lastModified = Date.now();
    }
    
    return removed;
  }
  
  /**
   * 搜索K近邻
   * @param {Float32Array|Array} queryVector 查询向量
   * @param {number} k 返回的近邻数量
   * @param {Object} options 搜索选项
   * @returns {Promise<Array<{id: number, distance: number, data: any}>>} 搜索结果
   */
  async function search(queryVector, k = 10, { ef = efSearch, partitionIds = null } = {}) {
    // 确定要搜索的分区
    const searchPartitionIds = partitionIds || [...partitionMetadata.keys()];
    
    // 在每个分区中执行搜索
    const allResults = [];
    
    for (const partitionId of searchPartitionIds) {
      // 确保分区已加载
      const partition = await ensurePartitionLoaded(partitionId);
      
      // 执行搜索
      const partitionResults = partition.searchKNN(queryVector, k, ef);
      
      // 转换结果，使用原始向量ID
      for (const result of partitionResults) {
        const node = partition._nodes.get(result.id);
        if (node && node.data) {
          allResults.push({
            id: node.data.originalId,
            distance: result.distance,
            data: node.data.data,
            partitionId
          });
        }
      }
    }
    
    // 排序并返回前k个结果
    allResults.sort((a, b) => a.distance - b.distance);
    return allResults.slice(0, k);
  }
  
  /**
   * 获取分区信息
   * @returns {Array<Object>} 分区元数据数组
   */
  function getPartitionInfo() {
    const info = [];
    
    for (const [partitionId, metadata] of partitionMetadata.entries()) {
      info.push({
        ...metadata,
        inMemory: partitions.has(partitionId),
        active: partitionId === currentPartitionId
      });
    }
    
    return info;
  }
  
  /**
   * 获取向量信息
   * @param {number} vectorId 向量ID
   * @returns {Promise<Object|null>} 向量信息或null
   */
  async function getVectorInfo(vectorId) {
    const partitionId = getVectorPartition(vectorId);
    if (partitionId === null) return null;
    
    const partition = await ensurePartitionLoaded(partitionId);
    
    // 查找向量
    for (const node of partition._nodes.values()) {
      if (node.data && node.data.originalId === vectorId) {
        return {
          id: vectorId,
          partitionId,
          vector: node.vector,
          data: node.data.data
        };
      }
    }
    
    return null;
  }
  
  /**
   * 强制保存所有内存中的分区
   * @returns {Promise<boolean>} 操作是否成功
   */
  async function saveAllPartitions() {
    if (!persistCallback) return false;
    
    try {
      for (const partitionId of partitions.keys()) {
        await unloadPartition(partitionId);
        // 立即重新加载，保持在内存中
        await ensurePartitionLoaded(partitionId);
      }
      return true;
    } catch (error) {
      console.error('保存所有分区失败:', error);
      return false;
    }
  }
  
  return {
    // 向量操作
    addVector,
    batchAddVectors,
    removeVector,
    search,
    getVectorInfo,
    
    // 分区管理
    getPartitionInfo,
    saveAllPartitions,
    
    // 内部方法，供调试使用
    _getPartitionMetadata: () => partitionMetadata,
    _getVectorToPartition: () => vectorToPartition,
    _getPartitions: () => partitions
  };
} 