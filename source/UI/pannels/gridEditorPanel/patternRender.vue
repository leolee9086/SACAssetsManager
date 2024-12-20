<template>
  <div class="cc-grid-editor-wrapper">
    <div class="cc-preview-container">
      <div class="cc-grid-preview">
        <canvas v-if="!isBrushMode" ref="canvas" :style="{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        }"></canvas>
      </div>
    </div>
    <div class="cc-controls">
      <GridControls v-model:lineWidth="lineWidth" v-model:lineColor="lineColor" v-model:opacity="opacity" />
      <NodeStyleControls v-model:nodeShape="nodeShape" v-model:nodeTransform="nodeTransform"
        v-model:nodeStrokeWidth="nodeStrokeWidth" v-model:nodeStrokeColor="nodeStrokeColor"
        v-model:polygonSettings="polygonSettings" @nodeImageUpload="handleNodeImageUpload" @update="() => genGridStyle(getPatternConfig())" />
      <SymmetryControls v-model="symmetryType" @update:modelValue="updateSymmetryType" />
      <FillImageControls v-model="fillTransform" @imageUpload="handleFillImageUpload" />
      <BasisControls 
        :symmetryType="symmetryType"
        :patternName="'main'"
      />
      <DownloadControls 
        :renderer="renderer"
        :symmetryType="symmetryType"
        :basis1="basis1"
        :basis2="basis2"
        :getPatternConfig="getPatternConfig"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getStatu, setStatu, 状态注册表 } from '../../../globalStatus/index.js'
import { useLineStyle } from './lineState.js'
import { useNodeImage } from './nodeState.js'
import { useCanvasRenderer } from './composables/useCanvasRenderer.js'
import GridControls from './GridControls.vue'
import NodeStyleControls from './NodeStyleControls.vue'
import SymmetryControls from './SymmetryControls.vue'
import BasisControls from './components/BasisControls.vue'
import FillImageControls from './components/FillImageControls.vue'
import DownloadControls from './components/DownloadControls.vue'
import {  usePatternStateByName } from './composables/usePatternState.js'

const { lineWidth, lineColor, opacity } = useLineStyle()

// 使用抽离的画布渲染逻辑
const {
  canvas,
  renderer,
  genGridStyle,
  handleResize
} = useCanvasRenderer()

const isBrushMode = computed({
  get: () => getStatu(状态注册表.笔刷模式),
  set: (value) => setStatu(状态注册表.笔刷模式, value)
})

const {
  basis1,
  basis2,
  symmetryType,
  fillImageUrl,
  fillTransform,
  handleBasisInput,
  updateSymmetryType,
  getPatternConfig
} = usePatternStateByName({ 
  name: 'main',
  genGridStyle 
})

const {
  nodeImageUrl,
  nodeTransform,
  polygonSettings,
  nodeShape,
  nodeStrokeWidth,
  nodeStrokeColor,
  processedNodeImage
} = useNodeImage()

const handleNodeImageUpload = (file) => {
  if (file) {
    nodeImageUrl.value = URL.createObjectURL(file)
    console.log(getPatternConfig())
    genGridStyle(getPatternConfig()).catch(console.error)
  }
}

const handleFillImageUpload = (file) => {
  if (file) {
    if (fillImageUrl.value) {
      URL.revokeObjectURL(fillImageUrl.value)
    }
    fillImageUrl.value = URL.createObjectURL(file)
    fillTransform.value = {
      scale: 1,
      rotation: 0,
      translate: { x: 0, y: 0 }
    }
    genGridStyle(getPatternConfig())
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (selectedImageUrl.value) {
    URL.revokeObjectURL(selectedImageUrl.value)
  }
})

</script>


