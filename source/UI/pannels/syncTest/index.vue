<template>
  <div class="sync-test-container">
    <header class="panel-header">
      <h3>响应式功能测试面板</h3>
      <div class="connection-status" :class="{ connected: syncedData.$status?.connected }">
        {{ syncedData.$status?.connected ? '已连接' : '未连接' }}
      </div>
    </header>
    
    <section class="test-grid">
      <!-- 左侧：Vue原生响应式 -->
      <div class="test-column">
        <h4>Vue原生响应式</h4>
        
        <div class="data-input">
          <div class="field-row">
            <label>基本值测试：</label>
            <input v-model="vueData.basicValue" placeholder="输入文本">
          </div>
          
          <div class="field-row">
            <label>嵌套对象测试：</label>
            <input v-model="vueData.nested.value" placeholder="输入文本">
          </div>
          
          <div class="field-row">
            <label>数组操作测试：</label>
            <div class="array-test">
              <div class="array-items">
                <div v-for="(item, index) in vueData.items" :key="index" class="array-item">
                  {{ item }}
                  <button @click="removeVueItem(index)" class="small-btn">删除</button>
                </div>
              </div>
              <div class="array-controls">
                <input v-model="vueNewItem" placeholder="新项目">
                <button @click="addVueItem" class="action-button">添加项目</button>
              </div>
            </div>
          </div>
          
          <div class="field-row">
            <label>计算属性测试：</label>
            <div class="computed-display">{{ vueComputed }}</div>
          </div>
        </div>
        
        <div class="control-actions">
          <button @click="resetVueData" class="action-button">重置数据</button>
        </div>
      </div>
      
      <!-- 右侧：同步响应式 -->
      <div class="test-column">
        <h4>同步响应式</h4>
        
        <div class="data-input">
          <div class="field-row">
            <label>基本值测试：</label>
            <input v-model="syncedData.basicValue" placeholder="输入文本">
          </div>
          
          <div class="field-row">
            <label>嵌套对象测试：</label>
            <input v-model="syncedData.nested.value" placeholder="输入文本">
          </div>
          
          <div class="field-row">
            <label>数组操作测试：</label>
            <div class="array-test">
              <div class="array-items">
                <div v-for="(item, index) in syncedData.items" :key="index" class="array-item">
                  {{ item }}
                  <button @click="removeSyncedItem(index)" class="small-btn">删除</button>
                </div>
              </div>
              <div class="array-controls">
                <input v-model="syncedNewItem" placeholder="新项目">
                <button @click="addSyncedItem" class="action-button">添加项目</button>
              </div>
            </div>
          </div>
          
          <div class="field-row">
            <label>计算属性测试：</label>
            <div class="computed-display">{{ syncedComputed }}</div>
          </div>
        </div>
        
        <div class="control-actions">
          <button @click="resetSyncedData" class="action-button">重置数据</button>
          <button @click="syncManual" class="action-button" :disabled="!syncedData.$status?.connected">手动同步</button>
          <button @click="openNewTab" class="action-button">打开新Tab</button>
        </div>
      </div>
    </section>
    
    <section class="watch-test">
      <h4>监听器测试</h4>
      <div class="watch-logs">
        <div v-for="(log, index) in watchLogs" :key="index" class="log-item" :class="log.type">
          {{ log.time }} - {{ log.message }}
        </div>
      </div>
      <button @click="clearLogs" class="action-button">清除日志</button>
    </section>
    
    <section class="status-section">
      <h4>同步信息</h4>
      <div class="status-row" v-if="syncedData && syncedData.$status">
        <div>房间名称: <code>{{ roomName }}</code></div>
        <div>数据键: <code>{{ dataKey }}</code></div>
        <div>连接节点: {{ syncedData.$status.peers ? syncedData.$status.peers.size : 0 }}</div>
        <div>上次同步: {{ syncedData.$status.lastSync ? new Date(syncedData.$status.lastSync).toLocaleTimeString() : '未同步' }}</div>
        <div>Tab ID: <code>{{ tabId || '主面板' }}</code></div>
      </div>
    </section>
  </div>
</template>

<script>
import { reactive, computed, watch, onMounted, onBeforeUnmount, ref } from '../../../../static/vue.esm-browser.js';
import { useSyncedReactive } from '../../../../src/toolBox/useAge/forSync/useSyncedReactive.js';

