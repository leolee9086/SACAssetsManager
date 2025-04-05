/**
 * HNSW索引和Delta-PQ压缩功能测试
 * 测试高性能向量索引和压缩算法的正确性和性能
 */

// 导入被测试的模块
import { createHNSWIndex, getRandomLevel, searchLayer } from '../../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/useCustomedHNSW.js';
import { createDeltaPQ } from '../../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/useCustomedDeltaPQ.js';
import { createCombinedDeltaPQHNSW } from '../../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/useCombinedDeltaPQHNSW.js';
import { computeEuclideanDistance, computeCosineDistance, computeInnerProduct } from '../../src/toolBox/base/forMath/forGeometry/forVectors/forDistance.js';

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
  const index = createHNSWIndex({
    distanceFunction: 'euclidean',
    M: 16,
    efConstruction: 100,
    efSearch: 50,
    ml: 10
  });
  
  // 3. 批量添加向量
  console.time('HNSW索引构建时间');
  for (const item of testData) {
    // 使用insertNode替代addVector
    const nodeId = index.insertNode(item.vector, { id: item.id, metadata: item.metadata });
    console.log(`向量${item.id}添加成功，节点ID: ${nodeId}`);
  }
  console.timeEnd('HNSW索引构建时间');
  
  // 4. 测试随机查询
  const queryVector = testData[0].vector; // 使用第一个向量作为查询向量
  
  console.time('HNSW索引查询时间');
  const results = index.searchKNN(queryVector, 5);
  console.timeEnd('HNSW索引查询时间');
  
  // 5. 验证查询正确性
  console.log(`查询结果数量: ${results.length}, 期望: 5`);
  console.log(`结果: ${JSON.stringify(results)}`);
  
  // 6. 测试删除功能
  index.removeNode(1); // 删除ID为1的节点
  const resultsAfterRemoval = index.searchKNN(queryVector, 5);
  console.log(`删除节点后查询结果: ${JSON.stringify(resultsAfterRemoval)}`);
  
  // 7. 测试序列化和反序列化
  const serialized = index.serialize();
  const deserializedIndex = createHNSWIndex();
  deserializedIndex.restore(serialized); // 注意restore替代deserialize
  
  const resultsFromDeserialized = deserializedIndex.searchKNN(queryVector, 5);
  console.log(`序列化/反序列化后查询结果数量: ${resultsFromDeserialized.length}, 期望: 5`);
}

/**
 * 测试Delta-PQ压缩功能
 */
function 测试DeltaPQ压缩() {
  console.log('\n---- 测试Delta-PQ压缩功能 ----');
  
  // 1. 生成测试数据
  const numVectors = 100;
  const dimensions = 64;
  const testData = generateRandomVectors(numVectors, dimensions);
  const vectors = testData.map(item => item.vector);
  
  // 2. 创建Delta-PQ量化器
  const deltaPQ = createDeltaPQ({
    numSubvectors: 8,
    bitsPerCode: 8,
    sampleSize: numVectors
  });
  
  // 3. 训练量化器 - 这一步是必须的
  console.log('开始训练Delta-PQ量化器...');
  const trainStartTime = performance.now();
  const trainResult = deltaPQ.train(vectors);
  const trainEndTime = performance.now();
  console.log(`Delta-PQ训练完成，耗时: ${(trainEndTime - trainStartTime).toFixed(2)}ms`);
  console.log(`训练结果: ${JSON.stringify(trainResult)}`);
  
  // 4. 测试向量量化和反量化
  const originalVector = vectors[0];
  
  const quantizeStartTime = performance.now();
  const quantizeResult = deltaPQ.quantizeVector(originalVector);
  const quantizeEndTime = performance.now();
  console.log(`Delta-PQ量化耗时: ${(quantizeEndTime - quantizeStartTime).toFixed(2)}ms`);
  
  const dequantizeStartTime = performance.now();
  const reconstructedVector = deltaPQ.dequantizeVector(quantizeResult.codes);
  const dequantizeEndTime = performance.now();
  console.log(`Delta-PQ反量化耗时: ${(dequantizeEndTime - dequantizeStartTime).toFixed(2)}ms`);
  
  // 5. 计算量化误差
  const originalNorm = Math.sqrt(originalVector.reduce((sum, val) => sum + val * val, 0));
  let errorSum = 0;
  for (let i = 0; i < originalVector.length; i++) {
    const diff = originalVector[i] - reconstructedVector[i];
    errorSum += diff * diff;
  }
  const relativeError = Math.sqrt(errorSum) / originalNorm;
  
  console.log(`向量量化相对误差: ${relativeError.toFixed(6)}`);
  console.log(`压缩率: ${(32 * dimensions) / (quantizeResult.codes.length * 8)}x`);
  
  // 6. 测试近似距离计算
  const queryVector = vectors[1];
  const queryCode = deltaPQ.quantizeVector(queryVector).codes;
  
  const exactDistance = computeEuclideanDistance(originalVector, queryVector);
  const approximateDistance = deltaPQ.computeApproximateDistance(quantizeResult.codes, queryCode);
  
  console.log(`精确距离: ${exactDistance.toFixed(6)}`);
  console.log(`近似距离: ${approximateDistance.toFixed(6)}`);
  console.log(`距离误差: ${Math.abs(exactDistance - approximateDistance).toFixed(6)}`);
}

