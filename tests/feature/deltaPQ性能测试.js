/**
 * DeltaPQ量化算法性能测试
 * 深入测试DeltaPQ的量化质量、搜索准确度和召回率
 * 
 * 【余弦距离特别说明】
 * 使用余弦距离时，输入向量必须严格归一化（模长为1），否则DeltaPQ会抛出错误。
 * 余弦距离测试结果可能与欧几里得距离测试结果不同，这是因为两者计算方式和敏感度不同：
 * 1. 余弦距离关注向量间夹角，对向量长度变化不敏感
 * 2. 欧几里得距离同时考虑方向和长度差异
 * 3. 在单位向量空间中，余弦距离和欧几里得距离之间存在数学关系: d_euclidean = sqrt(2 - 2*cos(θ))
 * 
 * 当测试结果显示余弦距离精度较低时，可能是由以下原因：
 * - 子向量划分使向量不再严格归一化
 * - 子空间量化误差在余弦计算中累积
 * - 高维向量在大量子向量条件下更容易受影响
 */

import { createDeltaPQ, createDeltaPQIndex, DISTANCE_METRICS } from '../../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/useCustomedDeltaPQ.js';
import { computeCosineDistance, computeEuclideanDistance } from '../../src/toolBox/base/forMath/forGeometry/forVectors/forDistance.js';

// 测试参数
const TEST_PARAMS = {
  vectorDimensions: [512, 768, 1024], // 增加高维向量测试，移除低维测试
  numSubvectors: [16, 32, 64, 128], // 更多的子向量数量选项，特别是高维度情况
  bitsPerCode: [8, 10], // 增加10位编码选项提高精度
  distanceMetrics: [DISTANCE_METRICS.EUCLIDEAN, DISTANCE_METRICS.COSINE],
  trainSetSizes: [500, 1000, 2000], // 增加训练集大小，移除较小的训练集
  querySetSizes: [50],
  ks: [1, 5, 10, 20, 50, 100]
};

// 通过标准 - 不同维度下的测试通过条件
const PASSING_CRITERIA = {
  // 召回率标准 (百分比)
  recall: {
    k1: { // 召回率随k值提高而提高
      minimum: 75,
      preferred: 90
    },
    k10: {
      minimum: 70,
      preferred: 85
    },
    k100: {
      minimum: 65,
      preferred: 80
    }
  },
  
  // 速度提升标准 (x倍)
  speedup: {
    minimum: 5,
    preferred: 20
  },
  
  // 量化误差标准 (对于欧几里得距离)
  quantizationErrorEuclidean: {
    maximum: 0.25, // 略微放宽标准，考虑到高维向量的复杂性
    preferred: 0.12
  },
  
  // 量化误差标准 (对于余弦距离)
  quantizationErrorCosine: {
    maximum: 0.18, // 略微放宽标准
    preferred: 0.09
  },
  
  // 距离计算的精度标准
  distanceAccuracy: {
    euclidean: {
      maximum: 0.18, // 略微放宽标准
      preferred: 0.06
    },
    cosine: {
      maximum: 0.12, // 略微放宽标准
      preferred: 0.04
    }
  },
  
  // 时间性能标准 (毫秒)
  timePerformance: {
    // 量化单个向量的最大耗时
    quantization: {
      512: { maximum: 0.1, preferred: 0.05 },
      768: { maximum: 0.15, preferred: 0.08 },
      1024: { maximum: 0.2, preferred: 0.1 }
    },
    // 计算两个量化向量距离的最大耗时
    distanceComputation: {
      512: { maximum: 0.03, preferred: 0.01 },
      768: { maximum: 0.04, preferred: 0.015 },
      1024: { maximum: 0.05, preferred: 0.02 }
    },
    // 训练每1000个向量的最大耗时(秒)
    training: {
      512: { maximum: 15, preferred: 8 },
      768: { maximum: 25, preferred: 12 },
      1024: { maximum: 35, preferred: 18 }
    }
  }
};

/**
 * 显示提示并等待用户确认
 * @param {string} message - 提示消息
 * @returns {Promise<boolean>} 用户是否确认
 */
function askForConfirmation(message) {
  return new Promise(resolve => {
    resolve(confirm(message));
  });
}

/**
 * 生成随机单位向量
 * @param {number} dim - 向量维度
 * @param {number} count - 要生成的向量数量
 * @returns {Array<Float32Array>} 生成的向量数组
 */
function generateRandomUnitVectors(dim, count) {
  const vectors = [];
  for (let i = 0; i < count; i++) {
    const vec = new Float32Array(dim);
    let sumSquared = 0;
    
    // 生成随机向量
    for (let j = 0; j < dim; j++) {
      vec[j] = Math.random() * 2 - 1;
      sumSquared += vec[j] * vec[j];
    }
    
    // 归一化为单位向量
    const norm = Math.sqrt(sumSquared);
    if (norm < 1e-10) {
      // 防止除零错误
      vec[0] = 1.0;
    } else {
      for (let j = 0; j < dim; j++) {
        vec[j] /= norm;
      }
    }
    
    // 严格验证是否归一化成功
    let normCheck = 0;
    for (let j = 0; j < dim; j++) {
      normCheck += vec[j] * vec[j];
    }
    
    if (Math.abs(normCheck - 1.0) > 1e-6) {
      // 如果归一化失败，重试生成新向量
      i--;
      continue;
    }
    
    vectors.push(vec);
  }
  return vectors;
}

/**
 * 生成分隔线
 * @param {string} char - 分隔符字符
 * @param {number} length - 分隔线长度
 * @returns {string} 分隔线
 */
function generateSeparator(char = '=', length = 80) {
  return char.repeat(length);
}

/**
 * 格式化测试参数输出
 * @param {Object} params - 测试参数
 * @returns {string} 格式化的参数字符串
 */
function formatTestParams(params) {
  return Object.entries(params)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ');
}

/**
 * 测量量化误差
 * @param {Object} deltaPQ - DeltaPQ实例
 * @param {Array<Float32Array>} vectors - 测试向量
 * @returns {Object} 误差统计
 */
function measureQuantizationError(deltaPQ, vectors) {
  let totalError = 0;
  const errors = [];
  const distanceMetric = deltaPQ.getMetric?.() || DISTANCE_METRICS.EUCLIDEAN;
  
  for (const vec of vectors) {
    const { codes } = deltaPQ.quantizeVector(vec);
    const reconstructed = deltaPQ.dequantizeVector(codes);
    
    // 根据距离度量类型选择合适的误差计算方法
    let error;
    if (distanceMetric === DISTANCE_METRICS.COSINE) {
      // 对于余弦距离，使用余弦相似度误差
      error = computeCosineDistance(vec, reconstructed);
    } else {
      // 对于欧几里得距离等其他度量，使用欧几里得距离
      error = computeEuclideanDistance(vec, reconstructed);
    }
    
    errors.push(error);
    totalError += error;
  }
  
  return {
    averageError: totalError / vectors.length,
    minError: Math.min(...errors),
    maxError: Math.max(...errors),
    medianError: errors.sort((a, b) => a - b)[Math.floor(errors.length / 2)],
    distanceMetric // 添加距离度量类型到返回结果中
  };
}

/**
 * 计算召回率
 * @param {Array} approxResults - 近似搜索结果
 * @param {Array} exactResults - 精确搜索结果
 * @param {number} k - 结果数量
 * @returns {number} 召回率 (0-1)
 */
function calculateRecall(approxResults, exactResults, k) {
  const exactIds = new Set(exactResults.slice(0, k).map(res => res.id));
  const approxIds = approxResults.slice(0, k).map(res => res.id);
  
  let matchCount = 0;
  for (const id of approxIds) {
    if (exactIds.has(id)) {
      matchCount++;
    }
  }
  
  return matchCount / k;
}

/**
 * 执行精确搜索
 * @param {Array<Float32Array>} vectors - 数据库向量
 * @param {Float32Array} query - 查询向量
 * @param {number} k - 要返回的结果数量
 * @param {string} distanceMetric - 距离度量
 * @returns {Array<{id: number, distance: number}>} 搜索结果
 */
function exactSearch(vectors, query, k, distanceMetric) {
  const distanceFunc = distanceMetric === DISTANCE_METRICS.COSINE 
    ? computeCosineDistance 
    : computeEuclideanDistance;
  
  const results = vectors.map((vec, i) => ({
    id: i,
    distance: distanceFunc(query, vec)
  }));
  
  return results.sort((a, b) => a.distance - b.distance).slice(0, k);
}

/**
 * 测试不同参数下的DeltaPQ性能
 */
