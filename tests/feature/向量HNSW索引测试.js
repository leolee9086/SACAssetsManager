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
  
  // 1. 生成测试数据
  const numVectors = 1000;
  const dimensions = 128;
  const testData = generateRandomVectors(numVectors, dimensions);
  
  // 2. 创建组合索引
  const combinedIndex = createCombinedDeltaPQHNSW({
    // Delta-PQ配置
    numSubvectors: 16,
    bitsPerCode: 8,
    // HNSW配置
    M: 16,
    efConstruction: 128,
    efSearch: 64
  });
  
  // 3. 批量添加向量
  console.time('组合索引构建时间');
  for (const item of testData) {
    combinedIndex.addVector(item.vector, item.id, item.metadata);
  }
  console.timeEnd('组合索引构建时间');
  
  // 4. 测试查询
  const queryVector = testData[Math.floor(Math.random() * numVectors)].vector;
  
  // 4.1 使用组合索引查询
  console.time('组合索引查询时间');
  const combinedResults = combinedIndex.search(queryVector, 10);
  console.timeEnd('组合索引查询时间');
  
  // 4.2 计算精确查询（用于对比）
  console.time('精确线性查询时间');
  const exactResults = testData
    .map(item => ({
      id: item.id,
      distance: computeEuclideanDistance(queryVector, item.vector)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 10);
  console.timeEnd('精确线性查询时间');
  
  // 5. 比较召回率
  const exactIds = new Set(exactResults.map(r => r.id));
  const recallCount = combinedResults.filter(r => exactIds.has(r.id)).length;
  const recallRate = recallCount / 10;
  
  console.log(`组合索引查询召回率: ${recallRate.toFixed(4)} (${recallCount}/10)`);
  
  // 6. 测试序列化/反序列化
  console.time('组合索引序列化时间');
  const serialized = combinedIndex.serialize();
  console.timeEnd('组合索引序列化时间');
  
  console.log(`序列化数据大小: ${(serialized.length / 1024).toFixed(2)} KB`);
  
  console.time('组合索引反序列化时间');
  const deserializedIndex = createCombinedDeltaPQHNSW();
  deserializedIndex.deserialize(serialized);
  console.timeEnd('组合索引反序列化时间');
  
  // 验证反序列化后的查询结果
  const resultsAfterDeserialization = deserializedIndex.search(queryVector, 10);
  console.log(`反序列化后查询结果数量: ${resultsAfterDeserialization.length}, 期望: 10`);
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
    euclideanIndex.addVector(item.vector, item.id);
    cosineIndex.addVector(item.vector, item.id);
    innerProductIndex.addVector(item.vector, item.id);
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
    M: 16,
    efConstruction: 128,
    efSearch: 100
  });
  
  // 3. 构建索引
  console.time('索引构建时间');
  for (const item of testData) {
    combinedIndex.addVector(item.vector, item.id);
  }
  console.timeEnd('索引构建时间');
  
  // 4. 测试查询性能
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
  
  // 5. 测试内存使用
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
  
  测试HNSW索引基本功能();
  测试DeltaPQ压缩();
   测试组合索引();
   测试不同距离度量();
   测试大规模数据性能();
  
  console.log('\n======== 测试完成 ========');
}

// 导出运行测试函数
export { 运行测试 }; 