/**
 * 向量索引搜索放大策略测试
 * 测试DeltaPQ-HNSW组合索引使用放大策略的性能和召回率
 */

import { createCombinedDeltaPQHNSW } from '../../src/toolBox/feature/forVectorEmbedding/useDeltaPQHNSW/useCombinedDeltaPQHNSW.js';

// 生成随机向量
function 生成随机向量(维度, 数量) {
  const 向量组 = [];
  for (let i = 0; i < 数量; i++) {
    const 向量 = new Float32Array(维度);
    for (let j = 0; j < 维度; j++) {
      向量[j] = Math.random() * 2 - 1; // 生成[-1,1]范围的随机值
    }
    // 向量归一化
    let 范数 = 0;
    for (let j = 0; j < 维度; j++) {
      范数 += 向量[j] * 向量[j];
    }
    范数 = Math.sqrt(范数);
    for (let j = 0; j < 维度; j++) {
      向量[j] /= 范数;
    }
    向量组.push(向量);
  }
  return 向量组;
}

// 计算欧氏距离
function 计算欧氏距离(向量1, 向量2) {
  let 距离 = 0;
  for (let i = 0; i < 向量1.length; i++) {
    const 差值 = 向量1[i] - 向量2[i];
    距离 += 差值 * 差值;
  }
  return Math.sqrt(距离);
}

// 执行线性搜索（暴力搜索）作为对比基准
function 线性搜索(查询向量, 向量库, topK) {
  const 结果 = [];
  
  for (let i = 0; i < 向量库.length; i++) {
    const 距离 = 计算欧氏距离(查询向量, 向量库[i]);
    结果.push({
      id: i,
      distance: 距离
    });
  }
  
  // 按距离排序
  结果.sort((a, b) => a.distance - b.distance);
  
  // 返回前topK个结果
  return 结果.slice(0, topK);
}

// 计算召回率
function 计算召回率(基准结果, 测试结果) {
  const 基准ID集合 = new Set(基准结果.map(r => r.id));
  const 命中数量 = 测试结果.filter(r => 基准ID集合.has(r.id)).length;
  return 命中数量 / 基准结果.length;
}

// 执行测试
export async function 运行测试() {
  console.log('开始测试向量索引搜索放大策略...');
  
  // 测试参数
  const 维度 = 128;
  const 向量数量 = 10000;
  const 查询数量 = 100;
  const topK = 10;
  
  console.log(`测试参数: 维度=${维度}, 向量数量=${向量数量}, 查询数量=${查询数量}, topK=${topK}`);
  
  // 生成向量库和查询集
  console.log('生成测试数据...');
  const 向量库 = 生成随机向量(维度, 向量数量);
  const 查询集 = 生成随机向量(维度, 查询数量);
  
  // 创建索引
  console.log('创建DeltaPQ-HNSW组合索引...');
  const 索引 = createCombinedDeltaPQHNSW({
    numSubvectors: 16,
    bitsPerCode: 8,
    sampleSize: 1000,
    M: 16,
    efConstruction: 200,
    efSearch: 100
  });
  
  // 训练索引
  console.log('训练索引...');
  索引.train(向量库.slice(0, 1000));
  
  // 添加向量
  console.log('添加向量到索引...');
  for (let i = 0; i < 向量库.length; i++) {
    索引.addVector(向量库[i], i);
    if ((i + 1) % 1000 === 0) {
      console.log(`已添加 ${i + 1}/${向量库.length} 个向量`);
    }
  }
  
  // 执行测试
  console.log('开始执行搜索测试...');
  let 总召回率 = 0;
  let 总搜索时间 = 0;
  
  for (let i = 0; i < 查询集.length; i++) {
    const 查询向量 = 查询集[i];
    
    // 执行线性搜索作为基准
    const 线性搜索开始时间 = Date.now();
    const 线性搜索结果 = 线性搜索(查询向量, 向量库, topK);
    const 线性搜索时间 = Date.now() - 线性搜索开始时间;
    
    // 执行索引搜索
    const 索引搜索开始时间 = Date.now();
    const 索引搜索结果 = 索引.search(查询向量, topK, { verbose: false });
    const 索引搜索时间 = Date.now() - 索引搜索开始时间;
    
    // 计算召回率
    const 召回率 = 计算召回率(线性搜索结果, 索引搜索结果);
    总召回率 += 召回率;
    总搜索时间 += 索引搜索时间;
    
    if ((i + 1) % 10 === 0 || i === 查询集.length - 1) {
      console.log(`查询 ${i + 1}/${查询集.length}: 召回率=${召回率.toFixed(2)}, 索引搜索时间=${索引搜索时间}ms, 线性搜索时间=${线性搜索时间}ms`);
    }
  }
  
  // 输出总体结果
  const 平均召回率 = 总召回率 / 查询集.length;
  const 平均搜索时间 = 总搜索时间 / 查询集.length;
  
  console.log('\n测试结果汇总:');
  console.log(`平均召回率: ${(平均召回率 * 100).toFixed(2)}%`);
  console.log(`平均搜索时间: ${平均搜索时间.toFixed(2)}ms`);
  console.log('测试完成!');
  
  return {
    平均召回率,
    平均搜索时间
  };
}

// 如果直接运行此文件则执行测试
if (process.argv[1].endsWith('向量索引搜索放大测试.mjs')) {
  运行测试().catch(console.error);
} 