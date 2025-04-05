/**
 * HNSW索引实现比较测试
 * 比较自定义HNSW实现与经典实现的性能和准确性
 */

// 导入自定义HNSW实现
import { createHNSWIndex } from '../../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/useCustomedHNSW.js';
import { 
  computeEuclideanDistance, 
  computeCosineDistance, 
  computeCosineSimilarity,
  computeInnerProduct 
} from '../../src/toolBox/base/forMath/forGeometry/forVectors/forDistance.js';

// 导入经典HNSW实现的模块
import { 为数据项构建hnsw索引 } from '../../source/data/database/localDataBase/hnswlayers/build.js';
import { hnswAnn搜索数据集 } from '../../source/data/database/localDataBase/hnswlayers/query.js';
import { 重建数据集的层级映射 } from '../../source/data/database/localDataBase/hnswlayers/utils.js';

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
 * 准备适用于经典HNSW实现的数据集格式
 * @param {Array} vectors - 向量数据集
 * @param {string} modelName - 模型名称
 * @returns {Object} 格式化的数据集
 */
function prepareClassicDataset(vectors, modelName) {
  const dataset = {};
  const hnswLayerMapping = { [modelName]: [] };
  
  // 转换为经典实现需要的数据格式
  vectors.forEach(item => {
    dataset[item.id] = {
      id: item.id,
      vector: { [modelName]: item.vector },
      neighbors: { [`${modelName}_hnsw`]: [] },
      metadata: item.metadata
    };
  });
  
  return { dataset, hnswLayerMapping };
}

/**
 * 对比测试两种HNSW实现
 */
