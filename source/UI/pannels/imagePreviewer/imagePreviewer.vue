<template>
  <div class="container-wrapper">
    <div class="ruler horizontal-ruler" v-if="isRepeat">
      <canvas ref="horizontalRulerRef" class="ruler-canvas"></canvas>
    </div>
    <div class="ruler vertical-ruler" v-if="isRepeat">
      <canvas ref="verticalRulerRef" class="ruler-canvas"></canvas>
    </div>
    <div class="container" :style="containerStyle" ref="containerRef">
      <div class="grid-overlay" v-if="isRepeat" :style="gridStyle"></div>
      <div class="tile-overlay" v-if="isRepeat" :style="tileOverlayStyle"></div>
      <div class="top-controls">
        <FileUploadButton
          label="选择图片"
          accept="image/*"
          :loading="isLoading"
          :error="errorMessage"
          :maxSize="20 * 1024 * 1024"
          @change="onImageChange"
          @error="handleUploadError"
        />
      </div>
      <div class="controls">
        <button class="control-btn" @click="toggleMode">
          {{ isRepeat ? '单次显示' : '平铺显示' }}
        </button>
        <button class="control-btn" @click="toggleBrushMode">
          {{ isBrushMode ? '退出刷子' : '使用刷子' }}
        </button>
        <div v-if="isRepeat" class="size-controls">
          <div class="size-control">
            <span>UV缩放:</span>
            <input 
              type="range" 
              :value="uvScale" 
              @input="updateUVScale" 
              min="0.1" 
              max="10"
              step="0.1"
            >
            <span>{{ uvScale.toFixed(1) }}</span>
          </div>
          <div class="size-control">
            <span>实际尺寸(米):</span>
            <input 
              type="number" 
              :value="realSize" 
              @input="updateRealSize" 
              min="0.1" 
              max="100"
              step="0.1"
            >
          </div>
          <div class="info">
            <span>当前平铺: {{ (realSize / uvScale).toFixed(2) }}米 × {{ ((realSize / uvScale) / imageAspectRatio).toFixed(2) }}米/块</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import FileUploadButton from '../../components/common/inputters/fileUploadButton.vue'
import { drawRulers, loadImageFile, calculateTileSize, $loadImageFile,uploadToSiyuan } from './imagePreviewerUtils.js'
import { createBrushModeHandlers } from './brushModeUtils.js'
import { createStyleComputed } from './styleUtils.js'
import { getStatu, setStatu, watchStatu, 状态注册表 } from '../../../globalStatus/index.js';

const appData = inject('appData')
const isRepeat = ref(true)
const uvScale = ref(1.0)
const realSize = ref(1.0)
const containerRef = ref(null)
const imageAspectRatio = ref(1)
const horizontalRulerRef = ref(null)
const verticalRulerRef = ref(null)
const isLoading = ref(false)
const errorMessage = ref('')
const isImageUploaded = ref(false)
// 替换本地的 ref 为全局状态
const isBrushMode = computed({
    get: () => getStatu(状态注册表.笔刷模式),
    set: (value) => setStatu(状态注册表.笔刷模式, value)
});

const currentHoverElement = computed({
    get: () => getStatu(状态注册表.笔刷悬停元素),
    set: (value) => setStatu(状态注册表.笔刷悬停元素, value)
});
// 计算瓦片尺寸
const tileSize = computed(() => 
  calculateTileSize(realSize.value, uvScale.value, imageAspectRatio.value)
)

// 获取样式计算
const { containerStyle, gridStyle, tileOverlayStyle } = createStyleComputed({
  appData,
  isRepeat,
  tileSize
})

// 获取刷子模式处理器
const { addBrushListeners, removeBrushListeners } = createBrushModeHandlers({
  isBrushMode,
  currentHoverElement,
  appData,
  isRepeat,
  tileSize
})

// 基本功能处理
const toggleMode = () => {
  isRepeat.value = !isRepeat.value
  if (!isRepeat.value) {
    containerRef.value.style.width = '100%'
    containerRef.value.style.height = '100%'
  }
}

const updateUVScale = (e) => {
  uvScale.value = Number(e.target.value)
}

const updateRealSize = (e) => {
  realSize.value = Number(e.target.value)
}


