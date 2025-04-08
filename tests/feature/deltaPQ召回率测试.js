/**
 * DeltaPQ召回率测试
 * 
 * 该测试专注于评估DeltaPQ在实际使用场景中的召回率表现
 * 测试不同参数配置和距离度量方式对召回率的影响
 */

import { createDeltaPQ, DISTANCE_METRICS } from '../../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/useCustomedDeltaPQ.js';
import { computeEuclideanDistance, computeCosineDistance } from '../../src/toolBox/base/forMath/forGeometry/forVectors/forDistance.js';

// =================== 测试配置 ===================
// 可以根据需要修改这些配置参数
const TEST_CONFIG = {
  // 基本配置
  dims: [512],                                    // 向量维度
  databaseSizes: [2000],                          // 数据库大小
  numQueries: 20,                                 // 查询数量
  
  // 算法参数
  subvectorCounts: [16, 32, 64],                  // 子向量数量
  bitsCodes: [8, 10],                             // 编码位数
  distanceMetrics: [                              // 距离度量
    DISTANCE_METRICS.EUCLIDEAN, 
    DISTANCE_METRICS.COSINE
  ],
  trainSizes: [1000],                             // 训练集大小
  
  // 评估参数
  kValues: [1, 10, 50, 100],                      // 测试的k值
  
  // 控制参数
  pauseBetweenTests: false,                       // 是否在测试间暂停等待用户确认
  skipExistingResults: false,                     // 跳过已有结果的测试
  showDetailedLogs: true,                         // 显示详细日志
  generateTempResults: true                       // 生成临时结果
};

// 保存测试结果
let allResults = [];

/**
 * 生成随机向量
 * @param {number} dim - 向量维度
 * @param {number} count - 要生成的向量数量
 * @param {string} distanceMetric - 距离度量类型
 * @returns {Array<Float32Array>} 生成的向量数组
 */
function generateRandomVectors(dim, count, distanceMetric) {
  console.log(`>>> 生成${count}个${dim}维${distanceMetric === DISTANCE_METRICS.COSINE ? '单位' : ''}向量...`);
  const vectors = [];
  
  for (let i = 0; i < count; i++) {
    const vec = new Float32Array(dim);
    for (let j = 0; j < dim; j++) {
      vec[j] = Math.random() * 2 - 1; // 生成[-1, 1]范围内的随机数
    }
    
    // 如果使用余弦距离，则进行归一化
    if (distanceMetric === DISTANCE_METRICS.COSINE) {
      vectors.push(normalizeVector(vec));
    } else {
      vectors.push(vec);
    }
    
    // 显示生成进度
    if (TEST_CONFIG.showDetailedLogs && count > 100 && i % Math.floor(count/10) === 0) {
      console.log(`  - 已生成: ${Math.floor(i/count*100)}%`);
    }
  }
  
  return vectors;
}

/**
 * 向量归一化
 * @param {Float32Array} vector - 需要归一化的向量
 * @returns {Float32Array} 归一化后的向量
 */
function normalizeVector(vector) {
  const normalizedVector = new Float32Array(vector.length);
  let norm = 0;
  
  // 计算向量的模长
  for (let i = 0; i < vector.length; i++) {
    norm += vector[i] * vector[i];
  }
  
  norm = Math.sqrt(norm);
  
  // 防止除以零
  if (norm > 1e-10) {
    for (let i = 0; i < vector.length; i++) {
      normalizedVector[i] = vector[i] / norm;
    }
  } else {
    normalizedVector[0] = 1.0; // 对于零向量，返回单位向量
  }
  
  return normalizedVector;
}

/**
 * 计算精确的K近邻
 * @param {Array<Float32Array>} database - 数据库向量
 * @param {Float32Array} query - 查询向量
 * @param {number} k - 返回的邻居数量
 * @param {string} distanceMetric - 距离度量类型
 * @returns {Array<{id: number, distance: number}>} 精确的K近邻
 */
function computeExactKNN(database, query, k, distanceMetric) {
  const distanceFunction = distanceMetric === DISTANCE_METRICS.COSINE 
    ? computeCosineDistance : computeEuclideanDistance;
  
  const distances = database.map((vector, id) => ({
    id,
    distance: distanceFunction(vector, query)
  }));
  
  // 根据距离排序
  distances.sort((a, b) => a.distance - b.distance);
  
  // 返回前k个
  return distances.slice(0, k);
}

