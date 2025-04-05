/**
 * 向量相关测试运行入口
 * 用于运行向量嵌入、HNSW索引和Delta-PQ压缩相关测试
 */

import { 运行测试 as 运行向量嵌入测试 } from './向量嵌入测试.js';
import { 运行测试 as 运行HNSW索引测试 } from './向量HNSW索引测试.js';

console.log('=======================================');
console.log('开始运行向量相关模块测试');
console.log('=======================================\n');

// 运行所有测试并捕获错误
async function 运行测试() {
  let 测试错误 = 0;
  
  // 运行向量嵌入测试
  try {
    console.log('\n--- 开始向量嵌入测试 ---\n');
    await 运行向量嵌入测试();
    console.log('\n--- 向量嵌入测试完成 ---');
  } catch (error) {
    console.error('\n向量嵌入测试失败:', error);
    测试错误++;
  }

  console.log('\n---------------------------------------\n');

  // 运行HNSW索引测试
  try {
    console.log('\n--- 开始HNSW索引测试 ---\n');
    await 运行HNSW索引测试();
    console.log('\n--- HNSW索引测试完成 ---');
  } catch (error) {
    console.error('\nHNSW索引测试失败:', error);
    测试错误++;
  }

  console.log('\n=======================================');
  if (测试错误 === 0) {
    console.log('所有向量相关模块测试成功完成');
  } else {
    console.log(`测试完成，但有 ${测试错误} 个测试套件出现错误`);
  }
  console.log('=======================================');
}

// 运行测试
await 运行测试(); 