// 修改 toggleBrushMode 函数
const toggleBrushMode = async () => {
    if (!isImageUploaded.value && appData.imagePath) {
        try {
            isLoading.value = true
            const uploadedPath = await uploadToSiyuan(appData.imagePath)
            appData.imagePath = uploadedPath
            isImageUploaded.value = true
        } catch (error) {
            errorMessage.value = '启用笔刷前上传图片失败：' + error.message
            return
        } finally {
            isLoading.value = false
        }
    }
    
    setStatu(状态注册表.笔刷模式, !getStatu(状态注册表.笔刷模式))
    if (getStatu(状态注册表.笔刷模式)) {
        document.body.style.cursor = 'crosshair'
        addBrushListeners()
    } else {
        document.body.style.cursor = 'default'
        removeBrushListeners()
    }
}

// 图片加载处理
const onImageChange = async (file) => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    
    const { dataUrl, width, height } = await $loadImageFile(file)
    
    imageAspectRatio.value = width / height
    const maxDimension = Math.max(width, height)
    uvScale.value = maxDimension / 100
    realSize.value = 1.0
    appData.imagePath = dataUrl
    
  } catch (error) {
    console.error('图片加载错误:', error)
    errorMessage.value = error.message || '图片加载失败，请重试'
    appData.imagePath = ''
  } finally {
    isLoading.value = false
  }
}

// 添加上传错误处理函数
const handleUploadError = (error) => {
  errorMessage.value = error
}

// 监听相关逻辑
watch([realSize, uvScale, isRepeat], () => {
  nextTick(() => {
    drawRulers({
      isRepeat: isRepeat.value,
      horizontalRulerRef: horizontalRulerRef.value,
      verticalRulerRef: verticalRulerRef.value,
      containerRef: containerRef.value,
      realSize: realSize.value,
      uvScale: uvScale.value,
      imageAspectRatio: imageAspectRatio.value
    })
  })
})

onMounted(async () => {
  if (appData.assets && appData.assets.length > 0) {
    try {
      isLoading.value = true
      errorMessage.value = ''
      
      // 从文件系统加载图片
      const file = appData.assets[0].path
      const { dataUrl, width, height } = await loadImageFile(file)
      
      // 设置图片相关参数
      imageAspectRatio.value = width / height
      const maxDimension = Math.max(width, height)
      uvScale.value = maxDimension / 100
      realSize.value = 1.0
      appData.imagePath = dataUrl
      
    } catch (error) {
      console.error('初始图片加载错误:', error)
      errorMessage.value = error.message || '图片加载失败'
      appData.imagePath = ''
    } finally {
      isLoading.value = false
    }
  }
})

onUnmounted(() => {
  removeBrushListeners()
})
</script>

<style scoped>
.container-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-areas: 
    "blank h-ruler"
    "v-ruler main";
  grid-template-columns: 30px 1fr;
  grid-template-rows: 30px 1fr;
}

.container {
  grid-area: main;
  position: relative;
  overflow: hidden;
}

.ruler {
  background: #2c2c2c;
  position: relative;
}

.horizontal-ruler {
  grid-area: h-ruler;
  width: 100%;
  height: 30px;
}

.vertical-ruler {
  grid-area: v-ruler;
  width: 30px;
  height: 100%;
}

.ruler-canvas {
  position: absolute;
  top: 0;
  left: 0;
}

.controls {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 4px;
  color: white;
}

.control-btn {
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.size-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.size-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.size-control input[type="range"] {
  width: 100px;
}

.size-control input[type="number"] {
  width: 60px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 2px 5px;
  border-radius: 3px;
}

.info {
  font-size: 0.9em;
  color: #aaa;
}

.top-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 5;
}

.file-input-label {
  display: inline-block;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-input-label:hover {
  background: rgba(0, 0, 0, 0.8);
}

.file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
}

/* 更新层级关系 */
.container::before {
  z-index: 1;
}

.grid-overlay {
  z-index: 2;
}

.tile-overlay {
  z-index: 3;
}

.controls, .top-controls {
  z-index: 5;
}

.control-btn.active {
  background: rgba(255, 255, 255, 0.4);
}

.file-input-label.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-message {
  color: #ff4444;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 8px;
}
</style>