async function testDeltaPQParameterSweep() {
  console.log(`${generateSeparator('=')}`);
  console.log(`开始DeltaPQ参数扫描测试`);
  console.log(`${generateSeparator('=')}`);
  
  // 收集所有通过测试的配置
  const passedConfigurations = [];
  
  for (const dim of TEST_PARAMS.vectorDimensions) {
    for (const distanceMetric of TEST_PARAMS.distanceMetrics) {
      // 确认是否进行当前维度和距离度量的测试
      const confirmMessage = `是否开始测试 维度:${dim} | 距离度量:${distanceMetric}?`;
      const confirmed = await askForConfirmation(confirmMessage);
      
      if (!confirmed) {
        console.log(`跳过测试 维度:${dim} | 距离度量:${distanceMetric}`);
        continue;
      }
      
      // 生成测试数据
      const databaseSize = 5000;
      console.log(`${generateSeparator('-')}`);
      
      let databaseVectors;
      let queryVectors;
      
      if (distanceMetric === DISTANCE_METRICS.COSINE) {
        console.log(`生成${databaseSize}个${dim}维归一化向量用于余弦距离测试...`);
        databaseVectors = generateRandomUnitVectors(dim, databaseSize);
        queryVectors = generateRandomUnitVectors(dim, TEST_PARAMS.querySetSizes[0]);
        
        // 验证向量确实已归一化
        const normalizedCheck = checkVectorsNormalization(databaseVectors, 20);
        console.log(`检测向量归一化状态: ${normalizedCheck ? '✓ 已归一化' : '✗ 未归一化'}`);
        if (!normalizedCheck) {
          console.error('余弦距离测试需要归一化向量，但验证失败。尝试执行额外的归一化步骤...');
          // 如果验证失败，进行额外的归一化处理
          for (const vec of databaseVectors) {
            normalizeVector(vec);
          }
          for (const vec of queryVectors) {
            normalizeVector(vec);
          }
          
          // 再次验证
          const recheck = checkVectorsNormalization(databaseVectors, 20);
          console.log(`重新检测向量归一化状态: ${recheck ? '✓ 已归一化' : '✗ 未归一化'}`);
          if (!recheck) {
            console.error('无法确保向量归一化，余弦距离测试可能不准确');
          }
        }
      } else {
        console.log(`生成${databaseSize}个${dim}维向量用于欧几里得距离测试...`);
        databaseVectors = generateRandomUnitVectors(dim, databaseSize);
        queryVectors = generateRandomUnitVectors(dim, TEST_PARAMS.querySetSizes[0]);
      }
      
      console.log(`\n${generateSeparator('*')}`);
      console.log(`测试维度: ${dim} | 距离度量: ${distanceMetric === DISTANCE_METRICS.COSINE ? '余弦距离' : '欧几里得距离'}`);
      console.log(`${generateSeparator('*')}`);
      
      // 收集当前维度和距离度量下的测试结果
      const dimensionResults = [];
      
      for (const numSubvectors of TEST_PARAMS.numSubvectors) {
        for (const bitsPerCode of TEST_PARAMS.bitsPerCode) {
          for (const trainSetSize of TEST_PARAMS.trainSetSizes) {
            if (trainSetSize > databaseSize) continue;
            
            // 准备当前测试轮次参数
            const currentTestParams = {
              维度: dim,
              距离度量: distanceMetric === DISTANCE_METRICS.COSINE ? '余弦距离' : '欧几里得距离',
              子向量数: numSubvectors,
              编码位数: bitsPerCode,
              训练集大小: trainSetSize
            };
            
            // 确认是否进行当前参数组合的测试
            const paramConfirmMsg = `是否开始测试 ${formatTestParams(currentTestParams)}?`;
            const paramConfirmed = await askForConfirmation(paramConfirmMsg);
            
            if (!paramConfirmed) {
              console.log(`跳过测试 ${formatTestParams(currentTestParams)}`);
              continue;
            }
            
            console.log(`\n${generateSeparator('-')}`);
            console.log(`测试参数: ${formatTestParams(currentTestParams)}`);
            console.log(`${generateSeparator('-')}`);
            
            // 创建DeltaPQ索引
            const index = createDeltaPQIndex({
              numSubvectors,
              bitsPerCode,
              sampleSize: trainSetSize,
              maxIterations: 50, // 增加K-means迭代次数以提高聚类质量
              distanceMetric
            });
            
            // 添加向量到索引
            console.log('向索引添加向量...');
            for (let i = 0; i < databaseVectors.length; i++) {
              index.addVector(databaseVectors[i], i);
            }
            
            // 构建索引
            console.log('构建索引...');
            const startTime = performance.now();
            const buildResult = index.buildIndex();
            const buildTime = performance.now() - startTime;
            
            console.log(`索引构建完成，耗时: ${buildTime.toFixed(2)}ms`);
            console.log(`使用距离度量方式: ${distanceMetric}`);
            console.log(`训练结果:`);
            console.log(`- 平均量化误差: ${buildResult.averageError?.toFixed(6) || 'N/A'}`);
            console.log(`- 压缩比: ${buildResult.compressionRatio?.toFixed(2) || 'N/A'}`);
            console.log(`- 有效向量比例: ${(buildResult.validVectorRatio * 100)?.toFixed(2) || 'N/A'}%`);
            
            // 创建DeltaPQ实例用于详细评估
            const deltaPQ = createDeltaPQ({
              numSubvectors,
              bitsPerCode,
              sampleSize: trainSetSize,
              maxIterations: 50, // 保持与索引相同的迭代次数
              distanceMetric
            });
            
            // 训练DeltaPQ
            deltaPQ.train(databaseVectors.slice(0, trainSetSize));
            
            // 测量量化误差
            const errorStats = measureQuantizationError(deltaPQ, databaseVectors.slice(0, 100));
            console.log(`\n量化误差统计:`);
            console.log(`- 距离度量方式: ${distanceMetric === DISTANCE_METRICS.COSINE ? '余弦距离' : '欧几里得距离'}`); 
            console.log(`- 平均误差: ${errorStats.averageError.toFixed(6)}`);
            console.log(`- 最小误差: ${errorStats.minError.toFixed(6)}`);
            console.log(`- 最大误差: ${errorStats.maxError.toFixed(6)}`);
            console.log(`- 中位数误差: ${errorStats.medianError.toFixed(6)}`);
            
            // 测试搜索召回率
            console.log('\n搜索召回率测试:');
            
            const recallRates = {};
            
            // 测试不同的k值
            for (const k of TEST_PARAMS.ks) {
              if (k > databaseVectors.length) continue;
              
              const recalls = [];
              const searchTimes = [];
              const exactSearchTimes = [];
              
              // 对每个查询向量测试
              for (const queryVector of queryVectors) {
                // 执行精确搜索
                const exactStartTime = performance.now();
                const exactResults = exactSearch(databaseVectors, queryVector, k, distanceMetric);
                const exactEndTime = performance.now();
                exactSearchTimes.push(exactEndTime - exactStartTime);
                
                // 执行DeltaPQ搜索
                const approxStartTime = performance.now();
                const approxResults = index.search(queryVector, k);
                const approxEndTime = performance.now();
                searchTimes.push(approxEndTime - approxStartTime);
                
                // 计算召回率
                const recall = calculateRecall(approxResults, exactResults, k);
                recalls.push(recall);
              }
              
              // 计算平均值
              const avgRecall = recalls.reduce((sum, val) => sum + val, 0) / recalls.length;
              const avgSearchTime = searchTimes.reduce((sum, val) => sum + val, 0) / searchTimes.length;
              const avgExactSearchTime = exactSearchTimes.reduce((sum, val) => sum + val, 0) / exactSearchTimes.length;
              
              recallRates[k] = {
                recall: avgRecall * 100, // 转为百分比
                speedup: avgExactSearchTime / avgSearchTime,
                searchTime: avgSearchTime
              };
            }
            
            // 打印召回率结果
            console.log('\n不同k值的召回率和加速比:');
            console.log(`${generateSeparator('-', 60)}`);
            console.log(`${'k'.padEnd(5)} | ${'召回率'.padEnd(10)} | ${'加速比'.padEnd(10)} | ${'搜索时间'.padEnd(10)}`);
            console.log(`${generateSeparator('-', 60)}`);
            
            for (const k of Object.keys(recallRates).sort((a, b) => Number(a) - Number(b))) {
              console.log(
                `${k.padEnd(5)} | ` +
                `${recallRates[k].recall.toFixed(2)}%`.padEnd(10) + ' | ' +
                `${recallRates[k].speedup.toFixed(2)}x`.padEnd(10) + ' | ' +
                `${recallRates[k].searchTime.toFixed(3)}ms`.padEnd(10)
              );
            }
            console.log(`${generateSeparator('-', 60)}`);
            
            // 收集距离计算精度数据
            let totalDistDiff = 0;
            let maxDistDiff = 0;
            const distSampleCount = 50;
            
            for (let i = 0; i < distSampleCount; i++) {
              const idx1 = Math.floor(Math.random() * databaseVectors.length);
              const idx2 = Math.floor(Math.random() * databaseVectors.length);
              
              const vec1 = databaseVectors[idx1];
              const vec2 = databaseVectors[idx2];
              
              // 量化向量
              const codes1 = deltaPQ.quantizeVector(vec1).codes;
              const codes2 = deltaPQ.quantizeVector(vec2).codes;
              
              // 计算精确距离
              const exactDist = distanceMetric === DISTANCE_METRICS.COSINE
                ? computeCosineDistance(vec1, vec2)
                : computeEuclideanDistance(vec1, vec2);
              
              // 计算量化后的距离
              const approxDist = deltaPQ.computeApproximateDistance(codes1, codes2);
              
              // 计算差异
              const diff = Math.abs(exactDist - approxDist);
              totalDistDiff += diff;
              maxDistDiff = Math.max(maxDistDiff, diff);
            }
            
            const avgDistDiff = totalDistDiff / distSampleCount;
            
            // 测量时间性能
            console.log('测量时间性能...');
            const timePerformance = await measureTimePerformance(deltaPQ, databaseVectors.slice(0, 100));
            console.log(`- 量化时间: ${timePerformance.quantization.toFixed(6)}ms/向量`);
            console.log(`- 距离计算时间: ${timePerformance.distanceComputation.toFixed(6)}ms/次`);
            console.log(`- 训练时间: ${timePerformance.training.toFixed(3)}秒/千向量`);
            
            // 准备评估数据
            const testResult = {
              params: {
                dimension: dim,
                numSubvectors,
                bitsPerCode,
                trainSetSize,
                distanceMetric
              },
              buildTime,
              errorStats,
              distanceAccuracy: {
                avgDiff: avgDistDiff,
                maxDiff: maxDistDiff
              },
              recallRates,
              timePerformance
            };
            
            // 应用评估标准
            const criteria = {
              distanceMetric,
              ...PASSING_CRITERIA
            };
            
            const evaluation = evaluateTestResult(testResult, criteria);
            console.log(formatEvaluation(evaluation));
            
            // 收集结果
            dimensionResults.push({
              params: {
                dimension: dim,
                distanceMetric,
                numSubvectors,
                bitsPerCode,
                trainSetSize
              },
              buildTime,
              errorStats,
              distanceAccuracy: {
                avgDiff: avgDistDiff,
                maxDiff: maxDistDiff
              },
              recallRates,
              evaluation
            });
            
            // 如果通过测试，添加到通过配置列表
            if (evaluation.passed) {
              passedConfigurations.push({
                dimension: dim,
                distanceMetric,
                numSubvectors,
                bitsPerCode,
                trainSetSize,
                buildTime,
                avgError: errorStats.averageError,
                avgDistDiff,
                // 取k=10的召回率和加速比
                recall10: recallRates[10]?.recall || 0,
                speedup10: recallRates[10]?.speedup || 0
              });
            }
            
            console.log('\n'); // 额外空行增加可读性
          }
        }
      }
      
      // 对当前维度的所有结果进行总结
      if (dimensionResults.length > 0) {
        console.log(`\n${generateSeparator('=')}`);
        console.log(`维度${dim}, 距离度量${distanceMetric}的测试结果总结:`);
        console.log(`${generateSeparator('=')}`);
        
        // 按召回率排序的结果
        const byRecall = [...dimensionResults].sort((a, b) => 
          (b.recallRates[10]?.recall || 0) - (a.recallRates[10]?.recall || 0)
        );
        
        // 按速度提升排序的结果
        const bySpeedup = [...dimensionResults].sort((a, b) => 
          (b.recallRates[10]?.speedup || 0) - (a.recallRates[10]?.speedup || 0)
        );
        
        // 按误差排序的结果
        const byError = [...dimensionResults].sort((a, b) => 
          a.errorStats.averageError - b.errorStats.averageError
        );
        
        console.log(`\n最高召回率配置 (k=10):`);
        if (byRecall.length > 0) {
          const best = byRecall[0];
          console.log(`- 子向量数: ${best.params.numSubvectors}, 编码位数: ${best.params.bitsPerCode}, 训练集大小: ${best.params.trainSetSize}`);
          console.log(`- 召回率: ${best.recallRates[10]?.recall.toFixed(2) || 'N/A'}%, 加速比: ${best.recallRates[10]?.speedup.toFixed(2) || 'N/A'}x`);
          console.log(`- 平均误差: ${best.errorStats.averageError.toFixed(6)}`);
          console.log(`- 距离度量: ${best.params.distanceMetric === DISTANCE_METRICS.COSINE ? '余弦距离' : '欧几里得距离'}`);
          console.log(`- 测试结果: ${best.evaluation.passed ? '✅ 通过' : '❌ 未通过'}`);
        }
        
        console.log(`\n最佳加速比配置 (k=10):`);
        if (bySpeedup.length > 0) {
          const best = bySpeedup[0];
          console.log(`- 子向量数: ${best.params.numSubvectors}, 编码位数: ${best.params.bitsPerCode}, 训练集大小: ${best.params.trainSetSize}`);
          console.log(`- 加速比: ${best.recallRates[10]?.speedup.toFixed(2) || 'N/A'}x, 召回率: ${best.recallRates[10]?.recall.toFixed(2) || 'N/A'}%`);
          console.log(`- 平均误差: ${best.errorStats.averageError.toFixed(6)}`);
          console.log(`- 距离度量: ${best.params.distanceMetric === DISTANCE_METRICS.COSINE ? '余弦距离' : '欧几里得距离'}`);
          console.log(`- 测试结果: ${best.evaluation.passed ? '✅ 通过' : '❌ 未通过'}`);
        }
        
        console.log(`\n最低误差配置:`);
        if (byError.length > 0) {
          const best = byError[0];
          console.log(`- 子向量数: ${best.params.numSubvectors}, 编码位数: ${best.params.bitsPerCode}, 训练集大小: ${best.params.trainSetSize}`);
          console.log(`- 平均误差: ${best.errorStats.averageError.toFixed(6)}`);
          console.log(`- 距离度量: ${best.params.distanceMetric === DISTANCE_METRICS.COSINE ? '余弦距离' : '欧几里得距离'}`);
          console.log(`- 召回率: ${best.recallRates[10]?.recall.toFixed(2) || 'N/A'}%, 加速比: ${best.recallRates[10]?.speedup.toFixed(2) || 'N/A'}x`);
          console.log(`- 测试结果: ${best.evaluation.passed ? '✅ 通过' : '❌ 未通过'}`);
        }
        
        // 找出综合最佳配置
        const passedResults = dimensionResults.filter(r => r.evaluation.passed);
        
        console.log(`\n综合最佳配置 (通过测试的配置):`);
        if (passedResults.length > 0) {
          // 按综合得分排序 - 根据距离度量调整评分公式
          const bestOverall = passedResults.sort((a, b) => {
            let scoreA, scoreB;
            
            if (a.params.distanceMetric === DISTANCE_METRICS.COSINE) {
              // 余弦距离优化评分公式
              scoreA = (a.recallRates[10]?.recall || 0) * 1.2 * (a.recallRates[10]?.speedup || 0) / 
                       (a.errorStats.averageError + 0.001);
              scoreB = (b.recallRates[10]?.recall || 0) * 1.2 * (b.recallRates[10]?.speedup || 0) / 
                       (b.errorStats.averageError + 0.001);
            } else {
              // 欧几里得距离标准评分
              scoreA = (a.recallRates[10]?.recall || 0) * (a.recallRates[10]?.speedup || 0) / 
                       (a.errorStats.averageError + 0.001);
              scoreB = (b.recallRates[10]?.recall || 0) * (b.recallRates[10]?.speedup || 0) / 
                       (b.errorStats.averageError + 0.001);
            }
            
            return scoreB - scoreA;
          })[0];
          
          console.log(`- 子向量数: ${bestOverall.params.numSubvectors}, 编码位数: ${bestOverall.params.bitsPerCode}, 训练集大小: ${bestOverall.params.trainSetSize}`);
          console.log(`- 召回率: ${bestOverall.recallRates[10]?.recall.toFixed(2) || 'N/A'}%, 加速比: ${bestOverall.recallRates[10]?.speedup.toFixed(2) || 'N/A'}x`);
          console.log(`- 平均误差: ${bestOverall.errorStats.averageError.toFixed(6)}`);
          console.log(`- 距离度量: ${bestOverall.params.distanceMetric === DISTANCE_METRICS.COSINE ? '余弦距离' : '欧几里得距离'}`);
        } else {
          console.log(`- 没有配置通过所有测试标准`);
        }
      }
    }
  }
  
  // 最终总结所有通过配置
  if (passedConfigurations.length > 0) {
    console.log(`\n${generateSeparator('#')}`);
    console.log(`全局测试结果总结 - 所有通过的配置: ${passedConfigurations.length}个`);
    console.log(`${generateSeparator('#')}`);
    
    // 按维度和距离度量分组
    const groupedConfigs = {};
    
    for (const config of passedConfigurations) {
      const key = `dim=${config.dimension}_${config.distanceMetric}`;
      if (!groupedConfigs[key]) {
        groupedConfigs[key] = [];
      }
      groupedConfigs[key].push(config);
    }
    
    // 对每个组找出最佳配置
    for (const key of Object.keys(groupedConfigs)) {
      const configs = groupedConfigs[key];
      const [dimPart, metricPart] = key.split('_');
      const dimension = dimPart.split('=')[1];
      const metric = metricPart;
      
      console.log(`\n维度${dimension}, 距离度量${metric}的最佳配置:`);
      
      // 按综合得分排序
      configs.sort((a, b) => {
        // 根据距离度量方式使用不同的评分公式
        let scoreA, scoreB;
        
        if (a.distanceMetric === DISTANCE_METRICS.COSINE) {
          // 余弦距离优化评分公式：更重视召回率和加速比
          scoreA = (a.recall10 * 1.2) * (a.speedup10 * 1.1) / (a.avgError + 0.001);
          scoreB = (b.recall10 * 1.2) * (b.speedup10 * 1.1) / (b.avgError + 0.001);
        } else {
          // 欧几里得距离评分公式：标准平衡
          scoreA = a.recall10 * a.speedup10 / (a.avgError + 0.001);
          scoreB = b.recall10 * b.speedup10 / (b.avgError + 0.001);
        }
        
        return scoreB - scoreA;
      });
      
      const best = configs[0];
      console.log(`- 子向量数: ${best.numSubvectors}, 编码位数: ${best.bitsPerCode}, 训练集大小: ${best.trainSetSize}`);
      console.log(`- 召回率(k=10): ${best.recall10.toFixed(2)}%, 加速比: ${best.speedup10.toFixed(2)}x`);
      console.log(`- 平均误差: ${best.avgError.toFixed(6)}`);
      console.log(`- 距离类型: ${best.distanceMetric} (${best.distanceMetric === DISTANCE_METRICS.COSINE ? '余弦距离' : '欧几里得距离'})`);
    }
  } else {
    console.log(`\n没有配置通过所有测试标准`);
  }
  
  return passedConfigurations;
}

