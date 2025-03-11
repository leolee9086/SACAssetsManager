/**
 * 模块注册表 - 管理所有模块的注册和状态
 */
import { 模块状态, 默认模块配置 } from './constants.js';

// 模块注册表和状态管理
const 模块注册表 = new Map();
const 模块名称集合 = new Set();

/**
 * 深度合并配置
 * @param {Object} 默认值 
 * @param {Object} 自定义值 
 */
export function 合并配置(默认值, 自定义值) {
  const 结果 = { ...默认值 };
  
  for (const 键 in 自定义值) {
    if (typeof 自定义值[键] === 'object' && 自定义值[键] !== null) {
      结果[键] = 合并配置(结果[键] || {}, 自定义值[键]);
    } else {
      结果[键] = 自定义值[键];
    }
  }
  
  return 结果;
}

/**
 * 创建模块信息对象
 * @param {string} 名称 - 模块名称
 * @param {Object} 实例 - 模块实例
 * @param {Object} 配置 - 模块配置
 * @returns {Object} 模块信息对象
 */
export const 创建模块信息 = (名称, 实例, 配置 = {}) => {
  const 合并后配置 = 合并配置(默认模块配置, 配置);
  
  return {
    名称,
    实例,
    配置: 合并后配置,
    状态: 模块状态.已加载,
    错误: null,
    设置状态(新状态, 错误 = null) {
      this.状态 = 新状态;
      this.错误 = 错误;
      console.info(`模块 [${this.名称}] 状态更新为: ${新状态}${错误 ? ` (错误: ${错误.message})` : ''}`);
    }
  };
};

/**
 * 注册模块到模块注册表
 * @param {string} 模块名称 - 模块的唯一标识名称
 * @param {Object} 模块实例 - 模块对象实例
 * @returns {boolean} 是否注册成功
 */
export function 注册模块(模块名称, 模块实例) {
  if (模块注册表.has(模块名称)) {
    console.warn(`模块 [${模块名称}] 已存在，将被覆盖`);
    // 确保旧模块被正确清理
    const 旧模块 = 模块注册表.get(模块名称);
    if (typeof 旧模块.实例.销毁 === 'function') {
      try {
        旧模块.实例.销毁();
      } catch (错误) {
        console.error(`清理旧模块 [${模块名称}] 时发生错误:`, 错误);
      }
    }
  }
  
  const 模块元数据 = 创建模块信息(模块名称, 模块实例);
  模块注册表.set(模块名称, 模块元数据);
  模块名称集合.add(模块名称);
  console.info(`模块 [${模块名称}] 已注册`);
  return true;
}

/**
 * 获取已注册的模块
 * @param {string} 模块名称 - 要获取的模块名称
 * @returns {Object|null} 模块实例或null（如果模块不存在）
 */
export function 获取模块(模块名称) {
  const 模块 = 模块注册表.get(模块名称);
  if (!模块) {
    console.warn(`尝试获取不存在的模块: [${模块名称}]`);
    return null;
  }
  
  return 模块.实例;
}

/**
 * 获取模块状态
 * @param {string} 模块名称 - 模块名称
 * @returns {string} 模块状态
 */
export function 获取模块状态(模块名称) {
  if (!模块注册表.has(模块名称)) {
    return 模块状态.未加载;
  }
  return 模块注册表.get(模块名称).状态;
}

/**
 * 获取所有已注册模块的名称
 * @returns {Array} 模块名称数组
 */
export function 获取所有模块名称() {
  return Array.from(模块名称集合);
}

/**
 * 清理模块注册表
 */
export function 清理注册表() {
  模块注册表.clear();
  模块名称集合.clear();
}

/**
 * 获取特定模块的完整信息
 * @param {string} 模块名称 
 * @returns {Object|undefined} 模块信息
 */
export function 获取模块信息(模块名称) {
  return 模块注册表.get(模块名称);
}

/**
 * 将模块添加到注册表
 * @param {string} 模块名称 
 * @param {Object} 模块元数据 
 */
export function 设置模块信息(模块名称, 模块元数据) {
  模块注册表.set(模块名称, 模块元数据);
  模块名称集合.add(模块名称);
} 