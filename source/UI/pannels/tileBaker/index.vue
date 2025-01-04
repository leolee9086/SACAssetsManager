<template>
  <div class="image-processor-test">
    <!-- 左侧处理堆栈 -->
    <div class="processor-stack">
      <div class="global-controls">
        <label class="file-input-button">
          <input 
            type="file" 
            accept="image/*" 
            @change="handleFileUpload"
            ref="fileInput"
          >
          <span class="button-text">选择图片</span>
        </label>
        <div class="control-options">
          <label class="auto-process">
            <input 
              type="checkbox" 
              v-model="autoProcess"
            >
            自动处理
          </label>
          <button 
            @click="applyProcessing" 
            :disabled="!hasImage"
            class="process-button"
          >
            应用处理
          </button>
        </div>
        <button 
          @click="downloadAllImages" 
          :disabled="!hasResult"
          class="download-all-button"
        >
          下载所有步骤图片
        </button>
      </div>

      <!-- 处理步骤列表 -->
      <div class="steps-list">
        <!-- 原始图像步骤 -->
        <image-step-previewer
          name="原始图像"
          :processed="hasImage"
          :source-ctx="currentCTX"
          :thumbnail-size="THUMBNAIL_SIZE"
        >
          <template #controls>
            <button 
              v-if="hasImage"
              class="download-button"
              @click="downloadStepImage(currentCTX, '原始图像')"
            >
              下载图片
            </button>
          </template>
        </image-step-previewer>
        
        <!-- 处理步骤 -->
        <image-step-previewer
          v-for="(step, index) in processingSteps"
          :key="index"
          :name="step.name"
          :processed="step.processed"
          :duration="step.duration"
          :source-ctx="step.ctx"
          :thumbnail-size="THUMBNAIL_SIZE"
        >
          <template #controls>
            <button 
              v-if="step.processed"
              class="download-button"
              @click="downloadStepImage(step.ctx, step.name)"
            >
              下载图片
            </button>
          </template>
        </image-step-previewer>

        <!-- 最终结果步骤 -->
        <image-step-previewer
          name="最终结果"
          :processed="hasResult"
          :source-ctx="resultCTX"
          :thumbnail-size="THUMBNAIL_SIZE"
        >
          <template #controls>
            <button 
              v-if="hasResult"
              class="download-button"
              @click="downloadStepImage(resultCTX, '最终结果')"
            >
              下载图片
            </button>
          </template>
        </image-step-previewer>
      </div>
    </div>

    <!-- 替换原有的预览区域 -->
    <image-preview
      :has-image="hasImage"
      :resultCTX="resultCTX"
    />

    <!-- 调试信息 -->
    <div class="debug-info">
      <p>状态: {{ hasImage ? '已加载图像' : '未加载图像' }}</p>
      <p v-if="hasImage">图像尺寸: {{ canvasWidth }}x{{ canvasHeight }}</p>
      <p>处理步骤数: {{ processingSteps.length }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { createImageCTXFromFile } from './ImageCTX.js'
import ImageStepPreviewer from './components/imageStepPreviewer.vue'
import { useImagePipeline } from './composable/useImagePipeline.js'
import ImagePreview from './components/ImagePreview.vue'
import { useImageDownloader } from './composable/useImageDownloader.js'
// 使用 useImagePipeline composable
const {
  currentCTX,
  processingSteps,
  hasImage,
  hasResult,
  resultCTX,
  initializePipeline,
  executePipeline
} = useImagePipeline()

const { downloadImages, downloadSingleImage } = useImageDownloader()

const fileInput = ref(null)
const canvasWidth = ref(300)
const canvasHeight = ref(300)
const THUMBNAIL_SIZE = 100
const autoProcess = ref(true)

onMounted(() => {
  // 使用 initializePipeline 替代原有的初始化逻辑
  initializePipeline()
})

const updateCanvases = async () => {
  await nextTick()
  
  canvasWidth.value = currentCTX.value.width
  canvasHeight.value = currentCTX.value.height

  if (autoProcess.value) {
    await applyProcessing()
  }
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    currentCTX.value = await createImageCTXFromFile(file)
    hasImage.value = true
    await nextTick()
    await updateCanvases()
  } catch (error) {
    console.error('图像加载失败:', error)
    alert('图像加载失败: ' + error.message)
  }
}

const applyProcessing = async () => {
  try {
    for (const step of processingSteps.value) {
      const result = await executeProcessor(step.name, step.paramValues)
      step.ctx = result
      step.processed = true
    }
  } catch (error) {
    console.error('处理失败:', error)
  }
}

const downloadAllImages = async () => {
  if (!hasResult.value) return
  await downloadImages(currentCTX.value, processingSteps.value, resultCTX.value)
}

const downloadStepImage = (ctx, name) => {
  downloadSingleImage(ctx, name)
}
</script>

<style scoped>
.image-processor-test {
  display: flex;
  padding: 20px;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 600px;
}

.processor-stack {
  flex: 0 0 300px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  border-right: 1px solid #eee;
  padding-right: 20px;
}

.global-controls {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.file-input-button {
  display: block;
  position: relative;
  width: 100%;
  cursor: pointer;
  margin-bottom: 12px;
}

.file-input-button input[type="file"] {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 2;
}

.file-input-button .button-text {
  display: block;
  padding: 10px 16px;
  background-color: #4CAF50;
  color: white;
  text-align: center;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.file-input-button:hover .button-text {
  background-color: #45a049;
}

.control-options {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 12px;
}

.auto-process {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
  cursor: pointer;
}

.process-button {
  flex: 1;
  padding: 8px 16px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.process-button:hover:not(:disabled) {
  background-color: #1976D2;
}

.process-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step-item {
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 4px;
  background-color: #fff;
}

.step-content {
  display: flex;
  gap: 15px;
  align-items: flex-start;
}

.step-info {
  flex: 1;
}

.step-preview {
  flex: 0 0 100px;
  height: 100px;
  border: 1px solid #eee;
  border-radius: 4px;
  overflow: hidden;
}

.thumbnail {
  width: 100px;
  height: 100px;
  object-fit: contain;
  background-color: #f5f5f5;
}

.step-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.step-duration {
  font-size: 0.9em;
  color: #666;
}

.step-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
  color: #666;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #ccc;
}

.status-dot.active {
  background-color: #4CAF50;
}

.preview-area {
  flex: 1;
  display: flex;
  align-items: flex-start;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.preview-container {
  width: 100%;
}

.preview-item {
  padding: 20px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.preview-item h3 {
  margin-bottom: 15px;
  color: #333;
  font-size: 1.1em;
}

.preview-item canvas {
  width: 100%;
  height: auto;
  object-fit: contain;
  border: 1px solid #eee;
  border-radius: 4px;
}

button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  width: 100%;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

button:hover:not(:disabled) {
  background-color: #45a049;
}

.debug-info {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 10px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9em;
}

.control-options {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.auto-process {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: #666;
}

.download-all-button {
  margin-top: 10px;
  width: 100%;
  padding: 8px 16px;
  background-color: #673AB7;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.download-all-button:hover:not(:disabled) {
  background-color: #5E35B1;
}

.download-all-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.download-button {
  margin-top: 10px;
  padding: 6px 12px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.3s;
}

.download-button:hover {
  background-color: #1976D2;
}
</style>