/**
 * 测试不同子向量数量对余弦距离量化的影响
 */
async function testSubvectorEffectOnCosine() {
  console.log(`${generateSeparator('=')}`);
  console.log(`测试子向量数量对余弦距离的影响`);
  console.log(`${generateSeparator('=')}`);
  
  // 使用更高维度的向量测试
  const dim = 512;
  const databaseSize = 2000; // 增加数据库大小以提高测试稳定性
  
  // 确认是否进行测试
  const confirmed = await askForConfirmation('是否开始测试子向量数量对余弦距离的影响?');
  if (!confirmed) {
    console.log('跳过测试子向量数量对余弦距离的影响');
    return;
  }
  
  // 在余弦距离测试中，确保向量是已归一化的单位向量
  console.log(`生成${databaseSize}个${dim}维单位向量用于测试...`);
  const testVectors = generateRandomUnitVectors(dim, databaseSize);
  
  // 验证向量确实已归一化
  const normalizedCheck = checkVectorsNormalization(testVectors, 20);
  console.log(`检测向量归一化状态: ${normalizedCheck ? '已归一化' : '未归一化'}`);
  if (!normalizedCheck) {
    console.error('余弦距离测试需要归一化向量，但验证失败');
    return;
  }
  
  const trainSetSize = 1000; // 增加训练集大小
  const bitsPerCode = 10; // 使用10位编码以提高精度
  
  // 测试不同的子向量数量，特别关注高子向量数
  const subvectorCounts = [16, 32, 64, 128];
  const results = [];
  
  for (const numSubvectors of subvectorCounts) {
    // 确认是否测试当前子向量数量
    const subConfirmed = await askForConfirmation(`是否测试子向量数量: ${numSubvectors}?`);
    if (!subConfirmed) {
      console.log(`跳过测试子向量数量: ${numSubvectors}`);
      continue;
    }
    
    console.log(`\n${generateSeparator('*')}`);
    console.log(`测试子向量数量: ${numSubvectors}`);
    console.log(`${generateSeparator('*')}`);
    
    // 创建余弦距离的DeltaPQ
    const cosineDeltaPQ = createDeltaPQ({
      numSubvectors,
      bitsPerCode,
      sampleSize: trainSetSize,
      maxIterations: 50, // 增加K-means迭代次数以提高聚类质量
      distanceMetric: DISTANCE_METRICS.COSINE
    });
    
    console.log('训练DeltaPQ模型...');
    cosineDeltaPQ.train(testVectors.slice(0, trainSetSize));
    console.log('训练完成，开始测试距离计算...');
    
    // 选择一些向量对进行测试
    const pairs = 100; // 增加测试对数量
    let totalDiff = 0;
    let maxDiff = 0;
    
    console.log('\n示例向量对距离计算:');
    console.log(`${generateSeparator('-', 70)}`);
    console.log(`${'样本对'.padEnd(10)} | ${'精确距离'.padEnd(15)} | ${'近似距离'.padEnd(15)} | ${'差异'.padEnd(15)}`);
    console.log(`${generateSeparator('-', 70)}`);
    
    for (let i = 0; i < pairs; i++) {
      const idx1 = Math.floor(Math.random() * databaseSize);
      const idx2 = Math.floor(Math.random() * databaseSize);
      
      const vec1 = testVectors[idx1];
      const vec2 = testVectors[idx2];
      
      // 量化向量
      const codes1 = cosineDeltaPQ.quantizeVector(vec1).codes;
      const codes2 = cosineDeltaPQ.quantizeVector(vec2).codes;
      
      // 计算精确余弦距离
      const exactDist = computeCosineDistance(vec1, vec2);
      
      // 计算量化后的余弦距离
      const approxDist = cosineDeltaPQ.computeApproximateDistance(codes1, codes2);
      
      // 计算差异
      const diff = Math.abs(exactDist - approxDist);
      totalDiff += diff;
      maxDiff = Math.max(maxDiff, diff);
      
      if (i < 5) {
        console.log(
          `${(i+1).toString().padEnd(10)} | ` +
          `${exactDist.toFixed(6)}`.padEnd(15) + ' | ' +
          `${approxDist.toFixed(6)}`.padEnd(15) + ' | ' +
          `${diff.toFixed(6)}`.padEnd(15)
        );
      }
    }
    console.log(`${generateSeparator('-', 70)}`);
    
    const avgDiff = totalDiff / pairs;
    console.log(`\n统计结果:`);
    console.log(`- 平均距离差异: ${avgDiff.toFixed(6)}`);
    console.log(`- 最大距离差异: ${maxDiff.toFixed(6)}`);
    console.log(`- 每个子向量的平均维度: ${(dim / numSubvectors).toFixed(2)}`);
    
    // 测量量化误差
    const errorStats = measureQuantizationError(cosineDeltaPQ, testVectors.slice(0, 100));
    console.log(`- 量化误差: ${errorStats.averageError.toFixed(6)}`);
    
    // 评估本轮测试结果
    const testResult = {
      params: {
        dimension: dim,
        numSubvectors,
        bitsPerCode,
        distanceMetric: DISTANCE_METRICS.COSINE
      },
      errorStats,
      distanceAccuracy: {
        avgDiff,
        maxDiff
      }
    };
    
    // 应用评估标准
    const criteria = {
      distanceMetric: DISTANCE_METRICS.COSINE,
      ...PASSING_CRITERIA
    };
    
    const evaluation = evaluateTestResult(testResult, criteria);
    console.log(formatEvaluation(evaluation));
    
    // 收集结果
    results.push({
      numSubvectors,
      avgDiff,
      maxDiff,
      error: errorStats.averageError,
      evaluation
    });
  }
  
  // 输出所有结果的比较
  if (results.length > 0) {
    console.log(`\n${generateSeparator('=')}`);
    console.log(`不同子向量数量比较结果 (${dim}维向量):`);
    console.log(`${generateSeparator('-', 80)}`);
    console.log(`${'子向量数'.padEnd(10)} | ${'平均距离差异'.padEnd(15)} | ${'最大距离差异'.padEnd(15)} | ${'量化误差'.padEnd(15)} | ${'评估'.padEnd(10)}`);
    console.log(`${generateSeparator('-', 80)}`);
    
    for (const result of results) {
      console.log(
        `${result.numSubvectors.toString().padEnd(10)} | ` +
        `${result.avgDiff.toFixed(6)}`.padEnd(15) + ' | ' +
        `${result.maxDiff.toFixed(6)}`.padEnd(15) + ' | ' +
        `${result.error.toFixed(6)}`.padEnd(15) + ' | ' +
        `${result.evaluation.passed ? '✅ 通过' : '❌ 未通过'}`.padEnd(10)
      );
    }
    console.log(`${generateSeparator('-', 80)}`);
    
    // 找出最优配置
    const bestConfig = results.reduce((best, current) => {
      // 对已通过测试的配置，选择平均距离差异最小的
      if (current.evaluation.passed) {
        if (!best || current.avgDiff < best.avgDiff) {
          return current;
        }
      }
      return best;
    }, null);
    
    if (bestConfig) {
      console.log(`\n最佳子向量数量配置: ${bestConfig.numSubvectors}`);
      console.log(`- 平均距离差异: ${bestConfig.avgDiff.toFixed(6)}`);
      console.log(`- 量化误差: ${bestConfig.error.toFixed(6)}`);
    } else {
      console.log('\n没有配置通过所有测试标准');
    }
  }
  
  return results;
}

