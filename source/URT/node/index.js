import { createAdapterFactory } from './adapterFactory.js';
import { createProtocolManager } from './protocol/index.js';
import { createCache } from './utils/cache.js';
import { createEventEmitter } from './utils/events.js';

/**
 * 创建节点
 * @param {Object} options - 节点配置
 * @returns {Object} 节点接口
 */
function createNode(options = {}) {
  const adapters = new Map();
  const instances = new Map();
  const context = {
    cache: createCache(),
    events: createEventEmitter(),
    ...options
  };
  const protocolManager = createProtocolManager();

  /**
   * 注册适配器
   * @param {Object} registration - 适配器注册信息
   */
  function registerAdapter(registration) {
    const { id, factory, capability } = registration;
    adapters.set(id, { factory, capability });
  }

  /**
   * 获取适配器实例
   * @param {string} adapterId
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async function getAdapter(adapterId, options = {}) {
    if (instances.has(adapterId)) {
      return instances.get(adapterId);
    }

    const registration = adapters.get(adapterId);
    if (!registration) {
      throw new Error(`Adapter ${adapterId} not found`);
    }

    const instance = await registration.factory({
      ...context,
      ...options
    });

    instances.set(adapterId, instance);
    return instance;
  }

  /**
   * 释放适配器实例
   * @param {string} adapterId
   */
  async function releaseAdapter(adapterId) {
    const instance = instances.get(adapterId);
    if (instance) {
      await instance.dispose?.();
      instances.delete(adapterId);
    }
  }

  /**
   * 获取节点支持的能力
   * @returns {Object}
   */
  function getCapabilities() {
    const capabilities = {};
    for (const [id, { capability }] of adapters) {
      capabilities[id] = capability;
    }
    return capabilities;
  }

  /**
   * 查找适合处理特定资源的适配器
   * @param {Object} resource
   * @returns {string|null}
   */
  function findAdapter(resource) {
    for (const [id, { capability }] of adapters) {
      if (capability.resourceTypes.includes(resource.type)) {
        return id;
      }
    }
    return null;
  }

  /**
   * 验证 seed 支持
   * @param {Object} seed
   * @returns {string[]} 支持该 seed 的适配器 ID 列表
   */
  function validateSeed(seed) {
    const supportedAdapters = [];
    for (const [id, { factory }] of adapters) {
      const adapter = factory(context);
      if (adapter.supportsSeed(seed)) {
        supportedAdapters.push(id);
      }
    }
    return supportedAdapters;
  }

  /**
   * 从 seed 生成资源列表
   * @param {Object} seed
   * @returns {AsyncGenerator<URTResource>}
   */
  async function* fromSeed(seed) {
    const supportedAdapters = validateSeed(seed);
    if (supportedAdapters.length === 0) {
      throw new Error(`No adapter found for seed type: ${seed.type}`);
    }

    for (const adapterId of supportedAdapters) {
      const adapter = await getAdapter(adapterId);
      yield* adapter.fromSeed(seed);
    }
  }

  return {
    registerAdapter,
    getAdapter,
    releaseAdapter,
    getCapabilities,
    findAdapter,
    validateSeed,
    fromSeed,
    protocolManager
  };
}

export { createNode };