/**
 * 计算DeltaPQ的K近邻
 * @param {Object} deltaPQ - DeltaPQ实例
 * @param {Array<Uint8Array>} codedVectors - 量化后的向量
 * @param {Uint8Array} queryCode - 查询向量的量化编码
 * @param {number} k - 返回的邻居数量
 * @returns {Array<{id: number, distance: number}>} DeltaPQ的K近邻
 */
function computeDeltaPQKNN(deltaPQ, codedVectors, queryCode, k) {
  const distances = codedVectors.map((codes, id) => ({
    id,
    distance: deltaPQ.computeApproximateDistance(queryCode, codes)
  }));
  
  // 根据距离排序
  distances.sort((a, b) => a.distance - b.distance);
  
  // 返回前k个
  return distances.slice(0, k);
}

/**
 * 计算召回率
 * @param {Array<{id: number, distance: number}>} exactResults - 精确的搜索结果
 * @param {Array<{id: number, distance: number}>} approxResults - 近似的搜索结果
 * @returns {number} 召回率 [0-1]
 */
function calculateRecall(exactResults, approxResults) {
  const exactIds = new Set(exactResults.map(r => r.id));
  let matchCount = 0;
  
  for (const result of approxResults) {
    if (exactIds.has(result.id)) {
      matchCount++;
    }
  }
  
  return matchCount / exactResults.length;
}

/**
 * 单次召回率测试
 * @param {Object} params - 测试参数
 * @param {number} testIndex - 测试索引
 * @param {number} totalTests - 总测试数
 * @returns {Object} 测试结果
 */