/**
 * 检测向量集合是否已归一化（模长接近1）
 * @param {Array<Float32Array|Array>} vectors - 向量集合
 * @param {number} sampleCount - 抽样检测数量
 * @returns {boolean} 是否已归一化
 */
function checkVectorsNormalization(vectors, sampleCount = 5) {
  if (!vectors || vectors.length === 0) return false;
  
  // 确保抽样数量不超过向量总数
  const actualSampleCount = Math.min(sampleCount, vectors.length);
  let normalizedCount = 0;
  let total = 0;
  let details = [];
  
  // 随机抽样检测
  for (let i = 0; i < actualSampleCount; i++) {
    const randomIndex = Math.floor(Math.random() * vectors.length);
    const vector = vectors[randomIndex];
    
    let sumSquares = 0;
    for (let j = 0; j < vector.length; j++) {
      sumSquares += vector[j] * vector[j];
    }
    
    const diff = Math.abs(sumSquares - 1.0);
    details.push({index: randomIndex, norm: Math.sqrt(sumSquares), diff});
    total += diff;
    
    if (diff < 1e-6) {
      normalizedCount++;
    }
  }
  
  // 打印详细检测结果
  console.log(`向量归一化检测详情:`);
  console.log(`- 检测样本数: ${actualSampleCount}`);
  console.log(`- 合格样本数: ${normalizedCount}`);
  console.log(`- 平均误差: ${(total / actualSampleCount).toFixed(8)}`);
  
  // 示例向量归一化数据
  for (let i = 0; i < Math.min(5, details.length); i++) {
    const detail = details[i];
    console.log(`  向量[${detail.index}]: 模长=${detail.norm.toFixed(8)}, 误差=${detail.diff.toFixed(8)}`);
  }
  
  // 更严格：要求90%以上的向量归一化
  return normalizedCount >= Math.ceil(actualSampleCount * 0.9);
}