async function 对比测试() {
  console.log('\n===== HNSW索引实现对比测试 =====');
  
  // 测试参数
  const numVectors = 3000;
  const dimensions = 64;
  const numQueries = 20;
  const k = 10; // 查询返回的邻居数量
  const modelName = 'test_model';
  
  // HNSW参数 - 增加构建和搜索时的ef值
  const M = 48;                   // 每个节点的最大连接数
  const efConstruction = 800;     // 构建索引时的ef值
  const efSearch = 800;           // 搜索时的ef值
  const ml = 16;                  // 最大层数
  
  // 1. 生成测试数据
  console.log(`1. 生成${numVectors}个${dimensions}维随机向量...`);
  const testData = generateRandomVectors(numVectors, dimensions);
  const queryVectors = generateRandomVectors(numQueries, dimensions);
  
  // 2. 初始化两种实现的索引
  console.log('2. 初始化索引结构...');
  
  // 自定义HNSW实现 - 使用相同的参数
  const customIndex = createHNSWIndex({
    distanceFunction: 'euclidean',
    M: M,
    efConstruction: efConstruction,
    efSearch: efSearch,
    ml: ml
  });
  
  // 经典HNSW实现
  const { dataset, hnswLayerMapping } = prepareClassicDataset(testData, modelName);
  
  // 3. 测量索引构建时间
  console.log('3. 测量索引构建时间...');
  
  // 自定义HNSW构建时间
  console.time('自定义HNSW索引构建时间');
  for (const item of testData) {
    customIndex.insertNode(item.vector, { id: item.id, text: item.metadata.text });
  }
  console.timeEnd('自定义HNSW索引构建时间');
  console.log('自定义HNSW索引状态:', customIndex.getStats());
  
  // 经典HNSW构建时间
  console.time('经典HNSW索引构建时间');
  for (const item of testData) {
    // 为每个数据项初始化HNSW邻接表结构
    const randomLevel = Math.floor(Math.random() * 3); // 随机分配0-2的层级
    dataset[item.id].neighbors[`${modelName}_hnsw`] = Array(randomLevel + 1).fill(0).map((_, i) => ({
      layer: i,
      type: `layer${i}`,
      items: []
    }));
    await 为数据项构建hnsw索引(dataset, dataset[item.id], modelName, hnswLayerMapping);
  }
  console.timeEnd('经典HNSW索引构建时间');
  
  // 4. 测量查询性能
  console.log('4. 测量查询性能...');
  
  const customQueryTimes = [];
  const classicQueryTimes = [];
  const exactQueryTimes = [];
  const recallRates = { custom: [], classic: [] };
  
  for (let i = 0; i < numQueries; i++) {
    const queryVector = queryVectors[i].vector;
    
    // 精确查询（暴力搜索）作为基准
    const exactStartTime = performance.now();
    const exactResults = testData
      .map(item => ({
        id: item.id,
        distance: computeEuclideanDistance(queryVector, item.vector),
        data: { id: item.id, text: item.metadata.text }
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k);
    const exactEndTime = performance.now();
    exactQueryTimes.push(exactEndTime - exactStartTime);
    
    // 自定义HNSW查询 - 使用相同的efSearch参数
    const customStartTime = performance.now();
    const customResults = customIndex.searchKNN(queryVector, k, { ef: efSearch * 2 });
    const customEndTime = performance.now();
    customQueryTimes.push(customEndTime - customStartTime);
    
    // 经典HNSW查询 - 使用相同的efSearch参数
    const classicStartTime = performance.now();
    const classicResults = hnswAnn搜索数据集(dataset, modelName, queryVector, k, hnswLayerMapping, efSearch * 2);
    const classicEndTime = performance.now();
    classicQueryTimes.push(classicEndTime - classicStartTime);
    
    // 计算召回率
    const exactIds = new Set(exactResults.map(r => r.id));
    
    // 自定义实现召回率
    const customMatches = customResults.filter(r => exactIds.has(r.id || (r.data && r.data.id))).length;
    const customRecall = customMatches / Math.min(k, exactResults.length);
    recallRates.custom.push(customRecall);
    
    // 经典实现召回率
    const classicMatches = classicResults.filter(r => exactIds.has(r.data.id)).length;
    const classicRecall = classicMatches / Math.min(k, exactResults.length);
    recallRates.classic.push(classicRecall);
    
    // 输出每个查询的结果
    console.log(`\n查询 ${i+1}/${numQueries}:`);
    console.log(`- 自定义HNSW: 耗时=${customQueryTimes[i].toFixed(2)}ms, 召回率=${(customRecall*100).toFixed(2)}%`);
    console.log(`- 经典HNSW: 耗时=${classicQueryTimes[i].toFixed(2)}ms, 召回率=${(classicRecall*100).toFixed(2)}%`);
  }
  
  // 5. 计算并输出统计结果
  const customQueryStats = computePerformanceStats(customQueryTimes);
  const classicQueryStats = computePerformanceStats(classicQueryTimes);
  const exactQueryStats = computePerformanceStats(exactQueryTimes);
  
  const customRecallStats = computePerformanceStats(recallRates.custom.map(r => r * 100));
  const classicRecallStats = computePerformanceStats(recallRates.classic.map(r => r * 100));
  
  console.log('\n===== 性能对比统计 =====');
  
  console.log('\n查询时间 (ms):');
  console.log(`- 精确查询: 平均=${exactQueryStats.avg.toFixed(2)}, 最小=${exactQueryStats.min.toFixed(2)}, 最大=${exactQueryStats.max.toFixed(2)}`);
  console.log(`- 自定义HNSW: 平均=${customQueryStats.avg.toFixed(2)}, 最小=${customQueryStats.min.toFixed(2)}, 最大=${customQueryStats.max.toFixed(2)}`);
  console.log(`- 经典HNSW: 平均=${classicQueryStats.avg.toFixed(2)}, 最小=${classicQueryStats.min.toFixed(2)}, 最大=${classicQueryStats.max.toFixed(2)}`);
  
  console.log('\n速度提升 (相对于精确查询):');
  console.log(`- 自定义HNSW: ${(exactQueryStats.avg / customQueryStats.avg).toFixed(2)}x`);
  console.log(`- 经典HNSW: ${(exactQueryStats.avg / classicQueryStats.avg).toFixed(2)}x`);
  
  console.log('\n召回率 (%):');
  console.log(`- 自定义HNSW: 平均=${customRecallStats.avg.toFixed(2)}, 最小=${customRecallStats.min.toFixed(2)}, 最大=${customRecallStats.max.toFixed(2)}`);
  console.log(`- 经典HNSW: 平均=${classicRecallStats.avg.toFixed(2)}, 最小=${classicRecallStats.min.toFixed(2)}, 最大=${classicRecallStats.max.toFixed(2)}`);
  
  // 6. 测试序列化/反序列化性能
  console.log('\n===== 序列化/反序列化性能 =====');
  
  // 自定义实现
  console.time('自定义HNSW序列化时间');
  const customSerialized = customIndex.serialize();
  console.timeEnd('自定义HNSW序列化时间');
  console.log(`自定义HNSW序列化大小: ${(JSON.stringify(customSerialized).length / 1024).toFixed(2)} KB`);
  
  console.time('自定义HNSW反序列化时间');
  const deserializedCustomIndex = createHNSWIndex();
  deserializedCustomIndex.restore(customSerialized);
  console.timeEnd('自定义HNSW反序列化时间');
  
  // 经典实现 (模拟，因为原实现不直接支持序列化)
  console.time('经典HNSW模拟序列化时间');
  const classicSerialized = JSON.stringify(dataset);
  console.timeEnd('经典HNSW模拟序列化时间');
  console.log(`经典HNSW模拟序列化大小: ${(classicSerialized.length / 1024).toFixed(2)} KB`);
  
  // 7. 结论
  console.log('\n===== 对比结论 =====');
  
  const customBetter = customQueryStats.avg < classicQueryStats.avg;
  const customHigherRecall = customRecallStats.avg > classicRecallStats.avg;
  
  console.log(`查询速度: ${customBetter ? '自定义实现更快' : '经典实现更快'} (${Math.abs(1 - customQueryStats.avg / classicQueryStats.avg) * 100}%)`);
  console.log(`查询准确性: ${customHigherRecall ? '自定义实现召回率更高' : '经典实现召回率更高'} (${Math.abs(customRecallStats.avg - classicRecallStats.avg).toFixed(2)}%)`);
  
  // 总结
  console.log('\n总体评估:');
  if (customBetter && customHigherRecall) {
    console.log('自定义HNSW实现在速度和准确性上均优于经典实现');
  } else if (customBetter) {
    console.log('自定义HNSW实现速度更快，但经典实现召回率更高');
  } else if (customHigherRecall) {
    console.log('自定义HNSW实现召回率更高，但经典实现速度更快');
  } else {
    console.log('经典HNSW实现在速度和准确性上均优于自定义实现');
  }
}

// 运行对比测试
对比测试().catch(error => {
  console.error('对比测试执行失败:', error);
});

// 对外导出测试函数
export default 对比测试; 