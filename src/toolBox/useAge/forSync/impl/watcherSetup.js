/**
 * 监听器设置 - 为同步对象设置监听器
 */

import { watch, toRaw } from '../../../../../static/vue.esm-browser.js';

/**
 * 设置监听器
 * @param {Object} params - 参数
 * @param {string} params.type - 类型 ('ref' 或 'reactive')
 * @param {Object} params.localState - 本地状态
 * @param {Object} params.status - 状态对象
 * @param {Object} params.engine - 同步引擎
 * @param {string} params.key - 键名
 * @param {Object} params.options - 配置选项
 * @returns {Object} 监听器清理函数
 */
export function setupWatchers(params) {
  const { type, localState, status, engine, key, options } = params;
  const storeType = type === 'ref' ? 'refs' : 'states';
  
  // 同步锁与计时器，防止循环更新和频繁同步
  let syncLock = false;
  let syncDebounceTimer = null;
  const SYNC_DEBOUNCE = 50; // 50ms防抖
  
  let unwatchLocal = null;
  let unwatchRemote = null;
  let unwatchConnection = null;
  let peerCheckInterval = null; // 添加对等点检查定时器变量
  
  // 深拷贝函数 - 确保值完全分离
  const deepClone = (value) => {
    if (value === null || typeof value !== 'object') return value;
    return JSON.parse(JSON.stringify(value));
  };
  
  // 更新对等点数量的函数
  const updatePeers = () => {
    if (engine && engine.getPeers) {
      try {
        const peers = engine.getPeers();
        status.peers = peers instanceof Set ? peers : new Set();
      } catch (err) {
        console.warn(`[Sync] 更新对等点数量失败:`, err);
        status.peers = new Set();
      }
    }
  };
  
  // 添加对等点更新监听 - 使用try-catch处理可能的错误
  try {
    engine.on('peers', updatePeers);
    updatePeers(); // 立即执行一次更新
  } catch (err) {
    console.warn(`[Sync] 添加对等点监听失败:`, err);
    // 失败时设置定时检查
    peerCheckInterval = setInterval(() => {
      if (engine && engine.isConnected()) {
        updatePeers();
      }
    }, 2000); // 每2秒检查一次
  }
  
  // 从远程获取数据并应用到本地 - 带防抖处理
  const syncFromRemote = (forceSyncNow = false) => {
    if (syncLock && !forceSyncNow) return;
    
    if (syncDebounceTimer && !forceSyncNow) {
      clearTimeout(syncDebounceTimer);
    }
    
    const doSync = () => {
      if (!status.connected || !engine.hasState(storeType, key)) return;
      
      syncLock = true;
      
      try {
        const remoteState = engine.getState(storeType, key);
        if (!remoteState) return;
        
        // 根据类型不同，更新本地状态
        if (type === 'ref') {
          localState.value = remoteState;
        } else {
          // 对于reactive类型，使用安全合并而不是直接替换
          const mergeStates = (target, source) => {
            if (!target || !source || typeof target !== 'object' || typeof source !== 'object') {
              return;
            }
            
            // 处理删除的属性
            Object.keys(target).forEach(k => {
              if (k.startsWith('$') || typeof target[k] === 'function') return;
              if (!(k in source)) {
                delete target[k];
              }
            });
            
            // 合并或添加属性
            Object.keys(source).forEach(k => {
              if (k.startsWith('$') || typeof source[k] === 'function') return;
              
              const sourceValue = source[k];
              
              // 目标不存在此属性，需要创建
              if (!(k in target)) {
                if (Array.isArray(sourceValue)) {
                  // 数组需要逐项复制
                  target[k] = [];
                  sourceValue.forEach(item => {
                    if (item !== null && typeof item === 'object') {
                      const newObj = Array.isArray(item) ? [] : {};
                      Object.keys(item).forEach(subKey => {
                        if (!subKey.startsWith('$') && typeof item[subKey] !== 'function') {
                          newObj[subKey] = item[subKey];
                        }
                      });
                      target[k].push(newObj);
                    } else {
                      target[k].push(item);
                    }
                  });
                } else if (sourceValue !== null && typeof sourceValue === 'object') {
                  // 对象需要递归合并
                  target[k] = {};
                  mergeStates(target[k], sourceValue);
                } else {
                  // 基本类型直接赋值
                  target[k] = sourceValue;
                }
                return;
              }
              
              const targetValue = target[k];
              
              // 递归处理嵌套对象
              if (sourceValue !== null && typeof sourceValue === 'object' && 
                  targetValue !== null && typeof targetValue === 'object') {
                if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
                  // 清空数组但保留引用
                  targetValue.length = 0;
                  // 填充新内容
                  sourceValue.forEach(item => {
                    if (item !== null && typeof item === 'object') {
                      const newObj = Array.isArray(item) ? [] : {};
                      Object.keys(item).forEach(subKey => {
                        if (!subKey.startsWith('$') && typeof item[subKey] !== 'function') {
                          newObj[subKey] = item[subKey];
                        }
                      });
                      targetValue.push(newObj);
                    } else {
                      targetValue.push(item);
                    }
                  });
                } else if (!Array.isArray(sourceValue) && !Array.isArray(targetValue)) {
                  // 对象递归合并
                  mergeStates(targetValue, sourceValue);
                } else {
                  // 类型不匹配，直接替换
                  target[k] = Array.isArray(sourceValue) ? [] : {};
                  mergeStates(target[k], sourceValue);
                }
              } else if (targetValue !== sourceValue) {
                // 简单类型直接替换
                target[k] = sourceValue;
              }
            });
          };
          
          // 使用安全合并函数
          mergeStates(localState, remoteState);
        }
        
        // 更新同步时间
        status.lastSync = Date.now();
        
        // 触发回调
        if (options.onSync) {
          options.onSync(type === 'ref' ? localState.value : localState);
        }
        
        if (options.onUpdate) {
          options.onUpdate(type === 'ref' ? localState.value : localState, 'remote');
        }
        
        if (options.debug) {
          console.log(`[Synced${type === 'ref' ? 'Ref' : 'Reactive'}:${key}] 同步更新 <-`, 
            type === 'ref' ? localState.value : localState);
        }
      } finally {
        syncLock = false;
      }
    };
    
    if (forceSyncNow) {
      doSync();
    } else {
      syncDebounceTimer = setTimeout(doSync, SYNC_DEBOUNCE);
    }
  };
  
  // 将本地数据同步到远程 - 带防抖处理
  const syncToRemote = (newState) => {
    if (syncLock || !status.connected) return;
    
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
    }
    
    syncDebounceTimer = setTimeout(() => {
      syncLock = true;
      
      try {
        // 创建一个安全的深拷贝，确保数据类型保持一致
        const safeDeepClone = (value) => {
          if (value === null || value === undefined) {
            return value;
          }
          
          if (typeof value !== 'object') {
            return value;
          }
          
          if (Array.isArray(value)) {
            return value.map(item => safeDeepClone(item));
          }
          
          const result = {};
          for (const key in value) {
            // 跳过内部属性和方法
            if (key.startsWith('$') || typeof value[key] === 'function') {
              continue;
            }
            result[key] = safeDeepClone(value[key]);
          }
          return result;
        };
        
        // 对数据进行安全深拷贝
        const rawState = toRaw(newState);
        const stateToSync = safeDeepClone(rawState);
        
        // 更新到同步引擎
        engine.setState(storeType, key, stateToSync);
        
        if (options.onUpdate) {
          options.onUpdate(newState, 'local');
        }
        
        if (options.debug) {
          console.log(`[Synced${type === 'ref' ? 'Ref' : 'Reactive'}:${key}] 本地更新 ->`, newState);
        }
      } finally {
        syncLock = false;
      }
    }, SYNC_DEBOUNCE);
  };
  
  // 设置本地变化监听
  if (type === 'ref') {
    // Ref类型监听
    unwatchLocal = watch(localState, (newVal) => {
      syncToRemote(newVal);
    }, { deep: options.deep !== false });
  } else {
    // Reactive类型监听
    unwatchLocal = watch(localState, (newState) => {
      syncToRemote(newState);
    }, { deep: true });
  }
  
  // 设置远程数据变化监听
  unwatchRemote = watch(() => engine.getState(storeType, key), (newState) => {
    syncFromRemote();
  }, { deep: true });
  
  // 监听连接状态
  unwatchConnection = watch(() => engine.isConnected(), (connected) => {
    status.connected = connected;
    
    // 连接状态改变时，主动同步一次
    if (connected) {
      // 给连接一点时间稳定
      setTimeout(() => {
        syncFromRemote(true);
      }, 100);
    }
  });
  
  // 立即尝试同步一次，不等待连接状态变化
  if (engine.isConnected() && engine.hasState(storeType, key)) {
    syncFromRemote(true);
  }
  
  // 返回清理函数
  return {
    cleanup: () => {
      if (unwatchLocal) unwatchLocal();
      if (unwatchRemote) unwatchRemote();
      if (unwatchConnection) unwatchConnection();
      if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
      if (peerCheckInterval) clearInterval(peerCheckInterval);
      
      // 安全地移除事件监听
      try {
        engine.off('peers', updatePeers);
      } catch (e) {
        // 忽略清理错误
        console.warn(`[Sync] 移除对等点监听失败:`, e);
      }
    }
  };
} 