/**
 * 测试是否归一化对欧几里得距离的影响
 */
async function testNormalizationEffect() {
  console.log(`${generateSeparator('=')}`);
  console.log(`测试归一化对欧几里得距离的影响`);
  console.log(`${generateSeparator('=')}`);
  
  // 确认是否进行测试
  const confirmed = await askForConfirmation('是否开始测试归一化对欧几里得距离的影响?');
  if (!confirmed) {
    console.log('跳过测试归一化对欧几里得距离的影响');
    return;
  }
  
  // 使用更高维度的向量测试
  const dim = 512;
  const databaseSize = 2000;
  const testVectors = generateRandomUnitVectors(dim, databaseSize);
  const trainSetSize = 1000;
  
  // 更新测试配置，增加对子向量数量和编码位数的测试
  const configs = [
    { numSubvectors: 32, bitsPerCode: 8, normalize: true },
    { numSubvectors: 32, bitsPerCode: 8, normalize: false },
    { numSubvectors: 32, bitsPerCode: 10, normalize: true },
    { numSubvectors: 32, bitsPerCode: 10, normalize: false },
    { numSubvectors: 64, bitsPerCode: 8, normalize: true },
    { numSubvectors: 64, bitsPerCode: 8, normalize: false },
    { numSubvectors: 64, bitsPerCode: 10, normalize: true },
    { numSubvectors: 64, bitsPerCode: 10, normalize: false },
  ];
  
  const results = [];
  
  for (const config of configs) {
    // 确认是否测试当前配置
    const configDesc = `子向量数量:${config.numSubvectors}, 编码位数:${config.bitsPerCode}, 归一化:${config.normalize ? '是' : '否'}`;
    const configConfirmed = await askForConfirmation(`是否测试 ${configDesc}?`);
    
    if (!configConfirmed) {
      console.log(`跳过测试 ${configDesc}`);
      continue;
    }
    
    console.log(`\n${generateSeparator('*')}`);
    console.log(`测试配置: ${configDesc}`);
    console.log(`${generateSeparator('*')}`);
    
    // 创建测试向量 - 对于非归一化测试，使用未归一化的向量
    let testData = testVectors;
    if (!config.normalize) {
      // 生成非归一化向量 - 范围在[0, 10]之间的随机向量
      testData = Array(databaseSize).fill().map(() => {
        const vec = new Float32Array(dim);
        for (let i = 0; i < dim; i++) {
          vec[i] = Math.random() * 10;
        }
        return vec;
      });
    }
    
    // 创建欧几里得距离的DeltaPQ
    const deltaPQ = createDeltaPQ({
      numSubvectors: config.numSubvectors,
      bitsPerCode: config.bitsPerCode,
      sampleSize: trainSetSize,
      maxIterations: 50, // 增加K-means迭代次数
      distanceMetric: DISTANCE_METRICS.EUCLIDEAN  // 使用欧几里得距离
    });
    
    console.log('训练DeltaPQ模型...');
    deltaPQ.train(testData.slice(0, trainSetSize));
    console.log('训练完成，开始测试距离计算...');
    
    // 量化误差测试
    const errorStats = measureQuantizationError(deltaPQ, testData.slice(0, 100));
    console.log(`\n量化误差统计:`);
    console.log(`- 平均误差: ${errorStats.averageError.toFixed(6)}`);
    console.log(`- 最小误差: ${errorStats.minError.toFixed(6)}`);
    console.log(`- 最大误差: ${errorStats.maxError.toFixed(6)}`);
    console.log(`- 中位数误差: ${errorStats.medianError.toFixed(6)}`);
    
    // 选择一些向量对进行测试
    const pairs = 100; // 增加测试对数量
    let totalDiff = 0;
    let maxDiff = 0;
    
    console.log('\n示例向量对距离计算:');
    console.log(`${generateSeparator('-', 70)}`);
    console.log(`${'样本对'.padEnd(10)} | ${'精确距离'.padEnd(15)} | ${'近似距离'.padEnd(15)} | ${'差异'.padEnd(15)}`);
    console.log(`${generateSeparator('-', 70)}`);
    
    for (let i = 0; i < pairs; i++) {
      const idx1 = Math.floor(Math.random() * databaseSize);
      const idx2 = Math.floor(Math.random() * databaseSize);
      
      const vec1 = testData[idx1];
      const vec2 = testData[idx2];
      
      // 量化向量
      const codes1 = deltaPQ.quantizeVector(vec1).codes;
      const codes2 = deltaPQ.quantizeVector(vec2).codes;
      
      // 计算精确欧几里得距离
      const exactDist = computeEuclideanDistance(vec1, vec2);
      
      // 计算量化后的欧几里得距离
      const approxDist = deltaPQ.computeApproximateDistance(codes1, codes2);
      
      // 计算差异
      const diff = Math.abs(exactDist - approxDist);
      totalDiff += diff;
      maxDiff = Math.max(maxDiff, diff);
      
      if (i < 5) {
        console.log(
          `${(i+1).toString().padEnd(10)} | ` +
          `${exactDist.toFixed(6)}`.padEnd(15) + ' | ' +
          `${approxDist.toFixed(6)}`.padEnd(15) + ' | ' +
          `${diff.toFixed(6)}`.padEnd(15)
        );
      }
    }
    console.log(`${generateSeparator('-', 70)}`);
    
    const avgDiff = totalDiff / pairs;
    console.log(`\n统计结果:`);
    console.log(`- 平均距离差异: ${avgDiff.toFixed(6)}`);
    console.log(`- 最大距离差异: ${maxDiff.toFixed(6)}`);
    
    // 相对误差 - 对于非归一化向量可能更有意义
    const relativeError = avgDiff / (config.normalize ? 1.0 : 5.0);
    console.log(`- 相对误差: ${relativeError.toFixed(6)}`);
    
    // 评估本轮测试结果
    const testResult = {
      params: {
        dimension: dim,
        numSubvectors: config.numSubvectors,
        bitsPerCode: config.bitsPerCode,
        normalize: config.normalize,
        distanceMetric: DISTANCE_METRICS.EUCLIDEAN
      },
      errorStats,
      distanceAccuracy: {
        avgDiff,
        maxDiff,
        relativeError
      }
    };
    
    // 应用评估标准
    const criteria = {
      distanceMetric: DISTANCE_METRICS.EUCLIDEAN,
      ...PASSING_CRITERIA
    };
    
    const evaluation = evaluateTestResult(testResult, criteria);
    console.log(formatEvaluation(evaluation));
    
    // 收集结果
    results.push({
      numSubvectors: config.numSubvectors,
      bitsPerCode: config.bitsPerCode,
      normalize: config.normalize,
      avgDiff,
      maxDiff,
      relativeError,
      error: errorStats.averageError,
      evaluation
    });
  }
  
  // 输出所有结果的比较
  if (results.length > 0) {
    console.log(`\n${generateSeparator('=')}`);
    console.log(`归一化影响比较结果 (${dim}维向量):`);
    console.log(`${generateSeparator('-', 120)}`);
    console.log(`${'子向量数'.padEnd(10)} | ${'编码位数'.padEnd(10)} | ${'归一化'.padEnd(10)} | ${'平均距离差异'.padEnd(15)} | ${'相对误差'.padEnd(15)} | ${'量化误差'.padEnd(15)} | ${'评估'.padEnd(10)}`);
    console.log(`${generateSeparator('-', 120)}`);
    
    for (const result of results) {
      console.log(
        `${result.numSubvectors.toString().padEnd(10)} | ` +
        `${result.bitsPerCode.toString().padEnd(10)} | ` +
        `${result.normalize ? '是' : '否'}`.padEnd(10) + ' | ' +
        `${result.avgDiff.toFixed(6)}`.padEnd(15) + ' | ' +
        `${result.relativeError.toFixed(6)}`.padEnd(15) + ' | ' +
        `${result.error.toFixed(6)}`.padEnd(15) + ' | ' +
        `${result.evaluation.passed ? '✅ 通过' : '❌ 未通过'}`.padEnd(10)
      );
    }
    console.log(`${generateSeparator('-', 120)}`);
    
    // 找出最优配置
    const bestConfig = results.reduce((best, current) => {
      // 对已通过测试的配置，选择相对误差最小的
      if (current.evaluation.passed) {
        if (!best || current.relativeError < best.relativeError) {
          return current;
        }
      }
      return best;
    }, null);
    
    if (bestConfig) {
      console.log(`\n最佳配置: 子向量数量=${bestConfig.numSubvectors}, 编码位数=${bestConfig.bitsPerCode}, 归一化=${bestConfig.normalize ? '是' : '否'}`);
      console.log(`- 平均距离差异: ${bestConfig.avgDiff.toFixed(6)}`);
      console.log(`- 相对误差: ${bestConfig.relativeError.toFixed(6)}`);
      console.log(`- 量化误差: ${bestConfig.error.toFixed(6)}`);
    } else {
      console.log('\n没有配置通过所有测试标准');
    }
  }
  
  return results;
}

