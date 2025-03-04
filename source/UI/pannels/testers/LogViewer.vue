<template>
  <div class="log-viewer">
    <div class="log-controls">
      <button @click="clearLogs">{{ clearButtonText }}</button>
      <div class="filter-controls" v-if="enableFiltering">
        <input 
          v-model="filterText" 
          :placeholder="filterPlaceholder" 
          class="filter-input" 
          aria-label="过滤日志"
        />
        <div class="log-type-filters" v-if="showTypeFilters">
          <label v-for="type in availableTypes" :key="type" class="type-filter">
            <input 
              type="checkbox" 
              :value="type" 
              v-model="selectedTypes" 
            />
            {{ type }}
          </label>
        </div>
      </div>
      <slot name="controls"></slot>
    </div>
    
    <div 
      class="log-container" 
      ref="logContainer"
      :style="{ height: containerHeight }"
      tabindex="0"
      aria-label="日志列表"
      role="log"
    >
      <div v-if="isLoading" class="log-loading" aria-live="polite">正在加载日志...</div>
      <div v-else-if="filteredLogs.length === 0" class="log-empty" aria-live="polite">
        {{ emptyMessage }}
      </div>
      <template v-else>
        <div 
          v-for="(log, index) in visibleLogs" 
          :key="getLogKey(log, index)" 
          :ref="el => { if(el) logItemRefs[`log-${index}`] = el }"
          :class="['log-item', log.type, customClassForLog(log), { 'active': index === activeLogIndex }]"
          @click="handleLogClick(log)"
          tabindex="-1"
          role="listitem"
          :aria-selected="index === activeLogIndex"
        >
          <span class="log-time" v-if="showTime">{{ log.time || '' }}</span>
          <span class="log-type" v-if="showType">{{ log.type || '未知' }}</span>
          <span class="log-content">{{ getFormattedContent(log) }}</span>
          <slot name="log-item-extra" :log="log"></slot>
        </div>
        <div v-if="virtualScrolling && hasMoreLogs && !isLoadingMore.value" class="virtual-scroll-info" aria-live="polite">
          还有 {{ totalFilteredLogs - visibleLogs.length }} 条日志
          <button @click="loadMoreLogs" class="load-more-button">加载更多</button>
        </div>
        <div v-if="virtualScrolling && hasMoreLogs && isLoadingMore.value" class="virtual-scroll-loading" aria-live="polite">
          正在加载更多日志...
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick, shallowRef, onBeforeUnmount, reactive } from 'vue';
import { useDebounce, useThrottle } from './useEventModifiers.js';
import { useVirtualScroll } from './useVirtualScroll.js'; // 导入虚拟滚动组合式API

