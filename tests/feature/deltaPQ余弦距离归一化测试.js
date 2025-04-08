/**
 * DeltaPQ余弦距离归一化测试
 * 
 * 这个测试旨在验证DeltaPQ在余弦距离模式下的向量归一化功能
 * 测试包含以下内容：
 * 1. 检测向量归一化功能
 * 2. 自动归一化功能
 * 3. 量化和反量化时的归一化保持性
 */

import { createDeltaPQ, DISTANCE_METRICS } from '../../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/useCustomedDeltaPQ.js';
import { computeCosineDistance } from '../../src/toolBox/base/forMath/forGeometry/forVectors/forDistance.js';

/**
 * 生成随机向量（非归一化）
 * @param {number} dim - 向量维度
 * @param {number} count - 要生成的向量数量
 * @returns {Array<Float32Array>} 生成的向量数组
 */
function generateRandomVectors(dim, count) {
  const vectors = [];
  for (let i = 0; i < count; i++) {
    const vec = new Float32Array(dim);
    for (let j = 0; j < dim; j++) {
      vec[j] = Math.random() * 2 - 1; // 范围在[-1, 1]之间
    }
    vectors.push(vec);
  }
  return vectors;
}

/**
 * 生成随机单位向量（严格归一化）
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
    
    // 验证归一化
    let normCheck = 0;
    for (let j = 0; j < dim; j++) {
      normCheck += vec[j] * vec[j];
    }
    
    if (Math.abs(normCheck - 1.0) > 1e-6) {
      i--; // 如果归一化失败，重试
      continue;
    }
    
    vectors.push(vec);
  }
  return vectors;
}

/**
 * 检测向量是否归一化
 * @param {Float32Array} vector - 向量
 * @returns {boolean} 是否归一化
 */
function isNormalized(vector) {
  let sumSquared = 0;
  for (let i = 0; i < vector.length; i++) {
    sumSquared += vector[i] * vector[i];
  }
  return Math.abs(sumSquared - 1.0) < 1e-6;
}

/**
 * 显示向量归一化状态
 * @param {Array<Float32Array>} vectors - 向量数组
 * @param {string} label - 标签
 */
function displayNormalizationStatus(vectors, label) {
  let normalizedCount = 0;
  let totalError = 0;
  
  for (let i = 0; i < vectors.length; i++) {
    let sumSquared = 0;
    for (let j = 0; j < vectors[i].length; j++) {
      sumSquared += vectors[i][j] * vectors[i][j];
    }
    
    const error = Math.abs(sumSquared - 1.0);
    totalError += error;
    
    if (error < 1e-6) {
      normalizedCount++;
    }
  }
  
  const avgError = totalError / vectors.length;
  console.log(`${label}:`);
  console.log(`- 归一化比例: ${normalizedCount}/${vectors.length} (${(normalizedCount/vectors.length*100).toFixed(2)}%)`);
  console.log(`- 平均误差: ${avgError.toFixed(8)}`);
  
  // 显示示例向量
  if (vectors.length > 0) {
    let sumSquared = 0;
    for (let j = 0; j < vectors[0].length; j++) {
      sumSquared += vectors[0][j] * vectors[0][j];
    }
    console.log(`- 示例向量模长: ${Math.sqrt(sumSquared).toFixed(8)}`);
  }
}

/**
 * 测试归一化向量的量化和反量化
 */
