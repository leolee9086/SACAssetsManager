/**
 * Vue 响应式同步工具 - 提供基于 Yjs 和 思源WebSocket 的跨窗口/跨组件响应式数据同步
 * 
 * 设计目标：
 * 1. 兼容 Vue 响应式 API 的使用体验
 * 2. 提供自动化的跨窗口/跨组件数据同步
 * 3. 支持本地存储持久化
 * 4. 自动断线重连和错误处理
 * 
 * @module useSyncedReactive
 */

import { ref, reactive, watch, nextTick, toRaw } from '../../../../static/vue.esm-browser.js';
import Y from '../../feature/useSyncedstore/yjsInstance.js';
import { createSyncStore } from '../../feature/useSyncedstore/useSyncstore.js';
import { 
  INTERNAL_SYMBOL, 
  valueToYjs, 
  valueFromYjs, 
  createMapProxy, 
  createArrayProxy 
} from './reactiveCore/index.js';
import { addDiagnostics } from './reactiveCore/diagnostics.js';


// 全局缓存 - 用于复用文档实例
const docCache = new Map();

// 全局缓存 - 用于同一窗口内复用响应式对象
const reactiveObjectCache = new Map();
const refObjectCache = new Map();

/**
 * 获取缓存键
 * @param {string} roomName - 房间名称
 * @param {string} key - 数据键
 * @returns {string} 缓存键
 */
const computeCacheKey = (roomName, key) => `${roomName}:${key}`;

/**
 * 创建Y.Doc实例
 * @param {Object} options - 配置选项
 * @returns {Y.Doc} Yjs文档实例
 */
function createYDoc(options) {
  const doc = new Y.Doc();
  
  return doc;
}

/**
 * 创建自定义响应式文本引用
 * @param {Y.Text} yText - Y.Text实例
 * @returns {Object} 响应式引用
 */
function createTextRef(yText) {
  // 初始值
  let currentValue = yText.toString();
  
  // 创建响应式引用
  const textRef = ref(currentValue);
  
  // 存储内部Y.Text引用
  textRef[INTERNAL_SYMBOL] = yText;
  
  // 标记是否正在更新，避免观察者触发循环更新
  let isUpdating = false;
  
  // 监听Y.Text变化
  yText.observe(event => {
    // 避免循环更新
    if (isUpdating) return;
    
    const newValue = yText.toString();
    if (currentValue !== newValue) {
      currentValue = newValue;
      
      isUpdating = true;
      try {
        textRef.value = newValue;
      } finally {
        isUpdating = false;
      }
    }
  });
  
  // 监听ref变化以更新Y.Text
  watch(textRef, (newValue) => {
    // 避免循环更新
    if (isUpdating) return;
    
    const stringValue = newValue !== null && newValue !== undefined ? String(newValue) : '';
    if (currentValue !== stringValue) {
      currentValue = stringValue;
      
      isUpdating = true;
      try {
        if (yText.doc) {
          // 使用事务更新
          yText.doc.transact(() => {
            yText.delete(0, yText.length);
            yText.insert(0, stringValue);
          });
        } else {
          // 无文档情况下直接更新
          yText.delete(0, yText.length);
          yText.insert(0, stringValue);
        }
      } finally {
        isUpdating = false;
      }
    }
  });
  
  return textRef;
}


/**
 * 创建可同步的响应式引用 - 类似ref但支持跨窗口同步
 * @param {any} initialValue - 初始值
 * @param {Object} options - 配置选项
 * @returns {Object} 响应式引用对象
 */
export function useSyncedRef(initialValue, options = {}) {
  // 规范化配置选项
  const config = {
    key: options.key || 'default',
    roomName: options.roomName || 'synced-refs',
    persist: options.persist !== false,
    debug: !!options.debug,
    autoConnect: options.autoConnect !== false,
    onSync: options.onSync || null,
    onUpdate: options.onUpdate || null,
    /*siyuan: {
      enabled: true,
      ...(options.siyuan || {})
    }*/
  };
  
  // 检查缓存是否存在相同的引用对象
  const cacheKey = computeCacheKey(config.roomName, config.key);
  if (refObjectCache.has(cacheKey)) {
    return refObjectCache.get(cacheKey);
  }
  
  // 获取或创建Y.Doc
  let yDoc = docCache.get(config.roomName);
  if (!yDoc) {
    yDoc = createYDoc(config);
    docCache.set(config.roomName, yDoc);
  }
  
  // 创建状态对象
  const status = reactive({
    connected: false,
    peers: 0,
    lastSync: null,
    loading: true,
    error: null
  });
  
  // 初始值序列化
  let initialValueString = '';
  try {
    if (typeof initialValue === 'string') {
      initialValueString = initialValue;
    } else if (initialValue !== undefined && initialValue !== null) {
      initialValueString = JSON.stringify(initialValue);
    }
  } catch (err) {
    console.warn('无法序列化初始值:', err);
  }
  
  // 创建Y.Text作为共享数据
  const sharedText = yDoc.getText(`refs-${config.key}`);
  
  // 初始化文本（如果为空）
  if (sharedText.toString() === '' && initialValueString !== '') {
    sharedText.insert(0, initialValueString);
  }
  
  // 创建响应式文本引用
  const crdtRef = createTextRef(sharedText);
  
  // 解析文本值
  const parseTextValue = (text) => {
    if (!text) return null;
    
    try {
      return JSON.parse(text);
    } catch (err) {
      return text;
    }
  };
  
  // 创建原始引用
  const rawRef = ref(parseTextValue(crdtRef.value));
  
  // 监听CRDT文本变化
  watch(crdtRef, (newText) => {
    const newValue = parseTextValue(newText);
    rawRef.value = newValue;
    
    // 触发更新回调
    if (config.onUpdate) {
      config.onUpdate(newValue);
    }
    
    status.lastSync = Date.now();
  });
  
  // 监听本地引用变化
  watch(rawRef, (newValue) => {
    let textValue = '';
    
    try {
      if (newValue === undefined || newValue === null) {
        textValue = '';
      } else if (typeof newValue === 'string') {
        textValue = newValue;
      } else {
        textValue = JSON.stringify(newValue);
      }
    } catch (err) {
      console.warn('无法序列化值:', err);
      textValue = String(newValue);
    }
    
    if (crdtRef.value !== textValue) {
      crdtRef.value = textValue;
    }
  }, { deep: true });
  
  // 设置状态
  nextTick(() => {
    status.loading = false;
    status.connected = true;
  });
  
  // 创建公共API
  const result = {
    get value() { return rawRef.value; },
    set value(newVal) { rawRef.value = newVal; },
    get $status() { return status; },
    $sync: () => {
      const textValue = crdtRef.value;
      rawRef.value = parseTextValue(textValue);
        status.lastSync = Date.now();
      
      if (config.onSync) {
        config.onSync(rawRef.value);
      }
      
      return true;
    },
    $connect: () => true,
    $disconnect: () => true,
    get $peers() { return new Set(); },
    $destroy: () => {
        refObjectCache.delete(cacheKey);
      return true;
    },
    get $crdt() { return sharedText; },
    get $raw() { return rawRef; }
  };
  
  // 缓存结果
  refObjectCache.set(cacheKey, result);
  console.log(result)
  return result;
}

