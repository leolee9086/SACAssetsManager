<template>
  <div class="histogram-wrapper">
    <!-- 左侧图像预览区域 -->
    <div class="toolbar">
      <button class="open-file-btn" @click="openNewFile">
        打开文件
      </button>
    </div>
    <div class="preview-section">
      <div class="image-container">
        <canvas ref="previewCanvas" alt="预览图"></canvas>
      </div>
      <div class="image-info">
        <div class="info-item">图像路径: {{ imagePath }}</div>
        <div class="info-item">大小: {{ info.width }}*{{ info.height }}</div>
      </div>
    </div>

    <!-- 右侧控制面板 -->
    <div class="control-section">
      <HistogramPanel
        v-model:channels="channels"
        :sharp-object="currentSharpObject"
        @histogram-updated="handleHistogramUpdate"
      />
      
      <ImageAdjuster
        ref="imageAdjuster"
        @update:processing="handleProcessingUpdate"
      />
    </div>

    <!-- 添加性能监控面板 -->
    <div class="performance-panel">
      <div class="performance-item">
        处理时间: {{ performanceStats.processingTime||0 }} ms
      </div>
      <div class="performance-item">
        内存使用: {{ performanceStats.memoryUsage||0 }} MB
      </div>
    </div>
  </div>
</template>

<script setup>
import HistogramPanel from './HistogramPanel.vue';
import ImageAdjuster from './ImageAdjuster.vue';
import { ref, computed, inject,toRef, onUnmounted } from 'vue';
import { onMounted, shallowRef } from '../../../../../static/vue.esm-browser.js';
import { fromFilePath } from '../../../../utils/fromDeps/sharpInterface/useSharp/toSharp.js';
const openNewFile = async () => {
  try {
    const result = await window.require("@electron/remote").dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: '图像文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const newPath = result.filePaths[0];
      // 更新图像路径
      imagePath.value = newPath;
      
      // 重新初始化图像处理
      const sharpObj = await fromFilePath(newPath);
      currentSharpObject.value = sharpObj;
      await generatePreview(sharpObj);
      
      // 重置所有调整
      resetAdjustments();
    }
  } catch (error) {
    console.error('打开文件失败:', error);
  }
};




const appData = inject('appData')
const histogram = ref({})
const imagePath = toRef(appData.imagePath||window.imagePath)
const previewCanvas = ref(null);
const info= ref({}) 
const channels = ref([
  { key: 'r', label: 'R', color: '#ff0000', visible: true },
  { key: 'g', label: 'G', color: '#00ff00', visible: true },
  { key: 'b', label: 'B', color: '#0000ff', visible: true },
  { key: 'brightness', label: '亮度', color: 'white', visible: true } // 添加亮度
  ]);

const imageAdjuster = ref(null);
const currentProcessing = ref(null);
const currentSharpObject = shallowRef(null);

// 添加性能监控相关的响应式数据
const performanceStats = ref({
  processingTime: 0,
  memoryUsage: 0,
  isProcessing: false
});

// 处理直方图更新
const handleHistogramUpdate = (result) => {
  info.value = result.info;
};

// 处理图像处理更新
const handleProcessingUpdate = async (processingPipeline) => {
  if (!processingPipeline) return;
  
  try {
    performanceStats.value.isProcessing = true;
    const startTime = performance.now();
    
    let processedImg = await fromFilePath(imagePath.value);  
    processedImg = await processingPipeline(processedImg);
    
    // 计算处理时间
    performanceStats.value.processingTime = (performance.now() - startTime).toFixed(2);
    
    // 获取内存使用情况（如果在Node环境中）
    if (process?.memoryUsage) {
      const memory = process.memoryUsage();
      performanceStats.value.memoryUsage = (memory.heapUsed / 1024 / 1024).toFixed(2);
    }
    
    currentSharpObject.value = processedImg;
    await generatePreview(processedImg);
  } catch (error) {
    console.error('处理图像失败:', error);
  } finally {
    performanceStats.value.isProcessing = false;
  }
};

