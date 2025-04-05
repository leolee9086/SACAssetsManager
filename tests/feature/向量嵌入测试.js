/**
 * 向量嵌入功能测试
 * 测试向量嵌入和相似度计算功能
 */

import { 计算向量相似度 } from '../../src/toolBox/feature/forVectorEmbedding/forSimilarity.js';
import { 查找最相似点 as 查找最相似向量 } from '../../src/toolBox/feature/forVectorEmbedding/forQuery.js';
import { createHNSWIndex } from '../../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/useCustomedHNSW.js';
import { computeCosineDistance } from '../../src/toolBox/base/forMath/forGeometry/forVectors/forDistance.js';

/**
 * 向量相似度计算测试
 */
function 测试向量相似度计算() {
  console.log('---- 测试向量相似度计算 ----');
  
  // 测试余弦相似度
  const 向量1 = [1, 0, 0, 0];
  const 向量2 = [0, 1, 0, 0];
  const 向量3 = [1, 1, 0, 0];
  
  const 相似度计算函数 = computeCosineDistance;
  const 相似度1_2 = 计算向量相似度(向量1, 向量2, 相似度计算函数);
  const 相似度1_3 = 计算向量相似度(向量1, 向量3, 相似度计算函数);
  const 相似度2_3 = 计算向量相似度(向量2, 向量3, 相似度计算函数);
  
  // 正交向量相似度应为0
  console.log('正交向量相似度为0:', Math.abs(相似度1_2) < 0.001 ? '通过' : '失败');
  
  // 相似度比较
  console.log('相似度比较关系:', 相似度1_3 > 相似度1_2 && 相似度2_3 > 相似度1_2 ? '通过' : '失败');
  
  // 自身相似度应为1
  const 自身相似度 = 计算向量相似度(向量1, 向量1, 相似度计算函数);
  console.log('向量与自身相似度为1:', Math.abs(自身相似度 - 1) < 0.001 ? '通过' : '失败');
}

/**
 * 测试相似向量查找
 */
async function 测试相似向量查找() {
  console.log('\n---- 测试相似向量查找 ----');
  
  // 创建测试向量库
  const 向量库 = [
    { id: 1, vector: [1, 0, 0, 0], text: '向量1' },
    { id: 2, vector: [0, 1, 0, 0], text: '向量2' },
    { id: 3, vector: [0, 0, 1, 0], text: '向量3' },
    { id: 4, vector: [0.9, 0.1, 0, 0], text: '接近向量1' },
    { id: 5, vector: [0.1, 0.9, 0, 0], text: '接近向量2' },
  ];
  
  // 查询向量
  const 查询向量 = [0.95, 0.05, 0, 0];  // 应该最接近id=1和id=4的向量
  
  // 查找最相似向量
  const 最相似结果 = await 查找最相似向量(查询向量, 向量库, 2, computeCosineDistance);
  
  // 验证结果
  console.log('查找最相似向量数量正确:', 最相似结果.length === 2 ? '通过' : '失败');
  console.log('最相似结果:', JSON.stringify(最相似结果));
}

/**
 * 测试HNSW索引创建和查询
 */
async function 测试HNSW索引() {
  console.log('\n---- 测试HNSW索引 ----');
  
  // 创建更多测试向量
  const 向量数量 = 100;
  const 向量维度 = 10;
  const 测试向量库 = [];
  
  for (let i = 0; i < 向量数量; i++) {
    const 向量 = Array(向量维度).fill(0).map(() => Math.random());
    测试向量库.push({
      id: i,
      vector: 向量,
      text: `向量${i}`
    });
  }
  
  // 创建目标向量（与第一个向量非常相似）
  const 目标向量 = [...测试向量库[0].vector];
  目标向量[0] += 0.05;  // 微小变化
  
  // 创建HNSW索引
  const hnsw索引 = createHNSWIndex({
    distanceFunction: 'cosine',
    M: 8,
    efConstruction: 64,
    efSearch: 20
  });
  
  // 添加向量到索引
  console.log('添加向量到索引...');
  for (const item of 测试向量库) {
    hnsw索引.insertNode(item.vector, { id: item.id });
  }
  
  // 使用HNSW索引查找最相似向量
  const 索引查询结果 = hnsw索引.searchKNN(目标向量, 3);
  
  // 验证HNSW索引的查询结果
  console.log('HNSW索引查询结果数量正确:', 索引查询结果.length === 3 ? '通过' : '失败');
  console.log('索引查询结果:', JSON.stringify(索引查询结果));
}

/**
 * 运行所有测试
 */
async function 运行测试() {
  console.log('======== 向量嵌入功能测试 ========\n');
  
  测试向量相似度计算();
  await 测试相似向量查找();
  await 测试HNSW索引();
  
  console.log('\n======== 测试完成 ========');
}

// 导出运行测试函数
export { 运行测试 }; 