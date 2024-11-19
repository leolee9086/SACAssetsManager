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
      <!-- 直方图通道控制 -->
      <div class="histogram-controls">
        <label v-for="channel in channels" 
               :key="channel.key" 
               class="channel-toggle">
          <input type="checkbox" 
                 v-model="channel.visible"
                 :style="{ accentColor: channel.color }">
          {{ channel.label }}
        </label>
      </div>

      <!-- 直方图显示 -->
      <div class="histogram-chart">
        <ECharts ref="histogramChart"
                 :option="chartOption"
                 style="width: 100%; height: 200px;" />
      </div>

      <!-- 调整控制面板 -->
      <div class="adjustment-controls">
        <div v-for="control in adjustmentControls" 
             :key="control.key" 
             class="control-item">
          <div class="control-header">
            <label>{{ control.label }}</label>
            <span class="value-display">{{ control.value }}</span>
          </div>
          <input type="range" 
                 v-model="control.value" 
                 :min="control.min" 
                 :max="control.max" 
                 :step="control.step"
                 @input="handleAdjustment(control.key)">
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed, inject,toRef, onUnmounted } from 'vue';
import ECharts from '../../../components/common/echarts.vue';
import { 创建经典直方图配置 } from '../../../../utils/fromDeps/echarts/presets.js';
import { thumbnail } from '../../../../server/endPoints.js';
import { onMounted } from '../../../../../static/vue.esm-browser.js';
import { getHistogramFromSharp,getHistogramFromPath } from '../../../../utils/image/histogram.js';
import { fromBuffer, fromFilePath } from '../../../../utils/fromDeps/sharpInterface/useSharp/toSharp.js';
import { 调整锐度, 调整平滑度, 调整清晰度, 调整锐化半径, 调整细节保护, 调整细节 } from '../../../../utils/fromDeps/sharpInterface/useSharp/adjust/clarity.js';
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

const adjustmentControls = ref([
  { key: 'sharpness', label: '锐度', value: 0, min: -1, max: 1, step: 0.1 },
  { key: 'smoothness', label: '平滑度', value: 0, min: 0, max: 20, step: 1 },
  { key: 'clarity', label: '清晰度', value: 0, min: -1, max: 1, step: 0.1 },
  { key: 'radius', label: '锐化半径', value: 1, min: 0.5, max: 5, step: 0.1 },
  { key: 'detail', label: '细节', value: 0, min: -1, max: 1, step: 0.1 },
  { key: 'protection', label: '细节保护', value: 0.5, min: 0, max: 1, step: 0.1 }
]);

// 添加 buffer 缓存
const imageBuffer = ref(null);
const currentImagePath = ref('');
const getImageBuffer = async () => {
  if (imageBuffer.value && currentImagePath.value === imagePath.value) {
    return imageBuffer.value;
  }
  
  try {
    const sharpObj = fromFilePath(imagePath.value);
    // 确保输出为 RGBA 格式
    imageBuffer.value = await sharpObj
      .ensureAlpha()  // 确保有 alpha 通道
      .raw()          // 获取原始数据
      .toBuffer();    // 转换为 buffer
      
    currentImagePath.value = imagePath.value;
    return imageBuffer.value;
  } catch (error) {
    console.error('获取图像buffer失败:', error);
    ElMessage.error('获取图像数据失败');
    throw error;
  }
};
onMounted(async()=>{
    const sharpObj= fromFilePath(imagePath.value)
    const result =await     getHistogramFromSharp(sharpObj)
    info.value =result.info
    histogram.value=result.histogram
})

const chartOption= computed(()=>创建经典直方图配置(channels.value,histogram.value))
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

// 修改handleAdjustment函数
const handleAdjustment = async (key) => {
  const sharpObj = fromBuffer(await getImageBuffer());
  const control = adjustmentControls.value.find(c => c.key === key);
  const value = parseFloat(control.value);
  let processedImg;
  
  try {
    switch(key) {
      case 'sharpness':
        processedImg = 调整锐度(sharpObj, value);
        break;
      case 'smoothness':
        processedImg = 调整平滑度(sharpObj, value);
        break;
      case 'clarity':
        processedImg = 调整清晰度(sharpObj, value);
        break;
      case 'radius':
        processedImg = 调整锐化半径(sharpObj, value);
        break;
      case 'detail':
        processedImg = 调整细节(sharpObj, value);
        break;
      case 'protection':
        processedImg = 调整细节保护(sharpObj, value);
        break;
    }
    
    // 使用防抖函数更新直方图和预览
    debouncedUpdate(processedImg);
  } catch (error) {
    console.error('处理图像失败:', error);
  }
};

// 添加清理函数
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
</style>
