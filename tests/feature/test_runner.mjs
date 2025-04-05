import { 运行测试 } from './向量HNSW索引测试.mjs';

console.log('开始运行向量HNSW索引测试...');

运行测试()
  .then(() => {
    console.log('测试运行完成');
  })
  .catch(error => {
    console.error('测试运行时发生错误:', error);
    process.exit(1);
  }); 