/**
 * HNSW索引实现比较测试
 * 比较自定义HNSW实现与经典实现以及npm库的性能和准确性
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

// 导入npm HNSW库
import { HNSW } from 'https://esm.sh/hnsw@1.0.3';

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
 * 对比测试三种HNSW实现
 */
async function 对比测试() {
  console.log('\n===== HNSW索引实现对比测试 =====');
  
  // 测试参数
  const numVectors = 1000;
  const dimensions = 1024;
  const numQueries = 20;
  const k = 10; // 查询返回的邻居数量
  const modelName = 'test_model';
  
  // HNSW参数 - 增加构建和搜索时的ef值
  const M = 48;                   // 每个节点的最大连接数
  const efConstruction = 800;     // 构建索引时的ef值
  const efSearch = 800;           // 搜索时的ef值
  const ml = 16;                  // 最大层数
  
  try {
    // 1. 生成测试数据
    console.log(`1. 生成${numVectors}个${dimensions}维随机向量...`);
    const testData = generateRandomVectors(numVectors, dimensions, false); // 使用普通数组
    const queryVectors = generateRandomVectors(numQueries, dimensions, false); // 使用普通数组
    
    // 验证所有向量维度
    const testDataDimensions = testData.map(item => item.vector.length);
    const uniqueDimensions = new Set(testDataDimensions);
    console.log(`测试数据维度检查: ${Array.from(uniqueDimensions).join(', ')}`);
    
    // 2. 初始化三种实现的索引
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
    
    // NPM HNSW部分
    let npmHnswIndex = null;
    const npmHnswQueryTimes = [];
    
    // 尝试初始化和构建NPM HNSW索引
    try {
      console.log('正在初始化NPM HNSW库...');
      
      // 准备NPM HNSW库数据 - 确保全部是普通数组
      const npmHnswData = testData.map(item => {
        // 确保每个向量都是纯JavaScript数组
        const vector = Array.isArray(item.vector) ? 
          [...item.vector] : 
          Array.from(item.vector);
        
        // 验证维度
        if (vector.length !== dimensions) {
          throw new Error(`向量维度不一致: ${vector.length} != ${dimensions}`);
        }
        
        return { id: item.id, vector: vector };
      });
      
      // 创建NPM HNSW索引
      npmHnswIndex = new HNSW(efConstruction, M, dimensions, 'euclidean');
      
      // 构建索引
      console.time('NPM HNSW库索引构建时间');
      console.log('NPM HNSW库索引构建中...');
      await npmHnswIndex.buildIndex(npmHnswData);
      console.timeEnd('NPM HNSW库索引构建时间');
      
      // 把npmHnsw的结果数组初始化
      recallRates.npmHnsw = [];
      
      console.log('NPM HNSW索引构建成功');
    } catch (error) {
      console.error('NPM HNSW索引构建失败:', error);
      console.log('继续执行其他测试...');
    }
    
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
      const customResults = customIndex.searchKNN(queryVector, k);
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
      
      // NPM HNSW库查询 (如果成功初始化)
      if (npmHnswIndex) {
        try {
          // 确保查询向量是普通数组
          const npmQueryVector = Array.isArray(queryVector) ? 
            [...queryVector] : 
            Array.from(queryVector);
          
          const npmHnswStartTime = performance.now();
          const npmHnswResults = npmHnswIndex.searchKNN(npmQueryVector, k, efSearch * 2);
          const npmHnswEndTime = performance.now();
          npmHnswQueryTimes.push(npmHnswEndTime - npmHnswStartTime);
          
          // NPM HNSW库召回率
          const npmHnswMatches = npmHnswResults.filter(r => exactIds.has(r.id)).length;
          const npmHnswRecall = npmHnswMatches / Math.min(k, exactResults.length);
          recallRates.npmHnsw.push(npmHnswRecall);
          
          // 输出查询结果
          console.log(`\n查询 ${i+1}/${numQueries}:`);
          console.log(`- 自定义HNSW: 耗时=${customQueryTimes[i].toFixed(2)}ms, 召回率=${(customRecall*100).toFixed(2)}%`);
          console.log(`- 经典HNSW: 耗时=${classicQueryTimes[i].toFixed(2)}ms, 召回率=${(classicRecall*100).toFixed(2)}%`);
          console.log(`- NPM HNSW库: 耗时=${npmHnswQueryTimes[i].toFixed(2)}ms, 召回率=${(npmHnswRecall*100).toFixed(2)}%`);
        } catch (error) {
          console.error(`查询 ${i+1}/${numQueries} NPM HNSW库查询失败:`, error);
          console.log(`- 自定义HNSW: 耗时=${customQueryTimes[i].toFixed(2)}ms, 召回率=${(customRecall*100).toFixed(2)}%`);
          console.log(`- 经典HNSW: 耗时=${classicQueryTimes[i].toFixed(2)}ms, 召回率=${(classicRecall*100).toFixed(2)}%`);
          npmHnswQueryTimes.push(0);
          recallRates.npmHnsw.push(0);
        }
      } else {
        console.log(`\n查询 ${i+1}/${numQueries}:`);
        console.log(`- 自定义HNSW: 耗时=${customQueryTimes[i].toFixed(2)}ms, 召回率=${(customRecall*100).toFixed(2)}%`);
        console.log(`- 经典HNSW: 耗时=${classicQueryTimes[i].toFixed(2)}ms, 召回率=${(classicRecall*100).toFixed(2)}%`);
        console.log(`- NPM HNSW库: 未运行`);
      }
    }
    
    // 5. 计算并输出统计结果
    const customQueryStats = computePerformanceStats(customQueryTimes);
    const classicQueryStats = computePerformanceStats(classicQueryTimes);
    const exactQueryStats = computePerformanceStats(exactQueryTimes);
    const npmHnswQueryStats = npmHnswIndex ? computePerformanceStats(npmHnswQueryTimes) : null;
    
    const customRecallStats = computePerformanceStats(recallRates.custom.map(r => r * 100));
    const classicRecallStats = computePerformanceStats(recallRates.classic.map(r => r * 100));
    const npmHnswRecallStats = npmHnswIndex && recallRates.npmHnsw ? 
      computePerformanceStats(recallRates.npmHnsw.map(r => r * 100)) : null;
    
    console.log('\n===== 性能对比统计 =====');
    
    console.log('\n查询时间 (ms):');
    console.log(`- 精确查询: 平均=${exactQueryStats.avg.toFixed(2)}, 最小=${exactQueryStats.min.toFixed(2)}, 最大=${exactQueryStats.max.toFixed(2)}`);
    console.log(`- 自定义HNSW: 平均=${customQueryStats.avg.toFixed(2)}, 最小=${customQueryStats.min.toFixed(2)}, 最大=${customQueryStats.max.toFixed(2)}`);
    console.log(`- 经典HNSW: 平均=${classicQueryStats.avg.toFixed(2)}, 最小=${classicQueryStats.min.toFixed(2)}, 最大=${classicQueryStats.max.toFixed(2)}`);
    
    if (npmHnswQueryStats) {
      console.log(`- NPM HNSW库: 平均=${npmHnswQueryStats.avg.toFixed(2)}, 最小=${npmHnswQueryStats.min.toFixed(2)}, 最大=${npmHnswQueryStats.max.toFixed(2)}`);
    }
    
    console.log('\n速度提升 (相对于精确查询):');
    console.log(`- 自定义HNSW: ${(exactQueryStats.avg / customQueryStats.avg).toFixed(2)}x`);
    console.log(`- 经典HNSW: ${(exactQueryStats.avg / classicQueryStats.avg).toFixed(2)}x`);
    
    if (npmHnswQueryStats) {
      console.log(`- NPM HNSW库: ${(exactQueryStats.avg / npmHnswQueryStats.avg).toFixed(2)}x`);
    }
    
    console.log('\n召回率 (%):');
    console.log(`- 自定义HNSW: 平均=${customRecallStats.avg.toFixed(2)}, 最小=${customRecallStats.min.toFixed(2)}, 最大=${customRecallStats.max.toFixed(2)}`);
    console.log(`- 经典HNSW: 平均=${classicRecallStats.avg.toFixed(2)}, 最小=${classicRecallStats.min.toFixed(2)}, 最大=${classicRecallStats.max.toFixed(2)}`);
    
    if (npmHnswRecallStats) {
      console.log(`- NPM HNSW库: 平均=${npmHnswRecallStats.avg.toFixed(2)}, 最小=${npmHnswRecallStats.min.toFixed(2)}, 最大=${npmHnswRecallStats.max.toFixed(2)}`);
    }
    
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
    
    // NPM HNSW库实现 (如果成功初始化)
    if (npmHnswIndex) {
      try {
        console.time('NPM HNSW库序列化时间');
        const npmHnswSerialized = npmHnswIndex.serialize();
        console.timeEnd('NPM HNSW库序列化时间');
        console.log(`NPM HNSW库序列化大小: ${(JSON.stringify(npmHnswSerialized).length / 1024).toFixed(2)} KB`);
        
        console.time('NPM HNSW库反序列化时间');
        const deserializedNpmHnswIndex = new HNSW(dimensions, M);
        deserializedNpmHnswIndex.deserialize(npmHnswSerialized);
        console.timeEnd('NPM HNSW库反序列化时间');
      } catch (error) {
        console.error('NPM HNSW库序列化/反序列化失败:', error);
      }
    }
    
    // 7. 结论
    console.log('\n===== 对比结论 =====');
    
    // 查询性能比较
    let implementations = ['自定义HNSW', '经典HNSW'];
    let queryStats = [customQueryStats, classicQueryStats];
    let recallStats = [customRecallStats, classicRecallStats];
    
    if (npmHnswQueryStats && npmHnswRecallStats) {
      implementations.push('NPM HNSW库');
      queryStats.push(npmHnswQueryStats);
      recallStats.push(npmHnswRecallStats);
    }
    
    // 找出查询时间最短的实现
    const fastestIndex = queryStats.findIndex(stat => 
      stat.avg === Math.min(...queryStats.map(s => s.avg))
    );
    
    // 找出召回率最高的实现
    const highestRecallIndex = recallStats.findIndex(stat => 
      stat.avg === Math.max(...recallStats.map(s => s.avg))
    );
    
    console.log(`查询速度最快: ${implementations[fastestIndex]}`);
    console.log(`查询准确性最高: ${implementations[highestRecallIndex]}`);
    
    // 计算各实现之间的速度差异百分比
    console.log('\n实现间性能对比:');
    for (let i = 0; i < implementations.length; i++) {
      for (let j = i + 1; j < implementations.length; j++) {
        const speedDiff = Math.abs(1 - queryStats[i].avg / queryStats[j].avg) * 100;
        const recallDiff = Math.abs(recallStats[i].avg - recallStats[j].avg);
        console.log(`${implementations[i]} vs ${implementations[j]}:`);
        console.log(`  - 速度差异: ${speedDiff.toFixed(2)}%`);
        console.log(`  - 召回率差异: ${recallDiff.toFixed(2)}%`);
      }
    }
    
    // 总结
    console.log('\n总体评估:');
    if (fastestIndex === highestRecallIndex) {
      console.log(`${implementations[fastestIndex]}在速度和准确性上均为最优`);
    } else {
      console.log(`${implementations[fastestIndex]}速度最快，${implementations[highestRecallIndex]}召回率最高`);
      
      // 找出综合表现最佳的实现
      const combinedScores = implementations.map((_, i) => {
        // 标准化速度分数（越快越好）
        const speedScore = queryStats[fastestIndex].avg / queryStats[i].avg;
        // 标准化召回率分数（越高越好）
        const recallScore = recallStats[i].avg / recallStats[highestRecallIndex].avg;
        // 综合分数（简单平均）
        return (speedScore + recallScore) / 2;
      });
      
      const bestOverallIndex = combinedScores.findIndex(score => 
        score === Math.max(...combinedScores)
      );
      
      console.log(`综合表现最佳: ${implementations[bestOverallIndex]}`);
    }
  } catch (error) {
    console.error('测试执行失败:', error);
  }
}

// 运行对比测试
对比测试().catch(error => {
  console.error('对比测试执行失败:', error);
});

// 对外导出测试函数
export default 对比测试;