/**
 * 测试结合Delta-PQ和HNSW的组合索引
 */
function 测试组合索引() {
  console.log('\n---- 测试Delta-PQ-HNSW组合索引 ----');
  
  try {
    // 1. 生成测试数据
    console.log('1. 生成测试数据...');
    const numVectors = 1000;
    const dimensions = 128;
    const testData = generateRandomVectors(numVectors, dimensions);
    console.log(`成功生成 ${testData.length} 个测试向量，维度: ${dimensions}`);
    
    // 2. 创建组合索引
    console.log('2. 创建组合索引...');
    const combinedIndex = createCombinedDeltaPQHNSW({
      // Delta-PQ配置
      numSubvectors: 16,
      bitsPerCode: 8,
      sampleSize: 100, // 显式设置小一些的训练样本数量
      // HNSW配置
      M: 16,
      efConstruction: 128,
      efSearch: 64
    });
    console.log('组合索引创建成功');
    
    // 3. 分为训练集和测试集
    console.log('3. 准备训练集...');
    const trainData = testData.slice(0, 100);
    const testData2 = testData.slice(100, 300); // 使用较少的向量进行测试
    console.log(`分割数据为训练集(${trainData.length}个向量)和测试集(${testData2.length}个向量)`);
    
    // 4. 先训练索引
    console.log('4. 训练组合索引...');
    try {
      console.time('组合索引训练时间');
      const vectors = trainData.map(item => item.vector);
      const trainResult = combinedIndex.train(vectors);
      console.timeEnd('组合索引训练时间');
      console.log('训练完成，结果:', trainResult);
    } catch (error) {
      console.error('训练索引失败:', error);
      return; // 训练失败就退出测试
    }
    
    // 5. 然后添加向量
    console.log('5. 添加更多向量...');
    try {
      console.time('组合索引添加向量时间');
      // 使用批量添加而不是逐个添加
      console.log(`开始批量添加 ${testData2.length} 个向量...`);
      
      // 提取向量、ID和元数据
      const vectors = testData2.map(item => item.vector);
      const ids = testData2.map(item => item.id);
      const metadataList = testData2.map(item => item.metadata);
      
      // 批量添加向量
      const addedIds = combinedIndex.batchAddVectors(vectors, ids, metadataList);
      
      // 统计添加结果
      const successCount = addedIds.filter(id => id >= 0).length;
      console.log(`成功添加 ${successCount}/${testData2.length} 个向量`);
      
      console.timeEnd('组合索引添加向量时间');
      
      // 检查索引状态
      const indexMetadata = combinedIndex.getMetadata();
      console.log('索引元数据:', JSON.stringify(indexMetadata, null, 2));
    } catch (error) {
      console.error('添加向量失败:', error);
    }
    
    // 6. 测试查询
    console.log('6. 测试查询...');
    const queryIndex = Math.floor(Math.random() * testData.length);
    const queryVector = testData[queryIndex].vector;
    console.log(`使用第 ${queryIndex} 个向量作为查询向量`);
    
    // 6.1 使用组合索引查询
    let combinedResults = [];
    try {
      console.time('组合索引查询时间');
      combinedResults = combinedIndex.search(queryVector, 10, { 
        ef: 100,          // 增加ef提高搜索质量
        useQuantization: true,  // 使用量化版本以提高性能
        verbose: false     // 关闭详细日志
      });
      console.timeEnd('组合索引查询时间');
      console.log(`查询结果数量: ${combinedResults.length}`);
      
      // 只打印前3个结果的摘要，避免日志过多
      if (combinedResults.length > 0) {
        const resultSummary = combinedResults.slice(0, 3).map(r => ({
          id: r.id,
          originalId: r.originalId,
          distance: r.distance.toFixed(6)
        }));
        console.log(`前3个查询结果: ${JSON.stringify(resultSummary, null, 2)}`);
        if (combinedResults.length > 3) {
          console.log(`...共 ${combinedResults.length} 个结果`);
        }
      }
    } catch (error) {
      console.error('组合索引查询失败:', error);
    }
    
    // 6.2 计算精确查询（用于对比）
    let exactResults = [];
    try {
      console.time('精确线性查询时间');
      exactResults = testData
        .map(item => ({
          id: item.id,
          distance: computeEuclideanDistance(queryVector, item.vector)
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10);
      console.timeEnd('精确线性查询时间');
      console.log('精确查询结果:', exactResults);
    } catch (error) {
      console.error('精确查询失败:', error);
    }
    
    // 7. 比较召回率
    if (combinedResults.length > 0 && exactResults.length > 0) {
      try {
        const exactIds = new Set(exactResults.map(r => r.id));
        let recallCount = 0;
        
        // 检查exactResults是否包含有效ID
        if (exactIds.size === 0) {
          console.warn('精确查询结果没有有效ID，无法计算召回率');
          console.log('精确查询结果:', JSON.stringify(exactResults.slice(0, 3)));
          console.log('组合查询结果:', JSON.stringify(combinedResults.slice(0, 3)));
          console.log('无法计算召回率: 精确查询结果ID无效');
        } else {
          // 遍历组合查询结果，计算匹配的数量
          for (const result of combinedResults) {
            // 检查结果对象是否有originalId字段
            if (result && typeof result.originalId !== 'undefined') {
              if (exactIds.has(result.originalId)) {
                recallCount++;
              }
            } else if (result && typeof result.id !== 'undefined') {
              // 尝试使用id字段
              if (exactIds.has(result.id)) {
                recallCount++;
              }
            }
          }
          
          const recallRate = recallCount / Math.min(10, exactResults.length);
          console.log(`组合索引查询召回率: ${recallRate.toFixed(4)} (${recallCount}/${Math.min(10, exactResults.length)})`);
        }
      } catch (error) {
        console.error('计算召回率失败:', error);
        console.error('精确查询结果示例:', exactResults.length > 0 ? JSON.stringify(exactResults[0]) : '无结果');
        console.error('组合查询结果示例:', combinedResults.length > 0 ? JSON.stringify(combinedResults[0]) : '无结果');
      }
    } else {
      console.log(`无法计算召回率: 查询结果不完整 (组合结果: ${combinedResults.length}, 精确结果: ${exactResults.length})`);
      
      // 打印查询结果的详细情况，帮助诊断
      if (combinedResults.length === 0) {
        console.log('组合查询结果为空');
      }
      
      if (exactResults.length === 0) {
        console.log('精确查询结果为空');
      }
    }
    
    // 8. 测试序列化/反序列化
    console.log('8. 测试序列化/反序列化...');
    try {
      console.time('组合索引序列化时间');
      const serialized = combinedIndex.serialize();
      console.timeEnd('组合索引序列化时间');
      console.log(`序列化数据大小: ${(serialized.length / 1024).toFixed(2)} KB`);
      
      console.time('组合索引反序列化时间');
      const deserializedIndex = createCombinedDeltaPQHNSW();
      const success = deserializedIndex.deserialize(serialized);
      console.timeEnd('组合索引反序列化时间');
      console.log(`反序列化${success ? '成功' : '失败'}`);
      
      if (success) {
        // 验证反序列化后的查询结果
        const resultsAfterDeserialization = deserializedIndex.search(queryVector, 10);
        console.log(`反序列化后查询结果数量: ${resultsAfterDeserialization.length}, 期望: 10`);
      }
    } catch (error) {
      console.error('序列化/反序列化测试失败:', error);
    }
    
    console.log('组合索引测试完成');
  } catch (error) {
    console.error('组合索引测试失败:', error);
  }
}

/**
 * 测试HNSW索引不同距离度量
 */
function 测试不同距离度量() {
  console.log('\n---- 测试HNSW索引不同距离度量 ----');
  
  // 1. 生成测试数据
  const numVectors = 100;
  const dimensions = 16;
  const testData = generateRandomVectors(numVectors, dimensions);
  
  // 2. 使用不同距离度量创建索引
  const euclideanIndex = createHNSWIndex({ distanceFunction: 'euclidean' });
  const cosineIndex = createHNSWIndex({ distanceFunction: 'cosine' });
  const innerProductIndex = createHNSWIndex({ distanceFunction: 'inner_product' });
  
  // 3. 添加向量到所有索引
  for (const item of testData) {
    euclideanIndex.insertNode(item.vector, { id: item.id });
    cosineIndex.insertNode(item.vector, { id: item.id });
    innerProductIndex.insertNode(item.vector, { id: item.id });
  }
  
  // 4. 用相同的查询向量在不同索引中查询
  const queryVector = testData[Math.floor(Math.random() * numVectors)].vector;
  
  // 5. 执行查询并比较结果
  const euclideanResults = euclideanIndex.searchKNN(queryVector, 5);
  const cosineResults = cosineIndex.searchKNN(queryVector, 5);
  const innerProductResults = innerProductIndex.searchKNN(queryVector, 5);
  
  console.log('欧几里得距离排序前5结果:', euclideanResults.map(r => r.id).join(', '));
  console.log('余弦距离排序前5结果:', cosineResults.map(r => r.id).join(', '));
  console.log('内积距离排序前5结果:', innerProductResults.map(r => r.id).join(', '));
  
  // 6. 验证不同距离度量结果的差异
  const euclideanIds = new Set(euclideanResults.map(r => r.id));
  const cosineIds = new Set(cosineResults.map(r => r.id));
  
  const differenceRatio = 1 - euclideanResults.filter(r => cosineIds.has(r.id)).length / 5;
  console.log(`不同距离度量结果差异率: ${(differenceRatio * 100).toFixed(2)}%`);
}

/**
 * 测试最小堆优化的搜索性能
 */
function 测试最小堆优化搜索() {
  console.log('\n---- 测试最小堆优化搜索性能 ----');
  
  try {
    // 1. 生成测试数据
    console.log('1. 生成测试数据...');
    const numVectors = 5000; // 使用较大的向量集
    const dimensions = 128;
    const testData = generateRandomVectors(numVectors, dimensions);
    console.log(`成功生成 ${testData.length} 个测试向量，维度: ${dimensions}`);
    
    // 2. 创建组合索引
    console.log('2. 创建组合索引...');
    const combinedIndex = createCombinedDeltaPQHNSW({
      // Delta-PQ配置
      numSubvectors: 16,
      bitsPerCode: 8,
      sampleSize: 1000,
      // HNSW配置
      M: 16,
      efConstruction: 128,
      efSearch: 64
    });
    console.log('组合索引创建成功');
    
    // 3. 训练索引
    console.log('3. 训练组合索引...');
    try {
      console.time('组合索引训练时间');
      const trainVectors = testData.slice(0, 1000).map(item => item.vector);
      const trainResult = combinedIndex.train(trainVectors);
      console.timeEnd('组合索引训练时间');
      console.log('训练完成，结果:', trainResult);
    } catch (error) {
      console.error('训练索引失败:', error);
      return;
    }
    
    // 4. 添加向量
    console.log('4. 添加向量...');
    console.time('向量添加时间');
    const vectors = testData.slice(1000).map(item => item.vector);
    const ids = testData.slice(1000).map(item => item.id);
    const metadata = testData.slice(1000).map(item => item.metadata);
    
    const addedIds = combinedIndex.batchAddVectors(vectors, ids, metadata);
    console.timeEnd('向量添加时间');
    console.log(`成功添加 ${addedIds.filter(id => id >= 0).length} 个向量`);
    
    // 5. 准备查询向量
    const numQueries = 50;
    console.log(`5. 执行 ${numQueries} 次查询性能测试...`);
    const queryVectors = [];
    for (let i = 0; i < numQueries; i++) {
      const randomIndex = Math.floor(Math.random() * testData.length);
      queryVectors.push(testData[randomIndex].vector);
    }
    
    // 6. 测试最小堆优化搜索性能
    console.log('6. 测试最小堆优化搜索...');
    const optimizedTimes = [];
    const optimizedResults = [];
    
    for (let i = 0; i < queryVectors.length; i++) {
      const queryVector = queryVectors[i];
      
      const startTime = performance.now();
      const results = combinedIndex.search(queryVector, 10, {
        ef: 100,
        useQuantization: true,
        verbose: false
      });
      const endTime = performance.now();
      
      optimizedTimes.push(endTime - startTime);
      optimizedResults.push(results);
      
      // 每10次查询输出一次进度
      if ((i + 1) % 10 === 0 || i === queryVectors.length - 1) {
        console.log(`已完成 ${i + 1}/${queryVectors.length} 次查询`);
      }
    }
    
    // 7. 分析性能数据
    console.log('7. 性能统计分析...');
    const stats = computePerformanceStats(optimizedTimes);
    
    console.log(`最小堆优化搜索性能统计(毫秒):`);
    console.log(`- 平均查询时间: ${stats.avg.toFixed(3)}ms`);
    console.log(`- 最小查询时间: ${stats.min.toFixed(3)}ms`);
    console.log(`- 最大查询时间: ${stats.max.toFixed(3)}ms`);
    console.log(`- 中位查询时间: ${stats.median.toFixed(3)}ms`);
    console.log(`- 95%分位查询时间: ${stats.p95.toFixed(3)}ms`);
    
    // 8. 输出部分结果
    console.log('8. 示例查询结果:');
    if (optimizedResults[0] && optimizedResults[0].length > 0) {
      console.log(`第一次查询返回 ${optimizedResults[0].length} 个结果`);
      console.log('前3个结果:');
      optimizedResults[0].slice(0, 3).forEach((result, i) => {
        console.log(`  ${i+1}. ID: ${result.id}, 距离: ${result.distance.toFixed(6)}`);
      });
    } else {
      console.log('查询未返回结果');
    }
    
    // 9. 执行精确搜索作为对照
    console.log('9. 计算精确搜索召回率...');
    const sampleQueryVector = queryVectors[0];
    
    // 精确搜索
    console.time('精确搜索时间');
    const exactResults = testData
      .map(item => ({
        id: item.id,
        distance: computeEuclideanDistance(sampleQueryVector, item.vector)
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);
    console.timeEnd('精确搜索时间');
    
    // 计算召回率
    if (optimizedResults[0] && optimizedResults[0].length > 0) {
      const exactIds = new Set(exactResults.map(r => r.id));
      let matchCount = 0;
      
      for (const result of optimizedResults[0]) {
        if (exactIds.has(result.originalId)) {
          matchCount++;
        }
      }
      
      const recallRate = matchCount / Math.min(10, exactResults.length);
      console.log(`召回率: ${(recallRate * 100).toFixed(2)}% (${matchCount}/${Math.min(10, exactResults.length)})`);
    }
    
    console.log('最小堆优化搜索测试完成');
  } catch (error) {
    console.error('最小堆优化搜索测试失败:', error);
    console.error(error.stack);
  }
}

/**
 * 测试大规模数据性能
 */
function 测试大规模数据性能() {
  console.log('\n---- 测试大规模数据性能 (可选) ----');
  console.log('注: 此测试可能需要较长时间，可根据实际需要调整参数或跳过');
  
  // 使用参数控制是否执行大规模测试
  const shouldRunLargeTest = false;
  if (!shouldRunLargeTest) {
    console.log('跳过大规模测试');
    return;
  }
  
  // 1. 生成测试数据
  const numVectors = 10000;
  const dimensions = 256;
  console.log(`生成${numVectors}个${dimensions}维向量...`);
  console.time('数据生成时间');
  const testData = generateRandomVectors(numVectors, dimensions);
  console.timeEnd('数据生成时间');
  
  // 2. 创建优化的组合索引
  const combinedIndex = createCombinedDeltaPQHNSW({
    numSubvectors: 32,
    bitsPerCode: 8,
    sampleSize: 1000, // 用于训练的样本数
    M: 16,
    efConstruction: 128,
    efSearch: 100
  });
  
  // 3. 先训练索引
  console.log('训练索引...');
  console.time('索引训练时间');
  const trainData = testData.slice(0, 1000);
  const trainVectors = trainData.map(item => item.vector);
  combinedIndex.train(trainVectors);
  console.timeEnd('索引训练时间');
  
  // 4. 构建索引（添加剩余向量）
  console.time('索引添加向量时间');
  const remainingData = testData.slice(1000);
  for (const item of remainingData) {
    combinedIndex.addVector(item.vector, item.id);
  }
  console.timeEnd('索引添加向量时间');
  
  // 5. 测试查询性能
  const numQueries = 100;
  const queryTimes = [];
  
  for (let i = 0; i < numQueries; i++) {
    const queryIndex = Math.floor(Math.random() * numVectors);
    const queryVector = testData[queryIndex].vector;
    
    const startTime = performance.now();
    combinedIndex.search(queryVector, 10);
    const endTime = performance.now();
    
    queryTimes.push(endTime - startTime);
  }
  
  // 计算平均查询时间
  const avgQueryTime = queryTimes.reduce((sum, time) => sum + time, 0) / numQueries;
  console.log(`平均查询时间 (${numQueries}次查询): ${avgQueryTime.toFixed(3)} ms`);
  
  // 6. 测试内存使用
  const serialized = combinedIndex.serialize();
  const memorySizeMB = serialized.length / (1024 * 1024);
  console.log(`索引大小: ${memorySizeMB.toFixed(2)} MB`);
  console.log(`每向量平均占用: ${(memorySizeMB * 1024 * 1024 / numVectors).toFixed(2)} 字节`);
}

/**
 * 运行所有测试
 */
async function 运行测试() {
  console.log('======== HNSW索引和Delta-PQ压缩测试 ========\n');
  
  try {
    console.log('开始测试HNSW索引基本功能...');
    测试HNSW索引基本功能();
    console.log('\n基本功能测试完成');
    
    console.log('\n开始测试Delta-PQ压缩...');
    测试DeltaPQ压缩();
    console.log('\nDelta-PQ压缩测试完成');

    console.log('\n开始测试组合索引...');
    测试组合索引();
    console.log('\n组合索引测试完成');
    
    console.log('\n开始测试不同距离度量...');
    测试不同距离度量();
    console.log('\n距离度量测试完成');
    
    console.log('\n开始测试最小堆优化搜索性能...');
    测试最小堆优化搜索();
    console.log('\n最小堆优化搜索测试完成');
    
    console.log('\n开始测试大规模数据性能...');
    测试大规模数据性能();
    console.log('\n大规模测试完成');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    console.log('\n======== 测试完成 ========');
  }
}

// 导出运行测试函数
export { 运行测试 }; 