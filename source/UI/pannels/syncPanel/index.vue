<template>
  <div class="sync-panel-container">
    <header class="panel-header">
      <h3>同步数据面板</h3>
      <div class="connection-status" :class="{ connected: syncData?.$status?.connected }">
        {{ syncData?.$status?.connected ? '已连接' : '未连接' }}
      </div>
    </header>
    
    <section class="data-section">
      <div class="data-input">
        <div class="field-row">
          <label>标题：</label>
          <input v-model="syncData.title" placeholder="输入标题">
        </div>
        
        <div class="field-row">
          <label>内容：</label>
          <textarea v-model="syncData.content" placeholder="输入内容" rows="5"></textarea>
        </div>
        
        <div class="field-row">
          <label>计数：</label>
          <div class="counter-control">
            <button @click="decrement">-</button>
            <span class="counter-value">{{ syncData.counter }}</span>
            <button @click="increment">+</button>
          </div>
        </div>

        <div class="field-row">
          <label>更新时间：</label>
          <span>{{ syncData.lastUpdate ? new Date(syncData.lastUpdate).toLocaleString() : '未更新' }}</span>
        </div>
      </div>
    </section>
    
    <section class="actions-section">
      <button @click="openNewTab" class="action-button">打开新Tab</button>
      <button @click="syncManual" class="action-button" :disabled="!syncData?.$status?.connected">手动同步</button>
      <button @click="forceSync" class="action-button" :disabled="!syncData?.$status?.connected">强制同步</button>
      <button @click="resetData" class="action-button">重置数据</button>
    </section>
    
    <section class="status-section">
      <h4>同步信息</h4>
      <div class="status-row" v-if="syncData && syncData.$status">
        <div>房间名称: <code>{{ roomName }}</code></div>
        <div>数据键: <code>{{ dataKey }}</code></div>
        <div>连接节点: {{ syncData.$status.peers ? syncData.$status.peers.size : 0 }}</div>
        <div>上次同步: {{ syncData.$status.lastSync ? new Date(syncData.$status.lastSync).toLocaleTimeString() : '未同步' }}</div>
        <div>Tab ID: <code>{{ tabId || '主面板' }}</code></div>
      </div>
    </section>
  </div>
</template>

<script>
import { reactive, onMounted, onBeforeUnmount } from '../../../../static/vue.esm-browser.js';
import { useSyncedReactive } from '../../../../src/toolBox/useAge/forSync/useSyncedReactive.js';

// 获取思源插件API
const pluginInstance = window[Symbol.for('plugin-SACAssetsManager')];
const eventBus = pluginInstance.eventBus;

export default {
  name: 'SyncPanel',
  
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
    const namespace = config.namespace || 'sync-panel';
    const id = config.id || 'main-data';
    const roomName = config.roomName || `sync-service-${namespace}`;
    const dataKey = config.dataKey || id;
    
    // 默认数据
    const defaultData = {
      title: '同步数据示例',
      content: '这是一个实时同步的数据面板，在不同的Tab中打开此面板可以实时同步数据。',
      counter: 0,
      lastUpdate: Date.now()
    };
    
    // 同步数据 - 使用useSyncedReactive同步接口
    const syncData = useSyncedReactive(
      defaultData, 
      {
        roomName,
        key: dataKey,
        persist: true,
        debug: true,
        onSync: (data) => {
          console.log('[同步面板] 数据同步', data);
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
    
    // 递增计数器
    function increment() {
      if (syncData) {
        syncData.counter++;
        syncData.lastUpdate = Date.now();
      }
    }
    
    // 递减计数器
    function decrement() {
      if (syncData) {
        syncData.counter--;
        syncData.lastUpdate = Date.now();
      }
    }
    
    // 重置数据
    function resetData() {
      if (syncData && syncData.$reset) {
        syncData.$reset();
      }
    }
    
    // 手动同步
    function syncManual() {
      if (syncData && syncData.$sync) {
        syncData.$sync();
      }
    }
    
    // 强制同步（主动推送本地数据到远程）
    function forceSync() {
      if (syncData && syncData.$forceSync) {
        syncData.$forceSync();
      }
    }
    
    // 打开新的Tab
    function openNewTab() {
      // 创建与当前数据相同配置的新Tab
      eventBus.emit('plugin-tab:open', {
        tabType: 'syncPanelTab',
        tabData: {
          syncConfig: {
            namespace,
            id,
            roomName,
            dataKey
          }
        }
      });
    }
    
    // 组件挂载完成后主动触发同步
    onMounted(() => {
      // 等待一会儿让其他组件也能挂载完成
      setTimeout(() => {
        if (syncData && syncData.$sync) {
          console.log('[同步面板] 组件挂载后主动同步');
          syncData.$sync();
        }
      }, 500);
      
      // 定期自动同步
      const autoSyncInterval = setInterval(() => {
        if (syncData && syncData.$syncAuto && syncData.$status?.connected) {
          syncData.$syncAuto();
        }
      }, 2000);
      
      // 组件卸载时清除定时器
      onBeforeUnmount(() => {
        clearInterval(autoSyncInterval);
      });
    });
    
    // 组件卸载前清理资源
    onBeforeUnmount(() => {
      if (syncData && syncData.$destroy) {
        // 不实际销毁服务，因为可能其他组件还在使用
        // 如果真的需要清理，使用：syncData.$destroy();
      }
    });
    
    return {
      syncData,
      roomName,
      dataKey,
      tabId: props.tabId,
      increment,
      decrement,
      resetData,
      syncManual,
      forceSync,
      openNewTab
    };
  }
}
</script>

<style scoped>
.sync-panel-container {
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

.data-section {
  flex: 1;
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

.counter-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.counter-control button {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
}

.counter-value {
  font-size: 18px;
  min-width: 32px;
  text-align: center;
}

.actions-section {
  display: flex;
  gap: 8px;
  margin: 16px 0;
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
}

.action-button:disabled {
  background-color: #b0bec5;
  cursor: not-allowed;
}

.status-section {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
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