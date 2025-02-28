<template>
  <div class="canvas-wrapper">
    <h2 class="canvas-title">元素层次细节测试</h2>
    <div class="canvas-box">
      <InfiniteCanvas 
        ref="canvas" 
        :initialScale="1" 
        :gridSize="50"
        :enableLod="enableLOD"
        @viewport-changed="handleViewportChanged"
        @lod-update="handleLodUpdate"
      />
    </div>
    <div class="canvas-controls">
      <button @click="addLodElements">添加LOD测试元素</button>
      <button @click="toggleLOD">{{ enableLOD ? '禁用LOD' : '启用LOD' }}</button>
      <button @click="zoomOut">缩小</button>
      <button @click="zoomIn">放大</button>
      <button @click="clearCanvas">清空画布</button>
      <button @click="toggleDynamicElements">{{ dynamicElementsEnabled ? '禁用' : '启用' }}动态元素</button>
    </div>
    <div class="canvas-info">
      <div>当前LOD状态: {{ enableLOD ? '启用' : '禁用' }}</div>
      <div>当前缩放: {{ currentScale.toFixed(2) }}x</div>
      <div>可见元素数量: {{ visibleElements }}</div>
      <div>元素统计: 总数 {{ elementStats.total }}, 可见 {{ elementStats.visible }}, 隐藏 {{ elementStats.hidden }}</div>
      <div>动态元素: {{ dynamicElementsEnabled ? '已启用' : '已禁用' }} (已添加: {{ dynamicElementsAdded }})</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import InfiniteCanvas from '../InfiniteCanvas.vue';

const canvas = ref(null);
const enableLOD = ref(true);
const currentScale = ref(1);
const visibleElements = ref(0);
const elementStats = ref({ total: 0, visible: 0, hidden: 0 });
const dynamicElementsEnabled = ref(false);
const dynamicElementsAdded = ref(0);
const scaleThresholds = ref([0.5, 1.0, 2.0, 4.0]);
const previousScaleIndex = ref(-1);

onMounted(() => {
  updateVisibleCount();
});

// 监听缩放变化，动态添加/删除元素
watch(currentScale, (newScale) => {
  if (!dynamicElementsEnabled.value) return;
  
  // 根据缩放级别确定当前所在的索引区间
  let currentScaleIndex = -1;
  for (let i = 0; i < scaleThresholds.value.length; i++) {
    if (newScale >= scaleThresholds.value[i]) {
      currentScaleIndex = i;
    }
  }
  
  // 如果索引区间发生变化，添加或删除元素
  if (currentScaleIndex !== previousScaleIndex.value) {
    if (currentScaleIndex > previousScaleIndex.value) {
      // 放大时添加更多细节元素
      addDynamicElements(currentScaleIndex);
    } else {
      // 缩小时删除一些细节元素
      removeDynamicElements(currentScaleIndex);
    }
    
    previousScaleIndex.value = currentScaleIndex;
  }
});

const handleViewportChanged = (e) => {
  currentScale.value = e.scale;
  updateVisibleCount();
};

const handleLodUpdate = (data) => {
  visibleElements.value = data.visibleElements.length;
  elementStats.value = data.statistics;
};

const updateVisibleCount = () => {
  if (!canvas.value) return;
  
  // 使用元素统计信息更新可见元素数量
  const stats = canvas.value.getElementStatistics ? canvas.value.getElementStatistics() : null;
  if (stats) {
    elementStats.value = stats;
    visibleElements.value = stats.visible;
  }
};

// 切换动态元素功能
const toggleDynamicElements = () => {
  dynamicElementsEnabled.value = !dynamicElementsEnabled.value;
  
  if (dynamicElementsEnabled.value) {
    // 启用时，根据当前缩放级别添加初始元素
    let currentScaleIndex = -1;
    for (let i = 0; i < scaleThresholds.value.length; i++) {
      if (currentScale.value >= scaleThresholds.value[i]) {
        currentScaleIndex = i;
      }
    }
    
    if (currentScaleIndex >= 0) {
      addDynamicElements(currentScaleIndex);
      previousScaleIndex.value = currentScaleIndex;
    }
  } else {
    // 禁用时，清除所有动态元素
    clearDynamicElements();
    previousScaleIndex.value = -1;
    dynamicElementsAdded.value = 0;
  }
};

// 添加动态元素
const addDynamicElements = (scaleIndex) => {
  if (!canvas.value) return;
  
  // 根据不同的缩放索引，添加不同密度和类型的元素
  const dynamicElements = [];
  const count = (scaleIndex + 1) * 20; // 每级别增加20个元素
  
  for (let i = 0; i < count; i++) {
    // 放大时，在视图中心附近随机位置添加元素
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 200 * (scaleIndex + 1);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    
    const elementType = ['circle', 'rect'][Math.floor(Math.random() * 2)];
    let element;
    
    if (elementType === 'circle') {
      element = {
        type: 'circle',
        x, y,
        radius: 5 + Math.random() * 10,
        fill: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.7)`,
        stroke: 'black',
        strokeWidth: 1,
        // 这些元素只在当前和更高缩放级别可见
        lodRange: { minScale: scaleThresholds.value[scaleIndex], maxScale: Infinity },
        metadata: { dynamic: true, scaleIndex }
      };
    } else {
      const size = 10 + Math.random() * 20;
      element = {
        type: 'rect',
        x: x - size/2,
        y: y - size/2,
        width: size,
        height: size,
        fill: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.7)`,
        stroke: 'black',
        strokeWidth: 1,
        // 这些元素只在当前和更高缩放级别可见
        lodRange: { minScale: scaleThresholds.value[scaleIndex], maxScale: Infinity },
        metadata: { dynamic: true, scaleIndex }
      };
    }
    
    // 添加ID前缀，方便后续清除
    element.id = `dynamic_${scaleIndex}_${i}`;
    dynamicElements.push(element);
  }
  
  // 批量添加元素
  if (dynamicElements.length > 0) {
    canvas.value.addElements(dynamicElements);
    dynamicElementsAdded.value += dynamicElements.length;
  }
};

