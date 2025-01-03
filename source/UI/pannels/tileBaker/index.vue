<template>
  <div class="fn__flex-column editor-container">
    <div class="fn__flex fn__flex-1">
      <!-- 左侧控制面板 -->
      <div class="left-panel">
        <div class="section-title">参数设置</div>
        <div class="panel-content">
          <!-- 参数组,添加折叠功能 -->
          <div v-for="(group, index) in parameterGroups" 
               :key="index" 
               class="control-group">
            <div class="group-header" @click="toggleGroup(index)">
              <h3>{{ group.title }}</h3>
              <span class="toggle-icon">{{ group.expanded ? '−' : '+' }}</span>
            </div>
            <div v-show="group.expanded" class="group-content">
              <div v-for="param in group.params" 
                   :key="param.key" 
                   class="control-item">
                <label>{{ param.label }}</label>
                <template v-if="param.type === 'range'">
                  <input type="range"
                         v-model.number="params[param.key]"
                         :min="param.min"
                         :max="param.max"
                         :step="param.step">
                  <span>{{ params[param.key] }}{{ param.unit || '' }}</span>
                </template>
                <template v-else-if="param.type === 'checkbox'">
                  <input type="checkbox"
                         v-model="params[param.key]">
                </template>
                <select v-else-if="param.type === 'select'"
                  v-model="params[param.key]">
                  <option v-for="opt in param.options" 
                         :key="opt.value" 
                         :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <span>{{ params[param.key] }}{{ param.unit || '' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主预览区域 -->
      <div class="fn__flex fn__flex-1 fn__flex-column editor-main">
        <!-- 顶部工具栏 -->
        <div class="editor-toolbar">
          <div class="toolbar-group fn__flex">
            <label class="toolbar-btn" title="上传原始图">
              <i class="icon">📁</i>
              <span>上传</span>
              <input 
                type="file" 
                accept="image/*" 
                @change="handleDistanceMapUpload" 
                style="display: none;"
              >
            </label>
            <button class="toolbar-btn" title="导出贴图" @click="exportMaps">
              <i class="icon">💾</i>
              <span>导出</span>
            </button>
          </div>

          <!-- 缩放控制 -->
          <div class="zoom-control">
            <input 
              type="range" 
              v-model.number="previewZoom" 
              min="0.2" 
              max="2" 
              step="0.1"
            >
            <span class="zoom-value">{{ Math.round(previewZoom * 100) }}%</span>
          </div>
        </div>

        <!-- 预览区域 -->
        <div class="editor-workspace">
          <div class="preview-container" :style="{ transform: `scale(${previewZoom})` }">
            <div class="preview-item main-preview">
              <canvas ref="mainPreviewCanvas" class="preview-canvas"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧预览面板 -->
      <div class="right-panel">
        <div class="section-title">预览</div>
        <div class="panel-content">
          <div class="preview-list">
            <!-- 原始图预览 -->
            <div class="preview-item" 
                 :class="{ active: currentPreview === 'original' }"
                 @click="switchPreview('original')">
              <h4>原始图</h4>
              <canvas ref="originalDistanceCanvas" class="preview-thumbnail"></canvas>
            </div>
            <!-- 处理后图预览 -->
            <div class="preview-item" 
                 :class="{ active: currentPreview === 'processed' }"
                 @click="switchPreview('processed')">
              <h4>处理后</h4>
              <canvas ref="distanceCanvas" class="preview-thumbnail"></canvas>
            </div>
            <!-- 法线图预览 -->
            <div class="preview-item" 
                 :class="{ active: currentPreview === 'normal' }"
                 @click="switchPreview('normal')">
              <h4>法线图</h4>
              <canvas ref="normalMapCanvas" class="preview-thumbnail"></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { AdvancedTileSeamBaker } from './TileSeamBaker.js'
import { 砖块法线生成器配置 } from '../../electronUI/windows/imageAdjuster/pipelineBuilder.js'

// 添加预览缩放控制
const previewZoom = ref(1) // 默认缩放比例为 1

// 预览画布引用
const originalDistanceCanvas = ref(null)
const distanceCanvas = ref(null)
const baker = ref(null)

// 添加主预览画布引用
const mainPreviewCanvas = ref(null)

// 添加法线图画布引用
const normalMapCanvas = ref(null)

// 参数组配置
const parameterGroups = ref([
  {
    title: '基础设置',
    expanded: true,
    params: [
      { key: 'tileSizeX', label: '砖块尺寸 X', type: 'range', min: 0.5, max: 5, step: 0.1 },
      { key: 'tileSizeY', label: '砖块尺寸 Y', type: 'range', min: 0.5, max: 5, step: 0.1 },
      { key: 'rotation', label: '旋转角度', type: 'range', min: 0, max: 360, step: 1, unit: '°' },
      { key: 'randomOffset', label: '随机偏移', type: 'range', min: 0, max: 0.5, step: 0.01 }
    ]
  },
  {
    title: '砖缝基础',
    expanded: false,
    params: [
      { key: 'seamWidth', label: '砖缝宽度', type: 'range', min: 0.01, max: 1.0, step: 0.01 },
      { key: 'seamVariation', label: '砖缝变化', type: 'range', min: 0, max: 1, step: 0.01 },
      { key: 'seamProfile', label: '砖缝轮廓', type: 'select', 
        options: [
          { value: '1', label: '线性' },
          { value: '2', label: '平方' },
          { value: '3', label: '平方根' }
        ]
      },
      { key: 'seamNoiseFrequency', label: '噪声频率', type: 'range', min: 0.1, max: 10, step: 0.1 }
    ]
  },
  {
    title: '深度调整',
    expanded: false,
    params: [
      { key: 'contrast', label: '对比度', type: 'range', min: 0.1, max: 2.0, step: 0.1 },
      { key: 'edgeSharpness', label: '边缘锐度', type: 'range', min: 0.1, max: 2.0, step: 0.1 },
      { key: 'heightRangeMin', label: '最小深度', type: 'range', min: 0, max: 1, step: 0.01 },
      { key: 'heightRangeMax', label: '最大深度', type: 'range', min: 0, max: 1, step: 0.01 }
    ]
  },
  {
    title: '砖缝细节',
    expanded: false,
    params: [
      { key: 'mortarVariation', label: '砂浆变化', type: 'range', min: 0, max: 1, step: 0.01 },
      { key: 'mortarFrequency', label: '砂浆频率', type: 'range', min: 0.1, max: 20, step: 0.1 },
      { key: 'wearAmount', label: '磨损程度', type: 'range', min: 0, max: 1, step: 0.01 },
      { key: 'wearDetail', label: '磨损细节', type: 'range', min: 1, max: 50, step: 1 }
    ]
  },
  {
    title: '边缘开裂',
    expanded: false,
    params: [
      { key: 'crackWidth', label: '开裂宽度', type: 'range', min: 0, max: 0.2, step: 0.01 },
      { key: 'crackDepth', label: '开裂深度', type: 'range', min: 0, max: 1, step: 0.01 },
      { key: 'crackRandomness', label: '开裂随机度', type: 'range', min: 0, max: 1, step: 0.01 },
      { key: 'crackFrequency', label: '开裂频率', type: 'range', min: 0.1, max: 10, step: 0.1 }
    ]
  },
  {
    title: '角点损坏',
    expanded: false,
    params: [
      { key: 'cornerDamage', label: '损坏程度', type: 'range', min: 0, max: 1, step: 0.01 },
      { key: 'cornerNoiseScale', label: '噪声尺度', type: 'range', min: 0.1, max: 10, step: 0.1 },
      { key: 'cornerFalloff', label: '衰减程度', type: 'range', min: 0, max: 1, step: 0.01 }
    ]
  },
  {
    title: '法线图设置',
    expanded: false,
    params: [
      { key: 'normalStrength', label: '法线强度', type: 'range', min: 0.1, max: 5, step: 0.1 },
      { key: 'normalBlur', label: '预模糊', type: 'range', min: 0, max: 5, step: 0.1 },
      { key: 'seamNormalStrength', label: '砖缝强度', type: 'range', min: 0.1, max: 3.0, step: 0.1 },
      { key: 'normalFlipX', label: 'X轴反转', type: 'checkbox' },
      { key: 'normalFlipY', label: 'Y轴反转', type: 'checkbox' },
      { key: 'normalScale', label: '法线缩放', type: 'range', min: 0.1, max: 2.0, step: 0.1 },
      { key: 'normalBias', label: '法线偏移', type: 'range', min: 0, max: 1, step: 0.1 }
    ]
  },
  {
    title: '法线预处理',
    expanded: false,
    params: [
      { key: 'normalPreprocessInvert', label: '反转高度', type: 'checkbox' },
      { key: 'normalPreprocessContrast', label: '对比度', type: 'range', min: -1, max: 1, step: 0.1 },
      { key: 'normalPreprocessBrightness', label: '亮度', type: 'range', min: -1, max: 1, step: 0.1 },
      { key: 'normalPreprocessSmooth', label: '平滑', type: 'range', min: 0, max: 2, step: 0.1 }
    ]
  }
])

// 折叠切换函数
const toggleGroup = (index) => {
  parameterGroups.value[index].expanded = !parameterGroups.value[index].expanded
}

// 定义处理器接口
const processors = {
  base: {
    name: '基础处理',
    enabled: true,
    expanded: false,
    process: (pixels, params) => {
      // 修正深度映射：确保砖面为白色(1.0)，砖缝为深色
      for (let i = 0; i < pixels.length; i += 4) {
        const depth = pixels[i] / 255
        // 不再反转深度值
        pixels[i] = depth * 255
        pixels[i + 1] = depth * 255
        pixels[i + 2] = depth * 255
      }
      return pixels
    }
  },
  contrast: {
    name: '对比度调整',
    enabled: true,
    expanded: false,
    process: (pixels, params) => {
      const contrast = params.contrast
      for (let i = 0; i < pixels.length; i += 4) {
        const value = pixels[i] / 255
        const adjusted = 0.5 + (value - 0.5) * contrast
        const final = Math.max(0, Math.min(1, adjusted)) * 255
        pixels[i] = final
        pixels[i + 1] = final
        pixels[i + 2] = final
      }
      return pixels
    }
  },
  heightRange: {
    name: '深度范围映射',
    enabled: true,
    expanded: false,
    process: (pixels, params) => {
      const { heightRangeMin, heightRangeMax } = params
      for (let i = 0; i < pixels.length; i += 4) {
        const value = pixels[i] / 255
        const mapped = heightRangeMin + value * (heightRangeMax - heightRangeMin)
        const final = Math.max(0, Math.min(1, mapped)) * 255
        pixels[i] = final
        pixels[i + 1] = final
        pixels[i + 2] = final
      }
      return pixels
    }
  }
}

// 创建处理器堆栈
const processorStack = ref(Object.keys(processors).map(key => ({
  id: key,
  ...processors[key]
})))

// 参数
const params = ref({
  tileSizeX: 2,
  tileSizeY: 2,
  rotation: 0,
  randomOffset: 0.1,
  seamWidth: 0.1,
  seamVariation: 0.3,
  seamProfile: 1,
  seamNoiseFrequency: 2.0,
  contrast: 1.0,
  edgeSharpness: 1.0,
  heightRangeMin: 0.2,
  heightRangeMax: 0.8,
  wearAmount: 0.3,
  wearDetail: 20,
  mortarVariation: 0.4,
  mortarFrequency: 8.0,
  // 边缘开裂参数
  crackWidth: 0.05,        // 开裂宽度
  crackDepth: 0.3,         // 开裂深度
  crackRandomness: 0.5,    // 开裂随机程度
  crackFrequency: 3.0,     // 开裂频率
  // 角点开裂参数
  cornerDamage: 0.3,       // 角点损坏程度
  cornerNoiseScale: 5.0,   // 角点噪声尺度
  cornerFalloff: 0.5,      // 角点衰减
  // 法线图参数
  normalStrength: 1.0,
  normalBlur: 0,
  seamNormalStrength: 1.0,
  normalFlipX: false,
  normalFlipY: false,
  normalScale: 1.0,
  normalBias: 0.5,
  normalPreprocessInvert: false,
  normalPreprocessContrast: 0,
  normalPreprocessBrightness: 0,
  normalPreprocessSmooth: 0
})

// 添加当前预览状态
const currentPreview = ref('processed') // 默认显示处理后的图

// 切换预览函数
const switchPreview = (type) => {
  currentPreview.value = type
  const mainCtx = mainPreviewCanvas.value.getContext('2d')
  mainCtx.clearRect(0, 0, mainPreviewCanvas.value.width, mainPreviewCanvas.value.height)
  
  let sourceCanvas
  switch(type) {
    case 'original':
      sourceCanvas = originalDistanceCanvas.value
      break
    case 'processed':
      sourceCanvas = distanceCanvas.value
      break
    case 'normal':
      sourceCanvas = normalMapCanvas.value
      break
  }
  
  if (sourceCanvas) {
    mainCtx.drawImage(
      sourceCanvas,
      0, 0,
      sourceCanvas.width,
      sourceCanvas.height,
      0, 0,
      mainPreviewCanvas.value.width,
      mainPreviewCanvas.value.height
    )
  }
}

// 初始化
onMounted(async () => {
  try {
    // 初始化画布尺寸
    if (originalDistanceCanvas.value) {
      originalDistanceCanvas.value.width = 256  // 右侧预览尺寸小一些
      originalDistanceCanvas.value.height = 256
    }
    if (distanceCanvas.value) {
      distanceCanvas.value.width = 256
      distanceCanvas.value.height = 256
    }
    if (mainPreviewCanvas.value) {
      mainPreviewCanvas.value.width = 512  // 主预览尺寸大一些
      mainPreviewCanvas.value.height = 512
    }
    if (normalMapCanvas.value) {
      normalMapCanvas.value.width = 256
      normalMapCanvas.value.height = 256
    }

    // 初始化烘焙器
    baker.value = new AdvancedTileSeamBaker()
    console.log('开始初始化 baker...')
    await baker.value.init(mainPreviewCanvas.value)  // 使用主预览画布初始化
    console.log('baker 初始化完成')

    // 等待一帧以确保所有初始化完成
    await new Promise(resolve => requestAnimationFrame(resolve))
    
    console.log('开始首次烘焙...')
    await updateBake()
    console.log('首次烘焙完成')
  } catch (error) {
    console.error('初始化失败:', error)
    console.error('错误堆栈:', error.stack)
  }
})

// 更新烘焙
const updateBake = async () => {
  if (!baker.value) {
    console.warn('Baker not initialized')
    return
  }

  console.log('开始烘焙更新，参数:', params.value)
  try {
    const maps = await baker.value.bake(params.value)
    
    // 更新主预览
    const mainCtx = mainPreviewCanvas.value.getContext('2d')
    const mainImageData = mainCtx.getImageData(0, 0, mainPreviewCanvas.value.width, mainPreviewCanvas.value.height)
    let pixels = mainImageData.data

    // 应用启用的处理器
    for (const processor of processorStack.value) {
      if (processor.enabled) {
        console.log(`应用处理器: ${processor.name}`)
        pixels = processor.process(pixels, params.value)
      }
    }
    
    mainCtx.putImageData(mainImageData, 0, 0)

    // 更新右侧小预览
    const previewCtx = distanceCanvas.value.getContext('2d')
    previewCtx.clearRect(0, 0, distanceCanvas.value.width, distanceCanvas.value.height)
    previewCtx.drawImage(mainPreviewCanvas.value, 0, 0, distanceCanvas.value.width, distanceCanvas.value.height)
    
    // 处理完成后切换到处理后预览
    switchPreview('processed')
    
    console.log('烘焙完成')

    // 生成并更新法线图
    const normalParams = {
      strength: params.value.normalStrength,
      blur: params.value.normalBlur,
      seamStrength: params.value.seamNormalStrength,
      flipX: params.value.normalFlipX,
      flipY: params.value.normalFlipY,
      normalScale: params.value.normalScale,
      normalBias: params.value.normalBias,
      preprocess: {
        invert: params.value.normalPreprocessInvert,
        contrast: params.value.normalPreprocessContrast,
        brightness: params.value.normalPreprocessBrightness,
        smooth: params.value.normalPreprocessSmooth
      }
    }
    
    const normalMap = await 砖块法线生成器配置.处理函数(
      distanceCanvas.value,
      normalParams.strength,
      normalParams.blur,
      normalParams.seamStrength,
      normalParams.flipX,
      normalParams.flipY,
      normalParams.normalScale,
      normalParams.normalBias,
      normalParams.preprocess
    )

    // 更新法线图预览
    const normalCtx = normalMapCanvas.value.getContext('2d')
    normalCtx.clearRect(0, 0, normalMapCanvas.value.width, normalMapCanvas.value.height)
    normalCtx.drawImage(normalMap, 0, 0, normalMapCanvas.value.width, normalMapCanvas.value.height)

  } catch (error) {
    console.error('烘焙更新失败:', error)
    console.error('错误堆栈:', error.stack)
  }
}

// 监听参数变化
watch(params, async () => {
  try {
    await updateBake()
  } catch (error) {
    console.error('参数更新烘焙失败:', error)
  }
}, { deep: true })

// 处理上传
const handleDistanceMapUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    console.log('开始处理上传的图片')
    
    const img = new Image()
    img.src = URL.createObjectURL(file)
    
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })
    
    // 更新原始预览
    const originalCtx = originalDistanceCanvas.value.getContext('2d')
    originalCtx.clearRect(0, 0, originalDistanceCanvas.value.width, originalDistanceCanvas.value.height)
    originalCtx.drawImage(img, 0, 0, originalDistanceCanvas.value.width, originalDistanceCanvas.value.height)
    
    // 更新主预览
    const mainCtx = mainPreviewCanvas.value.getContext('2d')
    mainCtx.clearRect(0, 0, mainPreviewCanvas.value.width, mainPreviewCanvas.value.height)
    mainCtx.drawImage(img, 0, 0, mainPreviewCanvas.value.width, mainPreviewCanvas.value.height)
    
    // 更新GPU纹理并执行烘焙
    if (baker.value) {
      console.log('更新GPU纹理...')
      await baker.value.updateUploadedDistanceTexture(mainPreviewCanvas.value)
      console.log('执行烘焙...')
      await updateBake()
      console.log('烘焙完成')
    }
    
    // 上传完成后切换到原始图预览
    switchPreview('original')
    
    URL.revokeObjectURL(img.src)
  } catch (error) {
    console.error('上传距离图失败:', error)
    console.error('错误堆栈:', error.stack)
  }
}