// 获取思源插件API
const pluginInstance = window[Symbol.for('plugin-SACAssetsManager')];
const eventBus = pluginInstance.eventBus;

export default {
  name: 'SyncTest',
  
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
    const namespace = config.namespace || 'sync-test';
    const id = config.id || 'test-data';
    const roomName = config.roomName || `sync-service-${namespace}`;
    const dataKey = config.dataKey || id;
    
    // 默认数据结构
    const defaultData = {
      basicValue: '响应式测试',
      nested: {
        value: '嵌套数据测试'
      },
      items: ['项目1', '项目2', '项目3'],
      lastUpdate: Date.now()
    };
    
    // =============== Vue原生响应式 ===============
    const vueData = reactive({...JSON.parse(JSON.stringify(defaultData))});
    const vueNewItem = ref('');
    
    // Vue原生计算属性
    const vueComputed = computed(() => {
      return `基础值长度: ${vueData.basicValue.length}, 数组数量: ${vueData.items.length}`;
    });
    
    // Vue原生数组操作
    const addVueItem = () => {
      if (vueNewItem.value.trim()) {
        vueData.items.push(vueNewItem.value);
        vueNewItem.value = '';
      }
    };
    
    const removeVueItem = (index) => {
      vueData.items.splice(index, 1);
    };
    
    // 重置Vue数据
    const resetVueData = () => {
      Object.assign(vueData, JSON.parse(JSON.stringify(defaultData)));
    };
    
    // =============== 同步响应式 ===============
    // 使用useSyncedReactive创建同步响应式数据
    const syncedData = useSyncedReactive(
      {...JSON.parse(JSON.stringify(defaultData))}, 
      {
        roomName,
        key: dataKey,
        persist: true,
        debug: true,
        onSync: (data) => {
          // 不在这里直接调用addLog，因为可能还未定义
          console.log(`[同步] 数据接收: ${JSON.stringify(data).substring(0, 50)}...`);
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
    
    const syncedNewItem = ref('');
    
    // 同步响应式计算属性
    const syncedComputed = computed(() => {
      return `基础值长度: ${syncedData.basicValue.length}, 数组数量: ${syncedData.items.length}`;
    });
    
    // 同步响应式数组操作
    const addSyncedItem = () => {
      if (syncedNewItem.value.trim()) {
        syncedData.items.push(syncedNewItem.value);
        syncedNewItem.value = '';
        syncedData.lastUpdate = Date.now();
      }
    };
    
    const removeSyncedItem = (index) => {
      syncedData.items.splice(index, 1);
      syncedData.lastUpdate = Date.now();
    };
    
    // 重置同步数据
    const resetSyncedData = () => {
      Object.assign(syncedData, JSON.parse(JSON.stringify(defaultData)));
    };
    
    // 手动同步
    function syncManual() {
      if (syncedData && syncedData.$sync) {
        syncedData.$sync();
        addLog('sync', '手动触发同步');
      }
    }
    
    // 打开新的Tab
    function openNewTab() {
      // 创建与当前数据相同配置的新Tab
      eventBus.emit('plugin-tab:open', {
        tabType: 'syncTestTab',
        tabData: {
          syncConfig: {
            namespace,
            id,
            roomName,
            dataKey
          }
        }
      });
      addLog('action', '打开新Tab');
    }
    
    // =============== 监听器测试 ===============
    const watchLogs = ref([]);
    
    // 添加日志
    const addLog = (type, message) => {
      const time = new Date().toLocaleTimeString();
      watchLogs.value.unshift({ type, message, time });
      
      // 限制日志数量
      if (watchLogs.value.length > 50) {
        watchLogs.value = watchLogs.value.slice(0, 50);
      }
    };
    
    // 自动增强所有数组属性 - 移到addLog函数之后
    if (syncedData.$enhanceAllArrays) {
      const count = syncedData.$enhanceAllArrays();
      addLog('action', `增强了${count}个数组属性`);
    }
    
    // 清除日志
    const clearLogs = () => {
      watchLogs.value = [];
    };
    
    // 监听Vue数据变化
    watch(() => vueData.basicValue, (newVal, oldVal) => {
      addLog('vue', `基础值变化: ${oldVal} -> ${newVal}`);
    });
    
    watch(() => vueData.nested.value, (newVal, oldVal) => {
      addLog('vue', `嵌套值变化: ${oldVal} -> ${newVal}`);
    });
    
    watch(() => vueData.items.length, (newVal, oldVal) => {
      addLog('vue', `数组长度变化: ${oldVal} -> ${newVal}`);
    });
    
    // 监听同步数据变化
    watch(() => syncedData.basicValue, (newVal, oldVal) => {
      addLog('synced', `基础值变化: ${oldVal} -> ${newVal}`);
    });
    
    watch(() => syncedData.nested.value, (newVal, oldVal) => {
      addLog('synced', `嵌套值变化: ${oldVal} -> ${newVal}`);
    });
    
    watch(() => syncedData.items.length, (newVal, oldVal) => {
      addLog('synced', `数组长度变化: ${oldVal} -> ${newVal}`);
    });
    
    // 同步状态监听
    watch(() => syncedData.$status?.connected, (newVal, oldVal) => {
      if (newVal !== oldVal) {
        addLog('status', `连接状态变化: ${oldVal ? '已连接' : '未连接'} -> ${newVal ? '已连接' : '未连接'}`);
      }
    });
    
    // 组件挂载完成后主动触发同步
    onMounted(() => {
      addLog('lifecycle', '组件已挂载');
      
      // 等待一会儿让其他组件也能挂载完成
      setTimeout(() => {
        if (syncedData && syncedData.$sync) {
          syncedData.$sync();
          addLog('sync', '组件挂载后主动同步');
        }
      }, 500);
      
      // 定期自动同步
      const autoSyncInterval = setInterval(() => {
        if (syncedData && syncedData.$syncAuto && syncedData.$status?.connected) {
          syncedData.$syncAuto();
        }
      }, 2000);
      
      // 组件卸载时清除定时器
      onBeforeUnmount(() => {
        clearInterval(autoSyncInterval);
        addLog('lifecycle', '组件将卸载');
      });
    });
    
    return {
      // Vue 原生响应式
      vueData,
      vueNewItem,
      vueComputed,
      addVueItem,
      removeVueItem,
      resetVueData,
      
      // 同步响应式
      syncedData,
      syncedNewItem,
      syncedComputed,
      addSyncedItem,
      removeSyncedItem,
      resetSyncedData,
      syncManual,
      openNewTab,
      
      // 监听器测试
      watchLogs,
      clearLogs,
      
      // 同步信息
      roomName,
      dataKey,
      tabId: props.tabId
    };
  }
}
</script>

<style scoped>
.sync-test-container {
  padding: 16px;
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 16px;
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

.connection-status {
  padding: 4px 8px;
  border-radius: 4px;
  background-color: #f44336;
  color: white;
  font-size: 12px;
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
}

.test-column h4 {
  margin: 0 0 16px 0;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 8px;
}

.data-input {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-row label {
  font-weight: bold;
  font-size: 14px;
}

.field-row input, .field-row textarea {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100%;
}

.computed-display {
  background-color: #f5f5f5;
  padding: 8px;
  border-radius: 4px;
  font-family: monospace;
}

.array-test {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.array-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
}

.array-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.small-btn {
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 3px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  cursor: pointer;
}

.small-btn:hover {
  background-color: #e0e0e0;
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
  gap: 8px;
  margin-top: 16px;
}

.action-button {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  background-color: #1976d2;
  color: white;
  font-size: 14px;
}

.action-button:disabled {
  background-color: #b0bec5;
  cursor: not-allowed;
}

.watch-test {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.watch-test h4 {
  margin: 0 0 12px 0;
}

.watch-logs {
  height: 150px;
  overflow-y: auto;
  background-color: #f8f8f8;
  border-radius: 4px;
  padding: 8px;
  margin-bottom: 10px;
  font-family: monospace;
  font-size: 12px;
}

.log-item {
  margin-bottom: 4px;
  padding: 4px;
  border-radius: 3px;
}

.log-item.vue {
  background-color: #e3f2fd;
}

.log-item.synced {
  background-color: #e8f5e9;
}

.log-item.sync {
  background-color: #fff8e1;
}

.log-item.action {
  background-color: #f3e5f5;
}

.log-item.lifecycle {
  background-color: #fce4ec;
}

.log-item.status {
  background-color: #e0f7fa;
}

.status-section {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  margin-top: 16px;
}

.status-section h4 {
  margin-top: 0;
  margin-bottom: 8px;
}

.status-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.status-row code {
  background-color: #e0e0e0;
  padding: 2px 4px;
  border-radius: 3px;
}
</style> 