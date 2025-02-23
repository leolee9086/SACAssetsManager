<template>
  <div class="fn__flex-column editor-container">
    <div class="fn__flex fn__flex-1">
      <!-- 左侧工具栏 -->
      <div class="tools-bar">
        <div class="tool-group">
          <div class="tool-item" :class="{ active: currentTool === 'grid' }" @click="currentTool = 'grid'">
            <i class="icon">⊞</i>
            <span>网格</span>
          </div>
          <div class="tool-item" :class="{ active: currentTool === 'node' }" @click="currentTool = 'node'">
            <i class="icon">◆</i>
            <span>节点</span>
          </div>
          <div class="tool-item" :class="{ active: currentTool === 'symmetry' }" @click="currentTool = 'symmetry'">
            <i class="icon">↔</i>
            <span>对称</span>
          </div>
        </div>
      </div>

      <!-- 左侧控制面板 -->
      <div class="left-panel">
        <div class="section-title">{{ getPanelTitle }}</div>
        <div class="panel-content">
          <template v-if="currentTool === 'grid'">
            <GridControls v-model:lineWidth="lineWidth" v-model:lineColor="lineColor" v-model:opacity="opacity" />
          </template>
          <template v-if="currentTool === 'node'">
            <NodeStyleControls v-model:nodeShape="nodeShape" v-model:nodeTransform="nodeTransform"
              v-model:nodeStrokeWidth="nodeStrokeWidth" v-model:nodeStrokeColor="nodeStrokeColor"
              v-model:polygonSettings="polygonSettings" @nodeImageUpload="handleNodeImageUpload"
              @update="() => updateRender()" />
          </template>
          <template v-if="currentTool === 'symmetry'">
            <SymmetryControls v-model="symmetryType" @update:modelValue="updateSymmetryType" />
          </template>
        </div>
      </div>

      <!-- 中间预览区域 -->
      <div class="fn__flex fn__flex-1 fn__flex-column canvas-wrapper">
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
      </div>

      <!-- 右侧属性面板 -->
      <div class="properties-panel">
        <FillImageControls v-model="fillTransform" @imageUpload="handleFillImageUpload" />
        <BasisControls :symmetryType="symmetryType" :patternName="'main'" />
        <DownloadControls :renderer="renderer" :symmetryType="symmetryType" :basis1="basis1" :basis2="basis2"
          :getPatternConfig="getPatternConfig" />
      </div>
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
import { mergePatternAndNode, usePatternStateByName } from './composables/usePatternState.js'

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

const updateRender = () => {
  genGridStyle(mergePatternAndNode(getPatternConfig(), {
    nodeImageUrl,
    nodeTransform,
    polygonSettings,
    nodeShape,
    nodeStrokeWidth,
    nodeStrokeColor,
    processedNodeImage
  }))
}
const handleNodeImageUpload = (file) => {
  if (file) {
    nodeImageUrl.value = URL.createObjectURL(file)
    updateRender()
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
    updateRender()

  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
  // 当没有文件时，创建一个包含数字"6"的canvas作为默认图片
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 100
  canvas.height = 100
  ctx.fillStyle = 'black'
  ctx.font = '90px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('6', canvas.width / 2, canvas.height / 2)
  canvas.toBlob((blob) => {
    fillImageUrl.value = URL.createObjectURL(blob)
    genGridStyle(getPatternConfig()).catch(console.error)
  })

})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (selectedImageUrl.value) {
    URL.revokeObjectURL(selectedImageUrl.value)
  }
})

// 添加新的响应式数据
const currentTool = ref('grid')

// 添加计算属性获取面板标题
const getPanelTitle = computed(() => {
  const titles = {
    grid: '网格设置',
    node: '节点设置',
    symmetry: '对称设置'
  }
  return titles[currentTool.value] || ''
})

</script>

<style scoped>
.editor-container {
  height: 100%;
  width: 100%;
}

/* 工具栏样式 */
.tools-bar {
  width: 80px;
  min-width: 80px;
  background: var(--cc-theme-surface);
  border-right: 1px solid var(--cc-border-color);
  display: flex;
  flex-direction: column;
  padding: 12px 0;
}

.tool-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.tool-item:hover {
  background-color: var(--cc-theme-surface-hover);
}

.tool-item.active {
  background-color: var(--cc-theme-surface-hover);
  position: relative;
}

.tool-item.active::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background-color: var(--cc-theme-primary);
}

/* 左侧面板样式 */
.left-panel {
  width: 280px;
  min-width: 280px;
  background: var(--cc-theme-surface);
  border-right: 1px solid var(--cc-border-color);
  display: flex;
  flex-direction: column;
}

.section-title {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 500;
  border-bottom: 1px solid var(--cc-border-color);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 中间预览区域样式 */
.canvas-wrapper {
  position: relative;
  background: #f0f0f0;
  overflow: hidden;
}

.cc-preview-container {
  flex: 1;
  position: relative;
}

.cc-grid-preview {
  width: 100%;
  height: 100%;
  position: relative;
}

/* 右侧属性面板样式 */
.properties-panel {
  width: 280px;
  min-width: 280px;
  padding: var(--cc-space-md);
  background: var(--cc-theme-surface);
  border-left: 1px solid var(--cc-border-color);
  overflow-y: auto;
}
</style>
