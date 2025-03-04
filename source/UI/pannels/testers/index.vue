<template>
    <div class="virtual-scroll-tester">
      <div class="control-panel">
        <h2>虚拟滚动测试工具</h2>
        
        <div class="test-selector">
          <div class="test-group">
            <h3>测试场景</h3>
            <select v-model="currentTestId">
              <option v-for="test in testScenarios" :key="test.id" :value="test.id">
                {{ test.name }}
              </option>
            </select>
            
            <div class="test-description">
              {{ currentTest?.description || '请选择测试场景' }}
            </div>
          </div>
          
          <div class="test-controls">
            <button @click="runCurrentTest" :disabled="isRunning">运行测试</button>
            <button @click="stopTest" :disabled="!isRunning">停止测试</button>
            <button @click="resetTest">重置</button>
          </div>
        </div>
        
        <div class="test-config">
          <h3>测试配置</h3>
          
          <div class="config-item">
            <label>项目数量:</label>
            <input type="number" v-model.number="itemCount" min="0" max="1000000" />
          </div>
          
          <div class="config-item">
            <label>项目高度:</label>
            <select v-model="heightMode">
              <option value="fixed">固定高度</option>
              <option value="random">随机高度</option>
              <option value="dynamic">动态变化</option>
            </select>
            <input 
              v-if="heightMode === 'fixed'" 
              type="number" 
              v-model.number="fixedHeight" 
              min="1" 
              max="1000" 
            />
          </div>
          
          <div class="config-item">
            <label>自动滚动:</label>
            <input type="checkbox" v-model="autoScroll" />
          </div>
          
          <div class="config-item">
            <label>动态添加项目:</label>
            <input type="checkbox" v-model="dynamicItemAddition" />
            <span v-if="dynamicItemAddition">
              每 <input type="number" v-model.number="addItemInterval" min="100" max="10000" /> 毫秒
            </span>
          </div>
          
          <div class="config-item">
            <label>模拟网络延迟:</label>
            <input type="checkbox" v-model="simulateNetworkDelay" />
            <span v-if="simulateNetworkDelay">
              <input type="number" v-model.number="networkDelay" min="0" max="10000" /> 毫秒
            </span>
          </div>
        </div>
        
        <div class="performance-metrics">
          <h3>性能指标</h3>
          <ul>
            <li>渲染时间: {{ formatNumber(virtualScroll?.performance?.averageRenderTime?.value) }} ms</li>
            <li>滚动事件: {{ virtualScroll?.performance?.scrollEvents?.value || 0 }}</li>
            <li>掉帧数: {{ virtualScroll?.performance?.frameDrops?.value || 0 }}</li>
            <li>性能评分: {{ virtualScroll?.performance?.performanceScore?.value || 0 }}/100</li>
            <li>缓存大小: {{ virtualScroll?.debug?.itemsCacheSize?.value || 0 }}</li>
            <li>缓存命中率: {{ formatNumber(virtualScroll?.debug?.cacheHitRate?.value * 100) }}%</li>
            <li>错误计数: {{ virtualScroll?.debug?.errorCount?.value || 0 }}</li>
            <li>可见项数: {{ virtualScroll?.debug?.visibleItemCount?.value || 0 }}</li>
          </ul>
        </div>
      </div>
      
      <div class="test-container">
        <div class="virtual-list-container" ref="containerRef">
          <div v-if="isLoading" class="loading-overlay">
            加载中...{{ loadingProgress }}%
          </div>
          
          <div v-if="testItems.length === 0 && !isLoading" class="empty-state">
            无数据 - 请运行测试
          </div>
          
          <div v-else class="virtual-list">
            <div 
              v-for="item in virtualScroll?.visibleItems?.value || []" 
              :key="item.id"
              class="list-item"
              :style="{
                height: `${getItemHeight(item)}px`,
                backgroundColor: item.color,
                opacity: item.visible ? 1 : 0.5
              }"
              @click="toggleItemVisibility(item)"
            >
              <div class="item-content">
                <span class="item-id">#{{ item.id }}</span>
                <span class="item-text">{{ item.text }}</span>
                <div v-if="showItemDetails" class="item-details">
                  {{ item.details || '无详细信息' }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="scroll-controls">
          <button @click="virtualScroll?.scrollToBottom()">滚动到底部</button>
          <button @click="scrollToRandom">随机跳转</button>
          <button @click="triggerResize">模拟容器大小变化</button>
          <button @click="toggleItemDetails">{{ showItemDetails ? '隐藏' : '显示' }}详情</button>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
  import { useVirtualScroll } from './useVirtualScroll.js';
  
  export default {
    name: 'VirtualScrollTester',
    
    setup() {
      // 测试状态
      const isRunning = ref(false);
      const isLoading = ref(false);
      const loadingProgress = ref(0);
      const showItemDetails = ref(false);
      const containerRef = ref(null);
      const testItems = ref([]);
      
      // 测试配置
      const currentTestId = ref('basic');
      const itemCount = ref(10000);
      const heightMode = ref('fixed');
      const fixedHeight = ref(40);
      const autoScroll = ref(false);
      const dynamicItemAddition = ref(false);
      const addItemInterval = ref(1000);
      const simulateNetworkDelay = ref(false);
      const networkDelay = ref(300);
      
      // 动态测试数据
      let itemAdditionTimer = null;
      let dynamicHeightTimer = null;
      let nextItemId = 0;
      
      // 测试场景定义
      const testScenarios = reactive([
        {
          id: 'basic',
          name: '基础测试 (1万项目)',
          description: '测试基本虚拟滚动功能，使用固定高度的项目。',
          setup() {
            itemCount.value = 10000;
            heightMode.value = 'fixed';
            fixedHeight.value = 40;
            autoScroll.value = false;
            dynamicItemAddition.value = false;
            return generateItems(itemCount.value);
          }
        },
        {
          id: 'large-dataset',
          name: '超大数据集 (10万项目)',
          description: '测试处理大量数据时的性能，验证内存使用和渲染效率。',
          setup() {
            itemCount.value = 100000;
            heightMode.value = 'fixed';
            fixedHeight.value = 30;
            autoScroll.value = false;
            dynamicItemAddition.value = false;
            return generateItems(itemCount.value);
          }
        },
        {
          id: 'variable-height',
          name: '随机高度项目',
          description: '测试每个项目高度不同的情况，检验动态高度计算能力。',
          setup() {
            itemCount.value = 5000;
            heightMode.value = 'random';
            autoScroll.value = false;
            dynamicItemAddition.value = false;
            return generateItems(itemCount.value, true);
          }
        },
        {
          id: 'dynamic-content',
          name: '动态内容变化',
          description: '测试项目内容和高度动态变化的情况，模拟实时数据更新。',
          setup() {
            itemCount.value = 1000;
            heightMode.value = 'dynamic';
            autoScroll.value = false;
            dynamicItemAddition.value = false;
            startDynamicHeightChanges();
            return generateItems(itemCount.value, true);
          }
        },
        {
          id: 'auto-scroll',
          name: '自动滚动测试',
          description: '测试自动滚动功能，模拟聊天或日志等不断添加内容的场景。',
          setup() {
            itemCount.value = 1000;
            heightMode.value = 'fixed';
            fixedHeight.value = 40;
            autoScroll.value = true;
            dynamicItemAddition.value = true;
            addItemInterval.value = 500;
            startItemAddition();
            return generateItems(itemCount.value);
          }
        },
        {
          id: 'empty-data',
          name: '空数据测试',
          description: '测试无数据情况下的处理能力，验证边界条件处理。',
          setup() {
            itemCount.value = 0;
            heightMode.value = 'fixed';
            fixedHeight.value = 40;
            autoScroll.value = false;
            dynamicItemAddition.value = false;
            return [];
          }
        },
        {
          id: 'tiny-dataset',
          name: '极小数据集 (10项)',
          description: '测试数据量极少的情况，验证小数据集上的过度优化问题。',
          setup() {
            itemCount.value = 10;
            heightMode.value = 'fixed';
            fixedHeight.value = 40;
            autoScroll.value = false;
            dynamicItemAddition.value = false;
            return generateItems(itemCount.value);
          }
        },
        {
          id: 'extreme-height',
          name: '极端高度测试',
          description: '测试极高/极矮项目混合的情况，检验高度计算稳定性。',
          setup() {
            itemCount.value = 1000;
            heightMode.value = 'random';
            autoScroll.value = false;
            dynamicItemAddition.value = false;
            return generateExtremeHeightItems(itemCount.value);
          }
        },
        {
          id: 'rapid-resize',
          name: '快速大小变化测试',
          description: '测试容器频繁改变大小的情况，验证重新计算和布局能力。',
          setup() {
            itemCount.value = 5000;
            heightMode.value = 'fixed';
            fixedHeight.value = 40;
            autoScroll.value = false;
            dynamicItemAddition.value = false;
            startRapidResizing();
            return generateItems(itemCount.value);
          }
        },
        {
          id: 'scroll-jumping',
          name: '滚动跳跃测试',
          description: '测试快速滚动和随机位置跳转，验证滚动位置计算准确性。',
          setup() {
            itemCount.value = 50000;
            heightMode.value = 'fixed';
            fixedHeight.value = 30;
            autoScroll.value = false;
            dynamicItemAddition.value = false;
            startRandomScrollJumping();
            return generateItems(itemCount.value);
          }
        },
        {
          id: 'network-simulation',
          name: '网络延迟模拟',
          description: '模拟网络延迟加载数据的情况，测试异步加载处理能力。',
          setup() {
            itemCount.value = 5000;
            heightMode.value = 'fixed';
            fixedHeight.value = 40;
            autoScroll.value = false;
            dynamicItemAddition.value = false;
            simulateNetworkDelay.value = true;
            networkDelay.value = 1500;
            return simulateNetworkLoading(itemCount.value);
          }
        }
      ]);
      
      // 计算当前测试场景
      const currentTest = computed(() => 
        testScenarios.find(test => test.id === currentTestId.value)
      );
      
      // 初始化虚拟滚动
      const virtualScroll = ref(null);
      
      function initVirtualScroll() {
        virtualScroll.value = useVirtualScroll({
          items: testItems,
          itemHeight: fixedHeight.value,
          dynamicItemHeight: heightMode.value !== 'fixed',
          getItemHeight: item => getItemHeight(item),
          autoScroll: autoScroll.value,
          maxVisibleItems: 100,
          buffer: 20,
          overscan: 10,
          throttleMs: 16,
          adaptiveUpdate: true,
          cacheStrategy: 'lru',
          fallbackToStandard: true
        });
      }
      
      // 生成测试数据
      function generateItems(count, randomHeight = false) {
        isLoading.value = true;
        loadingProgress.value = 0;
        nextItemId = 0;
        
        const batchSize = 1000;
        const totalBatches = Math.ceil(count / batchSize);
        let currentBatch = 0;
        let items = [];
        
        // 使用setTimeout分批生成数据以避免UI冻结
        function generateBatch() {
          const start = currentBatch * batchSize;
          const end = Math.min(start + batchSize, count);
          
          for (let i = start; i < end; i++) {
            const height = randomHeight ? Math.floor(Math.random() * 150) + 20 : fixedHeight.value;
            
            items.push({
              id: nextItemId++,
              text: `测试项目 ${i + 1}`,
              details: `这是项目 ${i + 1} 的详细信息，包含大量文本内容以测试渲染性能。当前高度: ${height}px`,
              height: height,
              color: getRandomColor(i),
              visible: true
            });
          }
          
          currentBatch++;
          loadingProgress.value = Math.floor((currentBatch / totalBatches) * 100);
          
          if (currentBatch < totalBatches) {
            setTimeout(generateBatch, 0);
          } else {
            testItems.value = items;
            isLoading.value = false;
            loadingProgress.value = 100;
          }
        }
        
        setTimeout(generateBatch, 0);
        return [];
      }
      
      // 生成极端高度的测试项目
      function generateExtremeHeightItems(count) {
        const items = [];
        nextItemId = 0;
        
        for (let i = 0; i < count; i++) {
          // 20%的项目有极端高度
          const extreme = Math.random() < 0.2;
          let height;
          
          if (extreme) {
            // 50%概率非常高，50%概率非常矮
            height = Math.random() < 0.5 ? 
              Math.floor(Math.random() * 500) + 300 : // 极高项目 (300-800px)
              Math.floor(Math.random() * 5) + 1;      // 极矮项目 (1-5px)
          } else {
            // 普通高度
            height = Math.floor(Math.random() * 80) + 20; // 20-100px
          }
          
          items.push({
            id: nextItemId++,
            text: `测试项目 ${i + 1} (${height}px)`,
            details: `这是${extreme ? '极端高度' : '普通高度'}项目`,
            height: height,
            color: getRandomColor(i),
            visible: true
          });
        }
        
        testItems.value = items;
        return items;
      }
      
      // 模拟网络延迟加载
      function simulateNetworkLoading(count) {
        isLoading.value = true;
        loadingProgress.value = 0;
        
        return new Promise(resolve => {
          // 模拟延迟加载的进度
          let progress = 0;
          const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 10) + 1;
            loadingProgress.value = Math.min(99, progress);
            
            if (progress >= 99) {
              clearInterval(interval);
              
              // 最终加载完成
              setTimeout(() => {
                loadingProgress.value = 100;
                isLoading.value = false;
                testItems.value = generateItems(count);
                resolve(testItems.value);
              }, networkDelay.value);
            }
          }, networkDelay.value / 10);
        });
      }
      
      // 获取项目高度
      function getItemHeight(item) {
        if (!item) return fixedHeight.value;
        
        // 如果是动态高度模式，返回项目的高度
        if (heightMode.value === 'dynamic' || heightMode.value === 'random') {
          return item.height || fixedHeight.value;
        }
        
        return fixedHeight.value;
      }
      
      // 获取随机颜色
      function getRandomColor(seed) {
        // 使用种子生成一致的颜色
        const h = (seed * 137) % 360;
        const s = 70 + ((seed * 37) % 30);
        const l = 85 + ((seed * 17) % 10);
        return `hsl(${h}, ${s}%, ${l}%)`;
      }
      
      // 格式化数字显示
      function formatNumber(num) {
        if (num === undefined || num === null) return '0';
        return typeof num === 'number' ? num.toFixed(2) : num;
      }
      
      // 控制项目可见性切换
      function toggleItemVisibility(item) {
        if (!item) return;
        item.visible = !item.visible;
        
        // 如果是动态高度模式，改变项目高度
        if (heightMode.value === 'dynamic') {
          item.height = item.visible ? 
            Math.floor(Math.random() * 150) + 20 : 
            Math.floor(Math.random() * 50) + 10;
        }
      }
      
      // 启动动态高度变化
      function startDynamicHeightChanges() {
        stopDynamicChanges();
        
        dynamicHeightTimer = setInterval(() => {
          if (!isRunning.value) return;
          
          // 随机选择5个项目改变高度
          for (let i = 0; i < 5; i++) {
            const randomIndex = Math.floor(Math.random() * testItems.value.length);
            const item = testItems.value[randomIndex];
            if (item) {
              item.height = Math.floor(Math.random() * 150) + 20;
            }
          }
        }, 2000);
      }
      
      // 启动随机项目添加
      function startItemAddition() {
        stopItemAddition();
        
        itemAdditionTimer = setInterval(() => {
          if (!isRunning.value || !dynamicItemAddition.value) return;
          
          // 添加一个新项目
          const newItem = {
            id: nextItemId++,
            text: `新项目 ${nextItemId}`,
            details: `这是动态添加的项目 ${nextItemId}`,
            height: heightMode.value !== 'fixed' ? Math.floor(Math.random() * 150) + 20 : fixedHeight.value,
            color: getRandomColor(nextItemId),
            visible: true
          };
          
          testItems.value.push(newItem);
        }, addItemInterval.value);
      }
      
      // 启动快速容器大小变化
      function startRapidResizing() {
        let resizeTimer = null;
        let originalHeight = 0;
        
        resizeTimer = setInterval(() => {
          if (!isRunning.value || !containerRef.value) {
            clearInterval(resizeTimer);
            return;
          }
          
          if (originalHeight === 0) {
            originalHeight = containerRef.value.clientHeight;
          }
          
          // 随机改变容器高度
          const heightChange = Math.floor(Math.random() * 200) - 100; // -100到+100px变化
          containerRef.value.style.height = `${originalHeight + heightChange}px`;
        }, 2000);
        
        return () => {
          clearInterval(resizeTimer);
          if (containerRef.value && originalHeight) {
            containerRef.value.style.height = `${originalHeight}px`;
          }
        };
      }
      
      // 启动随机滚动跳跃
      function startRandomScrollJumping() {
        let jumpTimer = null;
        
        jumpTimer = setInterval(() => {
          if (!isRunning.value || !virtualScroll.value) {
            clearInterval(jumpTimer);
            return;
          }
          
          scrollToRandom();
        }, 5000);
        
        return () => clearInterval(jumpTimer);
      }
      
      // 模拟触发容器大小变化
      function triggerResize() {
        if (!containerRef.value) return;
        
        const originalHeight = containerRef.value.clientHeight;
        // 先缩小容器
        containerRef.value.style.height = `${originalHeight * 0.8}px`;
        
        // 然后恢复
        setTimeout(() => {
          if (containerRef.value) {
            containerRef.value.style.height = `${originalHeight}px`;
          }
        }, 1000);
      }
      
      // 随机滚动位置
      function scrollToRandom() {
        if (!virtualScroll.value || testItems.value.length === 0) return;
        
        const randomIndex = Math.floor(Math.random() * testItems.value.length);
        virtualScroll.value.scrollToItem(randomIndex, 'smooth', 'center');
      }
      
      // 切换项目详情显示
      function toggleItemDetails() {
        showItemDetails.value = !showItemDetails.value;
      }
      
      // 停止动态变化
      function stopDynamicChanges() {
        if (dynamicHeightTimer) {
          clearInterval(dynamicHeightTimer);
          dynamicHeightTimer = null;
        }
      }
      
      // 停止项目添加
      function stopItemAddition() {
        if (itemAdditionTimer) {
          clearInterval(itemAdditionTimer);
          itemAdditionTimer = null;
        }
      }
      
      // 运行当前测试
      function runCurrentTest() {
        if (isRunning.value || !currentTest.value) return;
        
        resetTest();
        isRunning.value = true;
        
        // 设置测试配置
        const items = currentTest.value.setup();
        if (items.length > 0) {
          testItems.value = items;
        }
        
        // 初始化虚拟滚动
        nextTick(() => {
          if (containerRef.value) {
            if (!virtualScroll.value) {
              initVirtualScroll();
            }
            
            if (virtualScroll.value) {
              virtualScroll.value.initialize(containerRef.value);
            }
          }
        });
      }
      
      // 停止测试
      function stopTest() {
        isRunning.value = false;
        stopDynamicChanges();
        stopItemAddition();
      }
      
      // 重置测试
      function resetTest() {
        stopTest();
        testItems.value = [];
        nextItemId = 0;
        
        if (virtualScroll.value) {
          virtualScroll.value.reset();
        }
      }
      
      // 组件挂载
      onMounted(() => {
        initVirtualScroll();
        
        if (containerRef.value) {
          virtualScroll.value.initialize(containerRef.value);
        }
      });
      
      // 组件卸载前清理
      onBeforeUnmount(() => {
        stopTest();
        
        if (virtualScroll.value) {
          virtualScroll.value = null;
        }
      });
      
      // 监听自动滚动设置变化
      watch(autoScroll, newValue => {
        if (virtualScroll.value) {
          virtualScroll.value.scrollToBottom(newValue);
        }
      });
      
      // 监听动态添加项目设置变化
      watch(dynamicItemAddition, newValue => {
        if (newValue) {
          startItemAddition();
        } else {
          stopItemAddition();
        }
      });
      
      return {
        // 状态和引用
        containerRef,
        virtualScroll,
        testItems,
        isRunning,
        isLoading,
        loadingProgress,
        showItemDetails,
        
        // 测试场景
        testScenarios,
        currentTestId,
        currentTest,
        
        // 配置
        itemCount,
        heightMode,
        fixedHeight,
        autoScroll,
        dynamicItemAddition,
        addItemInterval,
        simulateNetworkDelay,
        networkDelay,
        
        // 方法
        runCurrentTest,
        stopTest,
        resetTest,
        getItemHeight,
        formatNumber,
        toggleItemVisibility,
        scrollToRandom,
        triggerResize,
        toggleItemDetails
      };
    }
  };
  </script>
  
  <style>
  .virtual-scroll-tester {
    display: flex;
    width: 100%;
    height: 100vh;
    font-family: Arial, sans-serif;
  }
  
  .control-panel {
    width: 350px;
    padding: 15px;
    background-color: #f5f5f5;
    border-right: 1px solid #ddd;
    overflow-y: auto;
  }
  
  .test-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  
  .virtual-list-container {
    flex: 1;
    overflow-y: auto;
    position: relative;
    border: 1px solid #ddd;
    background-color: #fff;
  }
  
  .test-selector {
    margin-bottom: 20px;
  }
  
  .test-description {
    margin-top: 10px;
    padding: 8px;
    background-color: #e9e9e9;
    border-radius: 4px;
    font-size: 14px;
  }
  
  .test-controls {
    margin-top: 15px;
    display: flex;
    gap: 10px;
  }
  
  .test-config {
    margin-bottom: 20px;
  }
  
  .config-item {
    margin-bottom: 10px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  
  .list-item {
    padding: 10px 15px;
    border-bottom: 1px solid #eee;
    position: relative;
    transition: background-color 0.2s;
  }
  
  .list-item:hover {
    background-color: rgba(0, 0, 0, 0.03);
  }
  
  .item-content {
    display: flex;
    flex-direction: column;
  }
  
  .item-id {
    font-weight: bold;
    margin-right: 10px;
  }
  
  .item-details {
    margin-top: 5px;
    font-size: 12px;
    color: #666;
  }
  
  .scroll-controls {
    padding: 10px;
    display: flex;
    gap: 10px;
    background-color: #f5f5f5;
    border-top: 1px solid #ddd;
  }
  
  .performance-metrics {
    background-color: #e9e9e9;
    padding: 10px;
    border-radius: 4px;
    margin-top: 20px;
  }
  
  .performance-metrics ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }
  
  .performance-metrics li {
    padding: 3px 0;
    font-size: 13px;
  }
  
  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
  }
  
  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    z-index: 10;
  }
  
  button, select, input {
    padding: 6px 10px;
    border-radius: 4px;
    border: 1px solid #ccc;
  }
  
  button {
    background-color: #4a90e2;
    color: white;
    border: none;
    cursor: pointer;
  }
  
  button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
  
  h2, h3 {
    margin-top: 0;
    margin-bottom: 15px;
  }
  
  input[type="number"] {
    width: 70px;
  }
  </style>