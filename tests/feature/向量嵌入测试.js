/**
 * 向量嵌入功能测试
 * 测试向量嵌入和相似度计算功能
 */

// 从toolBox导入向量嵌入相关功能
import { 生成向量嵌入, 计算向量相似度, 构建向量索引 } from '../../src/toolBox/feature/forVector/向量嵌入.js';
import { 查找最相似向量 } from '../../src/toolBox/feature/forVectorEmbedding/forSimilarity.js';
import { 生成查询向量 } from '../../src/toolBox/feature/forVectorEmbedding/forQuery.js';
import { 创建HNSW索引 } from '../../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/useCustomedHNSW.js';

/**
 * 向量相似度计算测试
 */
function 测试向量相似度计算() {
  console.log('---- 测试向量相似度计算 ----');
  
  // 测试余弦相似度
  const 向量1 = [1, 0, 0, 0];
  const 向量2 = [0, 1, 0, 0];
  const 向量3 = [1, 1, 0, 0];
  
  const 相似度1_2 = 计算向量相似度(向量1, 向量2);
  const 相似度1_3 = 计算向量相似度(向量1, 向量3);
  const 相似度2_3 = 计算向量相似度(向量2, 向量3);
  
  // 正交向量相似度应为0
  console.log('正交向量相似度为0:', Math.abs(相似度1_2) < 0.001 ? '通过' : '失败');
  
  // 相似度比较
  console.log('相似度比较关系:', 相似度1_3 > 相似度1_2 && 相似度2_3 > 相似度1_2 ? '通过' : '失败');
  
  // 自身相似度应为1
  const 自身相似度 = 计算向量相似度(向量1, 向量1);
  console.log('向量与自身相似度为1:', Math.abs(自身相似度 - 1) < 0.001 ? '通过' : '失败');
}

/**
 * 测试相似向量查找
 */
function 测试相似向量查找() {
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
  const 最相似结果 = 查找最相似向量(查询向量, 向量库.map(item => item.vector), 2);
  
  // 验证结果
  console.log('查找最相似向量数量正确:', 最相似结果.length === 2 ? '通过' : '失败');
  console.log('最相似结果第一项正确:', 最相似结果[0].index === 0 ? '通过' : '失败');  // 向量库中索引0对应id=1
  console.log('最相似结果第二项正确:', 最相似结果[1].index === 3 ? '通过' : '失败');  // 向量库中索引3对应id=4
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
  const hnsw索引 = 创建HNSW索引(测试向量库.map(item => item.vector), {
    M: 8,         // 每个节点的最大连接数
    efConstruction: 64,  // 构建时的搜索深度
    efSearch: 20  // 搜索时的搜索深度
  });
  
  // 使用HNSW索引查找最相似向量
  const 索引查询结果 = hnsw索引.searchKNN(目标向量, 3);
  
  // 验证HNSW索引的查询结果
  console.log('HNSW索引查询结果数量正确:', 索引查询结果.length === 3 ? '通过' : '失败');
  console.log('HNSW索引查询最相似项正确:', 索引查询结果[0].arrayIndex === 0 ? '通过' : '失败');
}

/**
 * 模拟测试生成查询向量
 */
function 测试查询向量生成() {
  console.log('\n---- 测试查询向量生成 ----');
  
  // 模拟查询文本
  const 查询文本 = "测试查询文本";
  
  // 由于实际生成embedding需要外部服务，这里只模拟测试API调用
  try {
    const 模拟生成向量 = 生成查询向量;
    console.log('查询向量生成函数存在:', typeof 模拟生成向量 === 'function' ? '通过' : '失败');
    console.log('注: 实际向量生成需要外部API服务，此处仅测试函数接口');
  } catch (e) {
    console.log('测试查询向量生成:', '失败', e.message);
  }
}

/**
 * 运行所有测试
 */
async function 运行测试() {
  console.log('======== 向量嵌入功能测试 ========\n');
  
  测试向量相似度计算();
  测试相似向量查找();
  await 测试HNSW索引();
  测试查询向量生成();
  
  console.log('\n======== 测试完成 ========');
}

// 导出运行测试函数
export { 运行测试 }; 