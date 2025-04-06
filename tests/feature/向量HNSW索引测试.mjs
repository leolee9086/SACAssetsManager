/**
 * HNSW索引性能和召回率测试
 * 测试高性能向量索引的正确性、性能和召回率
 */

// 导入被测试的模块
import { createHNSWIndex } from '../../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/useCustomedHNSW.js';
import { 
  computeEuclideanDistance, 
  computeCosineDistance, 
  computeCosineSimilarity,
  computeInnerProduct 
} from '../../src/toolBox/base/forMath/forGeometry/forVectors/forDistance.js';

/**
 * 生成随机向量数据集
 * @param {number} numVectors - 向量数量
 * @param {number} dimensions - 向量维度
 * @param {boolean} useFloat32 - 是否使用Float32Array类型
 * @returns {Array<{id: number, vector: Array|Float32Array}>} 生成的向量数据集
 */
function generateRandomVectors(numVectors, dimensions, useFloat32 = true) {
  // 防御性检查
  if (!numVectors || numVectors <= 0 || !dimensions || dimensions <= 0) {
    console.error('生成随机向量错误: 无效参数', { numVectors, dimensions });
    return [];
  }
  
  const vectors = [];
  
  for (let i = 0; i < numVectors; i++) {
    let vector;
    
    if (useFloat32) {
      vector = new Float32Array(dimensions);
      for (let j = 0; j < dimensions; j++) {
        // 使用较小的随机值范围，避免数值不稳定
        vector[j] = Math.random() * 2 - 1; // 范围在 [-1, 1] 之间
        
        // 确保没有NaN或无穷值
        if (isNaN(vector[j]) || !isFinite(vector[j])) {
          vector[j] = 0; // 如果生成了无效值，使用0替代
        }
      }
    } else {
      vector = new Array(dimensions);
      for (let j = 0; j < dimensions; j++) {
        vector[j] = Math.random() * 2 - 1;
        
        // 确保没有NaN或无穷值
        if (isNaN(vector[j]) || !isFinite(vector[j])) {
          vector[j] = 0;
        }
      }
    }
    
    vectors.push({
      id: i,
      vector: vector,
      metadata: { text: `向量_${i}` }
    });
  }
  
  return vectors;
}

/**
 * 计算性能统计数据
 * @param {Array<number>} times - 执行时间数组(毫秒)
 * @returns {Object} 统计数据
 */
function computePerformanceStats(times) {
  // 确保至少有一个样本
  if (!times || times.length === 0) return { avg: 0, min: 0, max: 0, median: 0 };
  
  // 复制并排序数组以计算中位数
  const sortedTimes = [...times].sort((a, b) => a - b);
  
  return {
    avg: times.reduce((sum, t) => sum + t, 0) / times.length,
    min: sortedTimes[0],
    max: sortedTimes[sortedTimes.length - 1],
    median: sortedTimes[Math.floor(sortedTimes.length / 2)],
    p95: sortedTimes[Math.floor(sortedTimes.length * 0.95)]
  };
}

/**
 * 测试HNSW索引基本功能
 */
