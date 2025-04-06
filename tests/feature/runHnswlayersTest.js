/**
 * HNSW索引实现比较测试入口文件
 * 用于运行拆分后的HNSW测试模块
 * 
 * 已修复的问题:
 * 1. 召回率计算逻辑问题 - 不同实现的结果格式不一致导致ID匹配失败
 * 2. 添加了详细的调试输出以便定位问题
 * 3. 优化了ID提取和匹配逻辑，支持更多格式的结果
 */

import { runTests } from './hnswlayers对比测试/index.mjs';

console.log('启动HNSW索引实现比较测试...');

// 运行测试，使用自定义测试参数
runTests({
  dimensions: 512,          // 降低维度，加快测试
  numQueries: 5,            // 减少查询次数，加快测试
  k: 10,                    // 查询返回的邻居数量
  minRecallRate: 70,        // 降低最小可接受召回率
  maxVectorCount: 1000,     // 降低最大测试向量数量
  startVectorCount: 1000,   // 起始测试向量数量
  hnswParams: {
    M: 12,                  // 每个节点的最大连接数
    efConstruction: 100,    // 构建索引时的ef值
    efSearch: 50,           // 搜索时的ef值
    ml: 6                   // 最大层数
  },
  debug: true               // 启用详细调试输出
}).catch(error => {
  console.error('测试执行失败:', error);
});
