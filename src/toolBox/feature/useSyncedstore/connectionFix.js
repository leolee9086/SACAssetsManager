/**
 * @fileoverview WebRTC连接修复模块
 * 
 * 本模块解决WebRTC连接重复创建的问题，确保同一个文档只存在一个WebRTC连接实例。
 */

// 使用自定义Key，避免全局污染
const YJS_PROVIDERS_KEY = Symbol.for('yjs_webrtc_providers');
const SIYUAN_PROVIDERS_KEY = Symbol.for('yjs_siyuan_providers');

// 确保全局提供者存储存在
function ensureGlobalStorage() {
  if (typeof window === 'undefined') return;
  
  // 初始化WebRTC提供者存储
  if (!window[YJS_PROVIDERS_KEY]) {
    window[YJS_PROVIDERS_KEY] = new Map();
  }
  
  // 初始化思源提供者存储
  if (!window[SIYUAN_PROVIDERS_KEY]) {
    window[SIYUAN_PROVIDERS_KEY] = new Map();
  }
}

/**
 * 获取或存储WebRTC提供者
 * @param {string} roomName - 房间名称
 * @param {string} serverId - 服务器标识符
 * @param {Object} [provider] - 要存储的提供者（可选）
 * @returns {Object|null} 存在的提供者或null
 */
export function getOrStoreWebRTCProvider(roomName, serverId, provider = null) {
  ensureGlobalStorage();
  if (typeof window === 'undefined') return null;
  
  const storage = window[YJS_PROVIDERS_KEY];
  const key = `${roomName}:${serverId || 'default'}`;
  
  // 存储模式
  if (provider) {
    storage.set(key, provider);
    console.log(`[连接修复] 缓存房间 ${roomName} 服务器 ${serverId} 的WebRTC提供者`);
    return provider;
  }
  
  // 获取模式
  if (storage.has(key)) {
    console.log(`[连接修复] 获取房间 ${roomName} 服务器 ${serverId} 的缓存WebRTC提供者`);
    return storage.get(key);
  }
  
  return null;
}

/**
 * 获取或存储思源提供者
 * @param {string} roomName - 房间名称
 * @param {Object} [provider] - 要存储的提供者（可选）
 * @returns {Object|null} 存在的提供者或null
 */
export function getOrStoreSiyuanProvider(roomName, provider = null) {
  ensureGlobalStorage();
  if (typeof window === 'undefined') return null;
  
  const storage = window[SIYUAN_PROVIDERS_KEY];
  
  // 存储模式
  if (provider) {
    storage.set(roomName, provider);
    console.log(`[连接修复] 缓存房间 ${roomName} 的思源提供者`);
    return provider;
  }
  
  // 获取模式
  if (storage.has(roomName)) {
    console.log(`[连接修复] 获取房间 ${roomName} 的缓存思源提供者`);
    return storage.get(roomName);
  }
  
  return null;
}

/**
 * 检查房间是否有全局缓存的WebRTC提供者
 * @param {string} roomName - 房间名称 
 * @param {string} serverId - 服务器标识符
 * @returns {boolean} 是否存在提供者
 */
export function hasWebRTCProvider(roomName, serverId) {
  ensureGlobalStorage();
  if (typeof window === 'undefined') return false;
  
  const storage = window[YJS_PROVIDERS_KEY];
  const key = `${roomName}:${serverId || 'default'}`;
  return storage.has(key);
}

/**
 * 检查房间是否有全局缓存的思源提供者
 * @param {string} roomName - 房间名称
 * @returns {boolean} 是否存在提供者
 */
export function hasSiyuanProvider(roomName) {
  ensureGlobalStorage();
  if (typeof window === 'undefined') return false;
  
  const storage = window[SIYUAN_PROVIDERS_KEY];
  return storage.has(roomName);
}

/**
 * 清理房间的所有提供者
 * @param {string} roomName - 房间名称
 */
export function cleanupProviders(roomName) {
  ensureGlobalStorage();
  if (typeof window === 'undefined') return;
  
  // 清理WebRTC提供者
  const webrtcStorage = window[YJS_PROVIDERS_KEY];
  
  // 查找所有以该房间为前缀的键
  const webrtcKeys = Array.from(webrtcStorage.keys())
    .filter(key => key.startsWith(`${roomName}:`));
  
  // 清理每个找到的键
  for (const key of webrtcKeys) {
    console.log(`[连接修复] 清理WebRTC提供者: ${key}`);
    
    const provider = webrtcStorage.get(key);
    if (provider) {
      try {
        if (typeof provider.disconnect === 'function') {
          provider.disconnect();
        }
        
        if (typeof provider.destroy === 'function') {
          provider.destroy();
        }
      } catch (e) {
        console.warn(`[连接修复] 清理提供者时出错: ${e.message}`);
      }
    }
    
    webrtcStorage.delete(key);
  }
  
  // 清理思源提供者
  const siyuanStorage = window[SIYUAN_PROVIDERS_KEY];
  if (siyuanStorage.has(roomName)) {
    console.log(`[连接修复] 清理思源提供者: ${roomName}`);
    
    const provider = siyuanStorage.get(roomName);
    if (provider) {
      try {
        if (typeof provider.disconnect === 'function') {
          provider.disconnect();
        }
      } catch (e) {
        console.warn(`[连接修复] 清理思源提供者时出错: ${e.message}`);
      }
    }
    
    siyuanStorage.delete(roomName);
  }
}

/**
 * 生成服务器标识符
 * @param {Object} options - 连接选项
 * @returns {string} 服务器标识符
 */
export function generateServerId(options) {
  // 思源连接标识
  if (options.useSiyuan || options.forceSiyuan) {
    return `siyuan:${options.host || '127.0.0.1'}:${options.port || '6806'}`;
  }
  
  // WebRTC连接标识
  if (options.signaling && Array.isArray(options.signaling) && options.signaling.length > 0) {
    // 使用第一个信令服务器作为标识
    return options.signaling[0];
  }
  
  // 无法获取信令服务器时，使用默认标识
  return 'default';
}

// 导出默认对象
export default {
  getOrStoreWebRTCProvider,
  getOrStoreSiyuanProvider,
  hasWebRTCProvider,
  hasSiyuanProvider,
  cleanupProviders,
  generateServerId
};