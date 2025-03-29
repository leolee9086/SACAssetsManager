/**
 * @fileoverview 持久化管理器 - 管理IndexedDB持久化存储
 * 
 * 该模块负责YJS文档的本地持久化，提供数据加载、同步和清理功能。
 * 支持优先从本地加载数据，以提高离线使用体验。
 * 
 * @module persistenceManager
 * @requires y-indexeddb
 */

import { IndexeddbPersistence } from '../../../../static/y-indexeddb.js'

// 常量配置
const DEFAULT_LOAD_TIMEOUT = 2000
const DB_NAME_PREFIX = 'y-'

/**
 * 创建持久化管理器
 * @param {Object} options - 配置选项
 * @param {string} options.roomName - 房间名称
 * @param {Object} options.ydoc - Y.Doc实例
 * @param {Object} options.initialState - 初始状态
 * @param {Object} options.store - 数据存储实例
 * @param {Object} options.status - 响应式状态对象
 * @param {Object} options.isLocalDataLoaded - 响应式本地数据加载状态
 * @returns {Promise<Object>} 持久化管理器实例
 */
export async function createPersistenceManager(options) {
  const {
    roomName,
    ydoc,
    initialState = {},
    store,
    status,
    isLocalDataLoaded
  } = options

  let persistence = null

  /**
   * 初始化并加载本地数据
   * @param {number} [timeout=DEFAULT_LOAD_TIMEOUT] - 加载超时时间(ms)
   * @returns {Promise<boolean>} 是否成功加载
   */
  async function initAndLoad(timeout = DEFAULT_LOAD_TIMEOUT) {
    try {
      console.log(`[本地优先] 开始从本地加载房间 ${roomName} 数据...`)
      persistence = new IndexeddbPersistence(roomName, ydoc)
      
      // 创建一个Promise来等待本地数据加载
      await waitForLocalData(timeout)
      
      // 确保状态正确反映
      isLocalDataLoaded.value = true
      return true
      
    } catch (e) {
      console.error(`创建持久化存储时出错:`, e)
      // 处理加载失败的情况
      return handleLoadFailure()
    }
  }

  /**
   * 等待本地数据加载
   * @param {number} timeout - 超时时间
   * @returns {Promise<void>}
   */
  function waitForLocalData(timeout) {
    return new Promise((resolve) => {
      // 如果已加载，直接解析
      if (checkLoaded()) {
        resolve();
        return;
      }
      
      // 设置超时，避免永久等待
      const timeoutId = setTimeout(() => {
        console.warn(`[本地优先] 等待本地数据超时，继续初始化`);
        resolve();
      }, timeout);
      
      // 监听同步事件
      persistence.once('synced', () => {
        clearTimeout(timeoutId);
        handleSyncSuccess();
        resolve();
      });
    });
  }

  /**
   * 检查是否已经加载完毕
   * @returns {boolean} 是否已加载
   */
  function checkLoaded() {
    // IndexedDB已加载完成的标志，可以通过属性检测
    if (persistence?.synced) {
      console.log(`[本地优先] 房间 ${roomName} 本地数据已加载`);
      return true;
    }
    return false;
  }

  /**
   * 处理同步成功
   */
  function handleSyncSuccess() {
    console.log(`[本地优先] 房间 ${roomName} 本地数据同步完成`);
    
    // 在同步完成后，初始化数据（如果本地没有数据）
    const isEmpty = Object.keys(store.state).length === 0;
    if (isEmpty) {
      initializeStateFromDefaults();
    }
    
    status.value = '已从本地加载';
    isLocalDataLoaded.value = true;
  }

  /**
   * 使用默认值初始化状态
   */
  function initializeStateFromDefaults() {
    // 将初始状态填充到同步存储中
    Object.entries(initialState).forEach(([key, value]) => {
      store.state[key] = value;
    });
  }

  /**
   * 处理加载失败的情况
   * @returns {boolean} 始终返回false表示加载失败
   */
  function handleLoadFailure() {
    // 如果本地加载失败，仍然需要标记为已加载，使用初始状态
    isLocalDataLoaded.value = true;
    
    // 使用初始状态
    initializeStateFromDefaults();
    return false;
  }

  /**
   * 销毁持久化实例
   * @returns {boolean} 是否成功销毁
   */
  function destroy() {
    if (persistence) {
      try {
        persistence.destroy();
        console.log(`房间 ${roomName} 持久化存储已销毁`);
        persistence = null;
        return true;
      } catch (e) {
        console.error(`销毁房间 ${roomName} 持久化存储时出错:`, e);
        persistence = null;
        return false;
      }
    }
    return false;
  }

  /**
   * 检查持久化是否已同步
   * @returns {boolean} 是否已同步
   */
  function isSynced() {
    return !!persistence?.synced;
  }

  /**
   * 手动触发同步
   * @returns {Promise<boolean>} 是否成功触发
   */
  async function sync() {
    if (!persistence) return false;

    return new Promise((resolve) => {
      function onSynced() {
        persistence.off('synced', onSynced);
        resolve(true);
      }
      
      persistence.on('synced', onSynced);
      
      // 如果已经同步完成，直接返回
      if (persistence.synced) {
        persistence.off('synced', onSynced);
        resolve(true);
      }
    });
  }

  /**
   * 清除本地数据
   * @returns {Promise<boolean>} 是否成功清除
   */
  async function clearLocalData() {
    // 先销毁当前实例
    destroy();
    
    // 尝试删除IndexedDB数据库
    return deleteDatabase(`${DB_NAME_PREFIX}${roomName}`);
  }

  /**
   * 删除IndexedDB数据库
   * @param {string} dbName - 数据库名称
   * @returns {Promise<boolean>} 是否成功删除
   */
  function deleteDatabase(dbName) {
    return new Promise((resolve) => {
      try {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => {
          console.log(`已清除房间 ${roomName} 的本地数据`);
          resolve(true);
        };
        req.onerror = (event) => {
          console.error(`清除房间 ${roomName} 本地数据时出错:`, event);
          resolve(false);
        };
      } catch (e) {
        console.error(`尝试删除数据库时出错:`, e);
        resolve(false);
      }
    });
  }

  return {
    initAndLoad,
    destroy,
    isSynced,
    sync,
    clearLocalData,
    getPersistence: () => persistence
  };
}

export default {
  createPersistenceManager
} 