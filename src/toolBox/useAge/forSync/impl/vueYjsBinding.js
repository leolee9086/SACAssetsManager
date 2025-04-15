/**
 * Vue和Yjs之间的双向绑定实现
 * 支持响应式数据与Yjs文档的同步
 * 
 * @module vueYjsBinding
 */

import { ref, watch, toRaw, reactive, nextTick } from '../../../../../static/vue.esm-browser.js';
import * as Y from '../../../../../static/yjs.js';
// 导入内置高性能防抖实现替代内部简单实现
import { 智能防抖 as adaptiveDebounce } from '../../../base/useEcma/forFunctions/forDebounce.js';

/**
 * 创建Vue-Yjs绑定
 * @param {Y.Doc} ydoc - Yjs文档
 * @param {any} initialValue - 初始值
 * @param {Object} options - 绑定选项
 * @returns {Object} 绑定对象
 */
export function createVueYjsBinding(ydoc, initialValue, options = {}) {
  const {
    rootKey = 'default',
    debug = false,
    deepMerge = true,
    mergeArrays = false, 
    arrayRefresh = 100,
    debounceTime = 450, // 大幅增加默认防抖时间
    dataFilter = null,  // 允许外部提供数据过滤函数
    batchUpdates = true, // 默认启用批量更新
    dirtyCheckThrottle = 800, // 大幅增加脏检查节流时间
    updateThreshold = 5, // 添加更新阈值，如果在短时间内达到此阈值则暂停更新
    updateCooldown = 3000, // 添加更新冷却时间
    strictChecking = true, // 启用更严格的变更检查
    enableFeedbackDetection = true // 启用互激循环检测
  } = options;
  
  // 调试日志
  const log = debug ? (...args) => console.log('[VueYjsBinding]', ...args) : () => {};
  
  // 获取Yjs根对象 - 添加错误处理
  let ymap;
  try {
    // 确保states映射存在
    if (!ydoc.get('states')) {
      ydoc.getMap('states');
    }
    
    // 获取或创建rootKey映射
    ymap = ydoc.getMap(rootKey);
  } catch (err) {
    console.error('[VueYjsBinding] 获取Yjs映射失败:', err);
    
    // 尝试获取states映射作为备选
    try {
      ymap = ydoc.getMap('states');
    } catch (err2) {
      console.error('[VueYjsBinding] 无法获取states映射，尝试创建基本映射');
      
      // 重新创建基本映射结构
      try {
        // 尝试创建基本结构并获取root映射
        const statesMap = ydoc.getMap('states');
        const rootMap = ydoc.getMap('root');
        ymap = rootMap;
        
        // 确保有meta映射记录信息
        ydoc.getMap('meta').set('lastInit', Date.now());
      } catch (err3) {
        console.error('[VueYjsBinding] 严重错误: 无法创建基本Yjs结构:', err3);
        // 创建未连接的临时映射
        ymap = new Y.Map();
      }
    }
  }
  
  // 锁定标志，防止循环更新
  let isUpdatingFromYjs = false;
  let isUpdatingFromVue = false;
  
  // 增加全局锁，阻止递归调用
  let updateLock = false;  
  let nestLevel = 0;
  const MAX_NEST_LEVEL = 3;
  
  // 新增：增加更新冷却机制
  let updateCount = 0;
  let lastUpdateCountReset = Date.now();
  let isUpdateCoolingDown = false;
  
  // 新增：互激循环检测
  const recentUpdates = [];
  const MAX_RECENT_UPDATES = 20;
  const FEEDBACK_DETECTION_INTERVAL = 1000; // 1秒内检测
  const FEEDBACK_THRESHOLD = 10; // 如果1秒内有10次交替更新，判定为互激循环
  
  // 存储引用绑定
  let boundRef = null;
  let refUnwatch = null;
  
  // 存储对象绑定
  let reactiveProxy = null;
  let yObserverDisposers = [];
  
  // 增加脏状态检查，避免无变化的更新
  let lastUpdateTime = 0;
  let lastStateHash = null;
  let pendingUpdates = 0;
  let isProcessingUpdate = false;
  
  // 新增：值缓存系统，用于在互激循环中恢复正确状态
  const valueCache = {
    vue: new Map(), // 缓存Vue端的值
    yjs: new Map(), // 缓存Yjs端的值
    lastUpdatedSide: null, // 最后更新的是哪一侧
    
    // 缓存Vue值
    cacheVueValue(key, value) {
      try {
        const serialized = typeof value === 'object' ? simpleHash(value) : String(value);
        this.vue.set(key, {
          value,
          hash: serialized,
          time: Date.now()
        });
        this.lastUpdatedSide = 'vue';
      } catch (e) {
        console.error('[VueYjsBinding] 缓存Vue值失败:', e);
      }
    },
    
    // 缓存Yjs值
    cacheYjsValue(key, value) {
      try {
        const serialized = typeof value === 'object' && !(value instanceof Y.Map) && !(value instanceof Y.Array) ? 
            simpleHash(value) : String(value);
        this.yjs.set(key, {
          value,
          hash: serialized,
          time: Date.now()
        });
        this.lastUpdatedSide = 'yjs';
      } catch (e) {
        console.error('[VueYjsBinding] 缓存Yjs值失败:', e);
      }
    },
    
    // 确定哪一侧的值应该优先使用（解决冲突）
    resolveConflict(key) {
      const vueEntry = this.vue.get(key);
      const yjsEntry = this.yjs.get(key);
      
      if (!vueEntry) return 'yjs';
      if (!yjsEntry) return 'vue';
      
      // 默认情况下，使用最新的值
      return vueEntry.time > yjsEntry.time ? 'vue' : 'yjs';
    },
    
    // 获取应该使用的值
    getResolvedValue(key) {
      const winner = this.resolveConflict(key);
      return winner === 'vue' ? this.vue.get(key).value : this.yjs.get(key).value;
    },
    
    // 清理过期缓存
    cleanup(maxAge = 60000) { // 默认60秒
      const now = Date.now();
      for (const [key, entry] of this.vue.entries()) {
        if (now - entry.time > maxAge) {
          this.vue.delete(key);
        }
      }
      for (const [key, entry] of this.yjs.entries()) {
        if (now - entry.time > maxAge) {
          this.yjs.delete(key);
        }
      }
    }
  };
  
  // 定期清理缓存
  setInterval(() => valueCache.cleanup(), 60000);
  
  /**
   * 自动恢复系统，在互激循环后恢复正确状态
   */
  function recoverFromFeedbackLoop() {
    console.info('[VueYjsBinding] 尝试从互激循环中恢复...');
    
    // 确定哪一侧的值应该作为真相源
    const sourceSide = valueCache.lastUpdatedSide || 'vue'; // 默认使用Vue端
    
    try {
      if (reactiveProxy) {
        // 对象绑定的情况
        if (sourceSide === 'vue') {
          // 从Vue恢复到Yjs - 先禁用所有观察者
          isUpdatingFromVue = true;
          
          // 获取Vue当前状态
          const currentState = toRaw(reactiveProxy);
          console.info('[VueYjsBinding] 从Vue恢复到Yjs (对象)');
          
          // 强制更新Yjs
          setTimeout(() => {
            safeApplyToYjs(ymap, currentState);
            isUpdatingFromVue = false;
          }, 0);
        } else {
          // 从Yjs恢复到Vue
          isUpdatingFromYjs = true;
          console.info('[VueYjsBinding] 从Yjs恢复到Vue (对象)');
          
          // 强制更新Vue
          setTimeout(() => {
            safeApplyFromYjs(reactiveProxy, ymap);
            isUpdatingFromYjs = false;
          }, 0);
        }
      } else if (boundRef) {
        // Ref绑定的情况
        if (sourceSide === 'vue') {
          // 从Vue恢复到Yjs
          isUpdatingFromVue = true;
          const currentValue = boundRef.value;
          console.info('[VueYjsBinding] 从Vue恢复到Yjs (ref)');
          
          // 强制更新Yjs
          setTimeout(() => {
            ymap.set('value', currentValue);
            isUpdatingFromVue = false;
          }, 0);
        } else {
          // 从Yjs恢复到Vue
          isUpdatingFromYjs = true;
          const yjsValue = ymap.get('value');
          console.info('[VueYjsBinding] 从Yjs恢复到Vue (ref)');
          
          // 强制更新Vue
          setTimeout(() => {
            boundRef.value = yjsValue;
            isUpdatingFromYjs = false;
          }, 0);
        }
      }
      
      // 清空互激循环检测历史
      recentUpdates.length = 0;
    } catch (e) {
      console.error('[VueYjsBinding] 恢复失败:', e);
    }
  }
  
  /**
   * 记录更新并检测互激循环 - 增强版，添加自动恢复功能
   * @param {string} source 更新来源 ('vue' 或 'yjs')
   * @returns {boolean} 是否检测到互激循环
   */
  function recordUpdateAndDetectFeedback(source) {
    if (!enableFeedbackDetection) return false;
    
    const now = Date.now();
    
    // 清理过期记录
    while (recentUpdates.length > 0 && now - recentUpdates[0].time > FEEDBACK_DETECTION_INTERVAL) {
      recentUpdates.shift();
    }
    
    // 添加新记录
    recentUpdates.push({ source, time: now });
    if (recentUpdates.length > MAX_RECENT_UPDATES) {
      recentUpdates.shift();
    }
    
    // 如果记录太少，不可能有互激循环
    if (recentUpdates.length < FEEDBACK_THRESHOLD) return false;
    
    // 检查是否存在交替更新模式
    let alternatingCount = 0;
    for (let i = 1; i < recentUpdates.length; i++) {
      if (recentUpdates[i].source !== recentUpdates[i-1].source) {
        alternatingCount++;
      }
    }
    
    // 如果交替更新次数超过阈值，判定为互激循环
    if (alternatingCount >= FEEDBACK_THRESHOLD) {
      console.error(`[VueYjsBinding] 检测到互激循环! ${FEEDBACK_THRESHOLD}次交替更新在${FEEDBACK_DETECTION_INTERVAL}ms内`);
      
      // 触发冷却
      isUpdateCoolingDown = true;
      
      // 延迟一段时间后尝试自动恢复
      setTimeout(() => {
        // 尝试恢复到正确状态
        recoverFromFeedbackLoop();
        
        // 然后结束冷却
        setTimeout(() => {
          console.info('[VueYjsBinding] 互激循环冷却结束，恢复正常更新');
          isUpdateCoolingDown = false;
          // 清空记录
          recentUpdates.length = 0;
        }, 1000); // 恢复后再等待1秒
      }, updateCooldown); // 等待冷却时间后恢复
      
      return true;
    }
    
    return false;
  }
  
  /**
   * 简单对象哈希计算，用于脏检查 - 增强版
   */
  function simpleHash(obj) {
    if (!obj || typeof obj !== 'object') return String(obj);
    
    try {
      if (strictChecking) {
        // 使用严格模式，排除Vue内部属性后再计算哈希
        const cleanObj = Object.create(null);
        Object.entries(toRaw(obj)).forEach(([key, value]) => {
          if (!key.startsWith('__v_') && !key.startsWith('_') && 
              !key.startsWith('$') && typeof value !== 'function') {
            cleanObj[key] = value;
          }
        });
        return JSON.stringify(cleanObj);
      } else {
        // 常规模式，直接序列化
        return JSON.stringify(obj);
      }
    } catch (e) {
      // 如果序列化失败，退回到简单对象哈希
      return Object.keys(obj).sort().map(k => {
        if (k.startsWith('__v_') || k.startsWith('_') || k.startsWith('$')) return '';
        return `${k}:${typeof obj[k]}`;
      }).filter(Boolean).join('|');
    }
  }
  
  /**
   * 检查是否是脏更新（是否有真实变化）- 增强版
   */
  function isDirtyUpdate(newVal) {
    const now = Date.now();
    
    // 冷却检查：如果更新太频繁则进入冷却状态
    if (now - lastUpdateCountReset > 1000) {
      // 每秒重置计数
      updateCount = 0;
      lastUpdateCountReset = now;
      
      // 非互激循环检测时才重置冷却状态
      if (!recordUpdateAndDetectFeedback('vue')) {
        isUpdateCoolingDown = false;
      }
    } else {
      updateCount++;
      
      // 如果短时间内更新次数超过阈值，进入冷却状态
      if (updateCount > updateThreshold && !isUpdateCoolingDown) {
        console.warn(`[VueYjsBinding] 检测到高频更新 (${updateCount}次/秒)，进入冷却状态`);
        isUpdateCoolingDown = true;
        setTimeout(() => {
          console.info('[VueYjsBinding] 更新冷却结束，恢复正常更新');
          isUpdateCoolingDown = false;
          updateCount = 0;
        }, updateCooldown);
      }
    }
    
    // 如果处于冷却状态，拒绝所有更新
    if (isUpdateCoolingDown) {
      return false;
    }
    
    // 如果时间间隔太短，视为脏更新
    if (now - lastUpdateTime < dirtyCheckThrottle) {
      pendingUpdates++;
      return false;
    }
    
    // 尝试通过哈希比较 - 使用增强的哈希函数
    try {
      const currentHash = simpleHash(newVal);
      
      // 如果哈希相同，没有变化
      if (currentHash === lastStateHash) {
        return false;
      }
      
      // 更新哈希和时间
      lastStateHash = currentHash;
      lastUpdateTime = now;
      return true;
    } catch (e) {
      // 如果哈希计算失败，执行更保守的检查
      if (now - lastUpdateTime < dirtyCheckThrottle * 2) {
        return false; // 更保守的时间检查
      }
      lastUpdateTime = now;
      return true;
    }
  }
  
  // 初始化Yjs，如果需要
  if (ymap.size === 0 && initialValue !== undefined) {
    safeApplyToYjs(ymap, initialValue);
  }
  
  /**
   * 安全执行函数，防止递归调用 - 增强版
   * @param {Function} fn - 要执行的函数
   * @returns {any} 函数结果
   */
  function safeExecute(fn) {
    // 如果处于冷却状态，拒绝所有操作
    if (isUpdateCoolingDown) {
      return;
    }
    
    // 检查递归深度
    if (nestLevel > MAX_NEST_LEVEL) {
      console.warn('[VueYjsBinding] 检测到可能的递归调用，跳过更新');
      // 触发冷却机制
      isUpdateCoolingDown = true;
      setTimeout(() => {
        isUpdateCoolingDown = false;
        nestLevel = 0; // 重置嵌套级别
      }, updateCooldown);
      return;
    }
    
    // 检查全局锁
    if (updateLock) {
      return;
    }
    
    updateLock = true;
    nestLevel++;
    
    try {
      // 使用定时器确保锁不会永久阻塞
      const timeoutId = setTimeout(() => {
        console.warn('[VueYjsBinding] 更新操作超时，强制释放锁');
        updateLock = false;
        nestLevel = 0;
        isUpdateCoolingDown = true; // 进入冷却状态
        setTimeout(() => {
          isUpdateCoolingDown = false;
        }, updateCooldown);
      }, 2000);
      
      const result = fn();
      
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      console.error('[VueYjsBinding] 安全执行失败:', err);
      // 出错时也进入冷却状态
      isUpdateCoolingDown = true;
      setTimeout(() => {
        isUpdateCoolingDown = false;
      }, updateCooldown / 2); // 错误后冷却时间较短
    } finally {
      updateLock = false;
      nestLevel--;
    }
  }
  
  /**
   * 安全地将值应用到Yjs
   * @param {Y.Map|Y.Array} yTarget - Yjs目标
   * @param {any} value - 要应用的值
   */
  function safeApplyToYjs(yTarget, value) {
    if (value === undefined || value === null) return;
    
    if (isUpdatingFromYjs) {
      // 如果当前正在从Yjs更新，则跳过
      return;
    }
    
    // 记录更新源并检测互激循环
    if (recordUpdateAndDetectFeedback('vue')) {
      // 如果检测到互激循环，跳过更新
      return;
    }
    
    // 缓存值用于可能的恢复
    if (value && typeof value === 'object') {
      valueCache.cacheVueValue('root', value);
    }
    
    safeExecute(() => {
      isUpdatingFromVue = true;
      try {
        // 处理数组
        if (Array.isArray(value) && yTarget instanceof Y.Array) {
          updateYjsArray(yTarget, value);
        } 
        // 处理对象
        else if (typeof value === 'object' && !(value instanceof Date) && yTarget instanceof Y.Map) {
          updateYjsMap(yTarget, value);
        } 
        // 处理简单值 - ref的情况
        else if (!(yTarget instanceof Y.Map || yTarget instanceof Y.Array)) {
          log('更新简单Yjs值:', value);
          yTarget.set(value);
        }
      } catch (err) {
        console.error('[VueYjsBinding] Yjs更新错误:', err);
      } finally {
        isUpdatingFromVue = false;
      }
    });
  }
  
  /**
   * 更新Yjs数组
   * @param {Y.Array} yarray - Yjs数组
   * @param {Array} array - 本地数组
   */
  function updateYjsArray(yarray, array) {
    log('更新Yjs数组:', array);
    
    try {
      // 清空数组并重新插入以保持索引一致
      yarray.delete(0, yarray.length);
      
      // 插入新元素
      array.forEach((item, index) => {
        try {
          if (item === undefined) {
            // 跳过undefined值，Yjs不支持
            yarray.insert(index, [null]);
          } else if (item === null) {
            yarray.insert(index, [null]);
          } else if (typeof item === 'object' && !(item instanceof Date)) {
            if (Array.isArray(item)) {
              const nestedArray = new Y.Array();
              updateYjsArray(nestedArray, item);
              yarray.insert(index, [nestedArray]);
            } else {
              const nestedMap = new Y.Map();
              updateYjsMap(nestedMap, item);
              yarray.insert(index, [nestedMap]);
            }
          } else if (typeof item === 'function' || typeof item === 'symbol') {
            // 跳过不支持的类型，用null替代
            log(`数组项 ${index} 类型不支持 (${typeof item})，已转换为null`);
            yarray.insert(index, [null]);
          } else if (item instanceof Date) {
            yarray.insert(index, [item.toISOString()]);
          } else if (typeof item === 'number' && (isNaN(item) || !isFinite(item))) {
            // 处理特殊数值
            if (isNaN(item)) {
              yarray.insert(index, ['NaN']);
            } else if (item === Infinity) {
              yarray.insert(index, ['Infinity']);
            } else if (item === -Infinity) {
              yarray.insert(index, ['-Infinity']);
            }
          } else if (typeof item === 'bigint') {
            yarray.insert(index, [item.toString()]);
          } else {
            yarray.insert(index, [item]);
          }
        } catch (itemErr) {
          console.error(`[VueYjsBinding] 插入数组项 ${index} 失败:`, itemErr);
          // 尝试转换为字符串
          try {
            const safeItem = typeof item === 'object' ? JSON.stringify(item) : String(item);
            yarray.insert(index, [safeItem]);
          } catch (convErr) {
            // 实在不行就插入null
            yarray.insert(index, [null]);
          }
        }
      });
    } catch (err) {
      console.error('[VueYjsBinding] 更新数组失败:', err);
    }
  }
  
  /**
   * 更新Yjs映射
   * @param {Y.Map} ymap - Yjs映射
   * @param {Object} obj - 本地对象
   */
  function updateYjsMap(ymap, obj) {
    // 首先检查是否存在实际变化，避免无限循环
    let hasChanges = false;
    const currentObj = Object.create(null);
    
    // 获取原始对象
    const rawObj = toRaw(obj);
    
    // 首先将ymap内容提取到普通对象，用于比较
    const originalObj = Object.create(null);
    ymap.forEach((value, key) => {
      if (!(value instanceof Y.Map) && !(value instanceof Y.Array)) {
        originalObj[key] = value;
      } else {
        // 对于嵌套结构，只记录其存在
        originalObj[key] = value instanceof Y.Map ? '[object]' : '[array]';
      }
    });
    
    // 提取当前obj内容，过滤Vue内部属性
    Object.entries(rawObj).forEach(([key, value]) => {
      // 过滤Vue内部属性
      if (key.startsWith('__v_') || key.startsWith('_') || key === '__proto__' || 
          key.startsWith('$') || typeof value === 'function') {
        return;
      }
      
      if (value === undefined) {
        return;
      }
      
      if (value === null) {
        currentObj[key] = null;
        return;
      }
      
      if (typeof value === 'object' && !(value instanceof Date)) {
        // 对于对象，只记录其基本类型
        currentObj[key] = Array.isArray(value) ? '[array]' : '[object]';
      } else {
        currentObj[key] = value;
      }
    });
    
    // 检测是否有变化
    for (const key in currentObj) {
      if (!(key in originalObj) || originalObj[key] !== currentObj[key]) {
        hasChanges = true;
        break;
      }
    }
    
    for (const key in originalObj) {
      if (!(key in currentObj)) {
        hasChanges = true;
        break;
      }
    }
    
    // 如果没有变化，直接返回避免无限循环
    if (!hasChanges) {
      return;
    }
    
    log('Yjs Map有实际变化，进行更新');
    
    // 删除不再存在的属性
    Array.from(ymap.keys()).forEach(key => {
      if (!(key in rawObj)) {
        ymap.delete(key);
      }
    });
    
    // 更新或设置新属性
    Object.entries(rawObj).forEach(([key, value]) => {
      // 过滤Vue内部属性 - 这是互激循环的根源
      if (key.startsWith('__v_') || key.startsWith('_') || key === '__proto__') {
        return;
      }
      
      // 过滤内部属性和方法
      if (key.startsWith('$') || typeof value === 'function') {
        return;
      }
      
      if (value === undefined) {
        // 跳过未定义的值
        return;
      }
      
      if (value === null) {
        ymap.set(key, null);
        return;
      }
      
      // 安全类型处理 - Yjs只支持特定类型
      try {
        if (typeof value === 'object' && !(value instanceof Date)) {
          // 检查是否有循环引用 - 这也是栈溢出的一个原因
          if (hasCircularReference(value)) {
            console.warn(`[VueYjsBinding] 跳过循环引用对象: ${key}`);
            ymap.set(key, null);
            return;
          }
          
          // 处理嵌套对象和数组
          if (Array.isArray(value)) {
            let yarray = ymap.get(key);
            
            if (!(yarray instanceof Y.Array)) {
              yarray = new Y.Array();
              ymap.set(key, yarray);
            }
            
            updateYjsArray(yarray, value);
          } else if (value !== null) {
            let nestedMap = ymap.get(key);
            
            if (!(nestedMap instanceof Y.Map)) {
              nestedMap = new Y.Map();
              ymap.set(key, nestedMap);
            }
            
            updateYjsMap(nestedMap, value);
          }
        } else if (typeof value === 'function' || typeof value === 'symbol') {
          // 跳过不支持的类型
          log(`跳过不支持的类型: ${key} (${typeof value})`);
        } else if (value instanceof Date) {
          // 日期转换为ISO字符串
          ymap.set(key, value.toISOString());
        } else if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
          // 处理特殊数值
          if (isNaN(value)) {
            ymap.set(key, 'NaN');
          } else if (value === Infinity) {
            ymap.set(key, 'Infinity');
          } else if (value === -Infinity) {
            ymap.set(key, '-Infinity');
          }
        } else if (typeof value === 'bigint') {
          // BigInt转换为字符串
          ymap.set(key, value.toString());
        } else {
          // 处理简单值 (字符串、数字、布尔值)
          ymap.set(key, value);
        }
      } catch (err) {
        console.error(`[VueYjsBinding] 设置属性 "${key}" 失败:`, err);
        // 尝试安全转换为字符串
        try {
          let safeValue = null;
          if (typeof value === 'object') {
            safeValue = JSON.stringify(value);
          } else {
            safeValue = String(value);
          }
          ymap.set(key, safeValue);
          log(`将属性 "${key}" 安全转换为字符串`);
        } catch (convErr) {
          console.error(`[VueYjsBinding] 无法安全转换属性 "${key}"，已跳过`);
        }
      }
    });
  }
  
  /**
   * 检测对象是否包含循环引用
   * @param {any} obj - 要检查的对象
   * @returns {boolean} 是否有循环引用
   */
  function hasCircularReference(obj) {
    try {
      // 如果对象可以被序列化为JSON，则不包含循环引用
      JSON.stringify(obj);
      return false;
    } catch (err) {
      // 如果抛出错误，可能是由于循环引用导致的
      return true;
    }
  }
  
  /**
   * 安全地从Yjs应用值到本地
   * @param {any} target - 本地目标
   * @param {Y.Map|Y.Array} ySource - Yjs源
   */
  function safeApplyFromYjs(target, ySource) {
    if (!ySource) return;
    
    if (isUpdatingFromVue) {
      // 如果当前正在向Yjs更新，则跳过
      return;
    }
    
    // 记录更新源并检测互激循环
    if (recordUpdateAndDetectFeedback('yjs')) {
      // 如果检测到互激循环，跳过更新
      return;
    }
    
    // 缓存Yjs值
    if (ySource instanceof Y.Map || ySource instanceof Y.Array) {
      valueCache.cacheYjsValue('root', ySource);
    }
    
    safeExecute(() => {
      isUpdatingFromYjs = true;
      try {
        // 处理数组
        if (Array.isArray(target) && ySource instanceof Y.Array) {
          updateLocalArray(target, ySource);
        } 
        // 处理对象
        else if (typeof target === 'object' && target !== null && !(target instanceof Date) && ySource instanceof Y.Map) {
          updateLocalObject(target, ySource);
        }
        // ref的情况（简单值）
        else if (boundRef && !(ySource instanceof Y.Map || ySource instanceof Y.Array)) {
          log('更新本地ref值:', ySource);
          boundRef.value = ySource;
        }
      } catch (err) {
        console.error('[VueYjsBinding] 本地更新错误:', err);
      } finally {
        isUpdatingFromYjs = false;
      }
    });
  }
  
  /**
   * 更新本地数组
   * @param {Array} array - 本地数组
   * @param {Y.Array} yarray - Yjs数组
   */
  function updateLocalArray(array, yarray) {
    // 如果启用了数组完整刷新
    if (arrayRefresh > 0) {
      // 创建新数组，避免直接操作原数组影响Vue响应性
      const newArray = yarray.toArray().map(item => {
        if (item instanceof Y.Map) {
          const obj = reactive({});
          updateLocalObject(obj, item);
          return obj;
        } else if (item instanceof Y.Array) {
          const arr = reactive([]);
          updateLocalArray(arr, item);
          return arr;
        } else {
          return item;
        }
      });
      
      // 替换数组内容，保留原有引用
      array.length = 0;
      array.push(...newArray);
      
      // 确保Vue更新视图
      nextTick(() => {
        if (array.length > 0) {
          // 创建一个微小变化触发更新
          const temp = array[0];
          array[0] = temp;
        }
      });
      
      return;
    }
    
    // 增量更新（可能在某些场景不稳定）
    log('更新本地数组:', yarray.toArray());
    
    // 调整数组长度
    while (array.length > yarray.length) {
      array.pop();
    }
    
    // 更新现有元素
    for (let i = 0; i < yarray.length; i++) {
      const yval = yarray.get(i);
      
      if (i >= array.length) {
        // 添加新元素
        if (yval instanceof Y.Map) {
          const newObj = reactive({});
          updateLocalObject(newObj, yval);
          array.push(newObj);
        } else if (yval instanceof Y.Array) {
          const newArr = reactive([]);
          updateLocalArray(newArr, yval);
          array.push(newArr);
        } else {
          array.push(yval);
        }
      } else {
        // 更新现有元素
        if (yval instanceof Y.Map && typeof array[i] === 'object' && array[i] !== null) {
          updateLocalObject(array[i], yval);
        } else if (yval instanceof Y.Array && Array.isArray(array[i])) {
          updateLocalArray(array[i], yval);
        } else if (array[i] !== yval) {
          array[i] = yval;
        }
      }
    }
  }
  
  /**
   * 更新本地对象
   * @param {Object} obj - 本地对象
   * @param {Y.Map} ymap - Yjs映射
   */
  function updateLocalObject(obj, ymap) {
    // 增加安全检查
    if (!obj || typeof obj !== 'object' || !ymap) {
      console.warn('[VueYjsBinding] 无效的参数:', { obj, ymap });
      return;
    }
    
    log('更新本地对象:', Object.fromEntries(ymap.entries()));
    
    // 删除本地对象中不再存在于ymap中的属性 - 但要确保不删除$开头的内部属性
    for (const key in obj) {
      if (!key.startsWith('$') && !ymap.has(key)) {
        delete obj[key];
      }
    }
    
    // 更新本地对象
    ymap.forEach((value, key) => {
      try {
        // 检查是否有循环引用
        if (isCircularReference(value)) {
          console.warn(`[VueYjsBinding] 检测到循环引用: ${key}`);
          obj[key] = null;
          return;
        }
        
        if (value instanceof Y.Map) {
          // 处理嵌套对象
          if (!obj[key] || typeof obj[key] !== 'object' || Array.isArray(obj[key])) {
            obj[key] = reactive({});
          }
          updateLocalObject(obj[key], value);
        } else if (value instanceof Y.Array) {
          // 处理嵌套数组
          if (!obj[key] || !Array.isArray(obj[key])) {
            obj[key] = reactive([]);
          }
          updateLocalArray(obj[key], value);
        } else {
          // 处理简单值 - 根据特定类型处理
          if (typeof value === 'string') {
            // 检查是否是特殊值序列化
            if (value === 'NaN') {
              obj[key] = NaN;
            } else if (value === 'Infinity') {
              obj[key] = Infinity;
            } else if (value === '-Infinity') {
              obj[key] = -Infinity;
            } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
              // 可能是ISO日期字符串
              try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                  obj[key] = date;
                } else {
                  obj[key] = value;
                }
              } catch {
                obj[key] = value;
              }
            } else {
              obj[key] = value;
            }
          } else {
            obj[key] = value;
          }
        }
      } catch (err) {
        console.error(`[VueYjsBinding] 更新本地属性 "${key}" 失败:`, err);
        obj[key] = value; // 降级处理，直接赋值
      }
    });
  }
  
  /**
   * 检测循环引用
   * @param {any} obj - 要检查的对象
   * @returns {boolean} 是否存在循环引用
   */
  function isCircularReference(obj) {
    // 简单实现，只检查一级循环引用
    if (obj instanceof Y.Map || obj instanceof Y.Array) {
      const visited = new Set();
      let hasCircular = false;
      
      function check(current) {
        if (visited.has(current)) {
          hasCircular = true;
          return;
        }
        
        visited.add(current);
        
        if (current instanceof Y.Map) {
          current.forEach(value => {
            if (value instanceof Y.Map || value instanceof Y.Array) {
              check(value);
            }
          });
        } else if (current instanceof Y.Array) {
          current.forEach(value => {
            if (value instanceof Y.Map || value instanceof Y.Array) {
              check(value);
            }
          });
        }
      }
      
      check(obj);
      return hasCircular;
    }
    
    return false;
  }
  
  /**
   * 绑定引用
   * @param {Object} vueRef - Vue引用
   */
  function bindRef(vueRef) {
    log('绑定ref:', vueRef);
    
    // 如果已绑定则先解绑
    if (boundRef && refUnwatch) {
      refUnwatch();
    }
    
    boundRef = vueRef;
    
    // 从Yjs初始加载
    if (ymap.has('value')) {
      boundRef.value = ymap.get('value');
    } else {
      ymap.set('value', boundRef.value);
    }
    
    // 监听Vue引用变化 - 使用智能防抖替代简单防抖
    const adaptiveVueUpdate = adaptiveDebounce(
      (newVal) => {
        if (isUpdatingFromYjs) return;
        log('Vue ref变化 → Yjs (自适应防抖):', newVal);
        safeApplyToYjs(ymap, { value: newVal });
      },
      () => {
        log('防抖阻止了Vue→Yjs更新');
      },
      150 // 预期平均执行时间
    );
    
    refUnwatch = watch(
      () => boundRef.value,
      adaptiveVueUpdate,
      { deep: true }
    );
    
    // 监听Yjs变化 - 同样使用智能防抖
    const observeYjs = adaptiveDebounce(
      () => {
        if (isUpdatingFromVue) return;
        log('Yjs变化 → Vue ref (自适应防抖)');
        
        if (ymap.has('value')) {
          boundRef.value = ymap.get('value');
        }
      },
      () => {
        log('防抖阻止了Yjs→Vue更新');
      },
      150 // 预期平均执行时间
    );
    
    // 注册Yjs观察者
    yObserverDisposers.push(ymap.observeDeep(observeYjs));
    
    return true;
  }
  
  /**
   * 解绑引用
   */
  function unbindRef() {
    if (boundRef && refUnwatch) {
      refUnwatch();
      boundRef = null;
      refUnwatch = null;
      
      // 清理Yjs观察者
      yObserverDisposers.forEach(dispose => dispose());
      yObserverDisposers = [];
      
      return true;
    }
    return false;
  }
  
  /**
   * 创建反应式代理
   * @returns {Object} 反应式代理对象
   */
  function createReactiveProxy() {
    log('创建反应式代理');
    
    // 如果已创建则直接返回
    if (reactiveProxy) {
      return reactiveProxy;
    }
    
    // 先从初始状态创建完整的反应式对象
    const initialState = {};
    
    // 从Yjs更新状态 - 如果Yjs中有数据
    if (ymap.size > 0) {
      log('从Yjs加载初始状态');
      isUpdatingFromYjs = true;
      try {
        updateLocalObject(initialState, ymap);
      } catch (err) {
        console.error('[VueYjsBinding] 加载初始状态失败:', err);
      } finally {
        isUpdatingFromYjs = false;
      }
    }
    
    // 创建响应式对象
    reactiveProxy = reactive(initialState);
    
    // 跟踪上次状态以实现差异检测
    let lastState = null;
    try {
      lastState = simpleHash(toRaw(reactiveProxy));
    } catch (e) {
      // 可能有循环引用，忽略
    }
    
    // 监听Vue变化 -> Yjs - 使用智能防抖
    const adaptiveVueUpdate = adaptiveDebounce(
      (newVal) => {
        if (isUpdatingFromYjs) {
          log('忽略由Yjs触发的Vue更新');
          return;
        }
        
        // 获取原始状态
        const rawVal = toRaw(newVal);
        
        // 如果有过滤函数，则应用它
        const filteredVal = dataFilter ? dataFilter(rawVal) : rawVal;
        
        // 使用脏检查减少不必要的更新
        if (!isDirtyUpdate(filteredVal)) {
          log('忽略无变化的Vue更新');
          return;
        }
        
        log('Vue对象变化 → Yjs (自适应防抖)');
        safeApplyToYjs(ymap, filteredVal);
      },
      (interval, avgTime) => {
        log(`防抖阻止了Vue→Yjs更新 (间隔: ${interval}ms, 平均时间: ${avgTime.toFixed(2)}ms)`);
      },
      300 // 预期平均执行时间
    );
    
    const vueWatcher = watch(
      () => toRaw(reactiveProxy),
      adaptiveVueUpdate,
      { deep: true, flush: 'post' }
    );
    
    // 监听Yjs变化 -> Vue - 增加更强的批处理和防抖
    let pendingYjsUpdates = 0;
    let batchUpdateTimeout = null;
    let lastYjsUpdateTime = 0;
    let consecutiveYjsUpdates = 0;
    
    // 使用智能防抖处理Yjs更新
    const handleYjsUpdates = adaptiveDebounce(
      () => {
        log(`处理Yjs变化 → Vue (合并了${pendingYjsUpdates}个更新)`);
        
        nextTick(() => {
          safeApplyFromYjs(reactiveProxy, ymap);
          pendingYjsUpdates = 0;
          batchUpdateTimeout = null;
          consecutiveYjsUpdates = 0;
        });
      },
      () => {
        log('防抖阻止了批量Yjs→Vue更新处理');
      },
      200 // 预期平均执行时间
    );
    
    const observeYjs = (events) => {
      if (isUpdatingFromVue) {
        log('忽略由Vue触发的Yjs更新');
        return;
      }
      
      const now = Date.now();
      
      // 检测连续快速更新
      if (now - lastYjsUpdateTime < 100) {
        consecutiveYjsUpdates++;
        if (consecutiveYjsUpdates > 5) {
          console.warn(`[VueYjsBinding] 检测到Yjs快速连续更新 (${consecutiveYjsUpdates}次)，暂时忽略`);
          return; // 忽略此次更新
        }
      } else {
        consecutiveYjsUpdates = 0;
      }
      
      lastYjsUpdateTime = now;
      
      // 批量更新处理
      if (batchUpdates) {
        pendingYjsUpdates++;
        
        // 清除之前的超时
        if (batchUpdateTimeout) {
          clearTimeout(batchUpdateTimeout);
        }
        
        // 使用智能防抖处理批量更新
        handleYjsUpdates();
      } else {
        // 即使不使用批处理，也使用智能防抖进行单次更新
        handleYjsUpdates();
      }
    };
    
    // 注册Yjs观察者 - 使用observeDeep以便监控嵌套变化
    yObserverDisposers.push(ymap.observeDeep(observeYjs));
    yObserverDisposers.push(() => vueWatcher());
    
    return reactiveProxy;
  }
  
  /**
   * 解绑代理
   */
  function unbindProxy() {
    if (reactiveProxy) {
      // 清理Yjs观察者
      yObserverDisposers.forEach(dispose => dispose());
      yObserverDisposers = [];
      reactiveProxy = null;
      
      return true;
    }
    return false;
  }
  
  // 返回绑定接口
  return {
    ydoc,
    ymap,
    bindRef,
    unbindRef,
    createReactiveProxy,
    unbindProxy,
    updateYjsMap,
    updateYjsArray,
    updateLocalObject,
    updateLocalArray
  };
} 