const props = defineProps({
  logs: {
    type: Array,
    default: () => [],
    required: true
  },
  showTime: {
    type: Boolean,
    default: true
  },
  showType: {
    type: Boolean,
    default: true
  },
  enableFiltering: {
    type: Boolean,
    default: true
  },
  showTypeFilters: {
    type: Boolean,
    default: true
  },
  containerHeight: {
    type: String,
    default: '200px'
  },
  clearButtonText: {
    type: String,
    default: '清空日志'
  },
  filterPlaceholder: {
    type: String,
    default: '搜索日志...'
  },
  emptyMessage: {
    type: String,
    default: '暂无日志'
  },
  autoScroll: {
    type: Boolean,
    default: true
  },
  customTypes: {
    type: Object,
    default: () => ({})
  },
  virtualScrolling: {
    type: Boolean,
    default: true
  },
  maxVisibleLogs: {
    type: Number,
    default: 200
  },
  idField: {
    type: String,
    default: ''
  },
  maxCacheSize: {
    type: Number,
    default: 10000 // 限制缓存大小
  },
  virtualScrollOptions: {
    type: Object,
    default: () => ({
      itemHeight: 30, // 估计的日志项高度
      buffer: 20, // 缓冲区大小
      overscan: 10, // 过扫描行数，提升滚动流畅度
      throttleMs: 16, // 约60fps的滚动节流
    })
  },
  errorRetryCount: {
    type: Number,
    default: 3
  },
  // 添加回退选项，当虚拟滚动失败时
  fallbackToStandardScroll: {
    type: Boolean,
    default: true
  },
  // 添加防内存泄漏的选项
  cacheLifetimeMs: {
    type: Number,
    default: 3600000 // 默认1小时清理一次缓存
  },
  // 添加渲染优化选项
  renderOptimization: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(['clear', 'filter', 'select-log']);

// 使用shallowRef优化大数组和对象引用性能
const filterText = ref('');
const debouncedFilterText = ref('');
const selectedTypes = ref([]);
const logContainer = ref(null);
const isLoading = ref(false);
// 使用Map替代Object作为缓存，性能更好
const formattedContentCache = reactive(new Map());
const cacheTimestamps = reactive(new Map()); // 跟踪缓存条目创建时间
const resizeObserver = ref(null);
const visibleLogCount = ref(props.maxVisibleLogs);
const errorCount = ref(0);
const logItemRefs = shallowRef({}); // 使用shallowRef优化引用类型
const activeLogIndex = ref(-1);
const virtualScrollEnabled = ref(props.virtualScrolling);
const cacheCleanupTimer = ref(null);
const viewportHeight = ref(0);
const isPerformingBatchUpdate = ref(false);

// 引入虚拟滚动加载状态
const isLoadingMore = computed(() => virtualScroll.isLoadingMore);

// 添加一个标志来跟踪是否是通过加载更多触发的日志变化
const isLoadingMoreTriggered = ref(false);

// 改进的防抖函数，增加立即执行选项并优化节流性能
const updateFilterTextDebounced = useDebounce(() => {
  debouncedFilterText.value = filterText.value;
}, { delay: 300 });

// 监听过滤文本变化
watch(filterText, () => {
  updateFilterTextDebounced();
});

// 计算所有可用的日志类型 - 优化算法
const availableTypes = computed(() => {
  try {
    // 使用Set去重，更高效
    const types = new Set();
    
    // 只处理前1000条日志以提高性能
    const logsToProcess = props.logs.slice(0, 1000);
    
    for (const log of logsToProcess) {
      if (log && log.type) types.add(log.type);
      // 如果已经找到一定数量的类型，提前退出
      if (types.size > 20) break;
    }
    
    return Array.from(types).sort();
  } catch (error) {
    console.error('计算日志类型时出错:', error);
    errorCount.value++;
    return [];
  }
});

// 根据过滤条件筛选日志 - 性能优化版本
const filteredLogs = computed(() => {
  try {
    if (isLoading.value) return []; // 如果正在加载，返回空数组避免重复计算
    
    isLoading.value = true;
    let result = props.logs || [];
    
    // 只有当实际设置了过滤条件时才进行过滤
    const hasTypeFilter = selectedTypes.value.length > 0;
    const hasTextFilter = !!debouncedFilterText.value;
    
    if (!hasTypeFilter && !hasTextFilter) {
      isLoading.value = false;
      return result;
    }
    
    // 创建类型过滤的Set，查找更快
    const typeSet = hasTypeFilter ? new Set(selectedTypes.value) : null;
    const searchTerm = hasTextFilter ? debouncedFilterText.value.toLowerCase() : null;
    
    // 批量处理以提高性能
    const batchSize = 1000;
    const totalLogs = result.length;
    const filteredResults = [];
    
    for (let i = 0; i < totalLogs; i += batchSize) {
      const batch = result.slice(i, i + batchSize);
      
      for (const log of batch) {
        if (!log) continue;
        
        // 类型过滤
        if (typeSet && log.type && !typeSet.has(log.type)) continue;
        
        // 文本过滤
        if (searchTerm) {
          try {
            const content = typeof log.content === 'object' 
              ? JSON.stringify(log.content) 
              : String(log.content || '');
            
            const typeMatch = log.type && log.type.toLowerCase().includes(searchTerm);
            const timeMatch = log.time && log.time.toLowerCase().includes(searchTerm);
            const contentMatch = content.toLowerCase().includes(searchTerm);
            
            if (!typeMatch && !timeMatch && !contentMatch) continue;
          } catch (error) {
            console.error('过滤日志内容时出错:', error, log);
            continue;
          }
        }
        
        filteredResults.push(log);
      }
      
      // 允许UI更新，避免长时间阻塞
      if (i + batchSize < totalLogs && filteredResults.length > 0) {
        // 这里我们只在过滤大量数据时使用这种策略
        if (totalLogs > 5000) {
          setTimeout(() => {}, 0);
        }
      }
    }
    
    return filteredResults;
  } catch (error) {
    console.error('过滤日志时出错:', error);
    errorCount.value++;
    return [];
  } finally {
    isLoading.value = false;
  }
});

// 应用虚拟滚动
const virtualScroll = useVirtualScroll({
  items: filteredLogs, // 使用过滤后的日志作为数据源
  itemHeight: props.virtualScrollOptions.itemHeight,
  maxVisibleItems: props.maxVisibleLogs,
  autoScroll: props.autoScroll,
  buffer: props.virtualScrollOptions.buffer,
  overscan: props.virtualScrollOptions.overscan,
  throttleMs: props.virtualScrollOptions.throttleMs,
  fallbackToStandard: props.fallbackToStandardScroll,
  stabilityThreshold: props.errorRetryCount
});

// 使用虚拟滚动提供的计算属性和方法替代原有实现
const visibleLogs = computed(() => virtualScroll.visibleItems.value);
const hasMoreLogs = computed(() => virtualScroll.hasMoreItems.value);
const totalFilteredLogs = computed(() => virtualScroll.totalItems.value);

// 替换原有的滚动到底部功能
function scrollToBottom() {
  virtualScroll.scrollToBottom();
}

// 替换原有的检查是否滚动到底部功能
function checkScrolledToBottom() {
  return virtualScroll.checkScrolledToBottom();
}

// 处理日志项目点击
function handleLogClick(log) {
  emit('select-log', log);
  
  // 获取日志索引，使用虚拟滚动的scrollToItem功能保持在视图中
  const index = filteredLogs.value.indexOf(log);
  if (index !== -1) {
    activeLogIndex.value = index;
    virtualScroll.scrollToItem(index, 'smooth', 'center');
  }
}

// 绑定容器引用
watch(() => logContainer.value, (container) => {
  if (container) {
    virtualScroll.containerRef.value = container;
  }
});

// 清空日志
function clearLogs() {
  emit('clear');
  // 清除缓存
  formattedContentCache.clear();
}

// 改进的缓存管理，包含过期清理机制
function manageCache() {
  try {
    const now = Date.now();
    
    // 如果缓存超过限制，删除最旧的条目
    if (formattedContentCache.size > props.maxCacheSize) {
      const deleteCount = Math.floor(props.maxCacheSize * 0.2); // 删除20%的缓存
      
      // 基于访问时间删除最旧的条目
      const entries = Array.from(cacheTimestamps.entries())
        .sort((a, b) => a[1] - b[1])
        .slice(0, deleteCount);
      
      for (const [key] of entries) {
        formattedContentCache.delete(key);
        cacheTimestamps.delete(key);
      }
    }
    
    // 清理过期缓存（超过缓存生命周期的）
    const expiryTime = now - props.cacheLifetimeMs;
    for (const [key, timestamp] of cacheTimestamps.entries()) {
      if (timestamp < expiryTime) {
        formattedContentCache.delete(key);
        cacheTimestamps.delete(key);
      }
    }
  } catch (error) {
    console.error('管理缓存时出错:', error);
    // 出错时清空缓存，确保不会阻塞UI
    formattedContentCache.clear();
    cacheTimestamps.clear();
  }
}

// 改进的格式化日志内容函数，带有更健壮的错误处理
function getFormattedContent(log) {
  if (!log || log.content === undefined || log.content === null) {
    return '';
  }
  
  try {
    // 使用缓存避免重复格式化
    const cacheKey = getLogKey(log, -1);
    
    if (formattedContentCache.has(cacheKey)) {
      // 更新访问时间
      cacheTimestamps.set(cacheKey, Date.now());
      return formattedContentCache.get(cacheKey);
    }
    
    let result;
    let retryCount = 0;
    
    const tryFormat = () => {
      try {
        if (typeof log.content === 'object') {
          // 使用 try-catch 处理可能的循环引用问题
          try {
            result = JSON.stringify(log.content, null, 2);
          } catch (circularError) {
            // 尝试使用特殊处理处理循环引用
            const cache = new Set();
            result = JSON.stringify(log.content, (key, value) => {
              if (typeof value === 'object' && value !== null) {
                if (cache.has(value)) {
                  return '[循环引用]';
                }
                cache.add(value);
              }
              return value;
            }, 2);
          }
        } else {
          result = String(log.content);
        }
        
        // 存储到缓存
        formattedContentCache.set(cacheKey, result);
        cacheTimestamps.set(cacheKey, Date.now());
        
        // 异步管理缓存避免阻塞渲染
        if (!isPerformingBatchUpdate.value) {
          setTimeout(manageCache, 0);
        }
        
        return result;
      } catch (error) {
        console.error('格式化日志内容时出错:', error);
        if (retryCount < props.errorRetryCount) {
          retryCount++;
          return tryFormat();
        }
        // 格式化失败时提供有用的错误信息
        return `[格式化错误: ${error.message || '未知错误'}]`;
      }
    };
    
    return tryFormat();
  } catch (error) {
    console.error('处理日志格式化时出错:', error);
    return '[处理错误]';
  }
}

// 为日志应用自定义样式类
function customClassForLog(log) {
  if (!log || !log.type || !props.customTypes[log.type]) return '';
  return props.customTypes[log.type];
}

// 为日志生成唯一键
function getLogKey(log, index) {
  if (props.idField && log && log[props.idField]) {
    return log[props.idField];
  }
  // 如果日志有时间戳和内容，可以组合成相对唯一的键
  if (log && log.time && log.content) {
    const contentStr = typeof log.content === 'object' 
      ? JSON.stringify(log.content)
      : String(log.content);
    return `${log.time}-${log.type || ''}-${contentStr.substring(0, 20)}`;
  }
  // 回退到索引
  return index;
}

// 定期清理缓存的函数
function setupCacheCleanup() {
  // 清理旧的定时器
  if (cacheCleanupTimer.value) {
    clearInterval(cacheCleanupTimer.value);
  }
  
  // 设置新的定时器，定期清理缓存
  cacheCleanupTimer.value = setInterval(() => {
    manageCache();
  }, Math.min(props.cacheLifetimeMs / 10, 300000)); // 最多5分钟清理一次
}

// 批量更新处理，优化大量日志处理性能
function performBatchUpdate(callback) {
  isPerformingBatchUpdate.value = true;
  try {
    callback();
  } finally {
    isPerformingBatchUpdate.value = false;
    // 批量更新后执行一次缓存管理
    nextTick(() => {
      setTimeout(manageCache, 0);
    });
  }
}

// 增强的生命周期钩子
onMounted(() => {
  // 初始滚动到底部
  nextTick(() => {
    scrollToBottom();
  });
  
  // 只保留键盘事件监听
  if (logContainer.value) {
    logContainer.value.addEventListener('keydown', handleKeyDown);
    
    // 添加滚动事件监听，用于触底加载
    logContainer.value.addEventListener('scroll', handleScroll);
    
    // 记录视口高度
    viewportHeight.value = logContainer.value.clientHeight;
  }
  
  // 初始状态检查
  checkScrolledToBottom();
  
  // 设置缓存清理
  setupCacheCleanup();
  
  // 如果有很多初始日志，使用批量更新
  if (props.logs.length > 1000) {
    performBatchUpdate(() => {
      // 预处理一部分日志以提高初始渲染性能
      const initialLogs = props.logs.slice(Math.max(0, props.logs.length - 100));
      for (const log of initialLogs) {
        if (log && log.content) {
          getFormattedContent(log);
        }
      }
    });
  }
});

// 添加 beforeUnmount 钩子确保清理
onBeforeUnmount(() => {
  // 确保清理所有计时器
  if (cacheCleanupTimer.value) {
    clearInterval(cacheCleanupTimer.value);
    cacheCleanupTimer.value = null;
  }
});

onUnmounted(() => {
  // 清理事件监听 - 只需要清理键盘事件，滚动事件由virtualScroll处理
  if (logContainer.value) {
    logContainer.value.removeEventListener('keydown', handleKeyDown);
    logContainer.value.removeEventListener('scroll', handleScroll);
  }
  
  // 清理缓存
  formattedContentCache.clear();
  cacheTimestamps.clear();
  
  // 虚拟滚动在内部会自动清理资源
});

// 键盘导航支持
function handleKeyDown(event) {
  if (!filteredLogs.value.length) return;
  
  const { key } = event;
  let newIndex = activeLogIndex.value;
  
  if (key === 'ArrowDown') {
    event.preventDefault();
    newIndex = Math.min(filteredLogs.value.length - 1, newIndex + 1);
  } else if (key === 'ArrowUp') {
    event.preventDefault();
    newIndex = Math.max(0, newIndex - 1);
  } else if (key === 'Enter' && newIndex >= 0) {
    event.preventDefault();
    handleLogClick(filteredLogs.value[newIndex]);
  } else if (key === 'Home') {
    event.preventDefault();
    newIndex = 0;
  } else if (key === 'End') {
    event.preventDefault();
    newIndex = filteredLogs.value.length - 1;
  } else {
    return;
  }
  
  // 只有索引改变时才更新
  if (newIndex !== activeLogIndex.value) {
    activeLogIndex.value = newIndex;
    
    // 确保当前激活项可见
    nextTick(() => {
      const activeRef = logItemRefs.value[`log-${newIndex}`];
      if (activeRef && logContainer.value) {
        activeRef.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }
}

// 修改日志变化的监听，只在非加载更多时自动滚动
watch(() => props.logs.length, (newLength, oldLength) => {
  // 只有在有新日志添加时且不是加载更多触发的情况下才滚动
  if (newLength > oldLength && !isLoadingMoreTriggered.value && !loadMoreInProgress) {
    // 使用nextTick确保DOM更新后再滚动
    nextTick(() => {
      scrollToBottom();
    });
  }
  
  // 如果日志减少了，清理缓存中可能不再需要的条目
  if (newLength < oldLength) {
    // 延迟清理，以避免性能问题
    setTimeout(() => {
      const currentKeys = new Set();
      props.logs.forEach((log, index) => {
        currentKeys.add(getLogKey(log, index));
      });
      
      // 删除不再存在的日志缓存
      formattedContentCache.forEach((_, key) => {
        if (!currentKeys.has(key)) {
          formattedContentCache.delete(key);
        }
      });
    }, 1000);
  }
});

// 监听筛选变化，发出事件
watch([debouncedFilterText, selectedTypes], () => {
  emit('filter', {
    text: debouncedFilterText.value,
    types: selectedTypes.value,
    filteredCount: filteredLogs.value.length
  });
  
  // 重置可见日志计数
  visibleLogCount.value = props.maxVisibleLogs;
  
  // 筛选条件变化后滚动到顶部
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = 0;
    }
  });
});

// 修改handleScroll函数，添加额外检查
const handleScroll = useThrottle(() => {
  // 如果当前正在通过加载更多触发变化，则不处理滚动事件
  if (isLoadingMoreTriggered.value || isLoadingMore.value) {
    return;
  }
  
  // 检查是否滚动到底部或接近底部
  if (logContainer.value && hasMoreLogs.value) {
    const { scrollTop, scrollHeight, clientHeight } = logContainer.value;
    // 修改触发阈值，防止过于敏感
    const scrollBottom = scrollHeight - scrollTop - clientHeight;
    
    if (scrollBottom < 50) {
      loadMoreLogs();
    }
  }
}, { delay: 300 }); // 增加节流延迟

// 添加加载更多方法，增强防跳动保护
let loadMoreInProgress = false;
let loadMoreLastTime = 0;

function loadMoreLogs() {
  // 组件级别的防重复保护
  const now = Date.now();
  if (loadMoreInProgress || now - loadMoreLastTime < 1000) {
    return;
  }
  
  loadMoreInProgress = true;
  loadMoreLastTime = now;
  
  // 设置标志，指示当前是由加载更多触发的变化
  isLoadingMoreTriggered.value = true;
  
  // 记住当前滚动位置
  const previousScrollTop = logContainer.value ? logContainer.value.scrollTop : 0;
  const previousScrollHeight = logContainer.value ? logContainer.value.scrollHeight : 0;
  
  // 调用虚拟滚动的加载方法
  const loaded = virtualScroll.loadMoreItems();
  
  // 使用nextTick确保内容已渲染后再重置状态
  nextTick(() => {
    // 防止滚动位置跳变
    if (logContainer.value) {
      // 计算滚动位置差值，保持相对位置
      const newScrollHeight = logContainer.value.scrollHeight;
      const heightDiff = newScrollHeight - previousScrollHeight;
      
      // 只有在有新内容添加时才调整滚动位置
      if (heightDiff > 0) {
        logContainer.value.scrollTop = previousScrollTop + heightDiff;
      }
    }
    
    // 延迟更长时间再重置标志，确保渲染和滚动已完成
    setTimeout(() => {
      loadMoreInProgress = false;
      isLoadingMoreTriggered.value = false;
    }, 1000);
  });
}
</script>

<style scoped>
.log-viewer {
  width: 100%;
  font-family: system-ui, -apple-system, sans-serif;
}

.log-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex-grow: 1;
}

.filter-input {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
  flex-grow: 1;
}

.log-type-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.type-filter {
  display: flex;
  align-items: center;
  font-size: 0.85em;
  background: #f5f5f5;
  padding: 3px 8px;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
}

.type-filter input {
  margin-right: 4px;
}

.log-container {
  height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  background: #fff;
  position: relative;
  will-change: transform; /* 提示浏览器进行优化 */
  overscroll-behavior: contain; /* 防止滚动嵌套问题 */
  contain: strict; /* 提高渲染性能 */
}

.log-item {
  padding: 5px;
  margin-bottom: 5px;
  border-bottom: 1px solid #eee;
  font-family: monospace;
  line-height: 1.4;
  transition: background-color 0.1s;
  cursor: pointer;
  contain: content; /* 性能优化，限制重排范围 */
}

.log-item:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.log-time {
  color: #999;
  margin-right: 10px;
  font-size: 0.85em;
  display: inline-block;
  min-width: 80px;
}

.log-type {
  font-weight: bold;
  margin-right: 10px;
  display: inline-block;
  min-width: 80px;
}

.log-content {
  word-break: break-word;
  white-space: pre-wrap;
}

.log-empty {
  color: #999;
  font-style: italic;
  text-align: center;
  padding: 20px 0;
}

.log-loading {
  color: #666;
  text-align: center;
  padding: 20px 0;
  font-style: italic;
}

.virtual-scroll-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 15px;
  background: #f5f5f5;
  margin: 10px 0;
  border-radius: 4px;
  transition: opacity 0.3s;
}