async function runSingleTest(params, testIndex, totalTests) {
  const { dim, databaseSize, numQueries, numSubvectors, bitsPerCode, 
          distanceMetric, trainSize } = params;
  
  // 检查是否已有相同配置的测试结果
  if (TEST_CONFIG.skipExistingResults) {
    const existingResult = allResults.find(r => 
      r.dim === dim &&
      r.databaseSize === databaseSize &&
      r.numSubvectors === numSubvectors &&
      r.bitsPerCode === bitsPerCode &&
      r.distanceMetric === distanceMetric &&
      r.trainSize === trainSize
    );
    
    if (existingResult) {
      console.log(`\n跳过已测试配置: 维度=${dim}, 子向量数=${numSubvectors}, 编码位数=${bitsPerCode}, 距离=${distanceMetric}`);
      return existingResult;
    }
  }
  
  console.log(`\n测试进度 [${testIndex+1}/${totalTests}]`);
  console.log(`==================== 测试配置 ====================`);
  console.log(`维度: ${dim}, 数据库大小: ${databaseSize}, 查询数量: ${numQueries}`);
  console.log(`子向量数: ${numSubvectors}, 编码位数: ${bitsPerCode}, 距离度量: ${distanceMetric}`);
  console.log(`训练集大小: ${trainSize}`);
  console.log(`=================================================`);
  
  // 生成数据库和查询向量
  const databaseVectors = generateRandomVectors(dim, databaseSize, distanceMetric);
  const queryVectors = generateRandomVectors(dim, numQueries, distanceMetric);
  
  // 创建并训练DeltaPQ
  console.log(`>>> 开始训练DeltaPQ模型...`);
  const deltaPQ = createDeltaPQ({
    numSubvectors,
    bitsPerCode,
    sampleSize: trainSize,
    maxIterations: 25,
    distanceMetric
  });
  
  const trainStartTime = Date.now();
  const trainResult = deltaPQ.train(databaseVectors.slice(0, trainSize));
  const trainTime = Date.now() - trainStartTime;
  
  console.log(`>>> 训练完成 (${trainTime}ms), 平均量化误差: ${trainResult.averageError.toFixed(6)}`);
  
  // 对数据库向量进行量化
  console.log(`>>> 量化数据库向量...`);
  const quantStartTime = Date.now();
  const codedVectors = databaseVectors.map(vec => deltaPQ.quantizeVector(vec).codes);
  const quantTime = Date.now() - quantStartTime;
  
  console.log(`>>> 量化完成 (${quantTime}ms), 平均每向量: ${(quantTime / databaseSize).toFixed(3)}ms`);
  
  // 测试不同k值的召回率
  console.log(`>>> 开始召回率测试...`);
  const recallResults = {};
  const distanceCalcTimes = {};
  
  for (const k of TEST_CONFIG.kValues) {
    let totalRecall = 0;
    let totalExactTime = 0;
    let totalApproxTime = 0;
    
    for (let i = 0; i < numQueries; i++) {
      const query = queryVectors[i];
      
      // 计算精确的KNN
      const exactStartTime = Date.now();
      const exactResults = computeExactKNN(databaseVectors, query, k, distanceMetric);
      totalExactTime += Date.now() - exactStartTime;
      
      // 计算DeltaPQ的KNN
      const queryQuantStartTime = Date.now();
      const queryCode = deltaPQ.quantizeVector(query).codes;
      const approxStartTime = Date.now();
      const approxResults = computeDeltaPQKNN(deltaPQ, codedVectors, queryCode, k);
      totalApproxTime += Date.now() - approxStartTime;
      
      // 计算召回率
      const recall = calculateRecall(exactResults, approxResults);
      totalRecall += recall;
      
      // 进度显示
      if (TEST_CONFIG.showDetailedLogs && i % Math.max(1, Math.floor(numQueries/5)) === 0) {
        console.log(`  - 查询进度 k=${k}: ${Math.floor(i/numQueries*100)}%, 当前平均召回率: ${((totalRecall/(i+1))*100).toFixed(2)}%`);
      }
    }
    
    // 计算平均召回率和时间
    const avgRecall = totalRecall / numQueries;
    recallResults[k] = avgRecall;
    
    const avgExactTime = totalExactTime / numQueries;
    const avgApproxTime = totalApproxTime / numQueries;
    distanceCalcTimes[k] = { exact: avgExactTime, approx: avgApproxTime, speedup: avgExactTime / avgApproxTime };
    
    console.log(`>>> k=${k} 结果:`);
    console.log(`  - 平均召回率: ${(avgRecall * 100).toFixed(2)}%`);
    console.log(`  - 精确查询平均时间: ${avgExactTime.toFixed(2)}ms`);
    console.log(`  - 近似查询平均时间: ${avgApproxTime.toFixed(2)}ms`);
    console.log(`  - 速度提升: ${distanceCalcTimes[k].speedup.toFixed(2)}x`);
  }
  
  // 计算压缩比和编码大小
  const compressionRatio = (32 * dim) / (bitsPerCode * numSubvectors);
  const encodedSizeBytes = Math.ceil(numSubvectors * bitsPerCode / 8);
  
  const result = {
    dim,
    databaseSize,
    numSubvectors,
    bitsPerCode,
    distanceMetric,
    trainSize,
    quantizationError: trainResult.averageError,
    compressionRatio,
    encodedSizeBytes,
    recallResults,
    distanceCalcTimes,
    trainTime,
    quantTime
  };
  
  // 如果启用了临时结果生成，则输出当前结果
  if (TEST_CONFIG.generateTempResults) {
    console.log('\n>>> 当前测试结果汇总:');
    displaySingleResult(result);
  }
  
  // 如果启用了测试间暂停，等待用户确认继续
  if (TEST_CONFIG.pauseBetweenTests) {
    console.log('\n>>> 按回车键继续下一个测试...');
    await new Promise(resolve => {
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');
      stdin.once('data', data => {
        if (data === '\r' || data === '\n' || data.toString() === '\u0003') {
          stdin.setRawMode(false);
          resolve();
        }
      });
    });
  }
  
  return result;
}

/**
 * 显示单个测试结果
 * @param {Object} result - 测试结果
 */
function displaySingleResult(result) {
  const { numSubvectors, bitsPerCode, compressionRatio, encodedSizeBytes, 
          quantizationError, recallResults, distanceCalcTimes } = result;
  
  console.log(`\n配置: ${numSubvectors}子向量, ${bitsPerCode}位编码`);
  console.log(`压缩比: ${compressionRatio.toFixed(1)}x, 编码大小: ${encodedSizeBytes}字节`);
  console.log(`量化误差: ${quantizationError.toFixed(6)}`);
  
  console.log('\n召回率:');
  for (const k in recallResults) {
    console.log(`  k=${k}: ${(recallResults[k]*100).toFixed(2)}%`);
  }
  
  console.log('\n速度提升:');
  for (const k in distanceCalcTimes) {
    console.log(`  k=${k}: ${distanceCalcTimes[k].speedup.toFixed(2)}x`);
  }
}

/**
 * 运行召回率测试
 */
