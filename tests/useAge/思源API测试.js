/**
 * 思源笔记API功能测试
 * 测试与思源笔记的API交互功能
 */

// 从toolBox导入思源API相关功能
import { 检测思源环境, 获取思源端口 } from '../../src/toolBox/useAge/forSiyuan/环境检测.js';
import { 请求思源API, 获取块内容, 更新块内容 } from '../../src/toolBox/useAge/forSiyuan/API请求.js';
import { 创建文档, 获取文档内容, 删除文档 } from '../../src/toolBox/useAge/forSiyuan/文档操作.js';

/**
 * 测试环境检测
 */
function 测试思源环境检测() {
  console.log('---- 测试思源环境检测 ----');
  
  const 环境结果 = 检测思源环境();
  console.log('思源环境检测:', 环境结果 ? '通过' : '失败');
  console.log('环境类型:', 环境结果 ? 环境结果.环境类型 : '未知');
  console.log('是否桌面端:', 环境结果 ? (环境结果.是桌面端 ? '是' : '否') : '未知');
  console.log('是否开发模式:', 环境结果 ? (环境结果.是开发模式 ? '是' : '否') : '未知');
}

/**
 * 测试端口获取
 */
async function 测试思源端口获取() {
  console.log('\n---- 测试思源端口获取 ----');
  
  try {
    const 核心端口 = await 获取思源端口('核心服务');
    console.log('获取思源核心服务端口:', 核心端口 ? '通过' : '失败');
    console.log('核心服务端口号:', 核心端口);
    
    const 插件端口 = await 获取思源端口('插件服务');
    console.log('获取插件服务端口:', 插件端口 ? '通过' : '失败');
    console.log('插件服务端口号:', 插件端口);
  } catch (e) {
    console.log('获取端口失败:', e.message);
  }
}

/**
 * 测试思源API请求
 */
async function 测试思源API请求() {
  console.log('\n---- 测试思源API请求 ----');
  
  try {
    // 测试获取系统信息的API
    const 系统信息 = await 请求思源API('/api/system/getConf');
    console.log('API请求系统信息:', 系统信息 ? '通过' : '失败');
    
    // 验证返回数据结构
    if (系统信息 && 系统信息.code === 0) {
      const 数据 = 系统信息.data;
      console.log('系统信息数据完整性:', 
        数据 && typeof 数据 === 'object' ? '通过' : '失败');
      
      // 检查一些关键字段
      const 字段检查 = [
        'appearance',
        'lang',
        'api'
      ].every(字段 => 字段 in 数据);
      
      console.log('系统信息字段检查:', 字段检查 ? '通过' : '失败');
    } else {
      console.log('系统信息API返回非成功状态');
    }
  } catch (e) {
    console.log('API请求测试失败:', e.message);
  }
}

/**
 * 测试块操作API
 */
async function 测试块操作API() {
  console.log('\n---- 测试块操作API ----');
  
  try {
    // 获取根块ID
    const 根块ID请求 = await 请求思源API('/api/block/getIDsByHPath', {
      path: '/'
    });
    
    if (根块ID请求 && 根块ID请求.code === 0 && 根块ID请求.data.length > 0) {
      const 根块ID = 根块ID请求.data[0];
      console.log('获取根块ID:', '通过', 根块ID);
      
      // 获取块属性
      const 块属性请求 = await 请求思源API('/api/attr/getBlockAttrs', {
        id: 根块ID
      });
      
      if (块属性请求 && 块属性请求.code === 0) {
        console.log('获取块属性:', '通过');
        console.log('块属性数据完整性:', 
          块属性请求.data && typeof 块属性请求.data === 'object' ? '通过' : '失败');
      } else {
        console.log('获取块属性:', '失败');
      }
    } else {
      console.log('获取根块ID:', '失败');
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
  
  try {
    // 获取所有笔记本
    const 笔记本请求 = await 请求思源API('/api/notebook/lsNotebooks');
    
    if (笔记本请求 && 笔记本请求.code === 0) {
      console.log('获取笔记本列表:', '通过');
      console.log('笔记本数量:', 笔记本请求.data.notebooks.length);
      
      if (笔记本请求.data.notebooks.length > 0) {
        const 第一个笔记本 = 笔记本请求.data.notebooks[0];
        console.log('笔记本数据完整性:', 
          第一个笔记本 && 第一个笔记本.id ? '通过' : '失败');
        
        // 尝试获取文档树
        const 文档树请求 = await 请求思源API('/api/filetree/getDoc', {
          id: 第一个笔记本.id,
          mode: 0
        });
        
        if (文档树请求 && 文档树请求.code === 0) {
          console.log('获取文档树:', '通过');
        } else {
          console.log('获取文档树:', '失败');
        }
      }
    } else {
      console.log('获取笔记本列表:', '失败');
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
  await 测试思源端口获取();
  await 测试思源API请求();
  await 测试块操作API();
  await 测试文档API();
  
  console.log('\n======== 测试完成 ========');
}

// 导出运行测试函数
export { 运行测试 }; 