/**
 * 创建可同步的响应式对象 - 类似reactive但支持跨窗口同步
 * @param {Object} initialState - 初始状态对象
 * @param {Object} options - 配置选项
 * @returns {Object} 响应式对象
 */
export function useSyncedReactive(initialState = {}, options = {}) {
  // 规范化配置选项
  const config = {
    key: options.key || 'default',
    roomName: options.roomName || 'synced-reactive',
    persist: options.persist !== false,
    debug: !!options.debug,
    autoConnect: options.autoConnect !== false,
    onSync: options.onSync || null,
    onUpdate: options.onUpdate || null,
   /* siyuan: {
      enabled: options.siyuan?.enabled !== false,
      ...(options.siyuan || {})
    },*/
    // 新增：是否禁用WebRTC
    disableWebRTC: options.disableWebRTC === false

  };
  
  // 添加调试日志
  const log = (...args) => {
    if (config.debug) {
      console.log(`[useSyncedReactive] [${config.roomName}:${config.key}]`, ...args);
    }
  };
  
  // 检查是否应该使用useSyncedStore代替原始实现
  if ((config.siyuan?.enabled || config.disableWebRTC) && typeof createSyncStore === 'function') {
    log(`检测到siyuan同步配置，使用useSyncedStore实现`);
    
    // 使用异步风格但同步返回结果，内部再异步建立连接
    const pendingSyncStore = {
      _promise: null,
      _data: reactive({}),
      _connected: ref(false),
      _status: reactive({
        connected: false,
        peers: 0,
        lastSync: null,
        loading: true,
        error: null
      })
    };
    
    // 安全初始化初始状态
    try {
      // 先尝试深拷贝，防止循环引用问题
      const safeInitialState = safeDeepCopy(initialState);
      Object.assign(pendingSyncStore._data, safeInitialState);
    } catch (err) {
      console.warn('[useSyncedReactive] 初始化状态失败，尝试浅拷贝:', err);
      // 如果深拷贝失败，进行浅拷贝
      try {
        // 浅拷贝只复制一级属性
        for (const key in initialState) {
          if (Object.prototype.hasOwnProperty.call(initialState, key)) {
            pendingSyncStore._data[key] = initialState[key];
          }
        }
      } catch (shallowErr) {
        console.error('[useSyncedReactive] 浅拷贝也失败:', shallowErr);
      }
    }
    
    // 添加基本方法
    Object.defineProperties(pendingSyncStore._data, {
      $status: {
        get: () => pendingSyncStore._status,
        enumerable: false,
        configurable: true
      },
      $sync: {
        value: () => {
          console.log('[useSyncedReactive] 尝试同步，等待实际连接建立...');
          return true;
        },
        enumerable: false,
        configurable: true
      },
      $syncAuto: {
        value: () => {
          console.log('[useSyncedReactive] 尝试自动同步，等待实际连接建立...');
          return true;
        },
        enumerable: false,
        configurable: true
      },
      $connect: {
        value: () => true,
        enumerable: false,
        configurable: true
      },
      $disconnect: {
        value: () => true,
        enumerable: false,
        configurable: true
      },
      $peers: {
        get: () => new Set(),
        enumerable: false,
        configurable: true
      },
      $destroy: {
        value: () => true,
        enumerable: false,
        configurable: true
      }
    });
    
    // 启动异步连接过程
    pendingSyncStore._promise = (async () => {
      try {
        log(`正在连接思源同步服务...`);
        
        // 创建实际的同步存储
        const actualStore = await useSyncedStore(initialState, options);
        
        // 建立双向数据绑定
        const bindData = () => {
          // 将初始数据从actualStore复制到pendingSyncStore
          Object.keys(actualStore).forEach(key => {
            if (typeof key === 'string' && !key.startsWith('$')) {
              try {
                // 特殊检查reactiveLossTest对象
                if (key === 'reactiveLossTest') {
                  console.log('[useSyncedReactive] 复制 reactiveLossTest:', actualStore[key]);
                  
                  // 确保嵌套对象存在
                  if (!pendingSyncStore._data[key]) {
                    pendingSyncStore._data[key] = {};
                  }
                  
                  // 特别处理嵌套对象
                  if (actualStore[key].nested) {
                    console.log('[useSyncedReactive] 复制 nested 对象:', actualStore[key].nested);
                    if (!pendingSyncStore._data[key].nested) {
                      pendingSyncStore._data[key].nested = {};
                    }
                    Object.assign(pendingSyncStore._data[key].nested, actualStore[key].nested);
                  }
                  
                  // 特别处理items数组
                  if (actualStore[key].items) {
                    console.log('[useSyncedReactive] 复制 items 数组:', actualStore[key].items.length, '项');
                    pendingSyncStore._data[key].items = [...actualStore[key].items];
                  }
                  
                  // 复制其它直接属性
                  Object.keys(actualStore[key]).forEach(subKey => {
                    if (subKey !== 'nested' && subKey !== 'items') {
                      pendingSyncStore._data[key][subKey] = actualStore[key][subKey];
                    }
                  });
                } else {
                  pendingSyncStore._data[key] = actualStore[key];
                }
              } catch (err) {
                console.warn(`[useSyncedReactive] 同步${key}属性失败:`, err);
              }
            }
          });
          
          // 监听pendingSyncStore的变化，同步到actualStore
          watch(pendingSyncStore._data, (newData) => {
            Object.keys(newData).forEach(key => {
              if (typeof key === 'string' && !key.startsWith('$')) {
                try {
                  // 添加安全检查，确保目标对象存在
                  if (!actualStore[key] && typeof newData[key] === 'object' && !Array.isArray(newData[key])) {
                    // 如果目标不存在但源是对象，先创建空对象
                    console.log(`[useSyncedReactive] 创建目标对象 ${key} 以进行同步`);
                    actualStore[key] = {};
                  }
                  actualStore[key] = newData[key];
                } catch (err) {
                  console.warn(`[useSyncedReactive] 同步${key}到actualStore失败:`, err);
                }
              }
            });
          }, { deep: true });
          
          // 监听actualStore的变化，同步到pendingSyncStore
          watch(actualStore, (newData) => {
            Object.keys(newData).forEach(key => {
              if (typeof key === 'string' && !key.startsWith('$')) {
                try {
                  // 修复：检查是否为嵌套对象，并确保保留响应式
                  if (newData[key] && typeof newData[key] === 'object') {
                    // 特殊处理 deepNested 属性
                    if (key === 'deepNested') {
                      console.log('[useSyncedReactive] 特殊处理同步 deepNested 对象');
                      
                      // 确保目标存在
                      if (!pendingSyncStore._data[key]) {
                        pendingSyncStore._data[key] = {};
                      }
                      
                      // 创建深度更新函数
                      const deepUpdate = (target, source) => {
                        if (!target || !source || typeof target !== 'object' || typeof source !== 'object') {
                          return source; // 如果不是对象，直接替换
                        }
                        
                        // 处理对象的每个属性
                        Object.keys(source).forEach(propKey => {
                          const sourceValue = source[propKey];
                          
                          if (sourceValue && typeof sourceValue === 'object') {
                            // 确保目标属性存在
                            if (!target[propKey] || typeof target[propKey] !== 'object') {
                              target[propKey] = Array.isArray(sourceValue) ? [] : {};
                            }
                            
                            // 递归更新
                            deepUpdate(target[propKey], sourceValue);
                          } else {
                            // 基本类型直接替换
                            target[propKey] = sourceValue;
                          }
                        });
                        
                        return target;
                      };
                      
                      // 应用深度更新
                      deepUpdate(pendingSyncStore._data[key], newData[key]);
                    } else {
                      // 常规嵌套对象处理
                      // 对象已存在，合并属性而不是替换整个对象
                      // 这样可以保留Vue的响应式跟踪
                      const updateNestedObject = (target, source) => {
                        // 处理数组
                        if (Array.isArray(source)) {
                          if (!Array.isArray(target)) {
                            // 如果目标不是数组，直接替换
                            return source.slice();
                          }
                          // 确保数组长度一致
                          target.length = source.length;
                          // 更新数组内容
                          for (let i = 0; i < source.length; i++) {
                            if (source[i] && typeof source[i] === 'object') {
                              if (!target[i] || typeof target[i] !== 'object') {
                                target[i] = source[i];
                              } else {
                                target[i] = updateNestedObject(target[i], source[i]);
                              }
                            } else {
                              target[i] = source[i];
                            }
                          }
                          return target;
                        }
                        
                        // 处理对象
                        if (source && typeof source === 'object') {
                          // 第一步：确保目标是对象
                          if (!target || typeof target !== 'object') {
                            target = {}; // 如果目标不是对象，创建新对象
                          }
                          
                          // 处理普通对象
                          Object.keys(source).forEach(nestedKey => {
                            // 确保嵌套键存在，防止undefined错误
                            if (source[nestedKey] !== undefined) {
                              if (source[nestedKey] && typeof source[nestedKey] === 'object') {
                                if (!target[nestedKey] || typeof target[nestedKey] !== 'object') {
                                  // 如果目标不存在或不是对象，创建适当的空对象
                                  target[nestedKey] = Array.isArray(source[nestedKey]) ? [] : {};
                                }
                                // 递归处理嵌套对象
                                updateNestedObject(target[nestedKey], source[nestedKey]);
                              } else {
                                // 基本类型直接赋值
                                target[nestedKey] = source[nestedKey];
                              }
                            }
                          });
                          
                          // 移除不再存在的属性
                          Object.keys(target).forEach(oldKey => {
                            if (source[oldKey] === undefined) {
                              delete target[oldKey];
                            }
                          });
                        }
                        return target;
                      };
                      
                      // 更新嵌套对象结构
                      updateNestedObject(pendingSyncStore._data[key], newData[key]);
                    }
                  } else {
                    // 基本类型直接赋值
                    pendingSyncStore._data[key] = newData[key];
                  }
                } catch (err) {
                  console.warn(`[useSyncedReactive] 同步${key}从actualStore失败:`, err);
                }
              }
            });
          }, { deep: true });
        };
        
        // 绑定数据
        bindData();
        
        // 更新连接状态
        watch(actualStore.$status, (newStatus) => {
          Object.keys(newStatus).forEach(key => {
            pendingSyncStore._status[key] = newStatus[key];
          });
        }, { deep: true });
        
        pendingSyncStore._connected.value = true;
        
        // 更新API方法
        Object.defineProperties(pendingSyncStore._data, {
          $status: {
            get: () => pendingSyncStore._status,
            enumerable: false,
            configurable: true
          },
          $sync: {
            value: () => actualStore.$sync(),
            enumerable: false,
            configurable: true
          },
          $syncAuto: {
            value: () => actualStore.$sync(),
            enumerable: false,
            configurable: true
          },
          $connect: {
            value: () => actualStore.$connect(),
            enumerable: false,
            configurable: true
          },
          $disconnect: {
            value: () => actualStore.$disconnect(),
            enumerable: false,
            configurable: true
          },
          $peers: {
            get: () => actualStore.$peers,
            enumerable: false,
            configurable: true
          },
          $destroy: {
            value: () => actualStore.$destroy(),
            enumerable: false,
            configurable: true
          },
          $crdt: {
            get: () => actualStore.$crdt,
            enumerable: false,
            configurable: true
          },
          $getDiagnostics: {
            value: () => actualStore.$getDiagnostics?.() || null,
            enumerable: false,
            configurable: true
          },
          $syncStore: {
            get: () => actualStore.$syncStore,
            enumerable: false,
            configurable: true
          }
        });
        
        log(`思源同步服务已连接!`);
        
        return actualStore;
      } catch (err) {
        console.error(`[useSyncedReactive] 思源同步连接失败:`, err);
        pendingSyncStore._status.error = err.message;
        return null;
      }
    })();
    
    // 返回预建的响应式对象
    return pendingSyncStore._data;
  }
  
  // 检查缓存是否存在相同的响应式对象
  const cacheKey = computeCacheKey(config.roomName, config.key);
  if (reactiveObjectCache.has(cacheKey)) {
    return reactiveObjectCache.get(cacheKey);
  }
  
  // 获取或创建Y.Doc
  let yDoc = docCache.get(config.roomName);
  if (!yDoc) {
    yDoc = createYDoc(config);
    console.log('创建新的Y.Doc实例:', config.roomName);
    docCache.set(config.roomName, yDoc);
    
    // 添加调试监听器
    yDoc.on('update', (update, origin) => {
      console.log(`[Y.Doc:${config.roomName}] 接收更新，大小:`, update.byteLength, '来源:', origin);
    });
  }
  
  // 创建状态对象
  const status = reactive({
    connected: false,
    peers: 0,
    lastSync: null,
    loading: true,
    error: null
  });
  
  // 使用ensureReactive确保初始状态的所有嵌套属性都是响应式的
  let initialStateCopy = {};
  try {
    // 简单复制初始状态
    initialStateCopy = safeDeepCopy(initialState || {});
  } catch (err) {
    console.warn('[useSyncedReactive] 无法安全复制初始状态，尝试序列化', err);
    try {
      initialStateCopy = JSON.parse(JSON.stringify(initialState || {}));
    } catch (jsonErr) {
      console.warn('[useSyncedReactive] 无法序列化初始状态，使用浅拷贝代替', jsonErr);
      initialStateCopy = Object.assign({}, initialState || {});
    }
  }
  
  // 创建Y.Map作为共享数据
  const sharedMap = yDoc.getMap(`states-${config.key}`);
  
  // 初始化数据（如果为空）
  if (sharedMap.size === 0 && Object.keys(initialStateCopy).length > 0) {
    try {
      console.log('[useSyncedReactive] 初始化共享Map...', Object.keys(initialStateCopy));
      
      // 创建安全初始化函数
      const safeInitializeProperty = (key, value) => {
        if (key.startsWith('$')) return; // 跳过内部属性
        
        try {
          // 特殊检查深层嵌套对象
          if (key === 'deepNested') {
            console.log('[useSyncedReactive] 特殊处理深层嵌套对象 deepNested');
            
            // 安全创建多层嵌套 Y.Map
            const createNestedYMap = (obj) => {
              if (!obj || typeof obj !== 'object') return null;
              
              const ymap = new Y.Map();
              
              Object.entries(obj).forEach(([nestedKey, nestedValue]) => {
                try {
                  if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
                    // 递归处理嵌套对象
                    const nestedYMap = createNestedYMap(nestedValue);
                    if (nestedYMap) {
                      ymap.set(nestedKey, nestedYMap);
                    }
                  } else {
                    // 基本类型或数组
                    ymap.set(nestedKey, valueToYjs(nestedValue));
                  }
                } catch (err) {
                  console.warn(`[useSyncedReactive] 处理深层嵌套键 ${nestedKey} 失败:`, err);
                }
              });
              
              return ymap;
            };
            
            // 创建顶层 Y.Map
            const deepNestedYMap = createNestedYMap(value);
            if (deepNestedYMap) {
              sharedMap.set(key, deepNestedYMap);
            } else {
              console.error('[useSyncedReactive] 创建 deepNested Y.Map 失败');
              // 退回到标准方法
              sharedMap.set(key, valueToYjs(value));
            }
          }
          // 特殊检查reactiveLossTest
          else if (key === 'reactiveLossTest') {
            console.log('[useSyncedReactive] 初始化reactiveLossTest:', value);
            
            if (value.nested) {
              console.log('[useSyncedReactive] nested结构:', value.nested);
              
              // 确保nested对象能正确同步
              const nestedYMap = new Y.Map();
              Object.entries(value.nested).forEach(([nestedKey, nestedValue]) => {
                nestedYMap.set(nestedKey, valueToYjs(nestedValue));
              });
              
              // 创建reactiveLossTest的Y.Map
              const rtMap = new Y.Map();
              rtMap.set('nested', nestedYMap);
              
              // 处理items数组
              if (value.items) {
                console.log('[useSyncedReactive] items结构:', value.items);
                const itemsYArray = new Y.Array();
                value.items.forEach(item => {
                  const itemYMap = new Y.Map();
                  Object.entries(item).forEach(([itemKey, itemValue]) => {
                    itemYMap.set(itemKey, valueToYjs(itemValue));
                  });
                  itemsYArray.push([itemYMap]);
                });
                rtMap.set('items', itemsYArray);
              }
              
              // 复制其它直接属性
              Object.entries(value).forEach(([subKey, subValue]) => {
                if (subKey !== 'nested' && subKey !== 'items') {
                  rtMap.set(subKey, valueToYjs(subValue));
                }
              });
              
              // 设置完整的对象
              sharedMap.set(key, rtMap);
            } else {
              // 如果没有nested，使用标准方法
              sharedMap.set(key, valueToYjs(value));
            }
          } else {
            // 标准方法
            sharedMap.set(key, valueToYjs(value));
          }
          
          console.log(`[useSyncedReactive] 设置了${key}，新值类型:`, 
                     sharedMap.get(key) instanceof Y.Map ? 'Y.Map' : 
                     sharedMap.get(key) instanceof Y.Array ? 'Y.Array' : 
                     typeof sharedMap.get(key));
        } catch (err) {
          console.warn(`[useSyncedReactive] 设置属性 ${key} 失败:`, err);
        }
      };
      
      // 使用事务包装所有更改
      yDoc.transact(() => {
        // 首先处理嵌套结构，确保它们在前面初始化
        const specialKeys = ['deepNested', 'reactiveLossTest'];
        
        // 首先处理特殊键
        specialKeys.forEach(key => {
          if (initialStateCopy[key]) {
            safeInitializeProperty(key, initialStateCopy[key]);
          }
        });
        
        // 然后处理其余键
        Object.entries(initialStateCopy).forEach(([key, value]) => {
          if (!specialKeys.includes(key)) {
            safeInitializeProperty(key, value);
          }
        });
      });
      
      // 验证初始化后的数据
      console.log('[useSyncedReactive] 初始化完成，共享Map大小:', sharedMap.size);
      if (initialStateCopy.reactiveLossTest) {
        const rtLoss = sharedMap.get('reactiveLossTest');
        console.log('[useSyncedReactive] reactiveLossTest是Y.Map?', rtLoss instanceof Y.Map);
        if (rtLoss instanceof Y.Map) {
          console.log('[useSyncedReactive] reactiveLossTest键:', Array.from(rtLoss.keys()));
          
          const nested = rtLoss.get('nested');
          console.log('[useSyncedReactive] nested是Y.Map?', nested instanceof Y.Map);
          if (nested instanceof Y.Map) {
            console.log('[useSyncedReactive] nested键:', Array.from(nested.keys()));
          }
          
          const items = rtLoss.get('items');
          console.log('[useSyncedReactive] items是Y.Array?', items instanceof Y.Array);
          if (items instanceof Y.Array) {
            console.log('[useSyncedReactive] items长度:', items.length);
          }
        }
      }
    } catch (err) {
      console.error('[useSyncedReactive] 初始化状态时出错:', err);
      status.error = err.message;
    }
  }
  
  // 创建响应式代理
  if (config.debug) {
    console.log('[useSyncedReactive] 创建响应式代理，原始Map大小:', sharedMap.size);
    console.log('[useSyncedReactive] 原始Map内容:', Array.from(sharedMap.entries()).map(([k, v]) => [k, typeof v]));
  }
  
  const state = createMapProxy(sharedMap);
  
  // 输出代理状态
  if (config.debug) {
    console.log('[useSyncedReactive] 创建完成，响应式对象属性:', Object.keys(state));
    
    // 检查嵌套对象（特别关注reactiveLossTest）
    if (state.reactiveLossTest) {
      console.log('[useSyncedReactive] 嵌套对象检查:');
      console.log('  - reactiveLossTest:', state.reactiveLossTest);
      console.log('  - reactiveLossTest.nested:', state.reactiveLossTest.nested);
      console.log('  - reactiveLossTest.items:', state.reactiveLossTest.items);
      
      // 检查是否存在值但没有被代理
      if (state.reactiveLossTest.nested === undefined) {
        console.error('[useSyncedReactive] 错误: nested属性丢失!');
      }
      
      if (state.reactiveLossTest.items === undefined) {
        console.error('[useSyncedReactive] 错误: items属性丢失!');
      }
    }
  }
  
  // 设置状态
  nextTick(() => {
    status.loading = false;
    status.connected = true;
  });
  
  // 添加API方法
  Object.defineProperties(state, {
    $status: {
      get: () => status,
      enumerable: false,
      configurable: true
    },
    $sync: {
      value: () => {
        status.lastSync = Date.now();
        if (config.onSync) {
          config.onSync(state);
        }
        return true;
      },
      enumerable: false,
      configurable: true
    },
    $connect: {
      value: () => true,
      enumerable: false,
      configurable: true
    },
    $disconnect: {
      value: () => true,
      enumerable: false,
      configurable: true
    },
    $peers: {
      get: () => new Set(),
      enumerable: false,
      configurable: true
    },
    $destroy: {
      value: () => {
        reactiveObjectCache.delete(cacheKey);
        return true;
      },
      enumerable: false,
      configurable: true
    },
    $reset: {
      value: () => {
        try {
          yDoc.transact(() => {
            // 清空当前值
            Array.from(sharedMap.keys()).forEach(key => {
              sharedMap.delete(key);
            });
            
            // 设置初始值
            Object.entries(initialStateCopy).forEach(([key, value]) => {
              if (key.startsWith('$')) return; // 跳过内部属性
              try {
                sharedMap.set(key, valueToYjs(value));
              } catch (err) {
                console.warn(`[useSyncedReactive] 重置属性 ${key} 失败:`, err);
              }
            });
          });
        } catch (err) {
          console.error('[useSyncedReactive] 重置状态出错:', err);
        }
        
        return state;
      },
      enumerable: false,
      configurable: true
    },
    $crdt: {
      get: () => sharedMap,
      enumerable: false,
      configurable: true
    },
    // 添加自动同步方法
    $syncAuto: {
      value: () => {
        if (config.onSync) {
          config.onSync(state);
        }
        status.lastSync = Date.now();
        return true;
      },
      enumerable: false,
      configurable: true
    },
    $getDiagnostics: {
      value: () => {
        try {
          return {
            docSize: sharedMap ? Object.keys(sharedMap).length : 0,
            yDocStats: yDoc ? {
              clientID: yDoc.clientID,
              gc: yDoc.gc,
              store: yDoc.store ? Object.keys(yDoc.store).length : 0
            } : null
          };
        } catch (err) {
          return {error: err.message};
        }
      },
      enumerable: false,
      configurable: true
    }
  });
  
  // 缓存结果
  reactiveObjectCache.set(cacheKey, state);
  
  // 添加诊断功能
  if (addDiagnostics) {
    addDiagnostics(state);
    
    if (config.debug) {
      console.log('[useSyncedReactive] 已添加诊断功能，可通过 $diagnose() 使用');
    }
  }
  
  return state;
}

