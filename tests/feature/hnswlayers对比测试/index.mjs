/**
 * HNSW索引实现比较测试主入口
 * 比较自定义HNSW实现与经典实现以及Hora-WASM库的性能和准确性
 */

import { 安全运行指数级扩展测试, runSingleTest, initTestEnvironment } from './testSuite.mjs';

/**
 * 运行测试
 * @param {Object} options - 测试配置选项
 */
async function runTests(options = {}) {
  console.log('初始化测试环境...');
  try {
    // 初始化环境（加载Hora等）
    const initialized = await initTestEnvironment();
    if (!initialized) {
      console.warn('测试环境初始化失败，部分测试可能无法运行');
    }
    
    // 运行指数级扩展测试
    await 安全运行指数级扩展测试(options);
  } catch (e) {
    // 即使这里出错也不会抛出异常
    console.error('测试运行时发生致命错误:', e);
  } finally {
    console.log('测试过程结束');
  }
}

// 设置默认测试参数
const defaultOptions = {
  dimensions: 768,         // 向量维度
  numQueries: 10,          // 每次测试的查询次数
  k: 10,                   // 查询返回的邻居数量
  modelName: 'test_model', // 模型名称
  minRecallRate: 80,       // 最小可接受召回率(%)
  growthFactor: 2,         // 向量数量增长因子
  maxVectorCount: 4000,    // 最大测试向量数量 
  startVectorCount: 1000,   // 起始测试向量数量
  hnswParams: {
    M: 16,                 // 每个节点的最大连接数
    efConstruction: 200,   // 构建索引时的ef值
    efSearch: 100,         // 搜索时的ef值
    ml: 8                  // 最大层数
  }
};

// 检查是否直接运行此文件
const isDirectlyExecuted = process.argv[1].includes('index.mjs');
if (isDirectlyExecuted) {
  console.log('直接运行测试...');
  runTests(defaultOptions).catch(e => console.error('测试运行失败:', e));
}

// 在浏览器或Node.js环境中都可以正常运行
if (typeof window !== 'undefined') {
  // 浏览器环境
  window.addEventListener('DOMContentLoaded', () => {
    console.log('在浏览器环境中运行测试...');
    runTests(defaultOptions).catch(e => console.error('测试运行失败:', e));
  });
}

// 对外导出测试函数
export { runTests, runSingleTest }; 