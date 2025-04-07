/**
 * HNSW索引实现比较测试入口文件
 * 用于运行拆分后的HNSW测试模块
 * 
 * 修改说明:
 * 1. 添加了经典算法实现参与对比测试
 * 2. 仍保留原有的调试支持和参数配置
 */

import { runTests } from './hnswlayers对比测试/index.mjs';
import { HNSWIndex, createHNSWParams, Node, Metric } from '../../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/hnswClassic.js';

console.log('启动HNSW索引实现测试...');

// 添加经典HNSW实现到全局环境，使测试套件能够访问
global.HNSWClassic = {
  HNSWIndex,
  createHNSWParams,
  Node,
  Metric
};

// 运行测试，使用自定义测试参数
runTests({
  dimensions: 512,          // 降低维度，加快测试
  numQueries: 100,          // 减少查询次数，加快测试
  k: 10,                    // 查询返回的邻居数量
  minRecallRate: 70,        // 降低最小可接受召回率
  maxVectorCount: 100,     // 降低最大测试向量数量
  startVectorCount: 100,   // 起始测试向量数量
  hnswParams: {
    M: 12,                  // 每个节点的最大连接数
    efConstruction: 200,    // 构建索引时的ef值
    efSearch: 100,          // 搜索时的ef值
    ml: 6                   // 最大层数
  },
  skipClassicImplementation: false, // 启用经典算法对比
  useClassicFromModule: true,     // 使用我们导入的经典实现
  debug: true               // 启用详细调试输出
}).catch(error => {
  console.error('测试执行失败:', error);
});