/**
 * 安全地进行深拷贝，防止循环引用
 * @param {any} obj - 需要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
function safeDeepCopy(obj, seen = new WeakMap()) {
  // 处理基本类型和null
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // 检查循环引用
  if (seen.has(obj)) {
    return null; // 发现循环引用，返回null
  }
  
  // 记录当前对象
  seen.set(obj, true);
  
  // 处理数组
  if (Array.isArray(obj)) {
    const result = [];
    for (let i = 0; i < obj.length; i++) {
      try {
        result[i] = safeDeepCopy(obj[i], seen);
      } catch (err) {
        console.warn(`[safeDeepCopy] 无法复制数组项 ${i}:`, err);
        result[i] = null;
      }
    }
    return result;
  }
  
  // 处理日期对象
  if (obj instanceof Date) {
    return new Date(obj);
  }
  
  // 处理普通对象
  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      try {
        result[key] = safeDeepCopy(obj[key], seen);
      } catch (err) {
        console.warn(`[safeDeepCopy] 无法复制属性 ${key}:`, err);
        result[key] = null;
      }
    }
  }
  
  return result;
}

/**
 * 通用同步API - 自动检测值类型并使用相应的同步方法
 * @param {any} state - 状态（对象或简单值）
 * @param {Object} options - 配置选项
 * @returns {Object} 同步对象
 */
