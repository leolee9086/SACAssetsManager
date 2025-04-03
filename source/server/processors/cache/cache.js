import {
  createJsonCacheAdapter,
  createGlobalCache
} from '../../../../src/toolBox/base/useEcma/forCrypto/forCache/useCacheProvider.js';
import {   computeCacheKey,
} from '../../../../src/toolBox/base/useEcma/forCrypto/forHash/computeMd5Hash.js';

// 导出工具箱中的缓存键生成函数
export { computeCacheKey as generateCacheKey };

// 使用工具箱中的JSON缓存适配器创建一个默认的适配器实例
const defaultAdapter = createJsonCacheAdapter(siyuanConfig.system.workspaceDir, 'temp', 'sac', 'cache');

/**
 * 构建缓存实例，如果全局缓存中已存在则返回现有实例
 * @param {string} name - 缓存名称
 * @param {Object} [adapter] - 可选的缓存适配器，默认使用本地JSON适配器
 * @returns {Object} 缓存提供者对象
 */
export function buildCache(name, adapter = defaultAdapter) {
  return createGlobalCache(name, adapter);
}
