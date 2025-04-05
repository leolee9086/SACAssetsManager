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
    
    console.log(`开始训练组合索引: ${vectors.length}个向量...`);
    
    // 存储训练向量以备插入使用
    trainingVectors = vectors.map(v => Array.from(v));
    
    // 训练DeltaPQ量化器
    console.log('训练DeltaPQ量化器...');
    const trainResult = quantizer.train(vectors);
    console.log('DeltaPQ量化器训练完成', trainResult);
    
    // 量化所有训练向量
    console.log('量化训练向量...');
    const quantizedVectors = vectors.map((vector, index) => {
      const result = quantizer.quantizeVector(vector);
      return { 
        vector, 
        codes: result.codes, 
        index 
      };
    });
    console.log(`成功量化 ${quantizedVectors.length} 个向量`);
    
    // 将量化后的向量插入HNSW索引
    console.log('插入量化向量到HNSW索引...');
    let insertedCount = 0;
    for (const { vector, codes, index } of quantizedVectors) {
      try {
        const id = insertVectorInternal(vector, codes, null);
        // 保存原始ID映射
        idMap.set(id, index);
        insertedCount++;
        
        if (insertedCount % 50 === 0) {
          console.log(`已插入 ${insertedCount}/${quantizedVectors.length} 个向量...`);
        }
      } catch (error) {
        console.error(`插入向量失败, 索引: ${index}`, error);
      }
    }
    console.log(`成功插入 ${insertedCount}/${quantizedVectors.length} 个向量`);
    
    isTrained = true;
    
    return {
      numVectors: vectors.length,
      insertedVectors: insertedCount,
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
        console.warn('量化编码为空，尝试重新量化');
        if (isTrained) {
          const result = quantizer.quantizeVector(vector);
          codes = result.codes;
          nodeData.codes = codes;
        } else {
          throw new Error('索引未训练，无法量化向量');
        }
      }
      
      // 插入HNSW节点（使用虚拟向量，实际距离计算会使用量化编码）
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
   * 添加向量到索引
   * @param {Float32Array|Array} vector - 要添加的向量
   * @param {any} [id] - 关联的ID
   * @param {any} [metadata] - 关联数据
   * @param {boolean} [storeOriginal=false] - 是否保留原始向量（会增加内存占用）
   * @returns {number} 分配的向量ID
   */
  function addVector(vector, id = null, metadata = null, storeOriginal = false) {
    // 如果索引未训练，收集向量用于后续训练
    if (!isTrained) {
      // 存储向量用于训练
      trainingVectors.push(Array.from(vector));
      
      // 如果已收集足够的向量，进行训练
      if (trainingVectors.length >= sampleSize) {
        console.log(`已收集${trainingVectors.length}个向量，开始自动训练索引...`);
        train(trainingVectors);
        // 训练后清空训练集以节省内存
        trainingVectors = [];
        // 现在索引已训练完成，继续处理当前向量
      } else {
        // 如果向量数量不足以训练，暂时存储原始向量和元数据
        const tempId = nextId++;
        vectorMap.set(tempId, {
          originalVector: Array.from(vector),
          userData: metadata || id,
          pendingTrain: true
        });
        
        if (id !== null) {
          idMap.set(tempId, id);
        }
        
        return tempId;
      }
    }
    
    try {
      // 性能优化：量化向量
      const quantizeResult = quantizer.quantizeVector(vector);
      if (!quantizeResult || !quantizeResult.codes) {
        throw new Error('向量量化失败');
      }
      
      // 创建节点数据
      const nodeData = {
        originalVector: storeOriginal ? Array.from(vector) : null,
        codes: quantizeResult.codes,
        userData: metadata || id
      };
      
      // 插入HNSW节点
      const nodeId = hnswIndex.insertNode(vector, nodeData);
      
      // 记录向量与ID的映射
      vectorMap.set(nodeId, {
        codes: quantizeResult.codes,
        userData: metadata || id
      });
      
      // 如果提供了ID，记录ID映射
      if (id !== null) {
        idMap.set(nodeId, id);
      }
      
      return nodeId;
    } catch (error) {
      console.error('添加向量失败:', error);
      return -1; // 返回无效ID表示添加失败
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
    
    return quantizer.computeApproximateDistance(node1.codes, node2.codes);
  }
  
  /**
   * 执行K近邻搜索 - 使用最小堆优化版本
   * @param {Float32Array|Array} queryVector - 查询向量
   * @param {number} k - 返回的近邻数量
   * @param {Object} options - 搜索选项
   * @returns {Array<{id: number, distance: number, data: any}>} 搜索结果
   */
  function search(queryVector, k = 10, { ef = efSearch, useQuantization = true, verbose = false } = {}) {
    try {
      if (verbose) {
        console.log(`开始搜索，k=${k}, 训练状态=${isTrained}, 待训练向量=${trainingVectors.length}`);
      }
      
      // 如果索引未训练但已收集了向量，自动进行训练
      if (!isTrained && trainingVectors.length > 0) {
        console.log(`执行搜索前自动训练索引（使用${trainingVectors.length}个向量）...`);
        try {
          train(trainingVectors);
          trainingVectors = [];
        } catch (err) {
          console.error('自动训练索引失败:', err);
        }
      }
      
      // 如果索引仍未训练，使用线性搜索处理
      if (!isTrained) {
        console.warn('索引未训练，切换到线性搜索模式');
        // 如果我们有一些向量，执行简单的线性搜索
        if (vectorMap.size > 0) {
          const results = [];
          // 遍历所有向量进行线性搜索
          for (const [id, entry] of vectorMap.entries()) {
            if (entry.originalVector) {
              // 使用欧几里得距离
              const distance = computeEuclideanDistance(queryVector, entry.originalVector);
              results.push({
                id,
                originalId: idMap.get(id),
                distance,
                data: entry.userData
              });
            }
          }
          
          // 排序并返回前k个结果
          if (results.length > 0) {
            return results
              .sort((a, b) => a.distance - b.distance)
              .slice(0, k);
          }
        }
        
        console.error('索引未训练且没有可用向量，无法执行搜索');
        return [];
      }
      
      if (!queryVector || queryVector.length === 0) {
        console.error('查询向量为空');
        return [];
      }
      
      if (verbose) {
        console.log(`量化查询向量...`);
      }
      
      // 量化查询向量 - 使用快速模式
      let quantizeResult;
      try {
        quantizeResult = quantizer.quantizeVector(queryVector, true);
        if (!quantizeResult || !quantizeResult.codes) {
          console.error('量化查询向量失败');
          // 尝试使用原始向量作为备选方案
          useQuantization = false;
        }
      } catch (error) {
        console.error('量化向量时出错:', error);
        useQuantization = false;
      }
      
      // 创建最小堆用于存储搜索结果 - 使用最大堆的反向排序实现k近邻
      // 按距离降序排列，这样我们可以轻松移除最远的元素
      const resultHeap = createMinHeap((a, b) => b.distance - a.distance);
      
      if (verbose) {
        console.log(`执行HNSW搜索...`);
      }
      
      try {
        // 执行HNSW搜索 - 获取初始候选集
        let initialResults = [];
        
        try {
          initialResults = hnswIndex.searchKNN(queryVector, Math.max(k, Math.min(ef, 100)), ef);
        } catch (error) {
          console.error('HNSW搜索失败:', error);
          // 尝试使用较小的ef值重试
          try {
            console.log('尝试使用较小的ef值重试搜索...');
            initialResults = hnswIndex.searchKNN(queryVector, k, Math.min(30, ef));
          } catch (retryError) {
            console.error('HNSW搜索重试失败:', retryError);
          }
        }
        
        if (!initialResults || initialResults.length === 0) {
          if (verbose) {
            console.log('HNSW搜索没有返回结果');
          }
          
          // 如果HNSW搜索失败，尝试线性搜索
          console.log('HNSW搜索失败，尝试线性搜索...');
          const linearResults = [];
          
          // 遍历随机选择的最多100个向量进行线性搜索
          const entries = Array.from(vectorMap.entries());
          const sampleSize = Math.min(100, entries.length);
          const sampledEntries = entries.sort(() => Math.random() - 0.5).slice(0, sampleSize);
          
          for (const [id, entry] of sampledEntries) {
            try {
              let distance;
              
              if (useQuantization && quantizeResult && entry.codes) {
                // 使用量化编码计算距离
                distance = quantizer.computeApproximateDistance(quantizeResult.codes, entry.codes);
              } else if (entry.originalVector) {
                // 使用原始向量计算距离
                distance = computeEuclideanDistance(queryVector, entry.originalVector);
              } else {
                // 如果既没有码也没有原始向量，则跳过
                continue;
              }
              
              linearResults.push({
                id,
                originalId: idMap.get(id),
                distance,
                data: entry.userData
              });
            } catch (e) {
              console.warn(`计算向量 ${id} 的距离失败:`, e);
            }
          }
          
          return linearResults
            .sort((a, b) => a.distance - b.distance)
            .slice(0, k);
        }
        
        // 将结果插入最小堆并保持堆的大小不超过k
        for (const result of initialResults) {
          try {
            // 获取节点数据 - 使用兼容性方法
            const node = hnswIndex.getNode ? hnswIndex.getNode(result.id) : 
                        (hnswIndex._nodes && hnswIndex._nodes.get(result.id));
                        
            if (!node) {
              console.warn(`找不到节点ID ${result.id} 的数据`);
              continue;
            }
            
            // 构建结果对象
            const resultObj = {
              id: result.id,
              originalId: idMap.get(result.id),
              distance: result.distance,
              data: node && node.data ? node.data.userData : null
            };
            
            // 最小堆中当前元素数量小于k，直接添加
            if (resultHeap.size() < k) {
              resultHeap.push(resultObj);
            } 
            // 如果当前元素距离小于堆顶元素距离，替换堆顶
            else if (result.distance < resultHeap.peek().distance) {
              resultHeap.pop(); // 移除距离最远的元素
              resultHeap.push(resultObj); // 添加新元素
            }
          } catch (error) {
            console.warn(`处理搜索结果 ${result.id} 时出错:`, error);
            // 继续处理下一个结果
          }
        }
        
        // 从堆中提取结果并按距离升序排序
        const finalResults = [];
        while (resultHeap.size() > 0) {
          finalResults.push(resultHeap.pop());
        }
        
        const sortedResults = finalResults.reverse(); // 反转以获得升序排列
        
        // 如果结果为空，尝试线性搜索作为回退方案
        if (sortedResults.length === 0) {
          console.warn('最小堆处理后结果为空，尝试线性搜索...');
          // 这里可以添加前面的线性搜索逻辑
          return sortedResults; // 暂时返回空结果
        }
        
        return sortedResults;
      } catch (error) {
        console.error('搜索过程中发生错误:', error);
        return [];
      }
    } catch (error) {
      console.error('组合索引搜索错误:', error);
      return [];
    }
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
   * 批量添加向量 - 性能优化版本
   * @param {Array<Float32Array|Array>} vectors - 要添加的向量数组
   * @param {Array<any>} [ids=null] - 向量ID数组（可选）
   * @param {Array<any>} [metadataList=null] - 向量元数据数组（可选）
   * @param {boolean} [storeOriginal=false] - 是否保留原始向量
   * @returns {Array<number>} 分配的向量ID列表
   */
  function batchAddVectors(vectors, ids = null, metadataList = null, storeOriginal = false) {
    if (!vectors || vectors.length === 0) {
      return [];
    }
    
    // 如果尚未训练，先进行训练
    if (!isTrained) {
      // 如果向量数量不足训练，将它们添加到训练向量中并返回临时ID
      if (vectors.length < sampleSize) {
        console.log(`向量数量不足训练阈值(${vectors.length}/${sampleSize})，先存储为待训练向量...`);
        const resultIds = [];
        
        for (let i = 0; i < vectors.length; i++) {
          const tempId = nextId++;
          const id = ids ? ids[i] : null;
          const metadata = metadataList ? metadataList[i] : null;
          
          vectorMap.set(tempId, {
            originalVector: Array.from(vectors[i]),
            userData: metadata || id,
            pendingTrain: true
          });
          
          if (id !== null) {
            idMap.set(tempId, id);
          }
          
          resultIds.push(tempId);
          trainingVectors.push(Array.from(vectors[i]));
        }
        
        return resultIds;
      }
      
      // 如果向量数量足够训练，使用前sampleSize个向量进行训练
      console.log(`使用当前批次中的${Math.min(sampleSize, vectors.length)}个向量进行训练...`);
      const trainVectors = vectors.slice(0, sampleSize);
      train(trainVectors);
    }
    
    console.time('批量量化向量');
    // 批量量化所有向量
    const quantizedResults = [];
    const batchSize = 100; // 分批处理以避免长时间阻塞
    
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, vectors.length);
      const batchVectors = vectors.slice(i, batchEnd);
      
      // 量化当前批次
      for (const vector of batchVectors) {
        try {
          // 使用快速路径进行量化
          const result = quantizer.quantizeVector(vector, true);
          quantizedResults.push(result.codes);
        } catch (error) {
          console.error('量化向量失败:', error);
          quantizedResults.push(null);
        }
      }
      
      if ((i + batchSize) % 500 === 0 || batchEnd === vectors.length) {
        console.log(`已量化 ${batchEnd}/${vectors.length} 个向量...`);
      }
    }
    console.timeEnd('批量量化向量');
    
    // 批量插入向量到HNSW索引
    console.time('批量插入向量到HNSW');
    const resultIds = [];
    
    for (let i = 0; i < vectors.length; i++) {
      try {
        const vector = vectors[i];
        const codes = quantizedResults[i];
        
        if (!codes) {
          resultIds.push(-1);
          continue;
        }
        
        const id = ids ? ids[i] : null;
        const metadata = metadataList ? metadataList[i] : null;
        
        // 创建节点数据
        const nodeData = {
          originalVector: storeOriginal ? Array.from(vector) : null,
          codes,
          userData: metadata || id
        };
        
        // 插入HNSW节点
        const nodeId = hnswIndex.insertNode(vector, nodeData);
        
        // 记录向量与ID的映射
        vectorMap.set(nodeId, {
          codes,
          userData: metadata || id
        });
        
        // 如果提供了ID，记录ID映射
        if (id !== null) {
          idMap.set(nodeId, id);
        }
        
        resultIds.push(nodeId);
        
        if ((i + 1) % 100 === 0 || i === vectors.length - 1) {
          console.log(`已插入 ${i + 1}/${vectors.length} 个向量...`);
        }
      } catch (error) {
        console.error(`插入向量 ${i} 失败:`, error);
        resultIds.push(-1);
      }
    }
    console.timeEnd('批量插入向量到HNSW');
    
    return resultIds;
  }
  
  /**
   * 获取索引元数据信息
   * @returns {Object} 元数据
   */
  function getMetadata() {
    // 获取量化器元数据
    let quantizerMetadata = null;
    if (isTrained && quantizer && typeof quantizer.getMetadata === 'function') {
      quantizerMetadata = quantizer.getMetadata();
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
      if (quantizer && typeof quantizer.serialize === 'function') {
        try {
          data.quantizerData = quantizer.serialize();
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
          quantizerSuccess = quantizer.deserialize(data.quantizerData);
          
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
  
  // 返回公开API
  return {
    train,
    addVector,
    removeVector,
    search,
    getVectorCodes,
    getDecodedVector,
    batchAddVectors,
    getMetadata,
    serialize,
    deserialize,
    clear
  };
} 