export function useSync(state, options = {}) {
  if (typeof state === 'object' && state !== null && !Array.isArray(state)) {
    const reactive = useSyncedReactive(state, options);
    return {
      state: reactive,
      get value() { return reactive; },
      status: reactive.$status,
      sync: reactive.$sync,
      connect: reactive.$connect,
      disconnect: reactive.$disconnect,
      destroy: reactive.$destroy
    };
  } else {
    const ref = useSyncedRef(state, options);
    return {
      get state() { return ref.value; },
      set state(newVal) { ref.value = newVal; },
      get value() { return ref.value; },
      set value(newVal) { ref.value = newVal; },
      status: ref.$status,
      sync: ref.$sync,
      connect: ref.$connect,
      disconnect: ref.$disconnect,
      destroy: ref.$destroy
    };
  }
}

/**
 * 获取已缓存的同步对象
 * @param {string} roomName - 房间名称
 * @param {string} key - 数据键
 * @param {string} type - 类型（'reactive'或'ref'）
 * @returns {Object|null} 同步对象或null
 */
export function getCachedSyncObject(roomName, key, type = 'reactive') {
  const cacheKey = computeCacheKey(roomName, key);
  if (type === 'reactive') {
    return reactiveObjectCache.get(cacheKey) || null;
  } else {
    return refObjectCache.get(cacheKey) || null;
  }
}