.virtual-scroll-loading {
  text-align: center;
  padding: 8px;
  color: #666;
  background: #f8f8f8;
  margin: 10px 0;
  border-radius: 4px;
  transition: opacity 0.3s;
}

.load-more-button {
  background: #4a89dc;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 0.9em;
}

.load-more-button:hover {
  background: #3a78cb;
}

/* 默认日志类型颜色 */
.log-item.info {
  background-color: #f0f7ff;
}

.log-item.warn {
  background-color: #fff8e0;
}

.log-item.error {
  background-color: #fff0f0;
}

.log-item.debug {
  background-color: #f0f0ff;
}

.log-item.success {
  background-color: #f0fff0;
}

/* 打印媒体样式以支持日志打印 */
@media print {
  .log-controls {
    display: none;
  }
  
  .log-container {
    height: auto !important;
    overflow: visible;
    border: none;
  }
  
  .log-item {
    break-inside: avoid;
  }
  
  .virtual-scroll-info {
    display: none;
  }
}

/* 为激活状态的日志项添加样式 */
.log-item.active {
  outline: 2px solid #4a86e8;
  background-color: rgba(74, 134, 232, 0.1);
}

/* 添加性能优化相关样式 */
.log-container {
  height: 200px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  background: #fff;
  position: relative;
  will-change: transform; /* 提示浏览器进行优化 */
  overscroll-behavior: contain; /* 防止滚动嵌套问题 */
  contain: strict; /* 提高渲染性能 */
}

