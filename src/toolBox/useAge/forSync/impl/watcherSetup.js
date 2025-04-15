/**
 * 监听器设置 - 为同步对象设置监听器
 */

import { watch, toRaw } from '../../../../../static/vue.esm-browser.js';

// 配置常量
const MAX_MERGE_DEPTH = 10; // 最大合并深度
const SYNC_DEBOUNCE = 50;   // 同步防抖时间(ms)

// 更改来源跟踪映射 - 用于标记数据来源
const changeSourceMap = new WeakMap();

// 生成全局唯一的客户端ID
const CLIENT_ID = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

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
  
  // 同步锁与更新标志
  let isApplyingRemoteChanges = false;  // 标记当前是否正在应用远程变更
  let isProcessingLocalChanges = false; // 标记当前是否正在处理本地变更
  let lastSyncTimestamp = 0;            // 最后同步时间戳
  let lastLocalUpdateTime = 0;          // 最后本地更新时间
  
  // 清理变量
  let unwatchLocal = null;
  let unwatchRemote = null;
  let unwatchConnection = null;
  let peerCheckInterval = null;
  
  // 生成同步追踪键 - 用于标识当前同步对象
  const syncTrackKey = `${storeType}:${key}`;
  
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
  
  /**
   * 从远程获取数据并应用到本地
   * @param {boolean} forceSyncNow - 是否立即同步
   * @param {Object} metadata - 元数据信息
   */
  const syncFromRemote = (forceSyncNow = false, metadata = null) => {
    // 如果当前正在处理本地变更，跳过远程同步
    if (isProcessingLocalChanges && !forceSyncNow) return;
    
    // 如果没有连接或状态不存在，直接返回
    if (!status.connected || !engine.hasState(storeType, key)) return;
    
    // 标记正在应用远程变更
    isApplyingRemoteChanges = true;
    
    try {
      const remoteState = engine.getState(storeType, key);
      if (!remoteState) return;
      
      // 解析元数据
      const changeMetadata = metadata || {};
      
      // 如果是本机发出的变更，跳过应用
      if (changeMetadata.clientId === CLIENT_ID) {
        if (options.debug) {
          console.log(`[Synced${type}:${key}] 跳过处理本机发出的远程变更`);
        }
        return;
      }
      
      // 检查时间戳，避免应用过时的数据
      const remoteTimestamp = changeMetadata.timestamp || Date.now();
      if (remoteTimestamp < lastSyncTimestamp && lastSyncTimestamp > 0) {
        if (options.debug) {
          console.log(`[Synced${type}:${key}] 跳过过时的远程数据`, 
                     {remote: remoteTimestamp, local: lastSyncTimestamp});
        }
        return;
      }
      
      // 更新时间戳
      lastSyncTimestamp = remoteTimestamp;
      
      // 应用远程数据
      if (type === 'ref') {
        localState.value = remoteState;
      } else {
        // 使用智能合并处理复杂对象
        smartMergeStates(localState, remoteState);
      }
      
      // 标记数据来源
      changeSourceMap.set(localState, {
        source: 'remote',
        timestamp: remoteTimestamp,
        clientId: changeMetadata.clientId || 'unknown'
      });
      
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
        console.log(`[Synced${type}:${key}] 同步更新 <-`, 
                   type === 'ref' ? localState.value : localState);
      }
    } finally {
      // 完成远程同步后，延迟重置标志，确保Vue的响应式系统有时间处理
      setTimeout(() => {
        isApplyingRemoteChanges = false;
      }, 0);
    }
  };
  
  /**
   * 智能合并状态 - 优化的合并算法，更好地处理数组和嵌套对象
   * @param {Object} target - 目标状态
   * @param {Object} source - 源状态
   * @param {number} depth - 当前递归深度
   */
  const smartMergeStates = (target, source, depth = 0) => {
    if (!target || !source || typeof target !== 'object' || typeof source !== 'object') {
      return;
    }
    
    // 防止过深递归
    if (depth > MAX_MERGE_DEPTH) {
      console.warn(`[Sync] 达到最大合并深度(${MAX_MERGE_DEPTH})，执行浅合并`);
      Object.assign(target, source);
      return;
    }
    
    // 标记处理过的键，用于移除不存在的属性
    const processedKeys = new Set();
    
    // 先处理source中的键
    for (const key in source) {
      // 跳过内部属性和方法
      if (key.startsWith('$') || typeof source[key] === 'function') continue;
      
      processedKeys.add(key);
      const sourceValue = source[key];
      
      // 如果目标不存在此属性，直接创建
      if (!(key in target)) {
        if (Array.isArray(sourceValue)) {
          // 创建新数组并复制内容
          target[key] = [];
          safeReplaceArray(target[key], sourceValue);
        } else if (sourceValue !== null && typeof sourceValue === 'object') {
          // 创建新对象
          target[key] = {};
          smartMergeStates(target[key], sourceValue, depth + 1);
        } else {
          // 基本类型直接赋值
          target[key] = sourceValue;
        }
        continue;
      }
      
      const targetValue = target[key];
      
      // 如果两者都是对象类型，递归合并
      if (typeof sourceValue === 'object' && sourceValue !== null && 
          typeof targetValue === 'object' && targetValue !== null) {
          
        // 数组特殊处理
        if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
          // 检查本地数组是否最近修改过
          const arraySyncKey = `__array_${key}_lastModified`;
          const lastModified = target[arraySyncKey] || 0;
          const timeSinceLastModification = Date.now() - lastModified;
          
          if (timeSinceLastModification < 2000 && lastModified > 0 && 
              lastModified > lastSyncTimestamp) {
            // 本地数组最近被修改过且修改时间晚于远程同步时间，检查是否内容有实质差异
            const localJSON = JSON.stringify(targetValue);
            const remoteJSON = JSON.stringify(sourceValue);
            
            if (localJSON !== remoteJSON) {
              // 如果内容不同，尝试智能合并而非覆盖
              smartMergeArrays(targetValue, sourceValue);
            }
          } else {
            // 没有近期修改或差异较大，使用安全替换
            safeReplaceArray(targetValue, sourceValue);
          }
        } else if (!Array.isArray(sourceValue) && !Array.isArray(targetValue)) {
          // 普通对象递归合并
          smartMergeStates(targetValue, sourceValue, depth + 1);
        } else {
          // 类型不匹配，直接替换
          if (Array.isArray(sourceValue)) {
            target[key] = [];
            safeReplaceArray(target[key], sourceValue);
          } else {
            target[key] = {};
            smartMergeStates(target[key], sourceValue, depth + 1);
          }
        }
      } else if (targetValue !== sourceValue) {
        // 非对象或类型不匹配，直接替换
        target[key] = sourceValue;
      }
    }
    
    // 删除远程不存在的属性
    Object.keys(target).forEach(key => {
      // 保留内部属性和方法
      if (key.startsWith('$') || key.startsWith('__') || typeof target[key] === 'function') return;
      
      // 删除没有处理过的键（即远程不存在的）
      if (!processedKeys.has(key)) {
        delete target[key];
      }
    });
  };
  
  /**
   * 安全替换数组内容
   * @param {Array} targetArray - 目标数组
   * @param {Array} sourceArray - 源数组
   */
  const safeReplaceArray = (targetArray, sourceArray) => {
    // 清空目标数组但保留引用
    targetArray.length = 0;
    
    // 将源数组内容复制到目标数组
    for (let i = 0; i < sourceArray.length; i++) {
      const item = sourceArray[i];
      if (item !== null && typeof item === 'object') {
        // 对象和数组需要深拷贝
        targetArray.push(deepClone(item));
      } else {
        // 基本类型直接添加
        targetArray.push(item);
      }
    }
  };
  
  /**
   * 检查数组是否包含ID标识
   * @param {Array} array - 要检查的数组
   * @returns {boolean} 是否包含ID
   */
  const checkArrayHasIds = (array) => {
    if (!Array.isArray(array) || array.length === 0) return false;
    
    // 检查前5个元素或全部元素（取较小值）
    const checkCount = Math.min(5, array.length);
    let idCount = 0;
    
    for (let i = 0; i < checkCount; i++) {
      const item = array[i];
      if (item && typeof item === 'object') {
        if (item.id !== undefined || item.ID !== undefined || item._id !== undefined) {
          idCount++;
        }
      }
    }
    
    // 如果超过半数元素有ID，认为是带ID的数组
    return idCount >= Math.ceil(checkCount / 2);
  };
  
  /**
   * 智能合并数组 - 尽量保留本地数组的修改
   * @param {Array} targetArray - 目标数组
   * @param {Array} sourceArray - 源数组
   */
  const smartMergeArrays = (targetArray, sourceArray) => {
    // 如果目标数组为空，直接复制源数组内容
    if (targetArray.length === 0) {
      for (let i = 0; i < sourceArray.length; i++) {
        targetArray.push(deepClone(sourceArray[i]));
      }
      return;
    }
    
    // 如果源数组为空，保留目标数组不变
    if (sourceArray.length === 0) {
      return;
    }
    
    // 检查数组元素是否有ID属性，如果有则基于ID合并
    const hasIds = checkArrayHasIds(targetArray) && checkArrayHasIds(sourceArray);
    
    if (hasIds) {
      // 基于ID合并数组
      mergeArraysById(targetArray, sourceArray);
    } else {
      // 没有ID，进行简单合并 - 尝试保留本地顺序和内容
      if (targetArray.length <= sourceArray.length) {
        // 本地数组较短，更新现有项并添加新项
        for (let i = 0; i < sourceArray.length; i++) {
          if (i < targetArray.length) {
            // 如果是对象类型，递归合并
            if (typeof targetArray[i] === 'object' && targetArray[i] !== null &&
                typeof sourceArray[i] === 'object' && sourceArray[i] !== null) {
              smartMergeStates(targetArray[i], sourceArray[i]);
            } else {
              targetArray[i] = deepClone(sourceArray[i]);
            }
          } else {
            // 添加新项
            targetArray.push(deepClone(sourceArray[i]));
          }
        }
      } else {
        // 本地数组较长，考虑保留一些本地项
        const existingLength = targetArray.length;
        // 更新前N项（N为源数组长度）
        for (let i = 0; i < sourceArray.length; i++) {
          // 如果是对象类型，递归合并
          if (typeof targetArray[i] === 'object' && targetArray[i] !== null &&
              typeof sourceArray[i] === 'object' && sourceArray[i] !== null) {
            smartMergeStates(targetArray[i], sourceArray[i]);
          } else {
            targetArray[i] = deepClone(sourceArray[i]);
          }
        }
        // 移除多余项
        targetArray.splice(sourceArray.length, existingLength - sourceArray.length);
      }
    }
  };
  
  /**
   * 基于ID合并数组
   * @param {Array} targetArray - 目标数组
   * @param {Array} sourceArray - 源数组
   */
  const mergeArraysById = (targetArray, sourceArray) => {
    // 创建ID映射
    const targetMap = new Map();
    const sourceMap = new Map();
    
    // 获取ID字段名
    const getIdField = (item) => {
      if (item.id !== undefined) return 'id';
      if (item.ID !== undefined) return 'ID';
      if (item._id !== undefined) return '_id';
      return null;
    };
    
    // 构建目标数组的ID映射
    for (let i = 0; i < targetArray.length; i++) {
      const item = targetArray[i];
      if (item && typeof item === 'object') {
        const idField = getIdField(item);
        if (idField) {
          targetMap.set(item[idField], { item, index: i });
        }
      }
    }
    
    // 构建源数组的ID映射
    for (let i = 0; i < sourceArray.length; i++) {
      const item = sourceArray[i];
      if (item && typeof item === 'object') {
        const idField = getIdField(item);
        if (idField) {
          sourceMap.set(item[idField], { item, index: i });
        }
      }
    }
    
    // 处理已存在项的更新
    const processedIds = new Set();
    for (const [id, { item: sourceItem }] of sourceMap.entries()) {
      if (targetMap.has(id)) {
        // 更新现有项
        const { item: targetItem, index } = targetMap.get(id);
        
        // 如果两者都是对象，递归合并
        if (typeof targetItem === 'object' && typeof sourceItem === 'object') {
          smartMergeStates(targetItem, sourceItem);
        }
        
        processedIds.add(id);
      }
    }
    
    // 创建新数组用于存放结果
    const resultArray = [];
    
    // 先添加源数组中的项，保持源数组的顺序
    for (let i = 0; i < sourceArray.length; i++) {
      const item = sourceArray[i];
      if (item && typeof item === 'object') {
        const idField = getIdField(item);
        if (idField) {
          const id = item[idField];
          if (targetMap.has(id)) {
            // 使用已更新的目标项
            resultArray.push(targetMap.get(id).item);
            processedIds.add(id);
          } else {
            // 源数组中新增的项
            resultArray.push(deepClone(item));
          }
        } else {
          // 没有ID的项，直接添加
          resultArray.push(deepClone(item));
        }
      } else {
        // 基本类型直接添加
        resultArray.push(item);
      }
    }
    
    // 添加目标数组中源数组不存在的项（保留本地唯一项）
    for (let i = 0; i < targetArray.length; i++) {
      const item = targetArray[i];
      if (item && typeof item === 'object') {
        const idField = getIdField(item);
        if (idField) {
          const id = item[idField];
          if (!processedIds.has(id)) {
            resultArray.push(item);
            processedIds.add(id);
          }
        }
      }
    }
    
    // 将结果复制回目标数组
    targetArray.length = 0;
    for (let i = 0; i < resultArray.length; i++) {
      targetArray.push(resultArray[i]);
    }
  };
  
  /**
   * 将本地数据同步到远程
   * @param {any} newState - 新状态
   */
  const syncToRemote = (newState) => {
    // 如果正在应用远程变更，跳过本地同步
    if (isApplyingRemoteChanges) return;
    
    // 断线状态不同步
    if (!status.connected) return;
    
    // 标记正在处理本地变更
    isProcessingLocalChanges = true;
    
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
      
      // 记录本次更新时间戳
      const currentTimestamp = Date.now();
      lastLocalUpdateTime = currentTimestamp;
      
      // 对于数组修改，记录修改时间戳到父对象上
      if (type === 'reactive') {
        Object.keys(newState).forEach(key => {
          if (Array.isArray(newState[key])) {
            // 添加隐藏属性记录修改时间
            newState[`__array_${key}_lastModified`] = currentTimestamp;
          }
        });
      }
      
      // 准备元数据
      const metadata = {
        source: 'local',
        timestamp: currentTimestamp,
        clientId: CLIENT_ID
      };
      
      // 对数据进行安全深拷贝
      const rawState = toRaw(newState);
      const stateToSync = safeDeepClone(rawState);
      
      // 更新到同步引擎，同时传递元数据
      engine.setState(storeType, key, stateToSync, metadata);
      
      // 记录最后同步时间戳
      lastSyncTimestamp = currentTimestamp;
      
      // 更新同步状态
      status.lastSync = currentTimestamp;
      
      // 标记此对象的变更来源
      changeSourceMap.set(localState, metadata);
      
      // 触发回调
      if (options.onUpdate) {
        options.onUpdate(newState, 'local');
      }
      
      if (options.debug) {
        console.log(`[Synced${type}:${key}] 同步更新 ->`, 
          type === 'ref' ? newState : Object.keys(newState));
      }
    } catch (err) {
      console.error(`[Synced${type}:${key}] 同步失败:`, err);
    } finally {
      // 延迟重置处理标志，确保Vue响应式系统有时间处理
      setTimeout(() => {
        isProcessingLocalChanges = false;
      }, 0);
    }
  };
  
  // 设置连接状态监听
  unwatchConnection = watch(() => engine.isConnected(), (connected) => {
    status.connected = connected;
    
    if (connected) {
      if (options.debug) {
        console.log(`[Synced${type}:${key}] 连接已建立`);
      }
      
      // 连接后立即同步一次
      syncFromRemote(true);
      
      // 更新对等点数量
      updatePeers();
    } else {
      if (options.debug) {
        console.log(`[Synced${type}:${key}] 连接已断开`);
      }
      
      // 断开连接时清空对等点
      status.peers = new Set();
    }
  }, { immediate: true });
  
  // 设置本地状态变化监听
  if (type === 'ref') {
    // 对于ref类型，监听value的变化
    unwatchLocal = watch(() => localState.value, (newVal) => {
      // 如果是远程变更触发的更新，跳过同步
      if (isApplyingRemoteChanges) return;
      
      // 获取上次变更的来源
      const lastChangeSource = changeSourceMap.get(localState);
      
      // 如果上次变更是远程触发的且时间非常接近，可能是响应式系统的重复通知，跳过
      if (lastChangeSource && lastChangeSource.source === 'remote') {
        const timeSinceLastSync = Date.now() - (lastChangeSource.timestamp || 0);
        if (timeSinceLastSync < 100) {
          // 极短时间内收到的重复更新，跳过
          return;
        }
      }
      
      // 同步到远程
      syncToRemote(newVal);
    }, { deep: options.deep !== false });
  } else {
    // 对于reactive类型，深度监听整个对象
    unwatchLocal = watch(localState, (newState) => {
      // 如果是远程变更触发的更新，跳过同步
      if (isApplyingRemoteChanges) return;
      
      // 获取上次变更的来源
      const lastChangeSource = changeSourceMap.get(localState);
      
      // 如果上次变更是远程触发的且时间非常接近，可能是响应式系统的重复通知，跳过
      if (lastChangeSource && lastChangeSource.source === 'remote') {
        const timeSinceLastSync = Date.now() - (lastChangeSource.timestamp || 0);
        if (timeSinceLastSync < 100) {
          // 极短时间内收到的重复更新，跳过
          return;
        }
      }
      
      // 同步到远程
      syncToRemote(newState);
    }, { deep: true });
  }
  
  // 如果存在store并可以监听同步事件，则设置监听
  if (engine && typeof engine.on === 'function') {
    try {
      // 监听同步事件 - 这是远程数据到达的入口点
      engine.on('sync', (metadata) => {
        if (options.debug) {
          console.log(`[Synced${type}:${key}] 收到同步事件`, metadata);
        }
        
        syncFromRemote(false, metadata);
      });
    } catch (err) {
      console.warn(`[Synced${type}:${key}] 设置sync事件监听失败:`, err);
    }
  }
  
  // 返回清理函数
  return function cleanup() {
    // 清理所有监听
    if (unwatchLocal) unwatchLocal();
    if (unwatchRemote) unwatchRemote();
    if (unwatchConnection) unwatchConnection();
    
    // 清理定时器
    if (peerCheckInterval) {
      clearInterval(peerCheckInterval);
      peerCheckInterval = null;
    }
  };
} 