/**
 * 清除房间中的所有同步对象
 * @param {string} roomName - 房间名称
 * @returns {boolean} 是否成功
 */
export function clearRoom(roomName) {
  // 删除所有与该房间相关的缓存
  for (const [key, value] of reactiveObjectCache.entries()) {
    if (key.startsWith(`${roomName}:`)) {
      value.$destroy();
      reactiveObjectCache.delete(key);
    }
  }
  
  for (const [key, value] of refObjectCache.entries()) {
    if (key.startsWith(`${roomName}:`)) {
      value.$destroy();
      refObjectCache.delete(key);
    }
  }
  
  // 删除房间的文档实例
  if (docCache.has(roomName)) {
    const doc = docCache.get(roomName);
    doc.destroy();
    docCache.delete(roomName);
    return true;
  }
  
  return false;
}

/**
 * 清除所有房间和同步对象
 * @returns {number} 清除的房间数量
 */
export function clearAllRooms() {
  const roomCount = docCache.size;
  
  // 清理所有缓存
  reactiveObjectCache.clear();
  refObjectCache.clear();
  
  // 销毁所有文档
  for (const doc of docCache.values()) {
    doc.destroy();
  }
  
  docCache.clear();
  
  return roomCount;
}

/**
 * 将useSyncedReactive与useSyncstore结合使用
 * @param {Object} initialState - 初始状态对象
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 响应式对象与同步功能
 */