onMounted(async () => {
  const sharpObj = fromFilePath(imagePath.value);
  currentSharpObject.value = sharpObj;
  await generatePreview(sharpObj);
});

// 导出保存当前设置的方法
const saveCurrentSettings = () => {
  return imageAdjuster.value?.getCurrentSettings();
};

// 导出加载设置的方法
const loadSavedSettings = (settings) => {
  imageAdjuster.value?.loadSettings(settings);
};

// 重置所有调整
const resetAdjustments = () => {
  imageAdjuster.value?.reset();
};

defineExpose({
  saveCurrentSettings,
  loadSavedSettings,
  resetAdjustments
});

const generatePreview = async (sharpObj) => {
  try {
    const previewSharp = sharpObj.clone();

    const buffer = await previewSharp
      .png()
      .toBuffer();
    
    const blob = new Blob([buffer], { type: 'image/png' });
    const imageBitmap = await createImageBitmap(blob);
    
    const canvas = previewCanvas.value;
    const ctx = canvas.getContext('2d');
    
    // 获取 image-container 的尺寸
    const container = canvas.parentElement;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // 计算图像的缩放比例
    const scale = Math.min(containerWidth / imageBitmap.width, containerHeight / imageBitmap.height);
    
    // 设置 canvas 尺寸
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    
    // 清除旧内容并绘制新图像
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      imageBitmap,
      0, 0, imageBitmap.width, imageBitmap.height,
      (canvas.width - imageBitmap.width * scale) / 2,
      (canvas.height - imageBitmap.height * scale) / 2,
      imageBitmap.width * scale,
      imageBitmap.height * scale
    );
    
    imageBitmap.close();
  } catch (error) {
    console.error('生成预览图失败:', error,error.stack);
  }
};

// 添加简单的防抖函数实现
const debounce = (fn, delay) => {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
};

// 创建防抖后的直方图和预览更新函数
const updateHistogramAndPreview = async (processedImg) => {
  try {
    const result = await getHistogramFromSharp(processedImg);
    histogram.value = result.histogram;
    info.value = result.info;
    await generatePreview(processedImg);
  } catch (error) {
    console.error('更新直方图和预览失败:', error);
  }
};

const debouncedUpdate = debounce(updateHistogramAndPreview, 300);

// 在组件卸载时清理缓存
onUnmounted(() => {
  // 清除可能存在的定时器
  if (debouncedUpdate.timer) {
    clearTimeout(debouncedUpdate.timer);
  }
});
</script>
<style scoped>
.histogram-wrapper {
  display: flex;
  gap: 20px;
  padding: 16px;
  background: #1e1e1e;
  border-radius: 4px;
  min-height: 600px;
}

/* 左侧预览区域样式 */
.preview-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #2a2a2a;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.image-container canvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
  position: absolute;
}

.image-info {
  padding: 8px;
  background: #2a2a2a;
  border-radius: 4px;
}

.info-item {
  color: #fff;
  font-size: 12px;
  margin-bottom: 4px;
}

/* 右侧控制面板样式 */
.control-section {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #2a2a2a;
  padding: 16px;
  border-radius: 4px;
}

.histogram-controls {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.channel-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.histogram-chart {
  background: #252525;
  border-radius: 4px;
  padding: 8px;
}

.adjustment-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  flex: 1;
}

.control-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.control-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  font-size: 12px;
}

.value-display {
  color: #888;
}

input[type="range"] {
  width: 100%;
  height: 4px;
  background: #3a3a3a;
  border-radius: 2px;
  -webkit-appearance: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
}

input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
}

.performance-panel {
  padding: 8px;
  background: #2a2a2a;
  border-radius: 4px;
}

.performance-item {
  color: #fff;
  font-size: 12px;
  margin-bottom: 4px;
}
</style>
