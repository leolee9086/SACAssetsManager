<template>
    <div class="event-bus-test-container">
      <h1>事件总线测试面板</h1>
      
      <div class="test-panels">
        <!-- 基础功能测试区域 -->
        <TestPanel title="基础功能测试">
          <div class="test-controls">
            <div class="control-group">
              <label>事件名称:</label>
              <input v-model="eventName" placeholder="输入事件名称" />
            </div>
            
            <div class="control-group">
              <label>事件数据:</label>
              <input v-model="eventData" placeholder="输入事件数据" />
            </div>
            
            <div class="control-group">
              <label>选项:</label>
              <div class="options-group">
                <label>
                  <input type="checkbox" v-model="eventOptions.sync" />
                  同步执行
                </label>
                <label>
                  <input type="number" v-model.number="eventOptions.priority" placeholder="优先级" />
                  优先级
                </label>
                <label>
                  <input v-model="eventOptions.namespace" placeholder="命名空间" />
                  命名空间
                </label>
              </div>
            </div>
            
            <div class="button-group">
              <button @click="handleRegisterListener">注册监听器</button>
              <button @click="handleRegisterOnceListener">注册一次性监听器</button>
              <button @click="handleEmitEvent">触发事件</button>
              <button @click="handleUnregisterListener">取消监听器</button>
              <button @click="handleRemoveAllListeners">移除所有监听器</button>
            </div>
          </div>
        </TestPanel>
        
        <!-- 事件监控 -->
        <TestPanel title="事件监控">
          <div class="event-monitor">
            <div class="event-stats">
              <div class="stat-item">
                <strong>已注册事件:</strong> {{ registeredEvents.length }}
              </div>
              <div class="stat-item">
                <strong>监听器总数:</strong> {{ totalListeners }}
              </div>
              <div class="stat-item">
                <strong>触发事件次数:</strong> {{ emitCount }}
              </div>
            </div>
            
            <div class="registered-events">
              <h3>已注册事件列表</h3>
              <table>
                <thead>
                  <tr>
                    <th>事件名称</th>
                    <th>监听器数量</th>
                    <th>命名空间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(event, index) in registeredEvents" :key="index">
                    <td>{{ event.name }}</td>
                    <td>{{ event.count }}</td>
                    <td>{{ event.namespace || '-' }}</td>
                    <td>
                      <button @click="() => handleEmitSpecificEvent(event.name)">触发</button>
                      <button @click="() => handleRemoveEvent(event.name)">移除</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </TestPanel>
        
        <!-- 事件日志 -->
        <TestPanel title="事件日志">
          <template #actions>
            <label>
              <input type="checkbox" v-model="debugMode" />
              调试模式
            </label>
          </template>
          
          <LogViewer 
            :logs="eventLogs" 
            @clear="clearLogs"
            :customTypes="{
              'emit': 'emit',
              'emit-specific': 'emit',
              'register': 'register',
              'register-once': 'register',
              'callback': 'callback',
              'once-callback': 'callback',
              'unregister': 'unregister',
              'remove-all': 'unregister',
              'remove-event': 'unregister',
              'debug': 'debug'
            }"
          />
        </TestPanel>
        
        <!-- 高级功能测试 -->
        <TestPanel title="高级功能测试">
          <div class="advanced-tests">
            <div class="test-case">
              <h3>优先级测试</h3>
              <button @click="runPriorityTest">运行优先级测试</button>
              <div class="test-result" v-if="priorityTestResult">
                <pre>{{ priorityTestResult }}</pre>
              </div>
            </div>
            
            <div class="test-case">
              <h3>命名空间测试</h3>
              <div class="control-group">
                <input v-model="namespaceForTest" placeholder="输入命名空间" />
                <button @click="runNamespaceTest">运行命名空间测试</button>
                <button @click="removeByNamespace">移除该命名空间</button>
              </div>
              <div class="test-result" v-if="namespaceTestResult">
                <pre>{{ namespaceTestResult }}</pre>
              </div>
            </div>
            
            <div class="test-case">
              <h3>通配符事件测试</h3>
              <button @click="runWildcardTest">运行通配符测试</button>
              <div class="test-result" v-if="wildcardTestResult">
                <pre>{{ wildcardTestResult }}</pre>
              </div>
            </div>
            
            <div class="test-case">
              <h3>性能测试</h3>
              <div class="control-group">
                <input type="number" v-model.number="performanceTestCount" placeholder="事件数量" />
                <button @click="runPerformanceTest" :disabled="performanceTestRunning">
                  {{ performanceTestRunning ? '测试中...' : '运行性能测试' }}
                </button>
                <button @click="runNativeComparisonTest" :disabled="performanceTestRunning">
                  与原生实现对比
                </button>
                <button @click="runLibraryComparisonTest" :disabled="performanceTestRunning || libraryTestLoading">
                  {{ libraryTestLoading ? '加载库中...' : '与流行库对比' }}
                </button>
              </div>
              <div class="test-result" v-if="performanceTestResult">
                <pre>{{ performanceTestResult }}</pre>
              </div>
              <div class="test-result comparison-result" v-if="comparisonTestResult">
                <h4>对比结果:</h4>
                <pre>{{ comparisonTestResult }}</pre>
              </div>
              <div class="test-result library-comparison-result" v-if="libraryComparisonResult">
                <h4>流行事件库对比结果:</h4>
                <pre>{{ libraryComparisonResult }}</pre>
              </div>
            </div>
          </div>
        </TestPanel>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, computed, onMounted, onUnmounted, watchEffect } from 'vue';
  import { createEventBus, 创建事件总线 } from '../../../utils/base/forEvent/useEventBus.js';
  import LogViewer from './LogViewer.vue';
  import TestPanel from './TestPanel.vue';
  
  // 状态管理
  const eventName = ref('test-event');
  const eventData = ref('测试数据');
  const eventOptions = reactive({
    sync: true,
    priority: 0,
    namespace: ''
  });
  
  // 测试相关状态
  const registeredEvents = ref([]);
  const eventLogs = ref([]);
  const emitCount = ref(0);
  const debugMode = ref(false);
  const totalListeners = ref(0);
  
  // 高级测试状态
  const priorityTestResult = ref('');
  const namespaceTestResult = ref('');
  const wildcardTestResult = ref('');
  const performanceTestResult = ref('');
  const comparisonTestResult = ref('');
  const libraryComparisonResult = ref('');
  const performanceTestRunning = ref(false);
  const libraryTestLoading = ref(false);
  const namespaceForTest = ref('test-namespace');
  const performanceTestCount = ref(1000);
  
  // 创建事件总线实例
  const eventBus = createEventBus();
  const 中文事件总线 = 创建事件总线();
  
  // 日志工具函数
  function addLog(type, content) {
    const now = new Date();
    const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`;
    eventLogs.value.unshift({
      time: timeStr,
      type,
      content: typeof content === 'object' ? JSON.stringify(content) : content
    });
    
    // 限制日志数量
    if (eventLogs.value.length > 100) {
      eventLogs.value = eventLogs.value.slice(0, 100);
    }
  }
  
  function clearLogs() {
    eventLogs.value = [];
  }
  
  // 事件总线操作函数
  function handleRegisterListener() {
    const callback = (data) => {
      addLog('callback', `接收到事件 ${eventName.value}: ${JSON.stringify(data)}`);
    };
    
    eventBus.on(eventName.value, callback, {
      priority: eventOptions.priority,
      namespace: eventOptions.namespace || undefined
    });
    
    updateRegisteredEvents();
    addLog('register', `注册事件监听器: ${eventName.value}`);
  }
  
  function handleRegisterOnceListener() {
    const callback = (data) => {
      addLog('once-callback', `接收到一次性事件 ${eventName.value}: ${JSON.stringify(data)}`);
    };
    
    eventBus.once(eventName.value, callback, {
      priority: eventOptions.priority,
      namespace: eventOptions.namespace || undefined
    });
    
    updateRegisteredEvents();
    addLog('register-once', `注册一次性事件监听器: ${eventName.value}`);
  }
  
  function handleEmitEvent() {
    const data = eventData.value ? JSON.parse(`"${eventData.value}"`) : null;
    eventBus.emit(eventName.value, data, { sync: eventOptions.sync });
    emitCount.value++;
    addLog('emit', `触发事件: ${eventName.value} 数据: ${eventData.value}`);
  }
  
  function handleUnregisterListener() {
    const result = eventBus.off(eventName.value, () => {});
    addLog('unregister', `尝试取消监听器: ${eventName.value} (结果: ${result})`);
    updateRegisteredEvents();
  }
  
  function handleRemoveAllListeners() {
    const result = eventBus.removeAllListeners(eventName.value);
    addLog('remove-all', `移除所有监听器: ${eventName.value} (结果: ${result})`);
    updateRegisteredEvents();
  }
  
  function handleEmitSpecificEvent(name) {
    eventBus.emit(name, { triggeredFrom: 'event-list' }, { sync: true });
    emitCount.value++;
    addLog('emit-specific', `触发特定事件: ${name}`);
  }
  
  function handleRemoveEvent(name) {
    eventBus.removeAllListeners(name);
    updateRegisteredEvents();
    addLog('remove-event', `移除事件: ${name}`);
  }
  
  // 更新已注册事件列表
  function updateRegisteredEvents() {
    const events = eventBus.eventNames();
    registeredEvents.value = events.map(name => {
      const count = eventBus.listenerCount(name);
      // 简单查找命名空间 - 实际应用中可能需要更复杂的逻辑
      let namespace = '';
      return { name, count, namespace };
    });
    
    totalListeners.value = registeredEvents.value.reduce((sum, event) => sum + event.count, 0);
  }
  
  // 高级测试函数
  function runPriorityTest() {
    // 清理之前的测试
    eventBus.removeAllListeners('priority-test');
    
    const results = [];
    
    // 添加不同优先级的监听器
    eventBus.on('priority-test', () => {
      results.push('低优先级 (0)');
    }, { priority: 0 });
    
    eventBus.on('priority-test', () => {
      results.push('中优先级 (5)');
    }, { priority: 5 });
    
    eventBus.on('priority-test', () => {
      results.push('高优先级 (10)');
    }, { priority: 10 });
    
    // 触发事件
    eventBus.emit('priority-test', null, { sync: true });
    
    priorityTestResult.value = `执行顺序: \n${results.join('\n')}`;
    addLog('priority-test', `优先级测试完成: ${results.join(' → ')}`);
    updateRegisteredEvents();
  }
  
  function runNamespaceTest() {
    // 清理之前的测试
    eventBus.removeAllListeners('namespace-test');
    
    // 添加有命名空间的监听器
    let callCount = 0;
    const namespace = namespaceForTest.value || 'test-namespace';
    
    eventBus.on('namespace-test', () => {
      callCount++;
    }, { namespace });
    
    eventBus.on('namespace-test-2', () => {
      callCount++;
    }, { namespace });
    
    // 添加没有命名空间的监听器
    eventBus.on('namespace-test', () => {
      callCount++;
    });
    
    // 触发事件
    eventBus.emit('namespace-test', null, { sync: true });
    eventBus.emit('namespace-test-2', null, { sync: true });
    
    namespaceTestResult.value = `命名空间: ${namespace}\n监听器被调用次数: ${callCount}`;
    addLog('namespace-test', `命名空间测试完成，调用次数: ${callCount}`);
    updateRegisteredEvents();
  }
  
  function removeByNamespace() {
    const namespace = namespaceForTest.value;
    const result = eventBus.offByNamespace(namespace);
    
    namespaceTestResult.value = `移除命名空间 ${namespace} 的结果: ${result ? '成功' : '失败'}`;
    addLog('namespace-remove', `移除命名空间 ${namespace} 的监听器: ${result ? '成功' : '失败'}`);
    updateRegisteredEvents();
  }
  
  function runWildcardTest() {
    // 清理之前的测试
    eventBus.removeAllListeners('*');
    eventBus.removeAllListeners('wildcard-test-1');
    eventBus.removeAllListeners('wildcard-test-2');
    
    const results = [];
    
    // 添加通配符监听器
    eventBus.on('*', (eventName, data) => {
      results.push(`通配符监听器捕获到事件: ${eventName}, 数据: ${JSON.stringify(data)}`);
    });
    
    // 触发不同的事件
    eventBus.emit('wildcard-test-1', { id: 1 }, { sync: true });
    eventBus.emit('wildcard-test-2', { id: 2 }, { sync: true });
    
    wildcardTestResult.value = results.join('\n');
    addLog('wildcard-test', `通配符测试完成: 捕获到 ${results.length} 个事件`);
    updateRegisteredEvents();
  }
  
  function runPerformanceTest() {
    performanceTestRunning.value = true;
    const count = performanceTestCount.value || 1000;
    
    // 清理之前的测试
    eventBus.removeAllListeners('perf-test');
    
    // 添加测试监听器
    const listener = () => {};
    eventBus.on('perf-test', listener);
    
    // 运行性能测试
    setTimeout(() => {
      const startTime = performance.now();
      
      for (let i = 0; i < count; i++) {
        eventBus.emit('perf-test', { index: i }, { sync: true });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      const eventsPerSecond = Math.round(count / (duration / 1000));
      
      performanceTestResult.value = `触发 ${count} 个事件用时: ${duration.toFixed(2)}ms\n每秒触发事件数: ${eventsPerSecond.toLocaleString()}\n平均每事件用时: ${(duration / count).toFixed(3)}ms`;
      addLog('performance-test', `性能测试完成: 每秒 ${eventsPerSecond.toLocaleString()} 个事件`);
      
      // 清理测试监听器
      eventBus.off('perf-test', listener);
      updateRegisteredEvents();
      performanceTestRunning.value = false;
    }, 100); // 给UI一点时间更新
  }
  
  function runNativeComparisonTest() {
    performanceTestRunning.value = true;
    const count = performanceTestCount.value || 1000;
    const results = {};
    
    // 创建一个测试用的DOM元素
    const testElement = document.createElement('div');
    
    // 预热阶段
    const warmupCount = Math.min(count * 0.1, 100);
    for (let i = 0; i < warmupCount; i++) {
      // 简单的空操作预热
      (() => {})();
    }
    
    // 第1步: 测试我们的事件总线
    // 清理之前的测试
    eventBus.removeAllListeners('perf-test');
    
    // 添加测试监听器
    const ebListener = () => {};
    eventBus.on('perf-test', ebListener);
    
    // 运行事件总线性能测试
    const ebStartTime = performance.now();
    
    for (let i = 0; i < count; i++) {
      eventBus.emit('perf-test', { index: i }, { sync: true });
    }
    
    const ebEndTime = performance.now();
    const ebDuration = ebEndTime - ebStartTime;
    results.eventBus = {
      duration: ebDuration,
      eventsPerSecond: Math.round(count / (ebDuration / 1000)),
      avgTimePerEvent: ebDuration / count
    };
    
    // 第2步: 测试原生DOM事件
    // 添加监听器
    const domListener = () => {};
    testElement.addEventListener('perf-test', domListener);
    
    // 运行DOM事件性能测试
    const domStartTime = performance.now();
    
    for (let i = 0; i < count; i++) {
      const event = new CustomEvent('perf-test', { detail: { index: i } });
      testElement.dispatchEvent(event);
    }
    
    const domEndTime = performance.now();
    const domDuration = domEndTime - domStartTime;
    results.domEvents = {
      duration: domDuration,
      eventsPerSecond: Math.round(count / (domDuration / 1000)),
      avgTimePerEvent: domDuration / count
    };
    
    // 第3步: 测试原生自定义事件
    // 创建一个简单的事件中心
    class SimpleEventEmitter {
      constructor() {
        this.events = {};
      }
      
      on(event, listener) {
        if (!this.events[event]) {
          this.events[event] = [];
        }
        this.events[event].push(listener);
      }
      
      emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => listener(data));
      }
    }
    
    const simpleEmitter = new SimpleEventEmitter();
    simpleEmitter.on('perf-test', () => {});
    
    // 运行简单事件性能测试
    const simpleStartTime = performance.now();
    
    for (let i = 0; i < count; i++) {
      simpleEmitter.emit('perf-test', { index: i });
    }
    
    const simpleEndTime = performance.now();
    const simpleDuration = simpleEndTime - simpleStartTime;
    results.simpleEmitter = {
      duration: simpleDuration,
      eventsPerSecond: Math.round(count / (simpleDuration / 1000)),
      avgTimePerEvent: simpleDuration / count
    };
    
    // 计算比较结果时增加防御性检查
    const baselinePerf = results.simpleEmitter.eventsPerSecond;
    if (!baselinePerf || baselinePerf <= 0 || !isFinite(baselinePerf)) {
      comparisonTestResult.value = "测试失败：无法获取有效的基准测试结果";
      performanceTestRunning.value = false;
      return;
    }
    
    const ebRatio = isFinite(results.eventBus.eventsPerSecond / baselinePerf) 
      ? (results.eventBus.eventsPerSecond / baselinePerf).toFixed(2) 
      : "N/A";
    
    const domRatio = isFinite(results.domEvents.eventsPerSecond / baselinePerf)
      ? (results.domEvents.eventsPerSecond / baselinePerf).toFixed(2)
      : "N/A";
    
    // 生成对比报告
    comparisonTestResult.value = `测试事件数量: ${count}
    
【基本事件触发器】
触发时间: ${results.simpleEmitter.duration.toFixed(2)}ms
每秒事件数: ${results.simpleEmitter.eventsPerSecond.toLocaleString()}
每事件平均时间: ${results.simpleEmitter.avgTimePerEvent.toFixed(3)}ms
性能比率: 1.00 (基准)

【事件总线】
触发时间: ${results.eventBus.duration.toFixed(2)}ms
每秒事件数: ${results.eventBus.eventsPerSecond.toLocaleString()}
每事件平均时间: ${results.eventBus.avgTimePerEvent.toFixed(3)}ms
性能比率: ${ebRatio}

【DOM事件】
触发时间: ${results.domEvents.duration.toFixed(2)}ms
每秒事件数: ${results.domEvents.eventsPerSecond.toLocaleString()}
每事件平均时间: ${results.domEvents.avgTimePerEvent.toFixed(3)}ms
性能比率: ${domRatio}`;
    
    addLog('comparison-test', `对比测试完成: 事件总线性能比率: ${ebRatio}, DOM事件性能比率: ${domRatio}`);
    
    // 清理
    eventBus.off('perf-test', ebListener);
    testElement.removeEventListener('perf-test', domListener);
    updateRegisteredEvents();
    performanceTestRunning.value = false;
  }
  
  // 动态加载外部事件库
  async function loadEventLibraries() {
    try {
      libraryTestLoading.value = true;
      
      // 添加加载超时保护
      const loadWithTimeout = (importPromise) => {
        return Promise.race([
          importPromise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("加载超时")), 5000)
          )
        ]);
      };
      
      // 使用动态导入从esm.sh加载流行的事件库
      const [eventEmitter3Module, mittModule, tinyEmitterModule, nanoeventsModule] = 
        await Promise.all([
          loadWithTimeout(import('https://esm.sh/eventemitter3@5.0.1')),
          loadWithTimeout(import('https://esm.sh/mitt@3.0.1')),
          loadWithTimeout(import('https://esm.sh/tiny-emitter@2.1.0')),
          loadWithTimeout(import('https://esm.sh/nanoevents@7.0.1'))
        ]);
      
      // 验证模块正确加载
      const libraries = {};
      
      if (eventEmitter3Module && eventEmitter3Module.default) 
        libraries.EventEmitter3 = eventEmitter3Module.default;
      
      if (mittModule && mittModule.default) 
        libraries.mitt = mittModule.default;
      
      if (tinyEmitterModule && tinyEmitterModule.default) 
        libraries.TinyEmitter = tinyEmitterModule.default;
      
      if (nanoeventsModule && nanoeventsModule.createNanoEvents) 
        libraries.nanoevents = nanoeventsModule.createNanoEvents;
      
      // 仅在至少有一个库成功加载时返回结果
      if (Object.keys(libraries).length > 0) {
        return libraries;
      } else {
        throw new Error("没有成功加载任何事件库");
      }
    } catch (error) {
      console.error('加载事件库失败:', error);
      addLog('error', `加载事件库失败: ${error.message}`);
      return null;
    } finally {
      libraryTestLoading.value = false;
    }
  }
  
  // 与流行事件库进行对比测试
  async function runLibraryComparisonTest() {
    performanceTestRunning.value = true;
    const count = performanceTestCount.value || 1000;
    const results = {
      eventBus: { name: '自定义事件总线' },
      simpleEmitter: { name: '基础事件实现' }
    };
    
    // 加载外部事件库
    libraryTestLoading.value = true;
    const libraries = await loadEventLibraries();
    libraryTestLoading.value = false;
    
    if (!libraries) {
      performanceTestRunning.value = false;
      return;
    }
    
    // 预热阶段，减少JIT优化对测试的影响
    const warmupCount = Math.min(count * 0.1, 100);
    const testLibs = [
      { name: 'warmup', fn: () => {} }
    ];
    
    for (let i = 0; i < warmupCount; i++) {
      testLibs.forEach(lib => lib.fn());
    }
    
    // 测试我们的事件总线
    eventBus.removeAllListeners('perf-test');
    const ebListener = () => {};
    eventBus.on('perf-test', ebListener);
    
    const ebStartTime = performance.now();
    for (let i = 0; i < count; i++) {
      eventBus.emit('perf-test', { index: i }, { sync: true });
    }
    const ebEndTime = performance.now();
    const ebDuration = ebEndTime - ebStartTime;
    results.eventBus.duration = ebDuration;
    results.eventBus.eventsPerSecond = Math.round(count / (ebDuration / 1000));
    results.eventBus.avgTimePerEvent = ebDuration / count;
    
    // 测试简单的事件实现
    class SimpleEventEmitter {
      constructor() { this.events = {}; }
      on(event, listener) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(listener);
      }
      emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => listener(data));
      }
    }
    
    const simpleEmitter = new SimpleEventEmitter();
    simpleEmitter.on('perf-test', () => {});
    
    const simpleStartTime = performance.now();
    for (let i = 0; i < count; i++) {
      simpleEmitter.emit('perf-test', { index: i });
    }
    const simpleEndTime = performance.now();
    const simpleDuration = simpleEndTime - simpleStartTime;
    results.simpleEmitter.duration = simpleDuration;
    results.simpleEmitter.eventsPerSecond = Math.round(count / (simpleDuration / 1000));
    results.simpleEmitter.avgTimePerEvent = simpleDuration / count;
    
    // 测试 EventEmitter3
    const ee3 = new libraries.EventEmitter3();
    ee3.on('perf-test', () => {});
    
    const ee3StartTime = performance.now();
    for (let i = 0; i < count; i++) {
      ee3.emit('perf-test', { index: i });
    }
    const ee3EndTime = performance.now();
    const ee3Duration = ee3EndTime - ee3StartTime;
    results.eventemitter3 = {
      name: 'EventEmitter3',
      duration: ee3Duration,
      eventsPerSecond: Math.round(count / (ee3Duration / 1000)),
      avgTimePerEvent: ee3Duration / count
    };
    
    // 测试 mitt
    const emitter = libraries.mitt();
    emitter.on('perf-test', () => {});
    
    const mittStartTime = performance.now();
    for (let i = 0; i < count; i++) {
      emitter.emit('perf-test', { index: i });
    }
    const mittEndTime = performance.now();
    const mittDuration = mittEndTime - mittStartTime;
    results.mitt = {
      name: 'mitt',
      duration: mittDuration,
      eventsPerSecond: Math.round(count / (mittDuration / 1000)),
      avgTimePerEvent: mittDuration / count
    };
    
    // 测试 tiny-emitter
    const tinyEmitter = new libraries.TinyEmitter();
    tinyEmitter.on('perf-test', () => {});
    
    const tinyStartTime = performance.now();
    for (let i = 0; i < count; i++) {
      tinyEmitter.emit('perf-test', { index: i });
    }
    const tinyEndTime = performance.now();
    const tinyDuration = tinyEndTime - tinyStartTime;
    results.tinyEmitter = {
      name: 'tiny-emitter',
      duration: tinyDuration,
      eventsPerSecond: Math.round(count / (tinyDuration / 1000)),
      avgTimePerEvent: tinyDuration / count
    };
    
    // 测试 nanoevents
    const nanoEmitter = libraries.nanoevents();
    nanoEmitter.on('perf-test', () => {});
    
    const nanoStartTime = performance.now();
    for (let i = 0; i < count; i++) {
      nanoEmitter.emit('perf-test', { index: i });
    }
    const nanoEndTime = performance.now();
    const nanoDuration = nanoEndTime - nanoStartTime;
    results.nanoevents = {
      name: 'nanoevents',
      duration: nanoDuration,
      eventsPerSecond: Math.round(count / (nanoDuration / 1000)),
      avgTimePerEvent: nanoDuration / count
    };
    
    // 找出最快的实现作为基准，避免除以0或异常数值
    let fastestLib = null;
    let fastestSpeed = 0;
    
    Object.keys(results).forEach(key => {
      const speed = results[key].eventsPerSecond;
      // 确保值有效且不为0
      if (speed && isFinite(speed) && speed > fastestSpeed) {
        fastestSpeed = speed;
        fastestLib = key;
      }
    });
    
    // 保护性检查：确保至少有一个有效测试
    if (!fastestLib || fastestSpeed <= 0) {
      libraryComparisonResult.value = "测试失败：无法获取有效的基准测试结果";
      performanceTestRunning.value = false;
      return;
    }
    
    // 计算相对性能比
    Object.keys(results).forEach(key => {
      const ratio = results[key].eventsPerSecond / fastestSpeed;
      // 保护不合法值
      results[key].performanceRatio = isFinite(ratio) ? ratio.toFixed(2) : "N/A";
    });
    
    // 生成对比报告
    let reportText = `测试事件数量: ${count.toLocaleString()}\n\n`;
    reportText += `最快实现: ${results[fastestLib].name} (${fastestSpeed.toLocaleString()} 事件/秒)\n\n`;
    
    // 按性能排序结果
    const sortedResults = Object.keys(results)
      .sort((a, b) => results[b].eventsPerSecond - results[a].eventsPerSecond)
      .map(key => results[key]);
      
    sortedResults.forEach((result, index) => {
      reportText += `${index + 1}. ${result.name}\n`;
      reportText += `   触发时间: ${result.duration.toFixed(2)}ms\n`;
      reportText += `   每秒事件数: ${result.eventsPerSecond.toLocaleString()}\n`;
      reportText += `   每事件平均时间: ${result.avgTimePerEvent.toFixed(3)}ms\n`;
      reportText += `   性能比率: ${result.performanceRatio}\n\n`;
    });
    
    libraryComparisonResult.value = reportText;
    addLog('library-comparison-test', `流行库对比测试完成: 最快实现是 ${results[fastestLib].name}`);
    
    // 清理
    eventBus.off('perf-test', ebListener);
    updateRegisteredEvents();
    performanceTestRunning.value = false;
  }
  
  // 调试支持
  function setupDebugSupport() {
    // 监听调试模式变化
    watchEffect(() => {
      if (debugMode.value) {
        eventBus.enableDebug();
        // 添加调试钩子
        eventBus.extend('debugExtension', {
          init: (context) => {
            context.addHook('debug', (debugEvent) => {
              addLog('debug', `${debugEvent.type}: ${JSON.stringify(debugEvent.data)}`);
            });
          }
        });
      } else {
        eventBus.disableDebug();
      }
    });
  }
  
  // 生命周期
  onMounted(() => {
    updateRegisteredEvents();
    setupDebugSupport();
    addLog('init', '事件总线测试组件已初始化');
  });
  
  onUnmounted(() => {
    // 清理所有监听器
    eventBus.removeAllListeners();
  });
  </script>
  
  <style scoped>
  .event-bus-test-container {
    font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    color: #333;
  }
  
  h1 {
    color: #0078d7;
    border-bottom: 2px solid #0078d7;
    padding-bottom: 10px;
    margin-bottom: 20px;
  }
  
  .test-panels {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  
  .control-group {
    margin-bottom: 15px;
    display: flex;
    flex-direction: column;
  }
  
  .control-group label {
    margin-bottom: 5px;
    font-weight: bold;
  }
  
  input, button {
    padding: 8px 12px;
    border-radius: 4px;
    border: 1px solid #ddd;
  }
  
  button {
    background: #0078d7;
    color: white;
    cursor: pointer;
    border: none;
    transition: background 0.2s;
  }
  
  button:hover {
    background: #005a9e;
  }
  
  button:disabled {
    background: #aaa;
    cursor: not-allowed;
  }
  
  .button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .options-group {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin-top: 5px;
  }
  
  .options-group label {
    display: flex;
    align-items: center;
    font-weight: normal;
  }
  
  .options-group input[type="checkbox"] {
    margin-right: 5px;
  }
  
  /* 表格样式 */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  
  th {
    background-color: #f2f2f2;
  }
  
  /* 事件监控区域 */
  .event-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    margin-bottom: 15px;
  }
  
  .stat-item {
    background: #e9f2fd;
    padding: 10px;
    border-radius: 4px;
    flex-grow: 1;
  }
  
  /* 日志区域 */
  .log-controls {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  
  .log-container {
    height: 200px;
    overflow-y: auto;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 10px;
    background: #fff;
  }
  
  .log-item {
    padding: 5px;
    margin-bottom: 5px;
    border-bottom: 1px solid #eee;
    font-family: monospace;
  }
  
  .log-time {
    color: #999;
    margin-right: 10px;
  }
  
  .log-type {
    font-weight: bold;
    margin-right: 10px;
  }
  
  /* 不同日志类型颜色 */
  .log-item.emit, .log-item.emit-specific {
    background-color: #f0f7ff;
  }
  
  .log-item.register, .log-item.register-once {
    background-color: #f0fff0;
  }
  
  .log-item.callback, .log-item.once-callback {
    background-color: #fff8e0;
  }
  
  .log-item.unregister, .log-item.remove-all, .log-item.remove-event {
    background-color: #fff0f0;
  }
  
  .log-item.debug {
    background-color: #f0f0ff;
  }
  
  /* 高级测试区域 */
  .advanced-tests {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
    gap: 20px;
  }
  
  .test-case {
    border: 1px solid #ddd;
    padding: 15px;
    border-radius: 6px;
  }
  
  .test-result {
    margin-top: 10px;
    padding: 10px;
    background: #f5f5f5;
    border-radius: 4px;
    font-family: monospace;
    white-space: pre-wrap;
  }
  
  /* 响应式调整 */
  @media (max-width: 768px) {
    .advanced-tests {
      grid-template-columns: 1fr;
    }
    
    .button-group button {
      flex: 1 1 calc(50% - 5px);
    }
  }
  </style>