// 移除特定缩放级别之后的动态元素
const removeDynamicElements = (currentScaleIndex) => {
  if (!canvas.value) return;
  
  // 获取当前的所有元素
  const elements = canvas.value.getElements();
  
  // 筛选出需要移除的元素：那些是动态元素且缩放级别高于当前级别的
  const elementsToRemove = elements.filter(el => {
    return el.metadata && 
           el.metadata.dynamic === true && 
           el.metadata.scaleIndex > currentScaleIndex;
  });
  
  // 移除元素
  elementsToRemove.forEach(el => {
    canvas.value.removeElement(el.id);
  });
  
  // 更新计数
  dynamicElementsAdded.value -= elementsToRemove.length;
};

// 清除所有动态元素
const clearDynamicElements = () => {
  if (!canvas.value) return;
  
  // 获取当前的所有元素
  const elements = canvas.value.getElements();
  
  // 筛选出所有动态元素
  const dynamicElements = elements.filter(el => {
    return el.metadata && el.metadata.dynamic === true;
  });
  
  // 移除所有动态元素
  dynamicElements.forEach(el => {
    canvas.value.removeElement(el.id);
  });
};

const addLodElements = () => {
  if (!canvas.value) return;
  
  // 创建多环元素阵列，从中心向外
  const totalRings = 10;
  const elementsPerRing = 20;
  
  for (let ring = 1; ring <= totalRings; ring++) {
    const radius = ring * 100;
    
    // 元素半径与环数成反比 - 内环元素小，外环元素大
    const elementRadius = 10 + (ring * 3);
    
    for (let i = 0; i < elementsPerRing; i++) {
      const angle = (i / elementsPerRing) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      // 根据环号设置不同的LOD范围
      let minScale, maxScale;
      
      if (ring <= 3) {
        // 内环 - 只在最大缩放级别可见（需要放大才能看到）
        minScale = 2.0;
        maxScale = Infinity;
      } else if (ring <= 5) {
        // 中环 - 在较大缩放级别可见
        minScale = 1.0;
        maxScale = Infinity;
      } else if (ring <= 8) {
        // 外环 - 在中等缩放级别可见
        minScale = 0.5;
        maxScale = Infinity;
      } else {
        // 最外环 - 在所有缩放级别都可见
        minScale = 0;
        maxScale = Infinity;
      }
      
      // 使用lodRange属性添加元素
      canvas.value.addElement({
        type: 'circle',
        x, y,
        radius: elementRadius,
        fill: `hsl(${(ring * 30) % 360}, 70%, 60%)`,
        stroke: 'black',
        strokeWidth: 1,
        lodRange: { minScale, maxScale },
        metadata: { ring, detail: `环 ${ring}` }
      });
    }
  }
  
  updateVisibleCount();
};

const toggleLOD = () => {
  if (!canvas.value) return;
  enableLOD.value = !enableLOD.value;
  // 调用InfiniteCanvas的方法设置LOD启用状态
  canvas.value.setLodThreshold(enableLOD.value ? 5 : 0);
  updateVisibleCount();
};

const zoomIn = () => {
  if (!canvas.value) return;
  canvas.value.zoomIn();
};

const zoomOut = () => {
  if (!canvas.value) return;
  canvas.value.zoomOut();
};

const clearCanvas = () => {
  if (!canvas.value) return;
  const elements = canvas.value.getElements();
  if (elements && elements.length > 0) {
    elements.forEach(el => {
      canvas.value.removeElement(el.id);
    });
  }
  dynamicElementsAdded.value = 0;
  previousScaleIndex.value = -1;
  updateVisibleCount();
};
</script>

<style scoped>
.canvas-wrapper {
  display: flex;
  flex-direction: column;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.canvas-title {
  padding: 10px 15px;
  margin: 0;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  font-size: 16px;
  font-weight: bold;
}

.canvas-box {
  flex: 1;
  position: relative;
  min-height: 300px;
  overflow: hidden;
}

.canvas-controls {
  padding: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-top: 1px solid #ddd;
  background: #f5f5f5;
}

.canvas-controls button {
  padding: 6px 12px;
  background: #4285f4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.canvas-controls button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.canvas-controls button:not(:disabled):hover {
  background: #3367d6;
}

.canvas-info {
  padding: 10px 15px;
  border-top: 1px solid #ddd;
  background: #f9f9f9;
  font-size: 14px;
  color: #555;
}
</style> 