function 测试HNSW索引基本功能() {
  console.log('---- 测试HNSW索引基本功能 ----');
  
  // 1. 生成测试数据
  const numVectors = 100;
  const dimensions = 16;
  const testData = generateRandomVectors(numVectors, dimensions);
  
  // 2. 创建HNSW索引
  console.log('创建HNSW索引...');
  const index = createHNSWIndex({
    distanceFunction: 'euclidean',
    M: 16,
    efConstruction: 100,
    efSearch: 50,
    ml: 10
  });
  
  console.log('索引初始状态:', index.getStats());
  
  // 3. 批量添加向量
  console.time('HNSW索引构建时间');
  console.log('开始添加向量...');
  
  const insertedIds = [];
  
  for (const item of testData) {
    try {
      // 1. 确保向量是有效的Float32Array实例
      const vector = Array.isArray(item.vector) ? new Float32Array(item.vector) : item.vector;
      
      // 验证向量数据
      if (!vector || vector.length !== dimensions) {
        console.error(`向量${item.id}数据无效:`, {
          hasVector: !!vector,
          length: vector ? vector.length : 0,
          expectedLength: dimensions
        });
        continue;
      }
      
      // 2. 确保metadata结构正确，避免直接将item作为data传递
      const metadata = {
        id: item.id,
        text: item.metadata?.text || `向量_${item.id}`
      };
      
      // 3. 安全添加向量并捕获可能的异常
      const nodeId = index.insertNode(vector, metadata);
      
      if (nodeId === undefined || isNaN(nodeId)) {
        console.error(`向量${item.id}添加返回无效ID: ${nodeId}`);
      } else {
        console.log(`向量${item.id}添加成功，节点ID: ${nodeId}`);
        insertedIds.push(nodeId);
      }
    } catch (error) {
      console.error(`添加向量${item.id}失败:`, error);
      console.error(`错误向量数据:`, {
        hasVector: !!item.vector,
        vectorType: item.vector ? (Array.isArray(item.vector) ? 'Array' : 'Float32Array') : 'undefined',
        vectorLength: item.vector ? item.vector.length : 0,
        metadata: item.metadata
      });
    }
  }
  
  console.timeEnd('HNSW索引构建时间');
  console.log(`成功添加向量数量: ${insertedIds.length}/${numVectors}`);
  console.log('索引状态:', index.getStats());
  
  if (insertedIds.length === 0) {
    console.error('基本功能测试不通过: 没有成功添加任何向量');
    return false;
  }
  
  // 4. 测试随机查询
  console.log('测试查询...');
  const queryVector = testData[0].vector; // 使用第一个向量作为查询向量
  
  console.time('HNSW索引查询时间');
  const results = index.searchKNN(queryVector, 5);
  console.timeEnd('HNSW索引查询时间');
  
  // 5. 验证查询正确性
  console.log(`查询结果数量: ${results.length}, 期望: 5`);
  console.log(`结果: ${JSON.stringify(results)}`);
  
  if (results.length === 0) {
    console.error('基本功能测试不通过: 查询结果为空');
    return false;
  }
  
  // 6. 测试删除功能
  if (insertedIds.length > 1) {
    const idToRemove = insertedIds[1];
    console.log(`测试删除节点ID: ${idToRemove}`);
    index.removeNode(idToRemove);
    const resultsAfterRemoval = index.searchKNN(queryVector, 5);
    console.log(`删除节点后查询结果: ${JSON.stringify(resultsAfterRemoval)}`);
  }
  
  // 7. 测试序列化和反序列化
  console.log('测试序列化和反序列化...');
  const serialized = index.serialize();
  const deserializedIndex = createHNSWIndex();
  deserializedIndex.restore(serialized);
  
  const resultsFromDeserialized = deserializedIndex.searchKNN(queryVector, 5);
  console.log(`序列化/反序列化后查询结果数量: ${resultsFromDeserialized.length}, 期望: 5`);
  
  return resultsFromDeserialized.length > 0;
}

/**
 * 测试HNSW索引不同距离度量
 */