// 导出贴图
const exportMaps = () => {
  if (!distanceCanvas.value) return
  
  const link = document.createElement('a')
  link.download = 'tile-distance.png'
  link.href = distanceCanvas.value.toDataURL('image/png')
  link.click()
}
</script>

<style scoped>
.editor-container {
  height: 100%;
  background: var(--background-color);
}

.left-panel,
.right-panel {
  width: 300px;
  min-width: 300px;
  background: var(--background-color-2);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
}

.right-panel {
  border-right: none;
  border-left: 1px solid var(--border-color);
}

.section-title {
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 500;
  border-bottom: 1px solid var(--border-color);
}

.panel-content {
  padding: 16px;
}

.editor-main {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.editor-toolbar {
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--border-color);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-color);
  cursor: pointer;
  font-size: inherit;
  color: inherit;
}

.toolbar-btn:hover {
  background: var(--background-color-hover);
}

/* 确保label按钮和普通按钮样式一致 */
label.toolbar-btn {
  margin: 0;
  font-weight: normal;
}

.editor-workspace {
  flex: 1;
  padding: 20px;
  overflow: auto;
  background-image: linear-gradient(45deg, #80808010 25%, transparent 25%),
    linear-gradient(-45deg, #80808010 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #80808010 75%),
    linear-gradient(-45deg, transparent 75%, #80808010 75%);
  background-size: 20px 20px;
  background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
}

.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  transform-origin: center center;
}

.main-preview {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-canvas {
  display: block;
  width: 512px;
  height: 512px;
  background: white;
}

.control-group {
  background: var(--background-color);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.control-group h3 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 500;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.control-item label {
  flex: 1;
  min-width: 100px;
}

.control-item input[type="range"] {
  flex: 2;
}

.control-item span {
  min-width: 40px;
  text-align: right;
}

.zoom-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zoom-value {
  min-width: 60px;
  text-align: center;
  font-size: 13px;
}

/* 处理器列表样式 */
.processor-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.processor-item {
  background: var(--background-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
}

.processor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--background-color-2);
}

.processor-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 4px 0;
}

.toggle-icon {
  font-size: 16px;
  font-weight: bold;
  color: var(--text-color-3);
}

.group-content {
  margin-top: 8px;
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-item {
  background: var(--background-color);
  border: 2px solid transparent;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-item:hover {
  background: var(--background-color-hover);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-item.active {
  border-color: var(--b3-theme-primary);
  background: var(--b3-theme-surface);
}

.preview-item h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--b3-theme-on-surface);
}

.preview-thumbnail {
  width: 100%;
  height: auto;
  border-radius: 4px;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 确保右侧面板有合适的宽度和滚动 */
.right-panel {
  width: 300px;
  min-width: 300px;
  background: var(--b3-theme-background);
  border-left: 1px solid var(--b3-border-color);
  overflow-y: auto;
}

/* 添加复选框样式 */
.control-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  margin: 0;
  cursor: pointer;
}

/* 调整控制项布局 */
.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.control-item label {
  flex: 1;
  min-width: 100px;
}

.control-item input[type="range"] {
  flex: 2;
}

.control-item span {
  min-width: 40px;
  text-align: right;
}
</style>
