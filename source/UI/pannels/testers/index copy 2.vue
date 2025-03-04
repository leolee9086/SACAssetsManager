<template>
    <div class="log-viewer-tester">
      <h1>日志查看器测试</h1>
      
      <div class="controls">
        <div class="control-group">
          <h3>添加测试日志</h3>
          <button @click="addInfoLog">添加信息日志</button>
          <button @click="addWarningLog">添加警告日志</button>
          <button @click="addErrorLog">添加错误日志</button>
          <button @click="addDebugLog">添加调试日志</button>
          <button @click="addCustomLog">添加自定义类型日志</button>
          <button @click="addBatchLogs(100)">添加100条日志</button>
          <button @click="addBatchLogs(1000)">添加1000条日志</button>
          <button @click="addComplexLog">添加复杂对象日志</button>
        </div>
        
        <div class="control-group">
          <h3>配置项</h3>
          <label>
            <input type="checkbox" v-model="showTime" />
            显示时间
          </label>
          <label>
            <input type="checkbox" v-model="showType" />
            显示类型
          </label>
          <label>
            <input type="checkbox" v-model="enableFiltering" />
            启用过滤
          </label>
          <label>
            <input type="checkbox" v-model="showTypeFilters" />
            显示类型过滤器
          </label>
          <label>
            <input type="checkbox" v-model="autoScroll" />
            自动滚动
          </label>
          <label>
            <input type="checkbox" v-model="virtualScrolling" />
            启用虚拟滚动
          </label>
        </div>
        
        <div class="control-group">
          <h3>容器高度</h3>
          <select v-model="containerHeight">
            <option value="200px">200px</option>
            <option value="300px">300px</option>
            <option value="400px">400px</option>
            <option value="500px">500px</option>
          </select>
        </div>
      </div>
      
      <div class="selected-log" v-if="selectedLog">
        <h3>选中的日志</h3>
        <pre>{{ JSON.stringify(selectedLog, null, 2) }}</pre>
      </div>
      
      <div class="log-viewer-container">
        <LogViewer
          :logs="logs"
          :show-time="showTime"
          :show-type="showType"
          :enable-filtering="enableFiltering"
          :show-type-filters="showTypeFilters"
          :container-height="containerHeight"
          :auto-scroll="autoScroll"
          :custom-types="customTypes"
          :virtual-scrolling="virtualScrolling"
          @clear="clearLogs"
          @filter="handleFilter"
          @select-log="handleSelectLog"
        >
          <template #controls>
            <div class="custom-controls">
              <button @click="exportLogs">导出日志</button>
            </div>
          </template>
          
          <template #log-item-extra="{ log }">
            <span v-if="log.extra" class="log-extra-info">
              {{ log.extra }}
            </span>
          </template>
        </LogViewer>
      </div>
      
      <div class="stats">
        <h3>统计信息</h3>
        <p>总日志数: {{ logs.length }}</p>
        <p>过滤后日志数: {{ filteredCount }}</p>
        <p>过滤文本: {{ filterText || '无' }}</p>
        <p>选中类型: {{ selectedTypes.join(', ') || '无' }}</p>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive } from 'vue';
  import LogViewer from './LogViewer.vue';
  
  // 状态
  const logs = ref([]);
  const selectedLog = ref(null);
  const showTime = ref(true);
  const showType = ref(true);
  const enableFiltering = ref(true);
  const showTypeFilters = ref(true);
  const containerHeight = ref('300px');
  const autoScroll = ref(true);
  const virtualScrolling = ref(true);
  const filterText = ref('');
  const selectedTypes = ref([]);
  const filteredCount = ref(0);
  
  // 自定义日志类型样式
  const customTypes = reactive({
    'custom': 'custom-log-type',
    'network': 'network-log-type',
    'performance': 'performance-log-type'
  });
  
  // 生成随机ID
  function generateId() {
    return Date.now() + Math.floor(Math.random() * 10000);
  }
  
  // 生成当前时间字符串
  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString() + '.' + now.getMilliseconds().toString().padStart(3, '0');
  }
  
  // 添加信息日志
  function addInfoLog() {
    logs.value.push({
      id: generateId(),
      time: getCurrentTime(),
      type: 'info',
      content: '这是一条信息日志，用于测试信息日志的显示',
      extra: '额外信息'
    });
  }
  
  // 添加警告日志
  function addWarningLog() {
    logs.value.push({
      id: generateId(),
      time: getCurrentTime(),
      type: 'warn',
      content: '这是一条警告日志，用于测试警告日志的显示'
    });
  }
  
  // 添加错误日志
  function addErrorLog() {
    logs.value.push({
      id: generateId(),
      time: getCurrentTime(),
      type: 'error',
      content: '这是一条错误日志，用于测试错误日志的显示'
    });
  }
  
  // 添加调试日志
  function addDebugLog() {
    logs.value.push({
      id: generateId(),
      time: getCurrentTime(),
      type: 'debug',
      content: '这是一条调试日志，用于测试调试日志的显示'
    });
  }
  
  // 添加自定义类型日志
  function addCustomLog() {
    const types = ['custom', 'network', 'performance'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    logs.value.push({
      id: generateId(),
      time: getCurrentTime(),
      type: type,
      content: `这是一条${type}类型的日志，用于测试自定义类型日志的显示`
    });
  }
  
  // 添加复杂对象日志
  function addComplexLog() {
    const complexObject = {
      user: {
        id: 12345,
        name: '测试用户',
        permissions: ['read', 'write', 'admin'],
        settings: {
          theme: 'dark',
          notifications: true,
          language: 'zh-CN'
        }
      },
      stats: {
        visits: 1024,
        actions: 256,
        lastLogin: new Date().toISOString()
      },
      flags: {
        isActive: true,
        hasPremium: false
      }
    };
    
    logs.value.push({
      id: generateId(),
      time: getCurrentTime(),
      type: 'debug',
      content: complexObject
    });
  }
  
  // 批量添加日志
  function addBatchLogs(count) {
    const types = ['info', 'warn', 'error', 'debug', 'custom', 'network', 'performance'];
    const batch = [];
    
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      batch.push({
        id: generateId(),
        time: getCurrentTime(),
        type: type,
        content: `批量测试日志 #${i+1} (类型: ${type})`
      });
    }
    
    logs.value = [...logs.value, ...batch];
  }
  
  // 清空日志
  function clearLogs() {
    logs.value = [];
    selectedLog.value = null;
  }
  
  // 导出日志
  function exportLogs() {
    const exportData = JSON.stringify(logs.value, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  // 处理过滤事件
  function handleFilter(filterData) {
    filterText.value = filterData.text;
    selectedTypes.value = filterData.types;
    filteredCount.value = filterData.filteredCount;
  }
  
  // 处理日志选择
  function handleSelectLog(log) {
    selectedLog.value = log;
  }
  
  // 在组件挂载时添加一些初始日志
  setTimeout(() => {
    addInfoLog();
    addWarningLog();
    addErrorLog();
    addDebugLog();
    addCustomLog();
    addComplexLog();
  }, 500);
  </script>
  
  <style scoped>
  .log-viewer-tester {
    max-width: 100%;
    margin: 0 auto;
    padding: 20px;
  }
  
  h1 {
    margin-bottom: 20px;
  }
  
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    margin-bottom: 20px;
    background-color: #f5f5f5;
    padding: 15px;
    border-radius: 8px;
  }
  
  .control-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .control-group h3 {
    margin: 0 0 10px 0;
    font-size: 16px;
  }
  
  .control-group label {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  button {
    padding: 8px 12px;
    background-color: #4a89dc;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 5px;
    margin-bottom: 5px;
  }
  
  button:hover {
    background-color: #3a78cb;
  }
  
  .log-viewer-container {
    margin-bottom: 20px;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 15px;
  }
  
  .stats {
    background-color: #f5f5f5;
    padding: 15px;
    border-radius: 8px;
  }
  
  .stats h3 {
    margin-top: 0;
    margin-bottom: 10px;
  }
  
  .selected-log {
    margin-bottom: 20px;
    padding: 15px;
    background-color: #e6f7ff;
    border-radius: 8px;
    border-left: 4px solid #1890ff;
  }
  
  .selected-log h3 {
    margin-top: 0;
    margin-bottom: 10px;
  }
  
  .selected-log pre {
    background-color: #fff;
    padding: 10px;
    border-radius: 4px;
    max-height: 200px;
    overflow: auto;
  }
  
  .custom-controls {
    display: flex;
    gap: 10px;
  }
  
  .log-extra-info {
    margin-left: 10px;
    padding: 2px 6px;
    background-color: #e6f7ff;
    border-radius: 4px;
    font-size: 0.8em;
  }
  
  /* 自定义日志类型样式 */
  :deep(.custom-log-type) {
    background-color: #e6f7ff !important;
    border-left: 3px solid #1890ff !important;
  }
  
  :deep(.network-log-type) {
    background-color: #f6ffed !important;
    border-left: 3px solid #52c41a !important;
  }
  
  :deep(.performance-log-type) {
    background-color: #fff7e6 !important;
    border-left: 3px solid #fa8c16 !important;
  }
  
  /* 暗黑模式支持 */
  @media (prefers-color-scheme: dark) {
    .controls, .stats {
      background-color: #2d2d2d;
      color: #e0e0e0;
    }
    
    .selected-log {
      background-color: #22272e;
      color: #e0e0e0;
      border-left-color: #4096ff;
    }
    
    .selected-log pre {
      background-color: #1e1e1e;
      color: #e0e0e0;
    }
    
    .log-extra-info {
      background-color: #22272e;
    }
    
    /* 自定义日志类型样式 - 暗黑模式 */
    :deep(.custom-log-type) {
      background-color: rgba(24, 144, 255, 0.15) !important;
    }
    
    :deep(.network-log-type) {
      background-color: rgba(82, 196, 26, 0.15) !important;
    }
    
    :deep(.performance-log-type) {
      background-color: rgba(250, 140, 22, 0.15) !important;
    }
  }
  </style>