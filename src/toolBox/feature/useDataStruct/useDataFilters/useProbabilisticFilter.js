/**
 * 统一概率型过滤器接口
 * 提供布隆过滤器和布谷鸟过滤器的统一访问方式
 */

import { bloomFilter, createBloomFilter } from './useBloomFilter.js';
import { cuckooFilter, createCuckooFilter } from './useCuckooFilter.js';

/**
 * 过滤器类型枚举
 */
export const FilterType = {
  BLOOM: 'bloom',
  CUCKOO: 'cuckoo'
};

/**
 * 获取基础过滤器
 * @param {string} type - 过滤器类型，使用FilterType枚举
 * @returns {Object} 过滤器对象
 */
export function getBaseFilter(type) {
  switch(type) {
    case FilterType.BLOOM:
      return bloomFilter;
    case FilterType.CUCKOO:
      return cuckooFilter;
    default:
      throw new Error(`不支持的过滤器类型: ${type}`);
  }
}

/**
 * 创建指定类型的过滤器实例
 * @param {string} type - 过滤器类型，使用FilterType枚举
 * @param {Object} options - 配置选项
 * @returns {Object} 过滤器实例
 */
export function createFilter(type, options = {}) {
  switch(type) {
    case FilterType.BLOOM:
      return createBloomFilter(options);
    case FilterType.CUCKOO:
      return createCuckooFilter(options);
    default:
      throw new Error(`不支持的过滤器类型: ${type}`);
  }
}

/**
 * 获取过滤器工厂
 * 允许使用链式调用创建过滤器实例
 */
export function filterFactory() {
  let filterType = FilterType.BLOOM; // 默认使用布隆过滤器
  let filterOptions = {};
  
  return {
    /**
     * 设置过滤器类型
     * @param {string} type - 过滤器类型
     * @returns {Object} 工厂实例
     */
    type(type) {
      filterType = type;
      return this;
    },
    
    /**
     * 设置过滤器配置
     * @param {Object} options - 配置选项
     * @returns {Object} 工厂实例
     */
    withOptions(options) {
      filterOptions = { ...filterOptions, ...options };
      return this;
    },
    
    /**
     * 创建过滤器实例
     * @returns {Object} 过滤器实例
     */
    build() {
      return createFilter(filterType, filterOptions);
    }
  };
}

// 导出默认接口
export default {
  getBaseFilter,
  createFilter,
  filterFactory,
  FilterType
}; 