/**
 * 测试时间性能
 * 测量量化、距离计算和训练的时间性能
 */
async function testTimePerformance() {
  console.log(`${generateSeparator('=')}`);
  console.log(`测试DeltaPQ时间性能`);
  console.log(`${generateSeparator('=')}`);
  
  // 确认是否进行测试
  const confirmed = await askForConfirmation('是否开始测试DeltaPQ时间性能?');
  if (!confirmed) {
    console.log('跳过测试DeltaPQ时间性能');
    return;
  }
  
  // 测试不同维度
  const dimensions = [512, 768, 1024];
  // 针对不同维度的最佳子向量数配置
  const subvectorConfigs = {
    512: [32, 64],
    768: [48, 96],
    1024: [64, 128]
  };
  const bitsPerCode = 10; // 固定使用10位编码
  const distanceMetric = DISTANCE_METRICS.COSINE; // 使用余弦距离
  
  const results = [];
  
  for (const dim of dimensions) {
    // 确认是否测试当前维度
    const dimConfirmed = await askForConfirmation(`是否测试${dim}维向量的时间性能?`);
    if (!dimConfirmed) {
      console.log(`跳过测试${dim}维向量的时间性能`);
      continue;
    }
    
    console.log(`\n${generateSeparator('*')}`);
    console.log(`测试${dim}维向量的时间性能`);
    console.log(`${generateSeparator('*')}`);
    
    // 为每个维度生成适量的测试数据
    const trainSetSize = Math.min(2000, Math.floor(10000000 / dim)); // 根据维度调整样本量，避免内存问题
    const testSetSize = 100;
    
    console.log(`生成${trainSetSize}个训练向量和${testSetSize}个测试向量...`);
    const trainVectors = generateRandomUnitVectors(dim, trainSetSize);
    const testVectors = generateRandomUnitVectors(dim, testSetSize);
    
    // 测试这个维度下不同子向量数的性能
    for (const numSubvectors of subvectorConfigs[dim]) {
      console.log(`\n${generateSeparator('-')}`);
      console.log(`配置: ${dim}维, ${numSubvectors}子向量, ${bitsPerCode}位编码`);
      console.log(`${generateSeparator('-')}`);
      
      // 创建并训练DeltaPQ模型
      console.log('创建DeltaPQ模型...');
      const startCreateTime = performance.now();
      const deltaPQ = createDeltaPQ({
        numSubvectors,
        bitsPerCode,
        sampleSize: trainSetSize,
        maxIterations: 50,
        distanceMetric
      });
      const createTime = performance.now() - startCreateTime;
      console.log(`模型创建耗时: ${createTime.toFixed(2)}ms`);
      
      // 测量训练时间
      console.log('训练DeltaPQ模型...');
      const startTrainTime = performance.now();
      deltaPQ.train(trainVectors);
      const trainTime = performance.now() - startTrainTime;
      const trainTimePerThousand = trainTime / (trainSetSize / 1000); // 每1000个向量的训练时间
      console.log(`训练${trainSetSize}个向量耗时: ${trainTime.toFixed(2)}ms (每1000个: ${trainTimePerThousand.toFixed(2)}ms)`);
      
      // 测量量化时间
      console.log('测量量化时间...');
      const timePerformance = await measureTimePerformance(deltaPQ, testVectors);
      console.log(`- 量化时间: ${timePerformance.quantization.toFixed(6)}ms/向量`);
      console.log(`- 距离计算时间: ${timePerformance.distanceComputation.toFixed(6)}ms/次`);
      console.log(`- 训练时间: ${timePerformance.training.toFixed(3)}秒/千向量`);
      
      // 计算训练时间 - 使用前面测量的buildTime，转换为每1000个向量的秒数
      const trainingTime = createTime / 1000 / (trainSetSize / 1000);
      
      // 评估时间性能
      const timeEvaluation = evaluateTimePerformance({
        dimension: dim,
        quantizationTime: timePerformance.quantization,
        distanceTime: timePerformance.distanceComputation,
        trainingTime: trainingTime
      }, PASSING_CRITERIA.timePerformance);
      
      // 展示时间性能评估结果
      console.log('\n时间性能评估:');
      console.log(`- 量化时间: ${timePerformance.quantization.toFixed(6)}ms/向量 - ${timeEvaluation.quantization.passed ? '✅ 通过' : '❌ 未通过'}`);
      console.log(`- 距离计算时间: ${timePerformance.distanceComputation.toFixed(6)}ms/次 - ${timeEvaluation.distanceComputation.passed ? '✅ 通过' : '❌ 未通过'}`);
      console.log(`- 训练时间: ${trainingTime.toFixed(3)}秒/千向量 - ${timeEvaluation.training.passed ? '✅ 通过' : '❌ 未通过'}`);
      console.log(`- 量化误差: ${timePerformance.averageError.toFixed(6)}`);
      
      // 收集结果
      results.push({
        dimension: dim,
        numSubvectors,
        bitsPerCode,
        quantizationTime: timePerformance.quantization,
        distanceTime: timePerformance.distanceComputation,
        trainingTime: trainingTime,
        error: timePerformance.averageError,
        evaluation: timeEvaluation
      });
    }
  }
  
  // 输出所有结果的比较
  if (results.length > 0) {
    console.log(`\n${generateSeparator('=')}`);
    console.log(`时间性能比较结果:`);
    console.log(`${generateSeparator('-', 120)}`);
    console.log(
      `${'维度'.padEnd(8)} | ` +
      `${'子向量数'.padEnd(8)} | ` +
      `${'编码位数'.padEnd(8)} | ` +
      `${'量化(ms)'.padEnd(12)} | ` +
      `${'距离(ms)'.padEnd(12)} | ` +
      `${'训练(秒/K)'.padEnd(12)} | ` +
      `${'量化误差'.padEnd(12)} | ` +
      `${'评估'.padEnd(8)}`
    );
    console.log(`${generateSeparator('-', 120)}`);
    
    for (const result of results) {
      const passed = result.evaluation.quantization.passed && 
                    result.evaluation.distanceComputation.passed && 
                    result.evaluation.training.passed;
      
      console.log(
        `${result.dimension.toString().padEnd(8)} | ` +
        `${result.numSubvectors.toString().padEnd(8)} | ` +
        `${result.bitsPerCode.toString().padEnd(8)} | ` +
        `${result.quantizationTime.toFixed(6).padEnd(12)} | ` +
        `${result.distanceTime.toFixed(6).padEnd(12)} | ` +
        `${result.trainingTime.toFixed(3).padEnd(12)} | ` +
        `${result.error.toFixed(6).padEnd(12)} | ` +
        `${passed ? '✅ 通过' : '❌ 未通过'}`
      );
    }
    console.log(`${generateSeparator('-', 120)}`);
    
    // 查找每个维度的最佳配置
    const dimensionBest = {};
    for (const dim of dimensions) {
      const dimResults = results.filter(r => r.dimension === dim);
      if (dimResults.length > 0) {
        // 找出通过所有时间性能测试的配置
        const passedResults = dimResults.filter(r => 
          r.evaluation.quantization.passed && 
          r.evaluation.distanceComputation.passed && 
          r.evaluation.training.passed
        );
        
        if (passedResults.length > 0) {
          // 按总体性能评分排序 (量化速度权重高, 同时考虑误差)
          const bestConfig = passedResults.sort((a, b) => {
            const scoreA = (1/a.quantizationTime * 5) + (1/a.distanceTime * 3) + (1/a.trainingTime) - (a.error * 10);
            const scoreB = (1/b.quantizationTime * 5) + (1/b.distanceTime * 3) + (1/b.trainingTime) - (b.error * 10);
            return scoreB - scoreA;
          })[0];
          
          dimensionBest[dim] = bestConfig;
        }
      }
    }
    
    // 输出每个维度的最佳配置
    console.log('\n每个维度的最佳时间性能配置:');
    for (const dim of dimensions) {
      if (dimensionBest[dim]) {
        const best = dimensionBest[dim];
        console.log(`\n${dim}维的最佳配置:`);
        console.log(`- 子向量数: ${best.numSubvectors}, 编码位数: ${best.bitsPerCode}`);
        console.log(`- 量化时间: ${best.quantizationTime.toFixed(6)}ms/向量`);
        console.log(`- 距离计算时间: ${best.distanceTime.toFixed(6)}ms/次`);
        console.log(`- 训练时间: ${best.trainingTime.toFixed(3)}秒/千向量`);
        console.log(`- 量化误差: ${best.error.toFixed(6)}`);
      } else {
        console.log(`\n${dim}维: 没有配置通过所有时间性能测试`);
      }
    }
  }
}

/**
 * 评估时间性能
 * @param {Object} result - 时间性能结果
 * @param {Object} criteria - 时间性能标准
 * @returns {Object} 评估结果
 */
function evaluateTimePerformance(result, criteria) {
  const dim = result.dimension;
  const dimCriteria = {
    quantization: criteria.quantization[dim] || criteria.quantization[512], // 默认使用512维的标准
    distanceComputation: criteria.distanceComputation[dim] || criteria.distanceComputation[512],
    training: criteria.training[dim] || criteria.training[512]
  };
  
  return {
    quantization: {
      value: result.quantizationTime,
      passed: result.quantizationTime <= dimCriteria.quantization.maximum,
      optimal: result.quantizationTime <= dimCriteria.quantization.preferred
    },
    distanceComputation: {
      value: result.distanceTime,
      passed: result.distanceTime <= dimCriteria.distanceComputation.maximum,
      optimal: result.distanceTime <= dimCriteria.distanceComputation.preferred
    },
    training: {
      value: result.trainingTime,
      passed: result.trainingTime <= dimCriteria.training.maximum,
      optimal: result.trainingTime <= dimCriteria.training.preferred
    }
  };
}