function 测试不同距离度量() {
  console.log('\n---- 测试HNSW索引不同距离度量 ----');
  
  try {
    // 1. 生成测试数据
    const numVectors = 100;
    const dimensions = 16;
    const testData = generateRandomVectors(numVectors, dimensions);
    
    // 2. 使用不同距离度量创建索引
    const euclideanIndex = createHNSWIndex({ distanceFunction: 'euclidean' });
    const cosineIndex = createHNSWIndex({ distanceFunction: 'cosine' });
    const innerProductIndex = createHNSWIndex({ distanceFunction: 'inner_product' });
    
    // 3. 添加向量到所有索引
    const idsMaps = { euclidean: [], cosine: [], inner_product: [] };
    
    for (const item of testData) {
      try {
        const vector = Array.isArray(item.vector) ? new Float32Array(item.vector) : item.vector;
        idsMaps.euclidean.push(euclideanIndex.insertNode(vector, { id: item.id }));
        idsMaps.cosine.push(cosineIndex.insertNode(vector, { id: item.id }));
        idsMaps.inner_product.push(innerProductIndex.insertNode(vector, { id: item.id }));
      } catch (error) {
        console.error(`添加向量${item.id}到距离索引失败:`, error);
      }
    }
    
    // 检查是否成功添加向量
    if (idsMaps.euclidean.length === 0 || idsMaps.cosine.length === 0 || idsMaps.inner_product.length === 0) {
      console.error('距离度量测试失败: 无法添加向量到索引');
      return false;
    }
    
    // 4. 用相同的查询向量在不同索引中查询
    const queryVector = testData[Math.floor(Math.random() * numVectors)].vector;
    
    // 5. 执行查询并比较结果
    const euclideanResults = euclideanIndex.searchKNN(queryVector, 5);
    const cosineResults = cosineIndex.searchKNN(queryVector, 5);
    const innerProductResults = innerProductIndex.searchKNN(queryVector, 5);
    
    // 检查查询结果
    if (euclideanResults.length === 0 || cosineResults.length === 0 || innerProductResults.length === 0) {
      console.error('距离度量测试失败: 查询结果为空');
      console.log('- 欧几里得结果数量:', euclideanResults.length);
      console.log('- 余弦距离结果数量:', cosineResults.length);
      console.log('- 内积距离结果数量:', innerProductResults.length);
      return false;
    }
    
    console.log('欧几里得距离排序前5结果:', euclideanResults.map(r => r.id).join(', '));
    console.log('余弦距离排序前5结果:', cosineResults.map(r => r.id).join(', '));
    console.log('内积距离排序前5结果:', innerProductResults.map(r => r.id).join(', '));
    
    // 6. 验证不同距离度量结果的差异
    const euclideanIds = new Set(euclideanResults.map(r => r.id));
    const cosineIds = new Set(cosineResults.map(r => r.id));
    
    const differenceRatio = 1 - euclideanResults.filter(r => cosineIds.has(r.id)).length / 5;
    console.log(`不同距离度量结果差异率: ${(differenceRatio * 100).toFixed(2)}%`);
    
    return true;
  } catch (error) {
    console.error('测试不同距离度量时出错:', error);
    return false;
  }
}

/**
 * 验证HNSW索引的连接结构正确性
 * @param {Object} index - HNSW索引实例
 * @param {number} numSamples - 采样检查的节点数量
 * @returns {Object} 验证结果
 */