async function testCosineDeltaPQNormalization() {
  console.log('===== DeltaPQ余弦距离归一化测试 =====\n');
  
  // 测试参数
  const dim = 512;
  const trainSize = 200;
  const testSize = 50;
  const numSubvectors = 32;
  const bitsPerCode = 10;
  
  console.log(`测试参数: 维度=${dim}, 训练集大小=${trainSize}, 测试集大小=${testSize}`);
  console.log(`量化参数: 子向量数=${numSubvectors}, 编码位数=${bitsPerCode}\n`);
  
  // 生成向量
  console.log('生成测试向量...');
  const unitVectors = generateRandomUnitVectors(dim, trainSize);
  const nonUnitVectors = generateRandomVectors(dim, testSize);
  
  // 显示向量归一化状态
  displayNormalizationStatus(unitVectors, '单位向量');
  displayNormalizationStatus(nonUnitVectors, '非单位向量');
  
  console.log('\n1. 测试DeltaPQ余弦距离模式下的自动归一化功能\n');
  
  // 创建余弦距离DeltaPQ
  const cosineDeltaPQ = createDeltaPQ({
    numSubvectors,
    bitsPerCode,
    sampleSize: trainSize,
    maxIterations: 20,
    distanceMetric: DISTANCE_METRICS.COSINE
  });
  
  // 训练模型
  console.log('训练余弦距离DeltaPQ模型...');
  cosineDeltaPQ.train(unitVectors);
  console.log('训练完成\n');
  
  // 测试非归一化向量的量化
  console.log('测试非归一化向量的量化...');
  const quantizedResults = [];
  let successCount = 0;
  
  for (let i = 0; i < nonUnitVectors.length; i++) {
    try {
      const result = cosineDeltaPQ.quantizeVector(nonUnitVectors[i]);
      quantizedResults.push(result);
      successCount++;
    } catch (e) {
      console.error(`向量[${i}]量化失败: ${e.message}`);
    }
  }
  
  console.log(`非归一化向量量化成功率: ${successCount}/${nonUnitVectors.length} (${(successCount/nonUnitVectors.length*100).toFixed(2)}%)\n`);
  
  // 测试反量化结果的归一化状态
  console.log('测试量化和反量化后向量的归一化状态...');
  
  const dequantizedVectors = [];
  for (let i = 0; i < Math.min(successCount, nonUnitVectors.length); i++) {
    const dequantized = cosineDeltaPQ.dequantizeVector(quantizedResults[i].codes);
    dequantizedVectors.push(dequantized);
  }
  
  displayNormalizationStatus(dequantizedVectors, '反量化向量');
  
  // 测试量化误差
  console.log('\n2. 测试余弦距离下的量化误差\n');
  
  let totalOriginalDistance = 0;
  let totalQuantizedDistance = 0;
  let totalDistanceError = 0;
  const distancePairs = Math.min(10, successCount);
  
  for (let i = 0; i < distancePairs; i++) {
    // 选择两个不同的测试向量
    const idx1 = i;
    const idx2 = (i + Math.floor(successCount / 2)) % successCount;
    
    // 原始向量距离
    const originalDist = computeCosineDistance(nonUnitVectors[idx1], nonUnitVectors[idx2]);
    
    // 量化后的向量距离
    const codes1 = quantizedResults[idx1].codes;
    const codes2 = quantizedResults[idx2].codes;
    const quantizedDist = cosineDeltaPQ.computeApproximateDistance(codes1, codes2);
    
    // 计算误差
    const distError = Math.abs(originalDist - quantizedDist);
    
    totalOriginalDistance += originalDist;
    totalQuantizedDistance += quantizedDist;
    totalDistanceError += distError;
    
    console.log(`向量对 ${idx1}-${idx2}: 原始距离=${originalDist.toFixed(6)}, 量化距离=${quantizedDist.toFixed(6)}, 误差=${distError.toFixed(6)}`);
  }
  
  console.log(`\n平均原始距离: ${(totalOriginalDistance / distancePairs).toFixed(6)}`);
  console.log(`平均量化距离: ${(totalQuantizedDistance / distancePairs).toFixed(6)}`);
  console.log(`平均距离误差: ${(totalDistanceError / distancePairs).toFixed(6)}`);
  
  console.log('\n===== 测试完成 =====');
}

// 运行测试
testCosineDeltaPQNormalization().catch(error => {
  console.error('测试过程中发生错误:', error);
}); 