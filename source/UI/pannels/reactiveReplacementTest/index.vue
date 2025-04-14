<template>
  <div class="reactive-replacement-container">
    <header class="panel-header">
      <h3>响应式替代测试</h3>
      <div class="connection-status" :class="{ connected: syncedData.$status?.connected }">
        {{ syncedData.$status?.connected ? '已连接' : '未连接' }}
      </div>
    </header>
    
    <section class="description">
      <p>本面板测试 useSyncedReactive 作为 Vue reactive 的完全替代品的表现</p>
    </section>

    <section class="test-grid">
      <!-- 纯响应式测试 -->
      <div class="test-column">
        <h4>纯响应式测试</h4>
        
        <div class="data-input">
          <div class="field-row">
            <label>基本数据绑定：</label>
            <input v-model="syncedData.basicValue" placeholder="输入文本">
            <div class="output-display">值：{{ syncedData.basicValue }}</div>
          </div>
          
          <div class="field-row">
            <label>嵌套对象测试：</label>
            <input v-model="syncedData.nested.value" placeholder="输入文本">
            <div class="output-display">嵌套值：{{ syncedData.nested.value }}</div>
          </div>
          
          <div class="field-row">
            <label>数组操作测试：</label>
            <div class="array-test">
              <div class="array-items">
                <div v-for="(item, index) in syncedData.items" :key="index" class="array-item">
                  {{ item }}
                  <button @click="removeItem(index)" class="small-btn">删除</button>
                </div>
              </div>
              <div class="array-controls">
                <input v-model="newItem" placeholder="新项目">
                <button @click="addItem" class="action-button">添加项目</button>
              </div>
            </div>
          </div>
          
          <div class="field-row">
            <label>计算属性测试：</label>
            <div class="computed-display">{{ computedValue }}</div>
          </div>
        </div>
        
        <div class="control-actions">
          <button @click="resetData" class="action-button">重置数据</button>
          <button @click="syncManual" class="action-button" :disabled="!syncedData.$status?.connected">手动同步</button>
          <button @click="openNewTab" class="action-button">打开新Tab</button>
        </div>
      </div>
      
      <!-- 高级特性测试 -->
      <div class="test-column">
        <h4>高级特性测试</h4>
        
        <div class="data-input">
          <div class="field-row">
            <label>深层嵌套测试：</label>
            <div class="nested-test">
              <input v-model="syncedData.deepNested.level1.level2.value" placeholder="深层值">
              <div class="output-display">
                深层值：{{ syncedData.deepNested.level1.level2.value }}
              </div>
            </div>
          </div>
          
          <div class="field-row">
            <label>对象数组测试：</label>
            <div class="object-array-test">
              <div class="array-items">
                <div v-for="(obj, index) in syncedData.objectArray" :key="index" class="object-item">
                  <input v-model="obj.name" placeholder="名称">
                  <input v-model.number="obj.value" type="number" placeholder="数值">
                  <button @click="removeObjectItem(index)" class="small-btn">删除</button>
                </div>
              </div>
              <button @click="addObjectItem" class="action-button">添加对象</button>
            </div>
          </div>
          
          <div class="field-row">
            <label>响应式方法测试：</label>
            <div class="method-test">
              <button @click="incrementCounter" class="action-button">计数器 +1</button>
              <span class="counter-value">当前值: {{ syncedData.counter }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 监听器测试 -->
    <section class="watch-test">
      <h4>监听器测试</h4>
      <div class="watch-logs">
        <div v-for="(log, index) in watchLogs" :key="index" class="log-item" :class="log.type">
          {{ log.time }} - {{ log.message }}
        </div>
      </div>
      <button @click="clearLogs" class="action-button">清除日志</button>
    </section>
    
    <!-- 同步状态 -->
    <section class="status-section">
      <h4>同步信息</h4>
      <div class="status-row" v-if="syncedData && syncedData.$status">
        <div>房间名称: <code>{{ roomName }}</code></div>
        <div>数据键: <code>{{ dataKey }}</code></div>
        <div>连接节点: {{ syncedData.$status.peers ? syncedData.$status.peers.size : 0 }}</div>
        <div>上次同步: {{ syncedData.$status.lastSync ? new Date(syncedData.$status.lastSync).toLocaleTimeString() : '未同步' }}</div>
        <div>Tab ID: <code>{{ tabId || '主面板' }}</code></div>
        <div>性能指标: <code>操作响应时间 {{ syncedData.performanceMetrics.responseTime }}ms</code></div>
      </div>
    </section>
  </div>
</template>

<script>
import { computed, watch, onMounted, onBeforeUnmount, ref } from '../../../../static/vue.esm-browser.js';
import { useSyncedReactive } from '../../../../src/toolBox/useAge/forSync/useSyncedReactive.js';

// 获取思源插件API
const pluginInstance = window[Symbol.for('plugin-SACAssetsManager')];
const eventBus = pluginInstance.eventBus;

// 默认数据结构
const createDefaultData = () => ({
  basicValue: '响应式测试',
  nested: {
    value: '嵌套数据测试'
  },
  items: ['项目1', '项目2', '项目3'],
  counter: 0,
  deepNested: {
    level1: {
      level2: {
        value: '深层嵌套值'
      }
    }
  },
  objectArray: [
    { id: 1, name: '对象1', value: 10 },
    { id: 2, name: '对象2', value: 20 }
  ],
  performanceMetrics: {
    responseTime: 0,
    operations: 0
  },
  lastUpdate: Date.now()
});

export default {
  name: 'ReactiveReplacementTest',
  
  props: {
    tabId: {
      type: String,
      default: null
    },
    // 可以从外部指定同步配置
    syncConfig: {
      type: Object,
      default: () => ({})
    }
  },
  
  setup(props) {
    // 同步配置
    const config = props.syncConfig || {};
    const namespace = config.namespace || 'reactive-replacement';
    const id = config.id || 'test-data';
    const roomName = config.roomName || `sync-service-${namespace}`;
    const dataKey = config.dataKey || id;
    
    // 使用useSyncedReactive作为Vue reactive的替代
    const syncedData = useSyncedReactive(
      createDefaultData(), 
      {
        roomName,
        key: dataKey,
        persist: true,
        debug: true,
        onSync: (data) => {
          console.log(`[同步] 数据接收: ${JSON.stringify(data).substring(0, 50)}...`);
          addLog('sync', '收到远程数据同步');
        },
        // 思源配置 - 启用思源WebSocket同步
        siyuan: {
          enabled: true,
          ...(config.siyuanConfig || {})
        },
        // 禁用WebRTC - 强制使用思源WebSocket
        disableWebRTC: true
      }
    );
    
    // 辅助数据
    const newItem = ref('');
    const watchLogs = ref([]);
    
    // 添加独立计数器避免递归更新
    let metricsUpdateCounter = 0;
    
    // 计算属性测试
    const computedValue = computed(() => {
      const start = performance.now();
      
      const result = `基础值长度: ${syncedData.basicValue.length}, 数组数量: ${syncedData.items.length}, 计数器: ${syncedData.counter}`;
      
      // 测量响应时间
      const end = performance.now();
      const responseTime = Math.round((end - start) * 100) / 100;
      
      // 使用setTimeout推迟指标更新到下一个事件循环
      // 这样可以完全避免在计算过程中触发响应式更新
      setTimeout(() => {
        if (syncedData.$updateMetrics) {
          syncedData.$updateMetrics({
            responseTime: responseTime,
            operations: ++metricsUpdateCounter
          });
        }
      }, 0);
      
      return result;
    });
    
    // 添加日志
    const addLog = (type, message) => {
      const time = new Date().toLocaleTimeString();
      watchLogs.value.unshift({ type, message, time });
      
      // 限制日志数量
      if (watchLogs.value.length > 30) {
        watchLogs.value = watchLogs.value.slice(0, 30);
      }
    };
    
    // 清除日志
    const clearLogs = () => {
      watchLogs.value = [];
    };
    
    // 数组操作
    const addItem = () => {
      if (newItem.value.trim()) {
        syncedData.items.push(newItem.value);
        newItem.value = '';
        syncedData.lastUpdate = Date.now();
        addLog('action', `添加了新项目: ${syncedData.items[syncedData.items.length - 1]}`);
      }
    };
    
    const removeItem = (index) => {
      const removed = syncedData.items[index];
      syncedData.items.splice(index, 1);
      syncedData.lastUpdate = Date.now();
      addLog('action', `删除了项目: ${removed}`);
    };
    
    // 对象数组操作
    const addObjectItem = () => {
      const newId = syncedData.objectArray.length > 0 
        ? Math.max(...syncedData.objectArray.map(obj => obj.id)) + 1 
        : 1;
        
      syncedData.objectArray.push({
        id: newId,
        name: `对象${newId}`,
        value: Math.floor(Math.random() * 100)
      });
      
      syncedData.lastUpdate = Date.now();
      addLog('action', `添加了新对象 ID: ${newId}`);
    };
    
    const removeObjectItem = (index) => {
      const removed = syncedData.objectArray[index];
      syncedData.objectArray.splice(index, 1);
      syncedData.lastUpdate = Date.now();
      addLog('action', `删除了对象 ID: ${removed.id}`);
    };
    
    // 递增计数器
    const incrementCounter = () => {
      syncedData.counter++;
      addLog('action', `计数器递增到: ${syncedData.counter}`);
    };
    
    // 重置数据
    const resetData = () => {
      Object.assign(syncedData, createDefaultData());
      addLog('action', '重置了所有数据');
    };
    
    // 手动同步
    const syncManual = () => {
      if (syncedData && syncedData.$sync) {
        syncedData.$sync();
        addLog('sync', '手动触发同步');
      }
    };
    
    // 打开新的Tab
    const openNewTab = () => {
      eventBus.emit('plugin-tab:open', {
        tabType: 'reactiveReplacementTab',
        tabData: {
          syncConfig: {
            namespace,
            id,
            roomName,
            dataKey
          }
        }
      });
      addLog('action', '打开了新Tab');
    };
    
    // 监听器设置
    watch(() => syncedData.basicValue, (newVal, oldVal) => {
      if (newVal !== oldVal) {
        addLog('watch', `基础值变化: ${oldVal} -> ${newVal}`);
      }
    });
    
    watch(() => syncedData.nested.value, (newVal, oldVal) => {
      if (newVal !== oldVal) {
        addLog('watch', `嵌套值变化: ${oldVal} -> ${newVal}`);
      }
    });
    
    watch(() => syncedData.counter, (newVal, oldVal) => {
      if (newVal !== oldVal) {
        addLog('watch', `计数器变化: ${oldVal} -> ${newVal}`);
      }
    });
    
    watch(() => syncedData.deepNested.level1.level2.value, (newVal, oldVal) => {
      if (newVal !== oldVal) {
        addLog('watch', `深层嵌套值变化: ${oldVal} -> ${newVal}`);
      }
    });
    
    // 监听数组长度变化
    watch(() => syncedData.items?.length, (newVal, oldVal) => {
      if (newVal !== oldVal) {
        addLog('watch', `数组长度变化: ${oldVal || 0} -> ${newVal || 0}`);
        
        // 如果items变为undefined，尝试恢复为空数组
        if (syncedData.items === undefined) {
          console.warn('[同步测试] items数组丢失，重新初始化为空数组');
          syncedData.items = [];
        }
      }
    });
    
    // 监听对象数组变化 (复杂监听)
    watch(() => JSON.stringify(syncedData.objectArray), (newVal, oldVal) => {
      if (newVal !== oldVal) {
        addLog('watch', `对象数组变化检测到`);
      }
    });
    
    // 连接状态监听
    watch(() => syncedData.$status?.connected, (newVal, oldVal) => {
      if (newVal !== oldVal) {
        addLog('status', `连接状态变化: ${oldVal ? '已连接' : '未连接'} -> ${newVal ? '已连接' : '未连接'}`);
      }
    });
    
    // 组件挂载后触发同步
    onMounted(() => {
      addLog('lifecycle', '组件已挂载');
      
      // 增强所有数组属性
      if (syncedData.$enhanceAllArrays) {
        const count = syncedData.$enhanceAllArrays();
        addLog('action', `增强了${count}个数组属性`);
      }
      
      // 延迟同步确保连接
      setTimeout(() => {
        if (syncedData.$sync) {
          syncedData.$sync();
          addLog('sync', '组件挂载后主动同步');
        }
      }, 500);
      
      // 定期自动同步
      const autoSyncInterval = setInterval(() => {
        if (syncedData.$syncAuto && syncedData.$status?.connected) {
          syncedData.$syncAuto();
        }
      }, 2000);
      
      // 组件卸载时清理
      onBeforeUnmount(() => {
        clearInterval(autoSyncInterval);
        addLog('lifecycle', '组件将卸载');
      });
    });
    
    return {
      syncedData,
      newItem,
      watchLogs,
      computedValue,
      addItem,
      removeItem,
      addObjectItem,
      removeObjectItem,
      incrementCounter,
      resetData,
      syncManual,
      openNewTab,
      clearLogs,
      roomName,
      dataKey,
      tabId: props.tabId
    };
  }
}
</script>

<style scoped>
.reactive-replacement-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h3 {
  margin: 0;
}

.description {
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  border-left: 4px solid #1976d2;
}

.description p {
  margin: 0;
  color: #333;
}

.connection-status {
  padding: 4px 10px;
  border-radius: 4px;
  background-color: #f44336;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.connection-status.connected {
  background-color: #4caf50;
}

.test-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.test-column {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  background-color: white;
}

.test-column h4 {
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
  color: #1976d2;
}

.data-input {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-row label {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.field-row input, .field-row textarea {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100%;
  font-size: 14px;
}

.field-row input:focus, .field-row textarea:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

.output-display {
  background-color: #f5f5f5;
  padding: 8px 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
  color: #333;
}

.computed-display {
  background-color: #e3f2fd;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  color: #0d47a1;
  font-weight: 500;
}

.array-test, .object-array-test, .nested-test, .method-test {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.array-items, .object-array-test .array-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
  background-color: #fafafa;
}

.array-item, .object-item {
  display: flex;
  align-items: center;
  padding: 8px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #eee;
}

.array-item {
  justify-content: space-between;
}

.object-item {
  gap: 8px;
  flex-wrap: wrap;
}

.object-item input {
  flex: 1;
  min-width: 100px;
}

.small-btn {
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  cursor: pointer;
  color: #f44336;
}

.small-btn:hover {
  background-color: #ffebee;
  border-color: #f44336;
}

.array-controls {
  display: flex;
  gap: 8px;
}

.array-controls input {
  flex: 1;
}

.control-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.action-button {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  background-color: #1976d2;
  color: white;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.action-button:hover {
  background-color: #1565c0;
}

.action-button:disabled {
  background-color: #b0bec5;
  cursor: not-allowed;
}

.counter-value {
  background-color: #e8eaf6;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: 500;
}

.watch-test {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.watch-test h4 {
  margin: 0 0 12px 0;
  color: #1976d2;
}

.watch-logs {
  height: 150px;
  overflow-y: auto;
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 10px;
  font-family: monospace;
  font-size: 13px;
}

.log-item {
  margin-bottom: 6px;
  padding: 6px 8px;
  border-radius: 4px;
  border-left: 3px solid transparent;
}

.log-item.watch {
  background-color: #e3f2fd;
  border-left-color: #2196f3;
}

.log-item.sync {
  background-color: #fff8e1;
  border-left-color: #ffc107;
}

.log-item.action {
  background-color: #f3e5f5;
  border-left-color: #9c27b0;
}

.log-item.lifecycle {
  background-color: #fce4ec;
  border-left-color: #e91e63;
}

.log-item.status {
  background-color: #e0f7fa;
  border-left-color: #00bcd4;
}

.status-section {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  font-size: 14px;
  margin-top: 16px;
  border: 1px solid #e0e0e0;
}

.status-section h4 {
  margin-top: 0;
  margin-bottom: 12px;
  color: #1976d2;
}

.status-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.status-row code {
  background-color: #e0e0e0;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 13px;
}
</style> 