function 验证索引结构(index, numSamples = 20) {
  console.log('\n---- 验证HNSW索引连接结构 ----');

  if (!index || !index._nodes) {
    console.error('无效的索引实例');
    return { valid: false, reason: '无效的索引实例' };
  }

  const nodes = index._nodes;
  const nodeCount = nodes.size;
  
  if (nodeCount === 0) {
    console.error('索引为空');
    return { valid: false, reason: '索引为空' };
  }

  console.log(`索引包含 ${nodeCount} 个节点`);
  console.log('开始检查连接结构...');

  // 获取样本节点
  const nodeIds = Array.from(nodes.keys());
  const sampleSize = Math.min(numSamples, nodeIds.length);
  const sampleIds = nodeIds.slice(0, sampleSize);
  
  // 统计信息
  const stats = {
    connectionCounts: [], // 每个节点的连接数
    bidirectionalRate: 0, // 双向连接率
    avgBranchingFactor: 0, // 平均分支因子
    disconnectedNodes: 0, // 孤立节点数
    malformedConnections: 0, // 异常连接数
  };
  
  let totalConnections = 0;
  let bidirectionalConnections = 0;
  
  // 检查每个样本节点
  for (const nodeId of sampleIds) {
    const node = nodes.get(nodeId);
    if (!node || node.deleted) {
      console.warn(`节点 ${nodeId} 不存在或已删除`);
      continue;
    }
    
    // 检查是否有连接结构
    if (!node.connections || !Array.isArray(node.connections) || node.connections.length === 0) {
      console.error(`节点 ${nodeId} 缺少连接结构`);
      stats.malformedConnections++;
      continue;
    }
    
    // 检查底层连接 (layer 0)
    if (!node.connections[0] || !Array.isArray(node.connections[0])) {
      console.error(`节点 ${nodeId} 缺少底层连接`);
      stats.disconnectedNodes++;
      continue;
    }
    
    const level0Connections = node.connections[0];
    stats.connectionCounts.push(level0Connections.length);
    totalConnections += level0Connections.length;
    
    // 检查双向连接率
    for (const connId of level0Connections) {
      const connNode = nodes.get(connId);
      if (!connNode || connNode.deleted) {
        console.warn(`节点 ${nodeId} 连接到了不存在的节点 ${connId}`);
        stats.malformedConnections++;
        continue;
      }
      
      // 检查是否有反向连接
      const hasReverseConn = connNode.connections[0] && 
        Array.isArray(connNode.connections[0]) && 
        connNode.connections[0].includes(nodeId);
      
      if (hasReverseConn) {
        bidirectionalConnections++;
      }
    }
  }
  
  // 计算统计指标
  if (stats.connectionCounts.length > 0) {
    stats.avgBranchingFactor = totalConnections / stats.connectionCounts.length;
  }
  
  if (totalConnections > 0) {
    stats.bidirectionalRate = bidirectionalConnections / totalConnections;
  }
  
  // 输出统计信息
  console.log('连接结构统计:');
  console.log(`- 平均分支因子: ${stats.avgBranchingFactor.toFixed(2)}`);
  console.log(`- 双向连接率: ${(stats.bidirectionalRate * 100).toFixed(2)}%`);
  console.log(`- 异常连接数: ${stats.malformedConnections}`);
  console.log(`- 孤立节点数: ${stats.disconnectedNodes}`);
  
  // 评估结构有效性
  const valid = stats.bidirectionalRate > 0.7 && stats.avgBranchingFactor > 5;
  
  console.log(`\n索引结构验证 ${valid ? '通过 ✅' : '不通过 ❌'}`);
  if (!valid) {
    if (stats.bidirectionalRate <= 0.7) {
      console.log('⚠️ 双向连接率过低，可能导致搜索路径不完整');
    }
    if (stats.avgBranchingFactor <= 5) {
      console.log('⚠️ 平均分支因子过低，可能导致搜索空间受限');
    }
  }
  
  return { 
    valid,
    stats,
    recommendation: valid ? '索引结构良好' : '建议增加连接双向性和分支因子'
  };
}

/**
 * 测试HNSW索引召回率和性能
 * @returns {boolean} 测试是否成功（召回率是否达标）
 */
