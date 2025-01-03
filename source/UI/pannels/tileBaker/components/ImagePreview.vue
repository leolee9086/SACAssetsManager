<template>
  <div class="preview-area" v-show="hasImage">
    <div class="preview-container">
      <div class="preview-item">
        <h3>预览 <span v-if="imageLoadDuration">(加载用时: {{ imageLoadDuration }}ms)</span></h3>
        <div class="canvas-wrapper">
          <canvas ref="previewCanvas"></canvas>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch,nextTick,toRef } from 'vue'

const props = defineProps({
  hasImage: Boolean,
  resultCTX: Object,
  imageLoadDuration: Number,
})
const resultCTX=toRef(props,'resultCTX')

const previewCanvas = ref(null)

// 添加画布尺寸设置
const initCanvas = () => {
  if (previewCanvas.value && props.resultCTX) {
    previewCanvas.value.width = props.resultCTX.width
    previewCanvas.value.height = props.resultCTX.height
  }
}

// 修改 watch 实现
watch(
  () => [resultCTX, props.hasImage],
  
  async ([newCTX, hasImage]) => {

    console.log(newCTX.value, hasImage)
    if (newCTX.value && hasImage && previewCanvas.value) {
      initCanvas()
      await nextTick()

      newCTX.value.updatePreview(previewCanvas.value, {
        width: previewCanvas.value.width,
        height: previewCanvas.value.height,
        smoothing: true,
        quality: 'high'
      })
    }
  },
  { immediate: true, deep: true }
)
</script>

<style scoped>
.preview-area {
  flex: 1;
  display: flex;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 4px;
  overflow: hidden; /* 防止内容溢出 */
}

.preview-container {
  width: 100%;
  min-height: 0; /* 允许容器收缩 */
}

.preview-item {
  height: 100%;
  padding: 20px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
}

.preview-item h3 {
  margin-bottom: 15px;
  color: #333;
  font-size: 1.1em;
  flex: none; /* 防止标题伸缩 */
}

.canvas-wrapper {
  flex: 1;
  overflow: auto; /* 添加滚动条 */
  min-height: 0; /* 允许容器收缩 */
}

.preview-item canvas {
  display: block;
  max-width: 100%;
  height: auto;
  object-fit: contain;
}
</style> 