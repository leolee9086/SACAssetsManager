/**
 * Vite模式测试工具
 * 
 * 用于测试Vite模式的各项功能，特别是智能路径修复
 */

import { 
  initVueApp, 
  createVueInterface, 
  configureViteMode, 
  isViteModeSupported 
} from './vueExports.js';

/**
 * 测试Vite模式加载
 * @param {string} 路径 - 组件路径
 * @param {HTMLElement} 容器 - 挂载容器
 * @returns {Promise<Object>} 测试结果
 */
export const testViteMode = async (路径, 容器 = document.body) => {
  console.log(`开始测试Vite模式加载: ${路径}`);
  
  // 检查环境支持
  const 支持Vite = isViteModeSupported();
  console.log(`当前环境${支持Vite ? '支持' : '不支持'}Vite模式`);
  
  if (!支持Vite) {
    return { 成功: false, 信息: '当前环境不支持Vite模式' };
  }
  
  // 开始计时
  const 开始时间 = performance.now();
  
  try {
    // 尝试加载组件
    const app = await initVueApp(路径, 'vite-test', { mountElement: 容器 });
    
    // 计算耗时
    const 耗时 = performance.now() - 开始时间;
    
    return {
      成功: true,
      使用Vite模式: app.isMountedWithVite === true,
      耗时: 耗时.toFixed(2) + 'ms',
      应用: app
    };
  } catch (错误) {
    return {
      成功: false,
      信息: `加载失败: ${错误.message}`,
      错误: 错误
    };
  }
};

/**
 * 测试具有缺失扩展名的路径
 * @param {string} 基础路径 - 组件基础路径
 * @param {string} 文件名 - 没有扩展名的文件名
 * @param {HTMLElement} 容器 - 挂载容器
 * @returns {Promise<Object>} 测试结果
 */
export const testPathExtension = async (基础路径, 文件名, 容器 = document.body) => {
  // 构建没有扩展名的路径
  const 无扩展名路径 = `${基础路径}/${文件名}`;
  
  console.log(`测试缺失扩展名路径: ${无扩展名路径}`);
  
  // 确保启用智能路径修复
  configureViteMode({ 智能路径修复: true });
  
  return await testViteMode(无扩展名路径, 容器);
};

/**
 * 批量测试多个路径
 * @param {Array<string>} 路径列表 - 要测试的路径列表
 * @returns {Promise<Object>} 测试结果
 */
export const batchTest = async (路径列表) => {
  const 结果 = {};
  
  for (const 路径 of 路径列表) {
    结果[路径] = await testViteMode(路径);
  }
  
  // 总结测试结果
  const 成功数 = Object.values(结果).filter(r => r.成功).length;
  const 失败数 = Object.values(结果).filter(r => !r.成功).length;
  const Vite模式数 = Object.values(结果).filter(r => r.成功 && r.使用Vite模式).length;
  
  return {
    详细结果: 结果,
    总结: {
      总数: 路径列表.length,
      成功数,
      失败数,
      Vite模式数,
      传统模式数: 成功数 - Vite模式数
    }
  };
};

/**
 * 获取当前Vite模式配置
 * @returns {Object} 当前配置
 */
export const getViteModeConfig = () => {
  return configureViteMode();
};

/**
 * 添加路径到黑名单
 * @param {string} 路径 - 要添加到黑名单的路径
 * @returns {Object} 更新后的配置
 */
export const addToBlacklist = (路径) => {
  const 配置 = configureViteMode();
  const 黑名单 = [...配置.路径黑名单];
  
  if (!黑名单.includes(路径)) {
    黑名单.push(路径);
  }
  
  return configureViteMode({ 路径黑名单: 黑名单 });
};

/**
 * 修复特定路径问题
 * @returns {Object} 修复结果
 */