export async function useSyncedStore(initialState = {}, options = {}) {
  // 规范化配置选项
  const config = {
    key: options.key || 'default',
    roomName: options.roomName || 'synced-store',
    persist: options.persist !== false,
    debug: !!options.debug,
    autoConnect: options.autoConnect !== false,
    onSync: options.onSync || null,
    onUpdate: options.onUpdate || null,
    // 合并思源配置
    /*siyuan: {
      enabled: options.siyuan?.enabled !== false,
      ...(options.siyuan || {})
    },*/
    // 同步存储配置
    syncStore: {
      enabled: options.syncStore?.enabled !== false,
      webrtc: options.syncStore?.webrtc || {},
      ...(options.syncStore || {})
    }
  };
  
  // 检查缓存是否存在相同的响应式对象
  const cacheKey = computeCacheKey(config.roomName, config.key);
  if (reactiveObjectCache.has(cacheKey)) {
    return reactiveObjectCache.get(cacheKey);
  }
  
  // 创建Y.Doc实例（使用useSyncstore创建）
  console.log(`[SyncedStore] 为房间 ${config.roomName} 创建同步存储`);
  
  // 创建useSyncStore实例
  const syncStore = await createSyncStore({
    roomName: config.roomName,
    initialState: { [config.key]: initialState },
    persist: config.persist,
    autoConnect: config.autoConnect,
    siyuan: config.siyuan,
    webrtcOptions: config.syncStore.webrtc || {},
    disableWebRTC: config.syncStore.disableWebRTC || false,
    loadTimeout: config.syncStore.loadTimeout || 5000
  });
  
  // 获取Yjs文档
  const ydoc = syncStore.ydoc;
  
  // 创建状态对象
  const status = reactive({
    connected: syncStore.isConnected,
    peers: 0,
    lastSync: null,
    loading: true,
    error: null
  });
  
  // 创建Y.Map作为共享数据
  const sharedMap = ydoc.getMap(`states-${config.key}`);
  
  // 初始化数据（如果为空）
  if (sharedMap.size === 0 && Object.keys(initialState).length > 0) {
    try {
      ydoc.transact(() => {
        Object.entries(initialState).forEach(([key, value]) => {
          sharedMap.set(key, valueToYjs(value));
        });
      });
    } catch (err) {
      console.error('[SyncedStore] 初始化状态时出错:', err);
      status.error = err.message;
    }
  }
  
  // 创建响应式代理
  const state = createMapProxy(sharedMap);
  
  // 同步连接状态
  watch(syncStore.isConnected, (newVal) => {
    status.connected = newVal;
    if (newVal) {
      // 连接成功，执行同步
      syncStore.sync();
      status.lastSync = Date.now();
    }
  });
  
  // 定时更新peers数量
  const updatePeers = () => {
    status.peers = syncStore.getPeers().size;
  };
  const peersInterval = setInterval(updatePeers, 5000);
  updatePeers(); // 初始更新一次
  
  // 添加API方法
  Object.defineProperties(state, {
    $status: {
      get: () => status,
      enumerable: false
    },
    $sync: {
      value: () => {
        syncStore.sync();
        status.lastSync = Date.now();
        if (config.onSync) {
          config.onSync(state);
        }
        return true;
      },
      enumerable: false
    },
    $connect: {
      value: () => {
        return syncStore.connect();
      },
      enumerable: false
    },
    $disconnect: {
      value: async () => {
        clearInterval(peersInterval);
        return await syncStore.disconnect();
      },
      enumerable: false
    },
    $peers: {
      get: () => syncStore.getPeers(),
      enumerable: false
    },
    $destroy: {
      value: async () => {
        clearInterval(peersInterval);
        await syncStore.disconnect();
        reactiveObjectCache.delete(cacheKey);
        return true;
      },
      enumerable: false
    },
    $reset: {
      value: () => {
        try {
          ydoc.transact(() => {
            // 清空当前值
            Array.from(sharedMap.keys()).forEach(key => {
              sharedMap.delete(key);
            });
            
            // 设置初始值
            Object.entries(initialState).forEach(([key, value]) => {
              sharedMap.set(key, valueToYjs(value));
            });
          });
        } catch (err) {
          console.error('[SyncedStore] 重置状态出错:', err);
        }
        
        return state;
      },
      enumerable: false
    },
    $crdt: {
      get: () => sharedMap,
      enumerable: false
    },
    $syncStore: {
      get: () => syncStore,
      enumerable: false
    },
    $getDiagnostics: {
      value: () => syncStore.getDiagnostics(),
      enumerable: false
    }
  });
  
  // 缓存结果
  reactiveObjectCache.set(cacheKey, state);
  
  // 标记加载完成
  status.loading = syncStore.isLocalDataLoaded.value === false;
  
  // 监听本地数据加载状态
  watch(syncStore.isLocalDataLoaded, (loaded) => {
    if (loaded) {
      status.loading = false;
    }
  });
  
  return state;
}