async function runRecallTests() {
  console.log('\n');
  console.log('=================================================');
  console.log('           DeltaPQ召回率测试                     ');
  console.log('=================================================');
  console.log('\n当前测试配置:');
  
  for (const key in TEST_CONFIG) {
    if (Array.isArray(TEST_CONFIG[key])) {
      console.log(`- ${key}: [${TEST_CONFIG[key].join(', ')}]`);
    } else {
      console.log(`- ${key}: ${TEST_CONFIG[key]}`);
    }
  }
  
  // 计算总测试数量
  const totalTests = TEST_CONFIG.dims.length * 
                     TEST_CONFIG.distanceMetrics.length * 
                     TEST_CONFIG.subvectorCounts.length * 
                     TEST_CONFIG.bitsCodes.length;
  
  console.log(`\n>>> 将运行 ${totalTests} 个测试组合`);
  
  const results = [];
  const startTime = Date.now();
  let testIndex = 0;
  
  // 遍历所有维度配置
  for (const dim of TEST_CONFIG.dims) {
    // 选择一个数据库大小
    const databaseSize = TEST_CONFIG.databaseSizes[0];
    
    // 遍历不同的距离度量
    for (const distanceMetric of TEST_CONFIG.distanceMetrics) {
      // 选择一个训练集大小
      const trainSize = TEST_CONFIG.trainSizes[0];
      
      // 遍历子向量数量和编码位数的组合
      for (const numSubvectors of TEST_CONFIG.subvectorCounts) {
        for (const bitsPerCode of TEST_CONFIG.bitsCodes) {
          const testParams = {
            dim,
            databaseSize,
            numQueries: TEST_CONFIG.numQueries,
            numSubvectors,
            bitsPerCode,
            distanceMetric,
            trainSize
          };
          
          try {
            const result = await runSingleTest(testParams, testIndex, totalTests);
            results.push(result);
            // 保存到全局结果中
            allResults.push(result);
          } catch (error) {
            console.error(`测试失败: ${error.message}`);
          }
          
          testIndex++;
        }
      }
    }
  }
  
  const totalTime = (Date.now() - startTime) / 1000;
  console.log(`\n测试完成，总耗时: ${totalTime.toFixed(2)}秒`);
  
  // 显示测试结果汇总
  displayResults(results);
}

/**
 * 显示测试结果汇总
 * @param {Array<Object>} results - 测试结果数组
 */
