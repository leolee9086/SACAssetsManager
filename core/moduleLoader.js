/**
 * 模块加载器 - 负责实际加载模块的核心逻辑
 */
import { 创建模块信息 } from './moduleRegistry.js';
import { 获取模块信息, 设置模块信息 } from './moduleRegistry.js';
import { 模块路径映射 } from './constants.js';
import { 带重试执行异步函数 } from '../src/toolBox/base/useEcma/usePromise.js';
// 宿主API引用
let 宿主API = null;

/**
 * 设置宿主API
 * @param {Object} api - 宿主环境提供的API
 */
export function 设置宿主API(api) {
  宿主API = api;
}

/**
 * 获取宿主API
 * @returns {Object} 宿主API对象
 */
export function 获取宿主API() {
  return 宿主API;
}

/**
 * 根据模块名称获取模块文件路径
 * @param {string} 模块名称 - 模块名称
 * @returns {string} 模块文件路径
 */
function 获取模块路径(模块名称) {
  // 先从映射表中查找模块路径
  if (模块路径映射[模块名称]) {
    return 模块路径映射[模块名称];
  }
  
  // 如果映射表中没有，使用默认路径
  return `core/services/${模块名称}.js`;
}

/**
 * 检查模块是否已存在
 * @param {string} 模块名称 - 模块名称
 * @returns {Object|null} 存在返回模块信息，不存在返回null
 */
function 检查模块是否已存在(模块名称) {
  return 获取模块信息(模块名称);
}

/**
 * 导入模块文件
 * @param {string} 模块名称 - 模块名称
 * @returns {Promise<Function>} 模块创建函数
 */
async function 导入模块文件(模块名称) {
  // 获取模块路径
  const 模块路径 = 获取模块路径(模块名称);
  const 完整路径 = 宿主API.解析路径(模块路径);
  
  console.info(`正在从路径 [${模块路径}] 加载模块 [${模块名称}]...`);
  
  // 动态导入模块
  const 模块模块 = await import(完整路径);
  const 创建模块 = 模块模块.创建模块 || 模块模块.default;
  
  if (typeof 创建模块 !== 'function') {
    throw new Error(`模块 [${模块名称}] 没有导出创建模块函数`);
  }
  
  return 创建模块;
}

/**
 * 创建并注册模块实例
 * @param {string} 模块名称 - 模块名称
 * @param {Function} 创建函数 - 模块创建函数
 * @param {Object} 配置 - 模块配置
 * @returns {Promise<Object>} 模块元数据
 */
async function 创建并注册模块实例(模块名称, 创建函数, 配置) {
  // 创建模块实例
  const 模块实例 = await 创建函数(配置);
  // 创建模块元数据
  const 模块元数据 = 创建模块信息(模块名称, 模块实例, 配置);
  // 注册模块
  设置模块信息(模块名称, 模块元数据);
  
  return 模块元数据;
}

/**
 * 执行单次模块加载尝试
 * @param {string} 模块名称 - 模块名称
 * @param {Object} 配置 - 模块配置
 * @returns {Promise<Object>} 模块元数据
 */
async function 执行模块加载尝试(模块名称, 配置) {
  // 检查模块是否已存在
  const 已存在模块 = 检查模块是否已存在(模块名称);
  if (已存在模块) {
    return 已存在模块;
  }

  // 导入模块文件获取创建函数
  const 创建函数 = await 导入模块文件(模块名称);
  
  // 创建并注册模块实例
  const 模块元数据 = await 创建并注册模块实例(模块名称, 创建函数, 配置);
  
  console.info(`模块 [${模块名称}] 加载完成`);
  return 模块元数据;
}



/**
 * 加载单个模块
 * @param {string} 模块名称 - 模块名称
 * @param {Object} 配置 - 模块配置
 * @returns {Promise<Object>} 模块信息
 */
export async function 加载模块(模块名称, 配置 = {}) {
  console.info(`正在加载模块 [${模块名称}]...`);
  
  try {
    return await 带重试执行异步函数(
      async () => 执行模块加载尝试(模块名称, 配置),
      {
        重试次数: 配置.重试次数,
        重试延迟: 配置.重试延迟
      }
    );
  } catch (错误) {
    throw new Error(`无法加载模块 [${模块名称}]: ${错误.message}`);
  }
}

/**
 * 注册自定义模块路径
 * @param {string} 模块名称 - 模块名称
 * @param {string} 模块路径 - 模块文件路径
 */
export function 注册模块路径(模块名称, 模块路径) {
  if (模块路径映射[模块名称]) {
    console.warn(`模块路径 [${模块名称}] 已存在，将被覆盖: ${模块路径映射[模块名称]} -> ${模块路径}`);
  }
  
  模块路径映射[模块名称] = 模块路径;
  console.info(`已注册模块路径: ${模块名称} -> ${模块路径}`);
} 