// 填充向量测试 - 验证填充向量被正确过滤
import { createCombinedDeltaPQHNSW } from '../../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/useCombinedDeltaPQHNSW.js';

/**
 * 生成随机向量
 * @param {number} dim - 向量维度
 * @returns {Float32Array} - 随机向量
 */
function generateRandomVector(dim) {
  const vector = new Float32Array(dim);
  for (let i = 0; i < dim; i++) {
    vector[i] = Math.random() * 2 - 1; // 范围 [-1, 1]
  }
  return vector;
}

/**
 * 测试填充向量过滤功能
 */
function testFillerVectorFiltering() {
  console.log('---- 测试填充向量过滤 ----');
  
  // 1. 创建测试数据
  console.log('1. 创建测试数据...');
  const dimensions = 64;
  const testData = [];
  
  for (let i = 0; i < 100; i++) {
    testData.push({
      id: i,
      vector: generateRandomVector(dimensions)
    });
  }
  console.log(`创建了 ${testData.length} 个测试向量，维度 ${dimensions}`);
  
  // 2. 创建包含填充向量的索引
  console.log('2. 创建索引（包含填充向量）...');
  const index = createCombinedDeltaPQHNSW({
    numSubvectors: 8,
    bitsPerCode: 8,
    M: 16,
    efConstruction: 100,
    efSearch: 100,
    randomFillCount: 50  // 使用50个填充向量
  });
  
  // 3. 训练索引
  console.log('3. 训练索引...');
  const vectors = testData.map(item => item.vector);
  const trainResult = index.train(vectors);
  console.log('训练结果:', trainResult);
  
  // 4. 添加向量
  console.log('4. 添加向量...');
  for (let i = 0; i < testData.length; i++) {
    const id = index.addVector(testData[i].vector, testData[i].id);
    if (i < 5) {
      console.log(`添加向量 ${i}: 内部ID = ${id}`);
    }
  }
  
  // 5. 执行查询，验证填充向量被过滤
  console.log('5. 执行查询测试...');
  const queryVector = testData[0].vector;
  console.log('5.1 不使用详细日志的查询');
  const results1 = index.search(queryVector, 20);
  console.log(`结果数量: ${results1.length}`);
  console.log(`结果ID列表: ${results1.map(r => r.id).join(', ')}`);
  
  console.log('\n5.2 使用详细日志的查询');
  const results2 = index.search(queryVector, 20, { verbose: true });
  console.log(`结果数量: ${results2.length}`);
  console.log(`结果ID列表: ${results2.map(r => r.id).join(', ')}`);
  
  // 6. 检查结果中是否包含填充向量
  console.log('\n6. 检查填充向量过滤情况');
  const hasFillerVector = results2.some(r => r.isFiller === true);
  console.log(`查询结果中${hasFillerVector ? '包含' : '不包含'}填充向量`);
  
  // 7. 检查是否有效ID匹配
  console.log('\n7. 检查有效ID匹配情况');
  const validIds = results2.filter(r => r.id >= 0 && r.id < 100).map(r => r.id);
  console.log(`有效ID数量: ${validIds.length}`);
  console.log(`有效ID列表: ${validIds.join(', ')}`);
  
  console.log('\n测试结束');
}

// 运行测试
testFillerVectorFiltering(); 