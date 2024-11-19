<template>
  <div class="histogram-wrapper">
    <!-- 左侧图像预览区域 -->
    <div class="preview-section">
      <div class="image-container">
        <img :src="previewURL" alt="预览图">
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
        处理时间: {{ performanceStats.processingTime }} ms
      </div>
      <div class="performance-item">
        内存使用: {{ performanceStats.memoryUsage }} MB
      </div>
    </div>
  </div>
</template>

<script setup>
import HistogramPanel from './HistogramPanel.vue';
import ImageAdjuster from './ImageAdjuster.vue';
import { ref, computed, inject,toRef, onUnmounted } from 'vue';
import { thumbnail } from '../../../../server/endPoints.js';
import { onMounted, shallowRef } from '../../../../../static/vue.esm-browser.js';
import { fromFilePath } from '../../../../utils/fromDeps/sharpInterface/useSharp/toSharp.js';

const appData = inject('appData')
const histogram = ref({})
const imagePath = toRef(appData.imagePath)
const previewURL=ref(thumbnail.genHref('localPath',imagePath.value,1000))
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
    previewURL.value = await generatePreview(processedImg);
  } catch (error) {
    console.error('处理图像失败:', error);
  } finally {
    performanceStats.value.isProcessing = false;
  }
};

onMounted(async () => {
  const sharpObj = fromFilePath(imagePath.value);
  currentSharpObject.value = sharpObj;
  previewURL.value = await generatePreview(sharpObj);
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
    // 调整图像大小并获取 buffer
    const buffer = await sharpObj
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    // 创建 Blob 对象
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    
    // 返回 Blob URL
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('生成预览图失败:', error);
    return previewURL.value;
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
    previewURL.value = await generatePreview(processedImg);
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
  height: 100%;
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
}

.image-container img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
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
