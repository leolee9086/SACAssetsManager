<template>
  <div class="cc-download-controls">
    <button @click="downloadImage">下载完整图片</button>
    <button @click="downloadUnit">下载最小单元</button>
    <div class="cc-unit-download-options" v-if="showUnitOptions">
      <div class="cc-option-group">
        <label>重复次数:</label>
        <input type="number" v-model="unitRepeat" min="1" max="10" />
      </div>
      <div class="cc-option-group">
        <label>目标宽度(px):</label>
        <input type="number" v-model="targetWidth" min="100" />
      </div>
      <button @click="confirmUnitDownload">确认下载</button>
    </div>
  </div>
</template>

<script setup>
import { usePatternDownload } from '../composables/usePatternDownload.js'
import { watch } from 'vue'

const props = defineProps({
  renderer: {
    type: Object,
    required: true
  },
  symmetryType: {
    type: String,
    required: true
  },
  basis1: {
    type: Object,
    required: true
  },
  basis2: {
    type: Object,
    required: true
  },
  getPatternConfig: {
    type: Function,
    required: true
  }
})

const {
  showUnitOptions,
  unitRepeat,
  targetWidth,
  downloadImage,
  downloadUnit,
  confirmUnitDownload,
  updateState
} = usePatternDownload()

// 监听属性变化并更新状态
watch(
  [
    () => props.renderer,
    () => props.symmetryType,
    () => props.basis1,
    () => props.basis2,
    () => props.getPatternConfig
  ],
  ([renderer, symmetryType, basis1, basis2, getPatternConfig]) => {
    updateState(renderer, symmetryType, basis1, basis2, getPatternConfig)
  },
  { immediate: true }
)
</script> 