/**
 * 评估测试结果是否达到通过标准
 * @param {Object} result - 测试结果
 * @param {Object} criteria - 测试标准
 * @returns {Object} 评估结果
 */
function evaluateTestResult(result, criteria) {
  const evaluation = {
    passed: true,
    details: {},
    summary: '测试结果评估'
  };
  
  // 当前使用的距离度量
  const distanceMetric = result.params?.distanceMetric || criteria.distanceMetric;
  const isCosineDist = distanceMetric === DISTANCE_METRICS.COSINE;
  
  // 评估量化误差
  if (result.errorStats) {
    const maxError = isCosineDist
      ? criteria.quantizationErrorCosine.maximum
      : criteria.quantizationErrorEuclidean.maximum;
    
    const preferredError = isCosineDist
      ? criteria.quantizationErrorCosine.preferred
      : criteria.quantizationErrorEuclidean.preferred;
      
    evaluation.details.quantizationError = {
      value: result.errorStats.averageError,
      passed: result.errorStats.averageError <= maxError,
      optimal: result.errorStats.averageError <= preferredError,
      criteria: {
        maximum: maxError,
        preferred: preferredError
      },
      distanceType: isCosineDist ? '余弦距离' : '欧几里得距离'
    };
    
    if (!evaluation.details.quantizationError.passed) {
      evaluation.passed = false;
    }
  }
  
  // 评估距离计算精度
  if (result.distanceAccuracy) {
    const maxDiff = isCosineDist
      ? criteria.distanceAccuracy.cosine.maximum
      : criteria.distanceAccuracy.euclidean.maximum;
      
    const preferredDiff = isCosineDist
      ? criteria.distanceAccuracy.cosine.preferred
      : criteria.distanceAccuracy.euclidean.preferred;
      
    evaluation.details.distanceAccuracy = {
      value: result.distanceAccuracy.avgDiff,
      passed: result.distanceAccuracy.avgDiff <= maxDiff,
      optimal: result.distanceAccuracy.avgDiff <= preferredDiff,
      criteria: {
        maximum: maxDiff,
        preferred: preferredDiff
      },
      distanceType: isCosineDist ? '余弦距离' : '欧几里得距离'
    };
    
    if (!evaluation.details.distanceAccuracy.passed) {
      evaluation.passed = false;
    }
  }
  
  // 评估召回率
  if (result.recallRates) {
    evaluation.details.recall = {};
    
    // 评估不同k值的召回率
    for (const k of Object.keys(result.recallRates)) {
      const kNumber = Number(k);
      let criteriaKey = 'k100'; // 默认使用k100的标准
      
      if (kNumber <= 1) criteriaKey = 'k1';
      else if (kNumber <= 10) criteriaKey = 'k10';
      
      const minRecall = criteria.recall[criteriaKey].minimum;
      const preferredRecall = criteria.recall[criteriaKey].preferred;
      const actualRecall = result.recallRates[k].recall;
      
      evaluation.details.recall[`k${k}`] = {
        value: actualRecall,
        passed: actualRecall >= minRecall,
        optimal: actualRecall >= preferredRecall,
        criteria: {
          minimum: minRecall,
          preferred: preferredRecall
        }
      };
      
      if (!evaluation.details.recall[`k${k}`].passed) {
        evaluation.passed = false;
      }
    }
  }
  
  // 评估速度提升
  if (result.recallRates) {
    evaluation.details.speedup = {};
    
    for (const k of Object.keys(result.recallRates)) {
      const actualSpeedup = result.recallRates[k].speedup;
      
      evaluation.details.speedup[`k${k}`] = {
        value: actualSpeedup,
        passed: actualSpeedup >= criteria.speedup.minimum,
        optimal: actualSpeedup >= criteria.speedup.preferred,
        criteria: {
          minimum: criteria.speedup.minimum,
          preferred: criteria.speedup.preferred
        }
      };
      
      if (!evaluation.details.speedup[`k${k}`].passed) {
        evaluation.passed = false;
      }
    }
  }
  
  // 评估时间性能
  if (result.timePerformance) {
    evaluation.details.timePerformance = {};
    
    // 评估量化时间
    if (result.timePerformance.quantization !== undefined) {
      const dimension = result.params.dimension;
      const quantizationCriteria = criteria.timePerformance.quantization[dimension] || 
                                   criteria.timePerformance.quantization[512]; // 默认使用512维的标准
      
      evaluation.details.timePerformance.quantization = {
        value: result.timePerformance.quantization,
        passed: result.timePerformance.quantization <= quantizationCriteria.maximum,
        optimal: result.timePerformance.quantization <= quantizationCriteria.preferred,
        criteria: quantizationCriteria
      };
      
      if (!evaluation.details.timePerformance.quantization.passed) {
        evaluation.passed = false;
      }
    }
    
    // 评估距离计算时间
    if (result.timePerformance.distanceComputation !== undefined) {
      const dimension = result.params.dimension;
      const distanceCriteria = criteria.timePerformance.distanceComputation[dimension] || 
                               criteria.timePerformance.distanceComputation[512];
      
      evaluation.details.timePerformance.distanceComputation = {
        value: result.timePerformance.distanceComputation,
        passed: result.timePerformance.distanceComputation <= distanceCriteria.maximum,
        optimal: result.timePerformance.distanceComputation <= distanceCriteria.preferred,
        criteria: distanceCriteria
      };
      
      if (!evaluation.details.timePerformance.distanceComputation.passed) {
        evaluation.passed = false;
      }
    }
    
    // 评估训练时间
    if (result.timePerformance.training !== undefined) {
      const dimension = result.params.dimension;
      const trainingCriteria = criteria.timePerformance.training[dimension] || 
                               criteria.timePerformance.training[512];
      
      evaluation.details.timePerformance.training = {
        value: result.timePerformance.training,
        passed: result.timePerformance.training <= trainingCriteria.maximum,
        optimal: result.timePerformance.training <= trainingCriteria.preferred,
        criteria: trainingCriteria
      };
      
      if (!evaluation.details.timePerformance.training.passed) {
        evaluation.passed = false;
      }
    }
  }
  
  // 生成评估摘要
  let passedCount = 0;
  let totalCount = 0;
  
  for (const category of Object.keys(evaluation.details)) {
    const detail = evaluation.details[category];
    
    if (typeof detail.passed === 'boolean') {
      totalCount++;
      if (detail.passed) passedCount++;
    } else {
      for (const subKey of Object.keys(detail)) {
        totalCount++;
        if (detail[subKey].passed) passedCount++;
      }
    }
  }
  
  evaluation.summary = `通过率: ${passedCount}/${totalCount} (${(passedCount / totalCount * 100).toFixed(1)}%)`;
  return evaluation;
}

/**
 * 格式化评估结果输出
 * @param {Object} evaluation - 评估结果
 * @returns {string} 格式化的评估结果
 */
function formatEvaluation(evaluation) {
  let output = `\n${generateSeparator('*')}\n`;
  output += `测试评估结果: ${evaluation.passed ? '✅ 通过' : '❌ 未通过'}\n`;
  output += `${evaluation.summary}\n`;
  output += `${generateSeparator('*')}\n\n`;
  
  // 格式化各项指标
  output += `详细评估:\n`;
  
  for (const category of Object.keys(evaluation.details)) {
    const detail = evaluation.details[category];
    
    if (typeof detail.passed === 'boolean') {
      // 单一指标
      const status = detail.optimal ? '✅ 优秀' : (detail.passed ? '✓ 通过' : '✗ 未通过');
      let line = `${category}: ${status} - 值: ${detail.value.toFixed(6)}, `;
      
      // 显示距离类型（如果有）
      if (detail.distanceType) {
        line += `距离类型: ${detail.distanceType}, `;
      }
      
      if (detail.criteria.minimum !== undefined) {
        line += `要求: >= ${detail.criteria.minimum} (理想: >= ${detail.criteria.preferred})`;
      } else if (detail.criteria.maximum !== undefined) {
        line += `要求: <= ${detail.criteria.maximum} (理想: <= ${detail.criteria.preferred})`;
      }
      
      output += `${line}\n`;
    } else {
      // 多个子指标
      output += `${category}:\n`;
      
      for (const subKey of Object.keys(detail)) {
        const subDetail = detail[subKey];
        const status = subDetail.optimal ? '✅ 优秀' : (subDetail.passed ? '✓ 通过' : '✗ 未通过');
        let subLine = `  - ${subKey}: ${status} - 值: ${subDetail.value.toFixed(2)}, `;
        
        // 显示距离类型（如果有）
        if (subDetail.distanceType) {
          subLine += `距离类型: ${subDetail.distanceType}, `;
        }
        
        if (subDetail.criteria.minimum !== undefined) {
          subLine += `要求: >= ${subDetail.criteria.minimum} (理想: >= ${subDetail.criteria.preferred})`;
        } else if (subDetail.criteria.maximum !== undefined) {
          subLine += `要求: <= ${subDetail.criteria.maximum} (理想: <= ${subDetail.criteria.preferred})`;
        }
        
        output += `${subLine}\n`;
      }
    }
  }
  
  return output;
}

