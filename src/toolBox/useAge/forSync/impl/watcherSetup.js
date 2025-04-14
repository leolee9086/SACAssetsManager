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
          // 对于reactive类型，需要更新所有属性
          const remoteKeys = Object.keys(remoteState);
          const localKeys = Object.keys(localState);
          
          // 更新或添加远程状态中的属性
          for (const k of remoteKeys) {
            const remoteValue = remoteState[k];
            // 如果是数值类型且不同，或者其他类型且值不同，进行更新
            const needsUpdate = (
              typeof remoteValue === 'number' && localState[k] !== remoteValue
            ) || JSON.stringify(localState[k]) !== JSON.stringify(remoteValue);
            
            if (needsUpdate) {
              localState[k] = remoteValue;
            }
          }
          
          // 删除不存在于远程的属性
          for (const k of localKeys) {
            if (!remoteKeys.includes(k)) {
              delete localState[k];
            }
          }
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
        // 对数据进行深拷贝，确保数值类型变更也被同步
        const rawState = toRaw(newState);
        const stateToSync = deepClone(rawState);
        
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