.log-item {
  padding: 5px;
  margin-bottom: 5px;
  border-bottom: 1px solid #eee;
  font-family: monospace;
  line-height: 1.4;
  transition: background-color 0.1s;
  cursor: pointer;
  contain: content; /* 性能优化，限制重排范围 */
}

/* 添加高DPI屏幕支持 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .log-item {
    border-bottom-width: 0.5px;
  }
}

/* 添加暗黑模式支持 */
@media (prefers-color-scheme: dark) {
  .log-container {
    background: #1e1e1e;
    border-color: #444;
  }
  
  .log-item {
    border-bottom-color: #333;
  }
  
  .log-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
  
  .log-time {
    color: #aaa;
  }
  
  .log-empty, .log-loading {
    color: #aaa;
  }
  
  .filter-input {
    background: #333;
    color: #eee;
    border-color: #555;
  }
  
  .type-filter {
    background: #333;
    color: #eee;
  }
  
  /* 调整暗黑模式下的日志类型颜色 */
  .log-item.info {
    background-color: rgba(30, 60, 90, 0.5);
  }
  
  .log-item.warn {
    background-color: rgba(90, 70, 10, 0.5);
  }
  
  .log-item.error {
    background-color: rgba(90, 30, 30, 0.5);
  }
  
  .log-item.debug {
    background-color: rgba(30, 30, 90, 0.5);
  }
  
  .log-item.success {
    background-color: rgba(30, 90, 30, 0.5);
  }
}
</style> 