function 测试HNSW索引召回率和性能() {
  console.log('\n---- 测试HNSW索引召回率和性能 ----');
  
  // 设置最低期望召回率阈值
  const MIN_EXPECTED_RECALL = 0.8; // 80%的最低召回率
  
  try {
    // 1. 生成测试数据
    console.log('1. 生成测试数据...');
    const numVectors = 30000;
    const dimensions = 128;
    
    // 创建具有更好区分度的向量集合
    const testData = [];
    
    // 生成5个聚类中心
    const centroids = [];
    for (let i = 0; i <30; i++) {
      const centroid = new Float32Array(dimensions);
      for (let j = 0; j < dimensions; j++) {
        centroid[j] = Math.random() * 2 - 1; // 范围[-1, 1]
      }
      centroids.push(centroid);
    }
    
    // 围绕聚类中心生成向量
    for (let i = 0; i < numVectors; i++) {
      const vector = new Float32Array(dimensions);
      
      // 选择一个聚类中心
      const centroidIdx = i % centroids.length;
      const centroid = centroids[centroidIdx];
      
      // 添加一些高斯噪声
      for (let j = 0; j < dimensions; j++) {
        // 生成一个偏向区别化的随机值 (围绕聚类中心的高斯分布)
        const noise = (Math.random() + Math.random() + Math.random() - 1.5) * 0.2; // 近似高斯
        vector[j] = centroid[j] + noise; 
      }
      
      testData.push({
        id: i,
        vector: vector,
        metadata: { 
          text: `向量_${i}`, 
          cluster: centroidIdx,
          id: i  // 明确在元数据中设置原始ID
        }
      });
    }
    
    console.log(`成功生成 ${testData.length} 个测试向量，维度: ${dimensions}`);
    
    // 2. 创建HNSW索引
    console.log('2. 创建HNSW索引...');
    console.log('使用优化配置参数:');
    console.log(' - M: 48 (节点连接数)');
    console.log(' - efConstruction: 200 (构建质量参数)');
    console.log(' - efSearch: 200 (搜索质量参数)');
    console.log(' - ml: 16 (最大层数)');

    const index = createHNSWIndex({
      distanceFunction: 'euclidean',
      M: 48,             // 增加每个节点的连接数
      efConstruction: 200, // 提高构建质量
      efSearch: 200,     // 提高搜索质量
      ml: 16             // 增加层数以提高搜索效率
    });
    console.log('HNSW索引创建成功');
    
    // 3. 添加向量
    console.log('3. 添加测试向量...');
    console.time('HNSW索引添加向量时间');
    const insertedIds = [];
    
    // 为演示目的打印几个向量的元数据
    console.log('添加样本向量的元数据示例:');
    testData.slice(0, 3).forEach(item => {
      console.log(`ID=${item.id}, 元数据=`, item.metadata);
    });
    
    // 确保每个向量都有唯一的原始ID
    for (const item of testData) {
      try {
        // 1. 确保向量是有效的Float32Array实例
        const vector = Array.isArray(item.vector) ? new Float32Array(item.vector) : item.vector;
        
        // 2. 明确设置包含原始ID的metadata
        const metadata = {
          id: item.id,  // 这是关键 - 确保存储原始ID
          cluster: item.metadata?.cluster,
          text: item.metadata?.text || `向量_${item.id}`
        };
        
        // 3. 添加向量并记录结果
        const nodeId = index.insertNode(vector, metadata);
        insertedIds.push(nodeId);
        
        // 添加第一个向量后检查
        if (insertedIds.length === 1) {
          const node = index._nodes.get(nodeId);
          console.log('第一个节点检查:', {
            nodeId: nodeId,
            originalId: node.data.id,
            metadata: node.data
          });
        }
      } catch (error) {
        console.error(`添加向量${item.id}失败:`, error);
      }
    }
    console.timeEnd('HNSW索引添加向量时间');
    console.log(`成功添加 ${insertedIds.length}/${testData.length} 个向量`);
    
    // 4. 优化索引连接结构以提高召回率
    console.log('4. 优化索引连接结构...');
    console.time('索引优化时间');
    const optimizationResult = index.optimizeConnectivity({
      sampleRate: 0.5,           // 处理一半的节点
      layersToOptimize: [0],     // 只优化底层
      minConnectionsPerNode: 10, // 每个节点至少10个连接
      targetBidirectionalRate: 0.9 // 目标90%的双向连接率
    });
    console.timeEnd('索引优化时间');
    
    console.log('优化结果:', optimizationResult);
    
    // 验证索引结构
    const 结构验证结果 = 验证索引结构(index);
    if (!结构验证结果.valid) {
      console.warn('⚠️ 索引结构存在问题，可能影响召回率');
    }
    
    // 准备查询向量 - 从不同聚类中选择
    const queryVectors = [];
    for (let cluster = 0; cluster < centroids.length; cluster++) {
      // 找出属于该聚类的向量
      const clusterVectors = testData.filter(
        item => item.metadata && item.metadata.cluster === cluster
      );
      
      if (clusterVectors.length > 0) {
        // 随机选择一个向量作为查询向量
        const randomIndex = Math.floor(Math.random() * clusterVectors.length);
        queryVectors.push({
          vector: clusterVectors[randomIndex].vector,
          id: clusterVectors[randomIndex].id,
          cluster: cluster
        });
      }
    }
    
    console.log(`准备了 ${queryVectors.length} 个不同聚类的查询向量`);
    
    // 打印前几个测试向量数据的详细信息
    console.log('测试数据示例(前3个):', 
      testData.slice(0, 3).map(item => ({
        id: item.id,
        metadata: item.metadata,
        vectorStart: Array.from(item.vector.slice(0, 3)) // 只显示向量的前几个元素
      }))
    );
    
    // 打印索引中的节点信息
    console.log('索引状态:', index.getStats());
    
    let totalRecall = 0;
    const queryTimes = [];
    const linearTimes = [];
    
    // 对每个查询向量测试
    for (let i = 0; i < queryVectors.length; i++) {
      const queryVector = queryVectors[i].vector;
      console.log(`\n[查询 ${i + 1}/${queryVectors.length}] 聚类=${queryVectors[i].cluster}`);
      
      // HNSW搜索
      const startTime = performance.now();
      const results = index.searchKNN(queryVector, 10);
      const endTime = performance.now();
      const queryTime = endTime - startTime;
      queryTimes.push(queryTime);
      
      console.log(`HNSW搜索耗时: ${queryTime.toFixed(2)}ms, 结果数: ${results.length}`);
      
      // 精确线性搜索
      const linearStartTime = performance.now();
      const exactResults = testData
        .map(item => ({
          id: item.id,
          distance: computeEuclideanDistance(queryVector, item.vector),
          data: item.metadata
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10);
      const linearEndTime = performance.now();
      const linearTime = linearEndTime - linearStartTime;
      linearTimes.push(linearTime);
      
      console.log(`线性搜索耗时: ${linearTime.toFixed(2)}ms, 结果数: ${exactResults.length}`);
      console.log(`速度提升: ${(linearTime/queryTime).toFixed(2)}x`);
      
      // 计算召回率
      const exactIds = new Set(exactResults.map(r => r.id));
      let matchCount = 0;
      
      // 调试输出
      console.log(`HNSW结果IDs: ${results.map(r => r.id).join(', ')}`);
      console.log(`精确搜索IDs: ${exactResults.map(r => r.id).join(', ')}`);
      
      // 比较原始ID是否匹配
      console.log('HNSW结果详情:',
        results.slice(0, 3).map(r => ({
          id: r.id,
          data: r.data ? { id: r.data.id, cluster: r.data.cluster } : null,
          distance: r.distance
        }))
      );
      
      console.log('精确搜索结果详情:',
        exactResults.slice(0, 3).map(r => ({
          id: r.id,
          distance: r.distance
        }))
      );
      
      // 详细的匹配过程
      console.log('ID匹配过程:');
      for (const result of results) {
        const isMatch = exactIds.has(result.id);
        console.log(`HNSW结果ID ${result.id} ${isMatch ? '✓ 匹配' : '✗ 不匹配'}`);
        if (isMatch) {
          matchCount++;
        }
      }
      
      const recallRate = matchCount / Math.min(10, exactResults.length);
      totalRecall += recallRate;
      
      console.log(`召回率: ${(recallRate * 100).toFixed(2)}% (${matchCount}/${Math.min(10, exactResults.length)})`);
      
      if (recallRate < MIN_EXPECTED_RECALL) {
        console.log(`⚠️ 召回率低于期望 ${MIN_EXPECTED_RECALL * 100}%`);
      } else {
        console.log(`✅ 召回率达到期望`);
      }
    }
    
    // 5. 计算和显示统计信息
    const avgRecall = totalRecall / queryVectors.length;
    const queryStats = computePerformanceStats(queryTimes);
    const linearStats = computePerformanceStats(linearTimes);
    
    console.log('\n===== 性能和召回率统计 =====');
    console.log(`平均召回率: ${(avgRecall * 100).toFixed(2)}%`);
    console.log(`HNSW查询时间: ${queryStats.avg.toFixed(2)}ms (平均), ${queryStats.min.toFixed(2)}ms (最小), ${queryStats.max.toFixed(2)}ms (最大)`);
    console.log(`线性查询时间: ${linearStats.avg.toFixed(2)}ms (平均), ${linearStats.min.toFixed(2)}ms (最小), ${linearStats.max.toFixed(2)}ms (最大)`);
    console.log(`平均速度提升: ${(linearStats.avg / queryStats.avg).toFixed(2)}x`);
    
    // 6. 返回测试结果
    const testPassed = avgRecall >= MIN_EXPECTED_RECALL;
    console.log(`\n召回率测试 ${testPassed ? '通过 ✅' : '未通过 ❌'}`);
    return testPassed;
    
  } catch (error) {
    console.error('HNSW索引召回率测试失败:', error);
    return false;
  }
}

/**
 * 运行所有测试
 */
async function 运行测试() {
  console.log('======== HNSW索引性能和召回率测试 ========\n');
  
  try {
    // 基本功能测试
    console.log('开始测试HNSW索引基本功能...');
    const 基本功能通过 = 测试HNSW索引基本功能();
    if (!基本功能通过) {
      console.log('\n基本功能测试未通过 ❌');
      console.log('基础索引功能测试失败，无法继续其他测试');
      return;
    }
    console.log('\n基本功能测试完成 ✅');
    
    // 不同距离度量测试
    console.log('\n开始测试不同距离度量...');
    const 距离度量通过 = 测试不同距离度量();
    console.log('\n距离度量测试' + (距离度量通过 ? '完成 ✅' : '未通过 ❌'));
    
    if (!距离度量通过) {
      console.log('距离度量测试失败，无法继续召回率测试');
      return;
    }
    
    // 召回率和性能测试
    console.log('\n开始测试HNSW索引召回率和性能...');
    const 召回率测试通过 = 测试HNSW索引召回率和性能();
    console.log(`\nHNSW索引召回率测试${召回率测试通过 ? '通过 ✅' : '未通过 ❌'}`);
    
    // 测试结果汇总
    console.log('\n======== 测试结果汇总 ========');
    console.log('1. HNSW基本功能: ' + (基本功能通过 ? '✅ 通过' : '❌ 未通过'));
    console.log('2. 不同距离度量: ' + (距离度量通过 ? '✅ 通过' : '❌ 未通过'));
    console.log('3. 索引召回率: ' + (召回率测试通过 ? '✅ 通过' : '❌ 未通过'));
    
    // 性能比较
    console.log('\n======== 性能对比 ========');
    
    // 判断是否需要继续进行量化索引测试
    if (召回率测试通过) {
      console.log('\n基础HNSW索引测试通过，可以继续进行量化索引测试。');
    } else {
      console.log('\n⚠️ 基础HNSW索引测试未通过，请修复问题后再进行量化索引测试。');
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    console.log('\n❌ 测试失败，请检查错误信息');
  } finally {
    console.log('\n======== 测试完成 ========');
  }
}

/**
 * 与经典HNSW实现进行对比测试
 */
async function 运行对比测试() {
  // 导入对比测试模块
  const { default: 对比测试 } = await import('../hnswlayers对比测试.js');
  await 对比测试();
}

export { 运行测试, 运行对比测试 }; 