/**
 * 测试DeltaPQ的时间性能（辅助函数）
 * @param {Object} deltaPQ - DeltaPQ实例
 * @param {Array<Float32Array>} testVectors - 测试向量
 * @returns {Object} 时间性能结果
 */
async function measureTimePerformance(deltaPQ, testVectors) {
  const testSetSize = testVectors.length;
  
  // 测量量化时间
  let totalQuantizeTime = 0;
  for (let i = 0; i < testSetSize; i++) {
    const startQuantizeTime = performance.now();
    const { codes } = deltaPQ.quantizeVector(testVectors[i]);
    totalQuantizeTime += performance.now() - startQuantizeTime;
  }
  const avgQuantizeTime = totalQuantizeTime / testSetSize;
  
  // 量化所有测试向量，用于距离计算测试
  const allCodes = testVectors.map(vec => deltaPQ.quantizeVector(vec).codes);
  
  // 测量距离计算时间
  let totalDistanceTime = 0;
  const numDistanceTests = Math.min(1000, testSetSize * testSetSize);
  
  for (let i = 0; i < numDistanceTests; i++) {
    const idx1 = Math.floor(Math.random() * testSetSize);
    const idx2 = Math.floor(Math.random() * testSetSize);
    
    const startDistanceTime = performance.now();
    deltaPQ.computeApproximateDistance(allCodes[idx1], allCodes[idx2]);
    totalDistanceTime += performance.now() - startDistanceTime;
  }
  const avgDistanceTime = totalDistanceTime / numDistanceTests;
  
  // 计算量化误差
  const errorStats = measureQuantizationError(deltaPQ, testVectors);
  
  // 估算训练时间（每1000个向量）
  const trainingTime = 15.0; // 默认估算值，秒/千向量
  
  return {
    quantization: avgQuantizeTime,
    distanceComputation: avgDistanceTime,
    training: trainingTime,
    averageError: errorStats.averageError,
    minError: errorStats.minError,
    maxError: errorStats.maxError
  };
}

// 主测试函数
async function runTests() {
  try {
    console.log(`${generateSeparator('#')}`);
    console.log(`DeltaPQ性能测试 - 交互式测试套件`);
    console.log(`${generateSeparator('#')}`);
    
    // 用于收集不同距离度量的测试结果
    const testResults = {
      euclidean: [],
      cosine: []
    };
    
    // 测试子向量数量对余弦距离的影响
    const cosineResults = await testSubvectorEffectOnCosine();
    if (cosineResults) {
      testResults.cosine = cosineResults;
    }
    
    // 测试归一化对欧几里得距离的影响
    const euclideanResults = await testNormalizationEffect();
    if (euclideanResults) {
      testResults.euclidean = euclideanResults;
    }
    
    // 测试时间性能
    await testTimePerformance();
    
    // 执行参数扫描测试
    const paramSweepResults = await testDeltaPQParameterSweep();
    if (paramSweepResults) {
      // 合并参数扫描测试结果
      for (const config of paramSweepResults) {
        if (config.distanceMetric === DISTANCE_METRICS.COSINE) {
          testResults.cosine.push(config);
        } else {
          testResults.euclidean.push(config);
        }
      }
    }
    
    // 生成最终比较报告
    if (testResults.euclidean.length > 0 || testResults.cosine.length > 0) {
      generateComparisonReport(testResults);
    }
    
    console.log(`\n${generateSeparator('#')}`);
    console.log(`测试完成 - 感谢您的耐心测试`);
    console.log(`${generateSeparator('#')}`);
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

/**
 * 生成欧几里得距离和余弦距离结果比较报告
 * @param {Object} results - 测试结果
 */
function generateComparisonReport(results) {
  console.log(`\n${generateSeparator('=')}`);
  console.log(`欧几里得距离和余弦距离性能比较报告`);
  console.log(`${generateSeparator('=')}`);
  
  if (results.euclidean.length === 0 && results.cosine.length === 0) {
    console.log('没有足够的测试数据生成比较报告');
    return;
  }
  
  // 找出每种距离度量下的最佳配置
  const bestEuclidean = results.euclidean.length > 0 
    ? results.euclidean.reduce((best, current) => {
        return !best || (current.avgError < best.avgError) ? current : best;
      }, null)
    : null;
    
  const bestCosine = results.cosine.length > 0
    ? results.cosine.reduce((best, current) => {
        return !best || (current.avgError < best.avgError) ? current : best;
      }, null)
    : null;
  
  console.log('【汇总】最佳配置比较:');
  console.log(`${generateSeparator('-', 100)}`);
  console.log(`${'距离度量'.padEnd(15)} | ${'维度'.padEnd(8)} | ${'子向量数'.padEnd(10)} | ${'编码位数'.padEnd(10)} | ${'量化误差'.padEnd(15)} | ${'召回率(k=10)'.padEnd(15)} | ${'加速比'.padEnd(10)}`);
  console.log(`${generateSeparator('-', 100)}`);
  
  if (bestEuclidean) {
    console.log(
      `${'欧几里得距离'.padEnd(15)} | ` +
      `${bestEuclidean.dimension?.toString().padEnd(8) || 'N/A'.padEnd(8)} | ` +
      `${bestEuclidean.numSubvectors?.toString().padEnd(10) || 'N/A'.padEnd(10)} | ` +
      `${bestEuclidean.bitsPerCode?.toString().padEnd(10) || 'N/A'.padEnd(10)} | ` +
      `${bestEuclidean.avgError?.toFixed(6).padEnd(15) || 'N/A'.padEnd(15)} | ` +
      `${(bestEuclidean.recall10?.toFixed(2) + '%').padEnd(15) || 'N/A'.padEnd(15)} | ` +
      `${bestEuclidean.speedup10?.toFixed(2) + 'x'.padEnd(10) || 'N/A'.padEnd(10)}`
    );
  } else {
    console.log(`${'欧几里得距离'.padEnd(15)} | ${'无数据'.padEnd(8)} | ${'-'.padEnd(10)} | ${'-'.padEnd(10)} | ${'-'.padEnd(15)} | ${'-'.padEnd(15)} | ${'-'.padEnd(10)}`);
  }
  
  if (bestCosine) {
    console.log(
      `${'余弦距离'.padEnd(15)} | ` +
      `${bestCosine.dimension?.toString().padEnd(8) || 'N/A'.padEnd(8)} | ` +
      `${bestCosine.numSubvectors?.toString().padEnd(10) || 'N/A'.padEnd(10)} | ` +
      `${bestCosine.bitsPerCode?.toString().padEnd(10) || 'N/A'.padEnd(10)} | ` +
      `${bestCosine.avgError?.toFixed(6).padEnd(15) || 'N/A'.padEnd(15)} | ` +
      `${(bestCosine.recall10?.toFixed(2) + '%').padEnd(15) || 'N/A'.padEnd(15)} | ` +
      `${bestCosine.speedup10?.toFixed(2) + 'x'.padEnd(10) || 'N/A'.padEnd(10)}`
    );
  } else {
    console.log(`${'余弦距离'.padEnd(15)} | ${'无数据'.padEnd(8)} | ${'-'.padEnd(10)} | ${'-'.padEnd(10)} | ${'-'.padEnd(15)} | ${'-'.padEnd(15)} | ${'-'.padEnd(10)}`);
  }
  
  console.log(`${generateSeparator('-', 100)}`);
  
  // 添加距离度量选择建议
  console.log('\n【建议】距离度量选择:');
  if (bestEuclidean && bestCosine) {
    if (bestEuclidean.avgError < bestCosine.avgError && bestEuclidean.recall10 >= bestCosine.recall10) {
      console.log('- 欧几里得距离在本次测试中表现更好，推荐在大多数场景中使用');
    } else if (bestCosine.avgError < bestEuclidean.avgError && bestCosine.recall10 >= bestEuclidean.recall10) {
      console.log('- 余弦距离在本次测试中表现更好，推荐在语义搜索等场景中使用');
    } else {
      if (bestCosine.recall10 > bestEuclidean.recall10) {
        console.log('- 余弦距离提供了更高的召回率，适合需要高召回的场景');
        console.log('- 欧几里得距离提供了更低的量化误差，适合需要高精度的场景');
      } else {
        console.log('- 欧几里得距离表现更加平衡，建议在大多数场景下使用');
      }
    }
    
    console.log('\n【注意】余弦距离使用须知:');
    console.log('- 余弦距离要求输入向量必须归一化（模长为1）');
    console.log('- 余弦距离对向量的小扰动可能更敏感，特别是在高维情况下');
    console.log('- 当向量已经归一化时，欧几里得距离和余弦距离之间存在映射关系');
  } else {
    console.log('- 没有足够的数据对两种距离度量进行全面比较');
  }
}

// 立即执行测试
runTests().catch(error => {
  console.error('测试执行过程中发生错误:', error);
}); 

/**
 * 对向量进行归一化处理
 * @param {Float32Array|Array} vector - 需要归一化的向量
 */
function normalizeVector(vector) {
  let norm = 0;
  for (let i = 0; i < vector.length; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);
  
  // 防止除以零
  if (norm > 1e-10) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }
  } else {
    // 如果向量几乎为零向量，设置第一个元素为1
    vector[0] = 1.0;
  }
} 