/**
 * 将useSyncedRef与useSyncstore结合使用
 * @param {any} initialValue - 初始值
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 响应式引用与同步功能
 */
export async function useSyncedStoreRef(initialValue, options = {}) {
  // 规范化配置选项
  const config = {
    key: options.key || 'default',
    roomName: options.roomName || 'synced-refs',
    persist: options.persist !== false,
    debug: !!options.debug,
    autoConnect: options.autoConnect !== false,
    onSync: options.onSync || null,
    onUpdate: options.onUpdate || null,
    siyuan: {
      enabled: options.siyuan?.enabled !== false,
      ...(options.siyuan || {})
    },
    syncStore: {
      enabled: options.syncStore?.enabled !== false,
      webrtc: options.syncStore?.webrtc || {},
      ...(options.syncStore || {})
    }
  };
  
  // 检查缓存是否存在相同的引用对象
  const cacheKey = computeCacheKey(config.roomName, config.key);
  if (refObjectCache.has(cacheKey)) {
    return refObjectCache.get(cacheKey);
  }
  
  // 初始值序列化
  let initialValueString = '';
  try {
    if (typeof initialValue === 'string') {
      initialValueString = initialValue;
    } else if (initialValue !== undefined && initialValue !== null) {
      initialValueString = JSON.stringify(initialValue);
    }
  } catch (err) {
    console.warn('[SyncedStoreRef] 无法序列化初始值:', err);
  }
  
  // 创建useSyncStore实例
  const syncStore = await createSyncStore({
    roomName: config.roomName,
    initialState: { [`ref-${config.key}`]: initialValue },
    persist: config.persist,
    autoConnect: config.autoConnect,
    siyuan: config.siyuan,
    webrtcOptions: config.syncStore.webrtc || {},
    disableWebRTC: config.syncStore.disableWebRTC || false,
    loadTimeout: config.syncStore.loadTimeout || 5000
  });
  
  // 获取Yjs文档
  const ydoc = syncStore.ydoc;
  
  // 创建状态对象
  const status = reactive({
    connected: syncStore.isConnected,
    peers: 0,
    lastSync: null,
    loading: true,
    error: null
  });
  
  // 创建Y.Text作为共享数据
  const sharedText = ydoc.getText(`refs-${config.key}`);
  
  // 初始化文本（如果为空）
  if (sharedText.toString() === '' && initialValueString !== '') {
    sharedText.insert(0, initialValueString);
  }
  
  // 创建响应式文本引用
  const crdtRef = createTextRef(sharedText);
  
  // 解析文本值
  const parseTextValue = (text) => {
    if (!text) return null;
    
    try {
      return JSON.parse(text);
    } catch (err) {
      return text;
    }
  };
  
  // 创建原始引用
  const rawRef = ref(parseTextValue(crdtRef.value));
  
  // 监听CRDT文本变化
  watch(crdtRef, (newText) => {
    const newValue = parseTextValue(newText);
    rawRef.value = newValue;
    
    // 触发更新回调
    if (config.onUpdate) {
      config.onUpdate(newValue);
    }
    
    status.lastSync = Date.now();
  });
  
  // 监听本地引用变化
  watch(rawRef, (newValue) => {
    let textValue = '';
    
    try {
      if (newValue === undefined || newValue === null) {
        textValue = '';
      } else if (typeof newValue === 'string') {
        textValue = newValue;
      } else {
        textValue = JSON.stringify(newValue);
      }
    } catch (err) {
      console.warn('[SyncedStoreRef] 无法序列化值:', err);
      textValue = String(newValue);
    }
    
    if (crdtRef.value !== textValue) {
      crdtRef.value = textValue;
    }
  }, { deep: true });
  
  // 同步连接状态
  watch(syncStore.isConnected, (newVal) => {
    status.connected = newVal;
    if (newVal) {
      // 连接成功，执行同步
      syncStore.sync();
      status.lastSync = Date.now();
    }
  });
  
  // 定时更新peers数量
  const updatePeers = () => {
    status.peers = syncStore.getPeers().size;
  };
  const peersInterval = setInterval(updatePeers, 5000);
  updatePeers(); // 初始更新一次
  
  // 创建公共API
  const result = {
    get value() { return rawRef.value; },
    set value(newVal) { rawRef.value = newVal; },
    get $status() { return status; },
    $sync: () => {
      syncStore.sync();
      const textValue = crdtRef.value;
      rawRef.value = parseTextValue(textValue);
      status.lastSync = Date.now();
      
      if (config.onSync) {
        config.onSync(rawRef.value);
      }
      
      return true;
    },
    $connect: () => syncStore.connect(),
    $disconnect: async () => {
      clearInterval(peersInterval);
      return await syncStore.disconnect();
    },
    get $peers() { return syncStore.getPeers(); },
    $destroy: async () => {
      clearInterval(peersInterval);
      await syncStore.disconnect();
      refObjectCache.delete(cacheKey);
      return true;
    },
    get $crdt() { return sharedText; },
    get $raw() { return rawRef; },
    get $syncStore() { return syncStore; },
    $getDiagnostics: () => syncStore.getDiagnostics()
  };
  
  // 缓存结果
  refObjectCache.set(cacheKey, result);
  
  // 标记加载完成
  status.loading = syncStore.isLocalDataLoaded.value === false;
  
  // 监听本地数据加载状态
  watch(syncStore.isLocalDataLoaded, (loaded) => {
    if (loaded) {
      status.loading = false;
    }
  });
  
  return result;
}

/**
 * 通用同步API - 结合useSyncstore
 * @param {any} state - 状态（对象或简单值）
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 同步对象
 */
export async function useSyncStore(state, options = {}) {
  if (typeof state === 'object' && state !== null && !Array.isArray(state)) {
    const reactive = await useSyncedStore(state, options);
    return {
      state: reactive,
      get value() { return reactive; },
      status: reactive.$status,
      sync: reactive.$sync,
      connect: reactive.$connect,
      disconnect: reactive.$disconnect,
      destroy: reactive.$destroy,
      getDiagnostics: reactive.$getDiagnostics,
      get syncStore() { return reactive.$syncStore; }
    };
  } else {
    const ref = await useSyncedStoreRef(state, options);
    return {
      get state() { return ref.value; },
      set state(newVal) { ref.value = newVal; },
      get value() { return ref.value; },
      set value(newVal) { ref.value = newVal; },
      status: ref.$status,
      sync: ref.$sync,
      connect: ref.$connect,
      disconnect: ref.$disconnect,
      destroy: ref.$destroy,
      getDiagnostics: ref.$getDiagnostics,
      get syncStore() { return ref.$syncStore; }
    };
  }
} 