function displayResults(results) {
  console.log('\n');
  console.log('=================================================');
  console.log('           DeltaPQ召回率测试结果汇总              ');
  console.log('=================================================');

  // 按距离度量分组
  const resultsByMetric = {};
  for (const result of results) {
    const metric = result.distanceMetric;
    if (!resultsByMetric[metric]) {
      resultsByMetric[metric] = [];
    }
    resultsByMetric[metric].push(result);
  }
  
  // 显示每种距离度量的结果
  for (const metric in resultsByMetric) {
    console.log(`\n## ${metric === DISTANCE_METRICS.EUCLIDEAN ? '欧几里得距离' : '余弦距离'} 结果\n`);
    
    // 按维度分组
    const resultsByDim = {};
    for (const result of resultsByMetric[metric]) {
      const dim = result.dim;
      if (!resultsByDim[dim]) {
        resultsByDim[dim] = [];
      }
      resultsByDim[dim].push(result);
    }
    
    // 显示每个维度的结果
    for (const dim in resultsByDim) {
      console.log(`### 维度: ${dim}\n`);
      console.log('| 子向量数 | 编码位数 | 压缩比 | 编码大小 | 量化误差 | 召回率@1 | 召回率@10 | 召回率@50 | 召回率@100 | 速度提升@10 |');
      console.log('|----------|----------|--------|----------|----------|----------|-----------|-----------|------------|-------------|');
      
      // 按子向量数和编码位数排序
      resultsByDim[dim].sort((a, b) => {
        if (a.numSubvectors !== b.numSubvectors) {
          return a.numSubvectors - b.numSubvectors;
        }
        return a.bitsPerCode - b.bitsPerCode;
      });
      
      for (const result of resultsByDim[dim]) {
        const { numSubvectors, bitsPerCode, compressionRatio, encodedSizeBytes, 
                quantizationError, recallResults, distanceCalcTimes } = result;
        
        const speedup = distanceCalcTimes[10] ? distanceCalcTimes[10].speedup.toFixed(1) : 'N/A';
        
        console.log(`| ${numSubvectors} | ${bitsPerCode} | ${compressionRatio.toFixed(1)}x | ${encodedSizeBytes}B | ${quantizationError.toFixed(6)} | ${(recallResults[1]*100).toFixed(1)}% | ${(recallResults[10]*100).toFixed(1)}% | ${(recallResults[50]*100).toFixed(1)}% | ${(recallResults[100]*100).toFixed(1)}% | ${speedup}x |`);
      }
    }
  }
  
  // 显示最佳配置推荐
  console.log('\n');
  console.log('=================================================');
  console.log('              最佳配置推荐                       ');
  console.log('=================================================');
  
  // 针对不同的召回率要求推荐配置
  const recallThresholds = [0.8, 0.9, 0.95];
  const kToCheck = 10; // 以k=10为基准
  
  for (const metric in resultsByMetric) {
    console.log(`\n### ${metric === DISTANCE_METRICS.EUCLIDEAN ? '欧几里得距离' : '余弦距离'}\n`);
    
    for (const threshold of recallThresholds) {
      const qualifying = resultsByMetric[metric].filter(r => r.recallResults[kToCheck] >= threshold);
      qualifying.sort((a, b) => b.compressionRatio - a.compressionRatio);
      
      if (qualifying.length > 0) {
        const best = qualifying[0];
        console.log(`- 召回率>${(threshold*100).toFixed(0)}%: ${best.numSubvectors}子向量, ${best.bitsPerCode}位编码 (压缩比${best.compressionRatio.toFixed(1)}x, 速度提升${best.distanceCalcTimes[kToCheck].speedup.toFixed(1)}x)`);
      } else {
        console.log(`- 召回率>${(threshold*100).toFixed(0)}%: 无满足条件的配置`);
      }
    }
  }
  
  // 显示使用建议
  console.log('\n');
  console.log('=================================================');
  console.log('               使用建议                          ');
  console.log('=================================================');
  
  console.log('\n1. **欧几里得距离**:');
  console.log('   - 高精度需求: 使用较低的子向量数(16-32)和较高的编码位数(10)');
  console.log('   - 高压缩需求: 使用较高的子向量数(64)和标准编码位数(8)');
  
  console.log('\n2. **余弦距离**:');
  console.log('   - 最佳效果: 使用较低的子向量数(16-32)和更高的编码位数(10)');
  console.log('   - 确保输入向量归一化以获得最佳结果');
  
  console.log('\n3. **通用建议**:');
  console.log('   - 对于更大维度(768+)的向量，考虑增加子向量数量');
  console.log('   - 训练集大小应至少为1000以获得稳定结果');
  console.log('   - 当召回率要求低于80%时，可以采用更高压缩比的配置');
  
  // 空行结束
  console.log('\n');
}

/**
 * 运行单个手动指定的测试
 * @param {Object} params - 测试参数
 */
async function runManualTest(params) {
  const defaultParams = {
    dim: 512,
    databaseSize: 2000,
    numQueries: 20,
    numSubvectors: 32,
    bitsPerCode: 10,
    distanceMetric: DISTANCE_METRICS.EUCLIDEAN,
    trainSize: 1000
  };
  
  // 合并默认参数和用户参数
  const testParams = { ...defaultParams, ...params };
  
  // 将generateTempResults临时设为true
  const originalTempResults = TEST_CONFIG.generateTempResults;
  TEST_CONFIG.generateTempResults = true;
  
  console.log('\n');
  console.log('=================================================');
  console.log('           DeltaPQ手动测试                      ');
  console.log('=================================================');
  
  console.log(`\n测试参数:`);
  for (const key in testParams) {
    console.log(`- ${key}: ${testParams[key]}`);
  }
  
  try {
    const result = await runSingleTest(testParams, 0, 1);
    allResults.push(result);
    
    // 显示结果
    console.log('\n');
    console.log('=================================================');
    console.log('           手动测试结果                          ');
    console.log('=================================================');
    displaySingleResult(result);
  } catch (error) {
    console.error(`测试失败: ${error.message}`);
  }
  
  // 恢复原始设置
  TEST_CONFIG.generateTempResults = originalTempResults;
}

// 导出主要函数
export {
  runRecallTests,       // 运行全部测试
  runManualTest,        // 运行单个手动测试
  TEST_CONFIG           // 测试配置
};

// 如果直接运行此文件，执行全部测试
if (import.meta.url === import.meta.main) {
  runRecallTests().catch(error => {
    console.error('\n测试过程中发生错误:', error);
  });
} 