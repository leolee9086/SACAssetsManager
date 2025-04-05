/**
 * 思源笔记API功能测试
 * 测试与思源笔记的API交互功能
 */

// 从toolBox导入思源API相关功能
import { useSiyuanSystem } from '../../src/toolBox/useAge/forSiyuan/useSiyuanSystem.js';
import { useSiyuanBlock } from '../../src/toolBox/useAge/forSiyuan/useSiyuanBlock.js';
import { useSiyuanNotebook } from '../../src/toolBox/useAge/forSiyuan/useSiyuanNotebook.js';

/**
 * 测试环境检测
 */
function 测试思源环境检测() {
  console.log('---- 测试思源环境检测 ----');
  
  const siyuanSystem = useSiyuanSystem();
  console.log('思源系统模块加载:', siyuanSystem ? '通过' : '失败');
  
  // 只有在思源环境中才能进一步测试
  if (!siyuanSystem) {
    console.log('当前不在思源环境中，跳过详细测试');
    return;
  }
  
  try {
    const 环境结果 = siyuanSystem.checkEnvironment();
    console.log('思源环境检测:', 环境结果 ? '通过' : '失败');
    console.log('环境信息:', JSON.stringify(环境结果));
  } catch (e) {
    console.log('思源环境检测失败:', e.message);
  }
}

/**
 * 测试API请求
 */
async function 测试思源API请求() {
  console.log('\n---- 测试思源API请求 ----');
  
  const siyuanSystem = useSiyuanSystem();
  if (!siyuanSystem) {
    console.log('当前不在思源环境中，跳过API请求测试');
    return;
  }
  
  try {
    // 测试获取系统信息的API
    const 系统信息 = await siyuanSystem.getSystemInfo();
    console.log('API请求系统信息:', 系统信息 ? '通过' : '失败');
    console.log('系统信息:', JSON.stringify(系统信息, null, 2).slice(0, 200) + '...');
  } catch (e) {
    console.log('API请求测试失败:', e.message);
  }
}

/**
 * 测试块操作API
 */
async function 测试块操作API() {
  console.log('\n---- 测试块操作API ----');
  
  const blockAPI = useSiyuanBlock();
  if (!blockAPI) {
    console.log('当前不在思源环境中，跳过块操作测试');
    return;
  }
  
  try {
    // 获取当前文档块
    console.log('尝试获取当前文档块...');
    
    // 尝试获取思源当前文档的根块
    const rootBlockId = blockAPI.getCurrentDocumentRootID();
    if (!rootBlockId) {
      console.log('未能获取当前文档ID，跳过测试');
      return;
    }
    
    console.log('获取到根块ID:', rootBlockId);
    
    // 获取块属性
    const attrs = await blockAPI.getBlockAttributes(rootBlockId);
    console.log('获取块属性:', attrs ? '通过' : '失败');
    if (attrs) {
      console.log('块属性数据:', JSON.stringify(attrs, null, 2).slice(0, 200) + '...');
    }
  } catch (e) {
    console.log('块操作API测试失败:', e.message);
  }
}

/**
 * 测试文档API
 */
async function 测试文档API() {
  console.log('\n---- 测试文档API ----');
  
  const notebookAPI = useSiyuanNotebook();
  if (!notebookAPI) {
    console.log('当前不在思源环境中，跳过文档API测试');
    return;
  }
  
  try {
    // 获取所有笔记本
    console.log('尝试获取笔记本列表...');
    const notebooks = await notebookAPI.getNotebooks();
    
    if (notebooks && notebooks.length > 0) {
      console.log('获取笔记本列表:', '通过');
      console.log('笔记本数量:', notebooks.length);
      console.log('第一个笔记本:', notebooks[0].name);
      
      // 尝试获取文档树
      const firstNotebookId = notebooks[0].id;
      console.log('尝试获取文档树...');
      const docTree = await notebookAPI.getNotebookDocuments(firstNotebookId);
      
      if (docTree) {
        console.log('获取文档树:', '通过');
        console.log('根文档数量:', docTree.length);
      } else {
        console.log('获取文档树:', '失败');
      }
    } else {
      console.log('获取笔记本列表:', '失败或无笔记本');
    }
  } catch (e) {
    console.log('文档API测试失败:', e.message);
  }
}

/**
 * 运行所有测试
 */
async function 运行测试() {
  console.log('======== 思源笔记API功能测试 ========\n');
  
  测试思源环境检测();
  await 测试思源API请求();
  await 测试块操作API();
  await 测试文档API();
  
  console.log('\n======== 测试完成 ========');
}

// 导出运行测试函数
export { 运行测试 }; 