export const fixAssetInfoPanelPath = () => {
  // 有问题的路径
  const 问题路径 = '/plugins/SACAssetsManager/source/UI/pannels/assetInfoPanel/vue';
  
  // 获取当前配置
  const 配置 = configureViteMode();
  
  // 检查路径是否已在黑名单中
  const 已在黑名单 = 配置.路径黑名单.includes(问题路径);
  
  if (!已在黑名单) {
    // 添加到黑名单
    const 新黑名单 = [...配置.路径黑名单, 问题路径];
    configureViteMode({ 路径黑名单: 新黑名单 });
    console.log(`已将路径 ${问题路径} 添加到黑名单`);
    return { 成功: true, 操作: '添加到黑名单' };
  } else {
    console.log(`路径 ${问题路径} 已在黑名单中`);
    return { 成功: true, 操作: '已在黑名单' };
  }
};

/**
 * 自动扫描和尝试修复已知组件路径的函数
 * @param {Array<string>} 路径列表 - 要修复的路径列表，如果不提供则使用默认路径
 * @returns {Promise<Object>} 修复结果统计
 */
export const 自动修复已知组件路径 = async (路径列表 = null) => {
  // 默认路径列表
  const 默认路径列表 = [
    '/plugins/SACAssetsManager/source/UI/pannels/assetInfoPanel/vue',
    // 在这里添加其他已知有问题的路径
  ];

  const 待修复路径 = 路径列表 || 默认路径列表;
  const 结果 = {
    总数: 待修复路径.length,
    成功: 0,
    失败: 0,
    详细: []
  };

  // 确保智能路径修复功能已启用
  const 当前配置 = configureViteMode();
  if (!当前配置.智能路径修复) {
    configureViteMode({ 智能路径修复: true });
    console.log('已自动启用智能路径修复功能');
  }

  // 尝试修复每个路径
  for (const 路径 of 待修复路径) {
    try {
      // 检查是否已在修复表中
      if (当前配置.路径修复表[路径]) {
        console.log(`路径 ${路径} 已有修复: ${当前配置.路径修复表[路径]}`);
        结果.成功++;
        结果.详细.push({
          路径,
          状态: '已修复',
          修复后: 当前配置.路径修复表[路径]
        });
        continue;
      }
      
      // 尝试智能修复
      const 可能扩展名 = ['.vue', '.js', '.jsx', '.ts', '.tsx'];
      let 已修复 = false;
      
      for (const 扩展名 of 可能扩展名) {
        const 尝试路径 = `${路径}${扩展名}`;
        try {
          // 尝试获取文件
          const 响应 = await fetch(尝试路径);
          if (响应.ok) {
            // 找到有效路径，添加到修复表
            const 新修复表 = {
              ...当前配置.路径修复表,
              [路径]: 尝试路径
            };
            configureViteMode({ 路径修复表: 新修复表 });
            console.log(`成功修复路径: ${路径} -> ${尝试路径}`);
            结果.成功++;
            结果.详细.push({
              路径,
              状态: '已修复',
              修复后: 尝试路径
            });
            已修复 = true;
            break;
          }
        } catch (错误) {
          console.warn(`尝试路径 ${尝试路径} 失败:`, 错误);
        }
      }
      
      // 如果无法修复，添加到黑名单
      if (!已修复) {
        const 新黑名单 = [...当前配置.路径黑名单, 路径];
        configureViteMode({ 路径黑名单: 新黑名单 });
        console.log(`无法修复路径 ${路径}，已添加到黑名单`);
        结果.失败++;
        结果.详细.push({
          路径,
          状态: '添加到黑名单',
          原因: '无法找到有效的文件扩展名'
        });
      }
    } catch (错误) {
      console.error(`处理路径 ${路径} 时出错:`, 错误);
      结果.失败++;
      结果.详细.push({
        路径,
        状态: '失败',
        原因: 错误.message
      });
    }
  }
  
  console.log(`路径修复完成: ${结果.成功}/${结果.总数} 成功, ${结果.失败}/${结果.总数} 失败`);
  return 结果;
};

// 导出默认对象
export default {
  testViteMode,
  testPathExtension,
  batchTest,
  getViteModeConfig,
  addToBlacklist,
  fixAssetInfoPanelPath,
  自动修复已知组件路径
}; 