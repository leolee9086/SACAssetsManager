<template>
  <div class="advanced-reactive-container">
    <header class="panel-header">
      <h3>高级响应式测试</h3>
      <div class="header-actions">
        <button @click="openNewTab" class="action-button">打开新Tab</button>
        <div class="connection-status" :class="{ connected: syncedData && syncedData.$status && syncedData.$status.connected && syncedData.$provider && syncedData.$provider.wsconnected }">
          {{ (syncedData && syncedData.$status && syncedData.$status.connected && syncedData.$provider && syncedData.$provider.wsconnected) ? '已连接' : '未连接' }}
        </div>
        <button @click="manualConnect" class="action-button" :disabled="syncedData && syncedData.$status && syncedData.$status.connected && syncedData.$provider && syncedData.$provider.wsconnected">重新连接</button>
      </div>
    </header>
    
    <section class="description">
      <p>本面板提供更复杂的useSyncedReactive测试场景，测试其在高级应用场景中的表现</p>
    </section>
    
    <div class="test-grid">
      <!-- 大数据集测试 -->
      <div class="test-column">
        <h4>大数据集测试</h4>
        <div class="test-content">
          <div class="field-row">
            <label>数据项数量:</label>
            <div class="input-row">
              <input type="number" v-model.number="largeDataItemCount" min="10" max="10000" class="number-input" />
              <button @click="generateLargeDataset" class="action-button">生成数据</button>
            </div>
          </div>
          
          <div class="field-row">
            <label>数据集大小: {{ formatBytes(largeDatasetSize) }}</label>
            <div class="progress-bar">
              <div class="progress" :style="{width: `${Math.min(largeDatasetSize / (5 * 1024 * 1024) * 100, 100)}%`}"></div>
            </div>
          </div>
          
          <div class="field-row">
            <label>操作:</label>
            <div class="button-group">
              <button @click="addRandomItems(10)" class="action-button">添加10项</button>
              <button @click="addRandomItems(100)" class="action-button">添加100项</button>
              <button @click="updateRandomItems(10)" class="action-button">更新10项</button>
              <button @click="clearLargeDataset" class="action-button danger">清空数据集</button>
            </div>
          </div>
          
          <div class="field-row">
            <label>性能指标:</label>
            <div class="metrics-display">
              <div>生成耗时: {{ syncedData.largeDataMetrics.generateTime || 0 }}ms</div>
              <div>同步耗时: {{ syncedData.largeDataMetrics.syncTime || 0 }}ms</div>
              <div>数据项数量: {{ syncedData.largeDataset.length || 0 }}</div>
            </div>
          </div>
          
          <div class="field-row">
            <label>数据预览:</label>
            <div class="data-preview">
              <div v-for="(item, index) in datasetPreview" :key="index" class="preview-item">
                ID: {{ item.id }}, 名称: {{ item.name }}, 大小: {{ formatBytes(item.dataSize) }}
              </div>
              <div v-if="syncedData.largeDataset.length > 5" class="preview-more">
                ...还有 {{ syncedData.largeDataset.length - 5 }} 项
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 并发操作测试 -->
      <div class="test-column">
        <h4>并发操作测试</h4>
        <div class="test-content">
          <div class="field-row">
            <label>协作计数器:</label>
            <div class="counter-display">
              <div class="counter-value">{{ syncedData.concurrentData.counter }}</div>
              <div class="button-group">
                <button @click="incrementCounter(1)" class="action-button">+1</button>
                <button @click="incrementCounter(10)" class="action-button">+10</button>
                <button @click="startAutoIncrement" class="action-button" :class="{ active: isAutoIncrementing }">
                  {{ isAutoIncrementing ? '停止自增' : '自动增加' }}
                </button>
                <button @click="resetCounter" class="action-button danger">重置</button>
              </div>
            </div>
          </div>
          
          <div class="field-row">
            <label>共享文本编辑:</label>
            <div class="shared-editor">
              <textarea 
                v-model="syncedData.concurrentData.sharedText" 
                placeholder="这是一个共享的文本域，所有客户端都可以编辑..."
                rows="4"
              ></textarea>
              <div class="button-group">
                <button @click="appendRandomText" class="action-button">追加随机文本</button>
                <button @click="clearSharedText" class="action-button danger">清空文本</button>
              </div>
            </div>
          </div>
          
          <div class="field-row">
            <label>同步延迟测试:</label>
            <div class="delay-test">
              <div class="input-row">
                <input type="number" v-model.number="syncDelay" min="0" max="10000" placeholder="延迟(毫秒)" class="number-input" />
                <button @click="simulateDelaySend" class="action-button">发送延迟数据</button>
              </div>
              <div class="metrics-display">
                <div>最近发送: {{ syncedData.concurrentData.lastDelaySend ? new Date(syncedData.concurrentData.lastDelaySend).toLocaleTimeString() : '无' }}</div>
                <div>发送耗时: {{ syncedData.concurrentData.delaySendTime || 0 }}ms</div>
              </div>
            </div>
          </div>
          
          <div class="field-row">
            <label>客户端信息:</label>
            <div class="client-info">
              <div class="client-id">本机ID: {{ clientId }}</div>
              <div class="active-clients">
                <div v-for="(client, id) in syncedData.clients" :key="id" class="client-badge" :class="{ self: id === clientId }">
                  {{ client.name }} {{ id === clientId ? '(本机)' : '' }}
                  <span class="last-active">{{ timeAgo(client.lastActive) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 冲突测试 -->
    <div class="test-row">
      <h4>冲突解决测试</h4>
      <div class="conflict-test">
        <div class="field-row">
          <label>共享计数器最终一致性:</label>
          <div class="conflict-counter">
            <div class="value-display">当前值: {{ syncedData.conflictData.sharedCounter || 0 }}</div>
            <div class="button-group">
              <button @click="forceSetCounter((syncedData.conflictData.sharedCounter || 0) + 5)" class="action-button">
                强制设为+5
              </button>
              <button @click="forceSetCounter((syncedData.conflictData.sharedCounter || 0) - 3)" class="action-button">
                强制设为-3
              </button>
              <button @click="simulateOfflineChange" class="action-button">模拟离线修改</button>
            </div>
          </div>
        </div>
        
        <div class="field-row">
          <label>共享对象并发修改:</label>
          <div class="object-edit">
            <div class="shared-object-display">
              <div v-for="(value, key) in syncedData.conflictData.sharedObject" :key="key" class="object-property">
                <span class="property-name">{{ key }}:</span>
                <input v-model="syncedData.conflictData.sharedObject[key]" class="property-value" />
                <button @click="deleteProperty(key)" class="small-btn">删除</button>
              </div>
            </div>
            <div class="button-group">
              <button @click="addProperty" class="action-button">添加属性</button>
              <button @click="resetSharedObject" class="action-button danger">重置对象</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 响应式丢失测试 -->
    <div class="test-row">
      <h4>响应式丢失测试</h4>
      <div class="reactive-loss-test">
        <div class="field-row">
          <label>嵌套响应式对象测试:</label>
          <div class="nested-reactive">
            <div class="value-display">
              <div>顶层计数：{{ syncedData.reactiveLossTest?.counter || 0 }}</div>
              <div>嵌套对象值：{{ syncedData.reactiveLossTest?.nested?.value || '未设置' }}</div>
              <div>嵌套数组长度：{{ syncedData.reactiveLossTest?.items?.length || 0 }}</div>
            </div>
            <div class="button-group">
              <button @click="incrementNestedCounter" class="action-button">增加计数</button>
              <button @click="updateNestedValue" class="action-button">更新嵌套值</button>
              <button @click="addNestedItem" class="action-button">添加数组项</button>
              <button @click="triggerManualSync" class="action-button">手动同步测试</button>
            </div>
          </div>
        </div>
        
        <div class="field-row">
          <label>响应式监听测试结果:</label>
          <div class="reactive-results">
            <div v-for="(log, index) in reactiveLossLogs" :key="index" class="log-item" :class="log.type">
              {{ log.time }} - {{ log.message }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 测试日志 -->
    <div class="test-row">
      <h4>测试日志</h4>
      <div class="test-logs">
        <div v-for="(log, index) in testLogs" :key="index" class="log-item" :class="log.type">
          {{ log.time }} - {{ log.message }}
        </div>
      </div>
      <button @click="clearLogs" class="action-button">清除日志</button>
    </div>
    
    <!-- 同步状态 -->
    <section class="status-section">
      <h4>同步信息</h4>
      <div class="status-row" v-if="syncedData && syncedData.$status">
        <div>房间名称: <code>{{ roomName }}</code></div>
        <div>数据键: <code>{{ dataKey }}</code></div>
        <div>连接节点: {{ syncedData.$status.peers ? syncedData.$status.peers.size : 0 }}</div>
        <div>上次同步: {{ syncedData.$status.lastSync ? new Date(syncedData.$status.lastSync).toLocaleTimeString() : '未同步' }}</div>
        <div>Tab ID: <code>{{ tabId || '主面板' }}</code></div>
        <div>性能指标: <code>操作响应时间 {{ syncedData.performanceMetrics?.responseTime || 0 }}ms</code></div>
      </div>
      
      <!-- 详细连接状态 -->
      <div class="debug-section" v-if="syncedData">
        <h5>详细连接状态</h5>
        <div class="debug-info">
          <div><strong>连接状态:</strong> {{ (syncedData.$status?.connected && syncedData.$provider?.wsconnected) ? '已连接' : '未连接' }}</div>
          <div><strong>Provider状态:</strong> {{ syncedData.$provider?.wsconnected ? 'Socket已连接' : 'Socket未连接' }}</div>
          <div><strong>WebSocket状态:</strong> {{ getWsStatus() }}</div>
          <div><strong>Room名称:</strong> {{ roomName }}</div>
          <div><strong>上次同步:</strong> {{ syncedData.$status?.lastSync ? new Date(syncedData.$status?.lastSync).toLocaleTimeString() : '未同步' }}</div>
          <div class="button-group">
            <button @click="checkConnectionStatus" class="action-button">检查连接状态</button>
            <button @click="forceStatusSync" class="action-button">强制同步状态</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { computed, watch, onMounted, onBeforeUnmount, ref, reactive } from '../../../../static/vue.esm-browser.js';
import { useSyncedReactive } from '../../../../src/toolBox/useAge/forSync/useSyncedReactive.js';

// 获取思源插件API
const pluginInstance = window[Symbol.for('plugin-SACAssetsManager')];
const eventBus = pluginInstance.eventBus;

// 默认数据结构
const createDefaultData = () => ({
  // 基础测试数据
  basicData: {
    value: '高级测试',
    counter: 0
  },
  
  // 大数据集测试
  largeDataset: [],
  largeDataMetrics: {
    generateTime: 0,
    syncTime: 0,
    lastUpdate: null
  },
  
  // 并发操作测试
  concurrentData: {
    counter: 0,
    sharedText: '',
    lastDelaySend: null,
    delaySendTime: 0
  },
  
  // 冲突测试
  conflictData: {
    sharedCounter: 0,
    sharedObject: {
      name: '共享对象',
      description: '用于测试并发修改的对象',
      value: 100,
      lastModified: Date.now()
    },
    offlineChanges: []
  },
  
  // 响应式丢失测试数据
  reactiveLossTest: {
    counter: 0,
    nested: {
      value: '嵌套响应式值',
      modified: Date.now()
    },
    items: [
      { id: 1, name: '初始项1' },
      { id: 2, name: '初始项2' }
    ],
    lastUpdate: Date.now()
  },
  
  // 客户端信息
  clients: {},
  
  // 性能指标 - 确保包含所有必需字段
  performanceMetrics: {
    responseTime: 0,
    operations: 0,
    lastUpdate: Date.now()
  },
  
  // 嵌套对象结构 - 确保存在
  nested: {
    value: '嵌套数据测试'
  },
  
  // 深层嵌套结构 - 确保存在
  deepNested: {
    level1: {
      level2: {
        value: '深层嵌套值'
      }
    }
  },
  
  lastUpdate: Date.now()
});

// 生成唯一标识符
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export default {
  name: 'AdvancedReactiveTest',
  
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
    // 测试日志
    const testLogs = ref([]);
    
    // 响应式丢失测试日志
    const reactiveLossLogs = ref([]);
    
    // 大数据集测试参数
    const largeDataItemCount = ref(100);
    const largeDatasetSize = ref(0);
    
    // 并发测试参数
    const isAutoIncrementing = ref(false);
    const autoIncrementInterval = ref(null);
    const syncDelay = ref(1000);
    const clientId = ref(generateId());
    
    
    // 同步配置
    const config = props.syncConfig || {};
    const namespace = config.namespace || 'advanced-reactive';
    const id = config.id || 'test-data';
    const roomName = config.roomName || `sync-service-${namespace}`;
    const dataKey = config.dataKey || id;
    
    // 使用useSyncedReactive创建响应式数据
    const syncedData = useSyncedReactive(
      createDefaultData(), 
      {
        roomName,
        key: dataKey,
        persist: true,
        debug: true,
        onSync: (data) => {
          console.log(`[同步] 数据接收: ${JSON.stringify(data)}...`);
          addLog('sync', '收到远程数据同步');
        },
        // 思源配置 - 启用思源WebSocket同步
        siyuan: {
          enabled: true,
          host: '127.0.0.1',
          port: 6806,
          token: '6806', // 默认token
          channel: 'sync'
        },
        // 禁用WebRTC - 强制使用思源WebSocket
        disableWebRTC: true
      }
    );
    console.log(syncedData)
    // 添加日志
    const addLog = (type, message) => {
      const time = new Date().toLocaleTimeString();
      testLogs.value.unshift({ type, message, time });
      
      // 限制日志数量
      if (testLogs.value.length > 50) {
        testLogs.value = testLogs.value.slice(0, 50);
      }
    };
    
    // 清除日志
    const clearLogs = () => {
      testLogs.value = [];
    };
    
    // 格式化字节数
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    // 计算时间差
    const timeAgo = (timestamp) => {
      if (!timestamp) return '未知';
      
      const seconds = Math.floor((Date.now() - timestamp) / 1000);
      
      if (seconds < 60) return `${seconds}秒前`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
      return `${Math.floor(seconds / 86400)}天前`;
    };
    
    // 数据集预览计算属性
    const datasetPreview = computed(() => {
      if (!syncedData.largeDataset || syncedData.largeDataset.length === 0) {
        return [];
      }
      console.log(syncedData,syncedData.largeDataset)
      return syncedData.largeDataset.slice(0, 5);
    });
    
    // 监听连接状态变化
    watch(() => syncedData.$status?.connected, (newValue, oldValue) => {
      if (newValue !== oldValue) {
        addLog('sync', newValue ? '连接建立成功' : '连接已断开');
        console.log('[连接状态]', newValue ? '已连接' : '未连接');
      }
    });
    
    // =================
    // 大数据集测试方法
    // =================
    
    // 生成大数据集
    const generateLargeDataset = () => {
      if (!largeDataItemCount.value || largeDataItemCount.value <= 0) {
        addLog('error', '数据项数量必须大于0');
        return;
      }
      
      // 限制最大数量
      const itemCount = Math.min(largeDataItemCount.value, 10000);
      
      // 记录开始时间
      const startTime = performance.now();
      
      // 清空现有数据集
      syncedData.largeDataset = [];
      
      // 生成数据项
      const newDataset = [];
      let totalSize = 0;
      
      for (let i = 0; i < itemCount; i++) {
        // 生成随机数据大小 (1KB - 20KB)
        const dataSize = Math.floor(Math.random() * 19000) + 1000;
        
        // 生成填充数据
        const randomData = Array(dataSize).fill('X').join('');
        
        // 创建数据项
        const item = {
          id: i + 1,
          name: `数据项 ${i + 1}`,
          value: Math.random() * 1000,
          tags: [`标签${i % 5}`, `类型${i % 10}`],
          dataSize: randomData.length,
          createdAt: Date.now(),
          data: randomData.substring(0, 100) // 只存储一小部分，不然太大了
        };
        
        newDataset.push(item);
        totalSize += JSON.stringify(item).length;
      }
      
      // 计算生成时间
      const generateTime = Math.round(performance.now() - startTime);
      
      // 记录同步开始时间
      const syncStartTime = performance.now();
      
      // 更新数据
      syncedData.largeDataset = newDataset;
      syncedData.largeDataMetrics.generateTime = generateTime;
      syncedData.largeDataMetrics.lastUpdate = Date.now();
      
      // 计算同步时间
      const syncTime = Math.round(performance.now() - syncStartTime);
      syncedData.largeDataMetrics.syncTime = syncTime;
      
      // 更新数据集大小
      largeDatasetSize.value = totalSize;
      
      addLog('action', `生成了${itemCount}项数据，总大小${formatBytes(totalSize)}，生成耗时${generateTime}ms，同步耗时${syncTime}ms`);
    };
    
    // 添加随机数据项
    const addRandomItems = (count) => {
      if (!syncedData.largeDataset) {
        syncedData.largeDataset = [];
      }
      
      // 获取下一个ID
      const nextId = syncedData.largeDataset.length > 0
        ? Math.max(...syncedData.largeDataset.map(item => item.id)) + 1
        : 1;
      
      // 记录开始时间
      const startTime = performance.now();
      
      // 添加新项目
      for (let i = 0; i < count; i++) {
        // 生成随机数据大小 (1KB - 10KB)
        const dataSize = Math.floor(Math.random() * 9000) + 1000;
        
        // 生成填充数据
        const randomData = Array(dataSize).fill('Y').join('');
        
        // 创建数据项
        const item = {
          id: nextId + i,
          name: `新数据项 ${nextId + i}`,
          value: Math.random() * 1000,
          tags: [`标签${i % 5}`, `类型${i % 10}`, '新增'],
          dataSize: randomData.length,
          createdAt: Date.now(),
          data: randomData.substring(0, 100)
        };
        
        syncedData.largeDataset.push(item);
      }
      
      // 计算操作时间
      const operationTime = Math.round(performance.now() - startTime);
      
      // 更新指标
      syncedData.largeDataMetrics.syncTime = operationTime;
      syncedData.largeDataMetrics.lastUpdate = Date.now();
      
      // 重新计算数据集大小
      largeDatasetSize.value = JSON.stringify(syncedData.largeDataset).length;
      
      addLog('action', `添加了${count}个随机数据项，耗时${operationTime}ms`);
    };
    
    // 更新随机数据项
    const updateRandomItems = (count) => {
      if (!syncedData.largeDataset || syncedData.largeDataset.length === 0) {
        addLog('error', '数据集为空，无法更新');
        return;
      }
      
      // 确保要更新的项目数不超过数据集大小
      const updateCount = Math.min(count, syncedData.largeDataset.length);
      
      // 记录开始时间
      const startTime = performance.now();
      
      // 更新随机项目
      for (let i = 0; i < updateCount; i++) {
        // 选择一个随机索引
        const randomIndex = Math.floor(Math.random() * syncedData.largeDataset.length);
        
        // 更新该项
        if (syncedData.largeDataset[randomIndex]) {
          syncedData.largeDataset[randomIndex].value = Math.random() * 2000;
          syncedData.largeDataset[randomIndex].name = `更新项 ${syncedData.largeDataset[randomIndex].id}`;
          syncedData.largeDataset[randomIndex].tags.push('已更新');
        }
      }
      
      // 计算操作时间
      const operationTime = Math.round(performance.now() - startTime);
      
      // 更新指标
      syncedData.largeDataMetrics.syncTime = operationTime;
      syncedData.largeDataMetrics.lastUpdate = Date.now();
      
      addLog('action', `随机更新了${updateCount}个数据项，耗时${operationTime}ms`);
    };
    
    // 清空数据集
    const clearLargeDataset = () => {
      syncedData.largeDataset = [];
      syncedData.largeDataMetrics.lastUpdate = Date.now();
      largeDatasetSize.value = 0;
      
      addLog('action', '清空了大数据集');
    };
    
    // =================
    // 并发操作测试方法
    // =================
    
    // 更新客户端活跃状态
    const updateClientActivity = () => {
      syncedData.clients[clientId.value] = {
        name: `客户端-${clientId.value.substring(0, 4)}`,
        lastActive: Date.now(),
        userAgent: navigator.userAgent.substring(0, 60)
      };
    };
    
    // 增加计数器
    const incrementCounter = (amount) => {
      // 记录开始时间
      const startTime = performance.now();
      
      syncedData.concurrentData.counter = (syncedData.concurrentData.counter || 0) + amount;
      
      // 更新性能指标
      syncedData.performanceMetrics.responseTime = Math.round(performance.now() - startTime);
      
      // 更新客户端活跃状态
      updateClientActivity();
      
      addLog('action', `增加计数器 ${amount}，当前值: ${syncedData.concurrentData.counter}`);
    };
    
    // 开始/停止自动增加
    const startAutoIncrement = () => {
      if (isAutoIncrementing.value) {
        // 停止自动增加
        clearInterval(autoIncrementInterval.value);
        autoIncrementInterval.value = null;
        isAutoIncrementing.value = false;
        addLog('action', '停止自动增加计数器');
      } else {
        // 开始自动增加
        isAutoIncrementing.value = true;
        autoIncrementInterval.value = setInterval(() => {
          incrementCounter(1);
        }, 2000);
        addLog('action', '开始自动增加计数器');
      }
    };
    
    // 重置计数器
    const resetCounter = () => {
      syncedData.concurrentData.counter = 0;
      updateClientActivity();
      addLog('action', '重置计数器');
    };
    
    // 追加随机文本
    const appendRandomText = () => {
      // 随机词库
      const words = [
        '响应式', '数据同步', '实时协作', '高级测试', '扩展性', '并发',
        '测试', '性能', '可靠性', '跨窗口', '状态管理', '冲突解决'
      ];
      
      // 生成一个随机句子
      const randomSentence = Array(Math.floor(Math.random() * 5) + 3)
        .fill(0)
        .map(() => words[Math.floor(Math.random() * words.length)])
        .join(' ');
      
      // 添加标点和客户端标识
      const text = `${randomSentence}。(${clientId.value.substring(0, 4)})\n`;
      
      // 追加文本
      syncedData.concurrentData.sharedText += text;
      
      // 更新客户端活跃状态
      updateClientActivity();
      
      addLog('action', `追加了随机文本`);
    };
    
    // 清空共享文本
    const clearSharedText = () => {
      syncedData.concurrentData.sharedText = '';
      updateClientActivity();
      addLog('action', '清空了共享文本');
    };
    
    // 模拟延迟发送
    const simulateDelaySend = () => {
      // 记录开始时间
      const startTime = Date.now();
      
      // 更新发送时间
      syncedData.concurrentData.lastDelaySend = startTime;
      
      // 模拟延迟
      setTimeout(() => {
        const delaySendTime = Date.now() - startTime;
        syncedData.concurrentData.delaySendTime = delaySendTime;
        
        // 更新客户端活跃状态
        updateClientActivity();
        
        addLog('action', `延迟${syncDelay.value}ms发送数据，实际耗时${delaySendTime}ms`);
      }, syncDelay.value);
    };
    
    // =================
    // 冲突解决测试方法
    // =================
    
    // 强制设置计数器值
    const forceSetCounter = (value) => {
      if (!syncedData.conflictData) {
        syncedData.conflictData = {
          sharedCounter: 0,
          sharedObject: {
            name: '共享对象',
            description: '用于测试并发修改的对象',
            value: 100,
            lastModified: Date.now()
          },
          offlineChanges: []
        };
      }
      syncedData.conflictData.sharedCounter = value;
      if (!syncedData.conflictData.sharedObject) {
        syncedData.conflictData.sharedObject = {
          name: '共享对象',
          description: '用于测试并发修改的对象',
          value: 100,
          lastModified: Date.now()
        };
      }
      syncedData.conflictData.sharedObject.lastModified = Date.now();
      
      // 更新客户端活跃状态
      updateClientActivity();
      
      addLog('action', `强制设置计数器为 ${value}`);
    };
    
    // 模拟离线修改
    const simulateOfflineChange = () => {
      if (!syncedData.conflictData) {
        syncedData.conflictData = {
          sharedCounter: 0,
          sharedObject: {
            name: '共享对象',
            description: '用于测试并发修改的对象',
            value: 100,
            lastModified: Date.now()
          },
          offlineChanges: []
        };
      }

      // 记录当前值
      const currentValue = syncedData.conflictData.sharedCounter || 0;
      
      // 生成一个随机偏移量
      const offset = Math.floor(Math.random() * 20) - 10;
      
      // 添加到离线修改列表
      if (!syncedData.conflictData.offlineChanges) {
        syncedData.conflictData.offlineChanges = [];
      }
      
      syncedData.conflictData.offlineChanges.push({
        timestamp: Date.now(),
        oldValue: currentValue,
        newValue: currentValue + offset,
        clientId: clientId.value
      });
      
      // 应用修改
      syncedData.conflictData.sharedCounter = currentValue + offset;
      
      // 更新客户端活跃状态
      updateClientActivity();
      
      addLog('action', `模拟离线修改: ${currentValue} -> ${currentValue + offset}`);
    };
    
    // 添加属性
    const addProperty = () => {
      if (!syncedData.conflictData) {
        syncedData.conflictData = {
          sharedCounter: 0,
          sharedObject: {
            name: '共享对象',
            description: '用于测试并发修改的对象',
            value: 100,
            lastModified: Date.now()
          },
          offlineChanges: []
        };
      }
      
      // 确保sharedObject存在
      if (!syncedData.conflictData.sharedObject) {
        syncedData.conflictData.sharedObject = {
          name: '共享对象',
          description: '用于测试并发修改的对象',
          value: 100,
          lastModified: Date.now()
        };
      }

      // 生成一个随机属性名
      const propName = `prop_${Math.floor(Math.random() * 1000)}`;
      
      // 生成一个随机值
      const propValue = `值_${Math.floor(Math.random() * 100)}`;
      
      // 添加属性
      syncedData.conflictData.sharedObject[propName] = propValue;
      syncedData.conflictData.sharedObject.lastModified = Date.now();
      
      // 更新客户端活跃状态
      updateClientActivity();
      
      addLog('action', `添加属性: ${propName} = ${propValue}`);
    };
    
    // 删除属性
    const deleteProperty = (key) => {
      // 不删除基本属性
      if (['name', 'description', 'value', 'lastModified'].includes(key)) {
        addLog('error', '无法删除基本属性');
        return;
      }
      
      if (!syncedData.conflictData || !syncedData.conflictData.sharedObject) {
        addLog('error', '共享对象不存在');
        return;
      }
      
      delete syncedData.conflictData.sharedObject[key];
      syncedData.conflictData.sharedObject.lastModified = Date.now();
      
      // 更新客户端活跃状态
      updateClientActivity();
      
      addLog('action', `删除属性: ${key}`);
    };
    
    // 重置共享对象
    const resetSharedObject = () => {
      syncedData.conflictData.sharedObject = {
        name: '共享对象',
        description: '用于测试并发修改的对象',
        value: 100,
        lastModified: Date.now()
      };
      
      // 更新客户端活跃状态
      updateClientActivity();
      
      addLog('action', '重置共享对象');
    };
    
    // 打开新的Tab
    const openNewTab = () => {
      eventBus.emit('plugin-tab:open', {
        tabType: 'advancedReactiveTab',
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
    
    // =================
    // 响应式丢失测试方法
    // =================
    
    // 记录响应式测试日志
    const addReactiveLog = (type, message) => {
      const time = new Date().toLocaleTimeString();
      reactiveLossLogs.value.unshift({ type, message, time });
      
      // 限制日志数量
      if (reactiveLossLogs.value.length > 20) {
        reactiveLossLogs.value = reactiveLossLogs.value.slice(0, 20);
      }
    };
    
    // 增加嵌套计数器
    const incrementNestedCounter = () => {
      if (!syncedData.reactiveLossTest) {
        syncedData.reactiveLossTest = {
          counter: 0,
          nested: { value: '嵌套响应式值', modified: Date.now() },
          items: [],
          lastUpdate: Date.now()
        };
      }
      syncedData.reactiveLossTest.counter++;
      syncedData.reactiveLossTest.lastUpdate = Date.now();
      addReactiveLog('action', `增加顶层计数器: ${syncedData.reactiveLossTest.counter}`);
    };
    
    // 更新嵌套值
    const updateNestedValue = () => {
      if (!syncedData.reactiveLossTest) {
        syncedData.reactiveLossTest = {
          counter: 0,
          nested: { value: '嵌套响应式值', modified: Date.now() },
          items: [],
          lastUpdate: Date.now()
        };
      }
      if (!syncedData.reactiveLossTest.nested) {
        syncedData.reactiveLossTest.nested = { value: '嵌套响应式值', modified: Date.now() };
      }
      syncedData.reactiveLossTest.nested.value = `嵌套值_${Date.now()}`;
      syncedData.reactiveLossTest.nested.modified = Date.now();
      addReactiveLog('action', `更新嵌套值: ${syncedData.reactiveLossTest.nested.value}`);
    };
    
    // 添加数组项
    const addNestedItem = () => {
      if (!syncedData.reactiveLossTest) {
        syncedData.reactiveLossTest = {
          counter: 0,
          nested: { value: '嵌套响应式值', modified: Date.now() },
          items: [],
          lastUpdate: Date.now()
        };
      }
      if (!syncedData.reactiveLossTest.items) {
        syncedData.reactiveLossTest.items = [];
      }
      console.log('当前items数组:', syncedData.reactiveLossTest.items);
      const newId = syncedData.reactiveLossTest.items.length > 0 
        ? Math.max(...syncedData.reactiveLossTest.items.map(item => item.id)) + 1 
        : 1;
        
      // 创建新项
      const newItem = {
        id: newId,
        name: `动态添加项${newId}`,
        timestamp: Date.now(),
        // 添加更复杂的嵌套结构来测试
        details: {
          description: `嵌套对象测试 ${newId}`,
          created: new Date().toLocaleTimeString()
        }
      };
      
      // 添加到数组
      syncedData.reactiveLossTest.items.push(newItem);
      
      // 更新时间戳
      syncedData.reactiveLossTest.lastUpdate = Date.now();
      
      // 测试响应式 - 更新添加的项
      setTimeout(() => {
        if (syncedData.reactiveLossTest?.items?.length > 0) {
          const lastItem = syncedData.reactiveLossTest.items[syncedData.reactiveLossTest.items.length - 1];
          if (lastItem && lastItem.details) {
            // 尝试更新嵌套属性以测试响应式
            lastItem.details.updated = new Date().toLocaleTimeString();
            addReactiveLog('action', `测试嵌套响应式: 更新了项${lastItem.id}的details.updated为${lastItem.details.updated}`);
          }
        }
      }, 500);
      
      addReactiveLog('action', `添加数组项: 项${newId} 带嵌套对象`);
    };
    
    // 手动触发同步测试
    const triggerManualSync = () => {
      addReactiveLog('sync', '手动触发同步开始');
      
      // 检查和初始化reactiveLossTest对象
      if (!syncedData.reactiveLossTest) {
        syncedData.reactiveLossTest = {
          counter: 0,
          nested: { value: '嵌套响应式值', modified: Date.now() },
          items: [],
          lastUpdate: Date.now()
        };
      }
      
      // 记录数据状态，用于检测同步后的变化
      const beforeState = {
        counter: syncedData.reactiveLossTest.counter || 0,
        nestedValue: syncedData.reactiveLossTest.nested?.value || '未设置',
        items: syncedData.reactiveLossTest.items?.length || 0
      };
      
      // 先修改一些值
      syncedData.reactiveLossTest.counter = (syncedData.reactiveLossTest.counter || 0) + 5;
      
      // 确保nested对象存在
      if (!syncedData.reactiveLossTest.nested) {
        syncedData.reactiveLossTest.nested = { value: '', modified: Date.now() };
      }
      syncedData.reactiveLossTest.nested.value = `手动同步测试_${Date.now()}`;
      
      // 执行手动同步 - 这会触发实际的网络同步
      if (syncedData.$sync) {
        syncedData.$sync();
        
        // 稍后检查数据是否保持响应式
        setTimeout(() => {
          // 再次修改值确认响应式是否保持
          syncedData.reactiveLossTest.counter += 1;
          
          // 检查是否产生更新
          addReactiveLog('result', `同步后响应式测试 - 计数器: ${syncedData.reactiveLossTest.counter}`);
          
          // 对比前后状态
          addReactiveLog('result', `同步前状态: 计数=${beforeState.counter}, 嵌套值=${beforeState.nestedValue}, 数组长度=${beforeState.items}`);
          addReactiveLog('result', `同步后状态: 计数=${syncedData.reactiveLossTest.counter}, 嵌套值=${syncedData.reactiveLossTest.nested?.value}, 数组长度=${syncedData.reactiveLossTest.items?.length || 0}`);
        }, 500);
      } else {
        addReactiveLog('error', '同步方法不可用');
      }
    };
    
    // 手动连接
    const manualConnect = () => {
      if (syncedData.$connect) {
        syncedData.$connect();
        addLog('action', '手动触发连接');
      }
      
      // 延迟执行同步
      setTimeout(() => {
        if (syncedData.$sync) {
          syncedData.$sync();
          addLog('sync', '手动连接后触发同步');
        }
      }, 1000);
    };
    
    // 检查连接状态
    const checkConnectionStatus = () => {
      // 打印当前连接状态
      console.log('[连接状态检查]', {
        status: syncedData.$status,
        provider: syncedData.$provider,
        peers: syncedData.$peers
      });
      
      // 获取内部WebSocket状态
      const wsState = getWsStatus();
      
      // 使用新方法同步状态
      if (syncedData.$syncStatus) {
        syncedData.$syncStatus();
      }
      
      // 同时检查status.connected和provider.wsconnected
      const reallyConnected = syncedData.$status?.connected && syncedData.$provider?.wsconnected;
      
      addLog('action', `连接状态检查 - WebSocket: ${wsState}, 连接状态: ${reallyConnected ? '已连接' : '未连接'}`);
      
      // 不再需要手动修复，使用$syncStatus即可实现
      return reallyConnected;
    };
    
    // 获取WebSocket状态
    const getWsStatus = () => {
      if (!syncedData.$provider?.ws) return '无WebSocket';
      return ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][syncedData.$provider.ws.readyState] || '未知';
    };
    
    // 强制同步状态
    const forceStatusSync = () => {
      if (syncedData.$syncStatus) {
        const changed = syncedData.$syncStatus();
        addLog('action', `强制同步状态：${changed ? '状态已更新' : '无状态变化'}`);
      }
      
      // 也发送同步请求
      if (syncedData.$sync) {
        syncedData.$sync();
        addLog('sync', '强制触发数据同步');
      }
    };
    
    // 组件挂载时
    onMounted(() => {
      addLog('lifecycle', '组件已挂载');
      
      // 添加/更新客户端信息
      updateClientActivity();
      
      // 确保立即连接
      if (syncedData.$connect) {
        syncedData.$connect();
        addLog('sync', '主动建立连接');
      }
      
      // 立即检查状态
      checkConnectionStatus();
      
      // 延迟同步确保连接
      setTimeout(() => {
        if (syncedData.$sync) {
          syncedData.$sync();
          addLog('sync', '组件挂载后主动同步');
        }
        
        // 额外的状态检查
        checkConnectionStatus();
      }, 500);
      
      // 再次延迟检查，确保连接状态更新
      setTimeout(() => {
        // 使用新方法同步状态
        if (syncedData.$syncStatus) {
          syncedData.$syncStatus();
          addLog('sync', '500ms后同步状态');
        }
        
        checkConnectionStatus();
      }, 1000);
      
      // 3秒后再检查一次
      setTimeout(() => {
        if (syncedData.$syncStatus) {
          syncedData.$syncStatus();
          addLog('sync', '3秒后同步状态');
        }
        checkConnectionStatus();
      }, 3000);
      
      // 定期更新客户端活跃状态
      const activityInterval = setInterval(() => {
        updateClientActivity();
      }, 30000);
      
      // 定期自动同步 - 解决无法自动同步的问题
      const autoSyncInterval = setInterval(() => {
        // 同时检查status.connected和provider.wsconnected确保真正连接成功
        if (syncedData.$status?.connected && syncedData.$provider?.wsconnected && syncedData.$syncAuto) {
          syncedData.$syncAuto();
          if (syncedData.$status.lastSync) {
            const lastSyncTime = new Date(syncedData.$status.lastSync).toLocaleTimeString();
            addLog('sync', `自动同步已执行，上次同步: ${lastSyncTime}`);
          }
        }
      }, 5000); // 每5秒自动同步一次
      
      // 定期检查连接状态，修复状态不一致问题
      const statusCheckInterval = setInterval(() => {
        // 使用新方法同步状态
        if (syncedData.$syncStatus) {
          const statusChanged = syncedData.$syncStatus();
          if (statusChanged) {
            addLog('sync', '定期检查同步了状态');
          }
        }
      }, 5000); // 每5秒检查一次
      
      // 组件卸载时清理
      onBeforeUnmount(() => {
        // 清理所有计时器
        if (autoIncrementInterval.value) {
          clearInterval(autoIncrementInterval.value);
        }
        
        clearInterval(activityInterval);
        clearInterval(autoSyncInterval); // 清除自动同步定时器
        clearInterval(statusCheckInterval); // 清除状态检查定时器
        
        addLog('lifecycle', '组件将卸载');
      });
    });
    
    return {
      syncedData,
      testLogs,
      largeDataItemCount,
      largeDatasetSize,
      isAutoIncrementing, 
      syncDelay,
      clientId,
      datasetPreview,
      
      // 工具方法
      addLog,
      clearLogs,
      formatBytes,
      timeAgo,
      
      // 大数据集方法
      generateLargeDataset,
      addRandomItems,
      updateRandomItems,
      clearLargeDataset,
      
      // 并发操作方法
      incrementCounter,
      startAutoIncrement,
      resetCounter,
      appendRandomText,
      clearSharedText,
      simulateDelaySend,
      
      // 冲突解决方法
      forceSetCounter,
      simulateOfflineChange,
      addProperty,
      deleteProperty,
      resetSharedObject,
      
      // 配置
      roomName,
      dataKey,
      tabId: props.tabId,
      
      // 新方法
      openNewTab,
      
      // 连接方法
      manualConnect,
      checkConnectionStatus,
      getWsStatus,
      forceStatusSync,
      
      // 响应式丢失测试日志
      reactiveLossLogs,
      incrementNestedCounter,
      updateNestedValue,
      addNestedItem,
      triggerManualSync
    };
  }
}
</script>

<style scoped>
.advanced-reactive-container {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
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

/* 测试网格布局 */
.test-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.test-column, .test-row {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  background-color: white;
}

.test-column h4, .test-row h4 {
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
  color: #1976d2;
}

.test-content {
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

/* 输入组件 */
.input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

input, textarea {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  width: 100%;
}

.number-input {
  width: 120px;
}

input:focus, textarea:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
}

textarea {
  resize: vertical;
  min-height: 80px;
}

/* 按钮 */
.button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-button {
  padding: 8px 12px;
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

.action-button.danger {
  background-color: #f44336;
}

.action-button.danger:hover {
  background-color: #d32f2f;
}

.action-button.active {
  background-color: #4caf50;
}

.action-button.active:hover {
  background-color: #388e3c;
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

/* 数据显示组件 */
.metrics-display {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.data-preview {
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.preview-item {
  padding: 8px;
  background-color: white;
  border-radius: 4px;
  margin-bottom: 8px;
  border: 1px solid #eee;
}

.preview-more {
  padding: 8px;
  text-align: center;
  font-style: italic;
  color: #757575;
}

/* 进度条 */
.progress-bar {
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 4px;
}

.progress {
  height: 100%;
  background-color: #1976d2;
  transition: width 0.3s ease;
}

/* 计数器 */
.counter-display {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.counter-value {
  font-size: 24px;
  font-weight: 700;
  padding: 12px 16px;
  background-color: #e3f2fd;
  border-radius: 8px;
  color: #0d47a1;
  text-align: center;
}

/* 共享文本编辑器 */
.shared-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 客户端信息 */
.client-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.client-id {
  font-weight: 500;
  margin-bottom: 4px;
}

.active-clients {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.client-badge {
  background-color: #e8eaf6;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid #c5cae9;
}

.client-badge.self {
  background-color: #e3f2fd;
  border-color: #bbdefb;
  font-weight: 600;
}

.last-active {
  font-size: 10px;
  color: #757575;
  margin-top: 2px;
}

/* 冲突测试 */
.conflict-test {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.value-display {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 15px;
  margin-bottom: 8px;
}

.conflict-counter {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.object-edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shared-object-display {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.object-property {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: white;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #eee;
}

.property-name {
  font-weight: 500;
  min-width: 100px;
}

.property-value {
  flex: 1;
}

/* 测试日志 */
.test-logs {
  height: 200px;
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

.log-item.action {
  background-color: #f3e5f5;
  border-left-color: #9c27b0;
}

.log-item.sync {
  background-color: #fff8e1;
  border-left-color: #ffc107;
}

.log-item.error {
  background-color: #ffebee;
  border-left-color: #f44336;
}

.log-item.lifecycle {
  background-color: #fce4ec;
  border-left-color: #e91e63;
}

/* 状态信息 */
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

/* 响应式丢失测试样式 */
.reactive-loss-test {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.nested-reactive {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.value-display {
  background-color: #e3f2fd;
  padding: 12px 16px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
}

.reactive-results {
  max-height: 250px;
  overflow-y: auto;
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 8px;
  font-family: monospace;
  font-size: 13px;
}

.log-item.result {
  background-color: #e8f5e9;
  border-left-color: #4caf50;
}

/* 详细连接状态 */
.debug-section {
  background-color: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  margin-top: 12px;
  border: 1px solid #e0e0e0;
}

.debug-section h5 {
  margin-top: 0;
  margin-bottom: 8px;
  color: #1976d2;
}

.debug-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.debug-info div {
  font-size: 13px;
  color: #333;
}

.debug-info button {
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  background-color: #1976d2;
  color: white;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.debug-info button:hover {
  background-color: #1565c0;
}
</style> 