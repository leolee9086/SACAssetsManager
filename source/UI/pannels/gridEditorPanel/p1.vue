<template>
  <div class="grid-editor-wrapper">
    <div class="preview-container">
      <div class="grid-preview">
        <canvas v-if="!isBrushMode" ref="canvas" :style="{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)'
        }"></canvas>
      </div>
    </div>

    <div class="controls">
      <div class="control-section">
        <h4>网格设置</h4>
        <div class="preset-buttons">
          <button v-for="preset in presetGridRatios" :key="preset.name" class="preset-btn"
            @click="applyPresetRatio(preset)">
            {{ preset.name }}
          </button>
        </div>
        <div class="control-group">
          <span>基向量1:</span>
          <div class="vector-inputs">
            <input type="number" v-model.number="basis1.x"
              @input="e => handleBasisInput(basis1, 'x', Number(e.target.value))" placeholder="X">
            <input type="number" v-model.number="basis1.y"
              @input="e => handleBasisInput(basis1, 'y', Number(e.target.value))" placeholder="Y">
          </div>
        </div>
        <div class="control-group">
          <span>基向量2:</span>
          <div class="vector-inputs">
            <input type="number" v-model.number="basis2.x"
              @input="e => handleBasisInput(basis2, 'x', Number(e.target.value))" placeholder="X">
            <input type="number" v-model.number="basis2.y"
              @input="e => handleBasisInput(basis2, 'y', Number(e.target.value))" placeholder="Y">
          </div>
        </div>
        <div class="control-group">
          <span>网格线宽:</span>
          <input type="range" :value="lineWidth" @input="updateLineWidth" min="1" max="5" step="0.5">
          <span>{{ lineWidth }}px</span>
        </div>
        <div class="control-group">
          <span>网格颜色:</span>
          <input type="color" :value="lineColor" @input="updateLineColor">
        </div>
        <div class="control-group">
          <span>透明度:</span>
          <input type="range" :value="opacity" @input="updateOpacity" min="0" max="1" step="0.1">
          <span>{{ opacity }}</span>
        </div>
      </div>

      <div class="control-section">
        <div class='fn__flex'>
          <h4>晶格点设置</h4>
          <div class="fn__space fn__flex-1"></div>
          <div class="image-upload">
            <input type="file" ref="nodeFileInput" @change="handleNodeImageUpload" accept="image/*"
              style="display: none">
            <button class="upload-btn" @click="triggerNodeFileInput">
              选择晶格点图片
            </button>
          </div>
        </div>
        <div class="control-group">
          <span>点形状:</span>
          <select v-model="nodeShape" @change="updateNodeShape">
            <option value="circle">圆形</option>
            <option value="square">正方形</option>
            <option value="rectangle">矩形</option>
            <option value="hexagon">六边形</option>
            <option value="triangle">三角形</option>
            <option value="star">五角星</option>
            <option value="diamond">菱形</option>
            <option value="octagon">八边形</option>
            <option value="ellipse">椭圆形</option>
            <option value="cross">十字形</option>
            <option value="arrow">箭头</option>
            <option value="heart">心形</option>
            <option value="cloud">云形</option>
            <option value="polygon">正多边形</option>
          </select>
        </div>
        <div class="image-controls">

          <div class="transform-controls">
            <div class="control-group">
              <span>缩放:</span>
              <input type="range" :value="nodeTransform.scale" @input="updateNodeTransform" min="0.1" max="2"
                step="0.1">
              <span>{{ nodeTransform.scale.toFixed(1) }}</span>
            </div>
            <div class="control-group">
              <span>旋转:</span>
              <input type="range" :value="nodeTransform.rotation" @input="updateNodeTransform" min="0" max="360"
                step="1">
              <span>{{ nodeTransform.rotation }}°</span>
            </div>
            <div class="control-group">
              <span>位移:</span>
              <div class="vector-inputs">
                <input type="number" v-model.number="nodeTransform.translate.x" @input="updateNodeTransform"
                  placeholder="X">
                <input type="number" v-model.number="nodeTransform.translate.y" @input="updateNodeTransform"
                  placeholder="Y">
              </div>
            </div>
          </div>
          <div class="control-group" v-if="nodeShape === 'polygon'">
            <span>边数:</span>
            <input type="range" v-model.number="polygonSettings.sides" @input="updatePolygonShape" min="3" max="32"
              step="1">
            <span>{{ polygonSettings.sides }}</span>
          </div>
        </div>
        <div class="control-group">
          <span>描边宽度:</span>
          <input type="range" :value="nodeStrokeWidth" @input="updateNodeStroke" min="0" max="10" step="0.5">
          <span>{{ nodeStrokeWidth }}px</span>
        </div>

        <div class="control-group">
          <span>描边颜色:</span>
          <input type="color" :value="nodeStrokeColor" @input="updateNodeStroke">
        </div>
      </div>

      <div class="control-section">
        <h4>填充图片</h4>
        <div class="image-controls">
          <div class="image-upload">
            <input type="file" ref="fillFileInput" @change="handleFillImageUpload" accept="image/*"
              style="display: none">
            <button class="upload-btn" @click="triggerFillFileInput">
              选择填充图片
            </button>
          </div>
          <div class="transform-controls">
            <div class="control-group">
              <span>缩放:</span>
              <input type="range" :value="fillTransform.scale" @input="updateFillTransform" min="0.1" max="2"
                step="0.1">
              <span>{{ fillTransform.scale.toFixed(1) }}</span>
            </div>
            <div class="control-group">
              <span>旋转:</span>
              <input type="range" :value="fillTransform.rotation" @input="updateFillTransform" min="0" max="360"
                step="1">
              <span>{{ fillTransform.rotation }}°</span>
            </div>
            <div class="control-group">
              <span>位移:</span>
              <div class="vector-inputs">
                <input type="number" v-model.number="fillTransform.translate.x" @input="updateFillTransform"
                  placeholder="X">
                <input type="number" v-model.number="fillTransform.translate.y" @input="updateFillTransform"
                  placeholder="Y">
              </div>
            </div>
          </div>
        </div>
      </div>

      <button class="apply-btn" @click="applyGrid">应用设置</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getStatu, setStatu, 状态注册表 } from '../../../globalStatus/index.js'
import { createGridBrushHandlers } from './gridBrushUtils.js'
import { Vector2 } from '../../../utils/image/textures.js/pattern/geometry-utils.js';
import { PatternRenderer } from '../../../utils/image/textures.js/pattern/index.js'
import { P1ImagePattern, calculateSeamlessTilingRange } from '../../../utils/image/textures.js/pattern/p1Image.js'
import { validateAndNormalizeBasis } from './utils.js';
import { createShapeMask } from '../../../utils/canvas/helpers/mask.js';
const gridSize = ref(20)
const lineWidth = ref(1)
const lineColor = ref('#cccccc')
const opacity = ref(0.5)
const width = ref(300)
const height = ref(300)

const isBrushMode = computed({
  get: () => getStatu(状态注册表.笔刷模式),
  set: (value) => setStatu(状态注册表.笔刷模式, value)
})

const currentHoverElement = computed({
  get: () => getStatu(状态注册表.笔刷悬停元素),
  set: (value) => setStatu(状态注册表.笔刷悬停元素, value)
})

const { addBrushListeners, removeBrushListeners } = createGridBrushHandlers({
  isBrushMode,
  currentHoverElement,
  gridSize,
  lineWidth,
  lineColor,
  opacity
})


const renderer = ref(null)
const canvas = ref(null)
const basis1 = ref({ x: 20, y: 0 })
const basis2 = ref({ x: 0, y: 20 })

const fileInput = ref(null)
const selectedFileName = ref('')
const selectedImageUrl = ref('')

const nodeImageUrl = ref('')
const fillImageUrl = ref('')
const nodeTransform = ref({
  scale: 1,
  rotation: 0,
  translate: { x: 0, y: 0 }
})
const fillTransform = ref({
  scale: 1,
  rotation: 0,
  translate: { x: 0, y: 0 }
})

const nodeFileInput = ref(null)
const fillFileInput = ref(null)



const drawSeamlessUnitBox = () => {
  if (!canvas.value) return;

  // 创建一个覆盖层画布
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = width.value;
  overlayCanvas.height = height.value;
  overlayCanvas.style.position = 'absolute';
  overlayCanvas.style.left = '50%';
  overlayCanvas.style.top = '50%';
  overlayCanvas.style.transform = 'translate(-50%, -50%)';
  overlayCanvas.style.pointerEvents = 'none'; // 确保不影响下层交互

  const ctx = overlayCanvas.getContext('2d');

  const b1 = new Vector2(basis1.value.x, basis1.value.y);
  const b2 = new Vector2(basis2.value.x, basis2.value.y);

  const tilingRange = calculateSeamlessTilingRange(
    b1,
    b2,
    width.value,
    height.value
  );

  ctx.translate(width.value / 2, height.value / 2);

  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.rect(
    -tilingRange.actualWidth / 2,
    -tilingRange.actualHeight / 2,
    tilingRange.actualWidth,
    tilingRange.actualHeight
  );
  ctx.stroke();

  // 移除旧的覆盖层(如果存在)
  const oldOverlay = canvas.value.parentElement.querySelector('.overlay-canvas');
  if (oldOverlay) {
    oldOverlay.remove();
  }

  // 添加新的覆盖层
  overlayCanvas.classList.add('overlay-canvas');
  canvas.value.parentElement.appendChild(overlayCanvas);
};

const genGridStyle = (() => {
  let isRendering = false; // 异步锁
  let lastRenderTime = 0; // 上次渲染时间
  const THROTTLE_INTERVAL = 15; // 节流间隔(ms)
  let pendingRender = null; // 待执行的渲染任务

  const executeRender = async (imageUrl = null) => {
    if (renderer.value) {
      renderer.value.clear();
    }

    let processedNodeImage = null;
    if (nodeImageUrl.value) {
      const img = new Image();
      img.src = nodeImageUrl.value;

      await new Promise((resolve) => {
        img.onload = () => {
          const tempCanvas = document.createElement('canvas');
          const size = Math.max(img.width, img.height);
          tempCanvas.width = size;
          tempCanvas.height = size;
          const ctx = tempCanvas.getContext('2d');

          ctx.drawImage(img,
            (size - img.width) / 2,
            (size - img.height) / 2,
            img.width,
            img.height
          );

          const shape = {
            type: 'polygon',
            sides: polygonSettings.value.sides
          }
          const clipMask = createShapeMask(nodeShape.value=="polygon"?shape:nodeShape.value, size, true, nodeStrokeWidth.value, nodeStrokeColor.value, nodeTransform.value);
          ctx.globalCompositeOperation = 'destination-in';
          ctx.drawImage(clipMask, 0, 0);

          ctx.globalCompositeOperation = 'source-over';
          const strokeMask = createShapeMask(nodeShape.value=="polygon"?shape:nodeShape.value, size, false, nodeStrokeWidth.value, nodeStrokeColor.value, nodeTransform.value);
          ctx.drawImage(strokeMask, 0, 0);

          processedNodeImage = tempCanvas.toDataURL();
          resolve();
        };
      });
    }

    const pattern = new P1ImagePattern({
      lattice: {
        basis1: new Vector2(basis1.value.x, basis1.value.y),
        basis2: new Vector2(basis2.value.x, basis2.value.y),
        shape: 'parallelogram',
        clipMotif: true
      },
      nodeImage: processedNodeImage ? {
        imageUrl: processedNodeImage,
        transform: {
          ...nodeTransform.value,
          rotation: (nodeTransform.value.rotation * Math.PI) / 180
        },
        fitMode: 'contain'
      } : null,
      fillImage: fillImageUrl.value ? {
        imageUrl: fillImageUrl.value,
        transform: {
          ...fillTransform.value,
          rotation: (fillTransform.value.rotation * Math.PI) / 180
        },
        fitMode: 'contain'
      } : null,
      render: {
        backgroundColor: 'transparent',
        showGrid: true,
        gridStyle: {
          color: lineColor.value,
          width: lineWidth.value,
          dash: []
        },
        scale: 1,
        smoothing: true
      }
    });

    await pattern.loadImages();

    if (!renderer.value) {
      renderer.value = {
        canvas: canvas.value,
        ctx: canvas.value.getContext('2d')
      };
    }

    renderer.value.canvas.width = width.value;
    renderer.value.canvas.height = height.value;
    renderer.value.ctx.clearRect(0, 0, width.value, height.value);

    pattern.render(renderer.value.ctx, {
      width: width.value,
      height: height.value,
      x: width.value / 2,
      y: height.value / 2,
    });

    drawSeamlessUnitBox();
  };

  return async (imageUrl = null) => {
    // 如果正在渲染，存储新的渲染请求
    if (isRendering) {
      pendingRender = imageUrl;
      return;
    }

    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime;

    if (timeSinceLastRender < THROTTLE_INTERVAL) {
      // 如果距离上次渲染时间太短，延迟执行
      if (!pendingRender) {
        pendingRender = imageUrl;
        setTimeout(async () => {
          const renderImage = pendingRender;
          pendingRender = null;
          isRendering = true;
          try {
            await executeRender(renderImage);
          } finally {
            isRendering = false;
            lastRenderTime = Date.now();
          }
        }, THROTTLE_INTERVAL - timeSinceLastRender);
      }
      return;
    }

    // 直接执行渲染
    isRendering = true;
    try {
      await executeRender(imageUrl);
    } finally {
      isRendering = false;
      lastRenderTime = Date.now();
    }
  };
})();

const handleResize = () => {
  if (canvas.value) {
    const container = canvas.value.parentElement;
    width.value = container.clientWidth;
    height.value = container.clientHeight;

    genGridStyle();
  }
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
  handleResize();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (selectedImageUrl.value) {
    URL.revokeObjectURL(selectedImageUrl.value);
  }
});


const updateLineWidth = (e) => {

  lineWidth.value = Number(e.target.value)
  genGridStyle()

}

const updateLineColor = (e) => {

  lineColor.value = e.target.value
  genGridStyle()

}

const updateOpacity = (e) => {

  opacity.value = Number(e.target.value)
  genGridStyle()

}

const applyGrid = () => {
  emit('update', {
    gridSize: gridSize.value,
    lineWidth: lineWidth.value,
    lineColor: lineColor.value,
    opacity: opacity.value
  })
}

const emit = defineEmits(['update'])

const updateDimensions = () => {
  const container = canvas.value?.closest('.grid-preview');
  if (container) {
    width.value = container.clientWidth;
    height.value = container.clientHeight;
  }
}

const resizeObserver = new ResizeObserver(entries => {
  for (const entry of entries) {
    width.value = entry.contentRect.width
    height.value = entry.contentRect.height
    if (renderer.value) {
      renderer.value.width = width.value
      renderer.value.height = height.value
    }
  }
})

const triggerNodeFileInput = () => {
  nodeFileInput.value.click()
}

const handleNodeImageUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    nodeImageUrl.value = URL.createObjectURL(file)
    genGridStyle().catch(console.error);
  }
}

const updateNodeTransform = (e) => {
  const target = e.target;
  if (target.type === 'range') {
    if (target.parentElement.querySelector('span').textContent.includes('缩放')) {
      nodeTransform.value.scale = Number(target.value);
    } else if (target.parentElement.querySelector('span').textContent.includes('旋转')) {
      nodeTransform.value.rotation = Number(target.value);
    }
  }
  genGridStyle();
}

const triggerFillFileInput = () => {
  fillFileInput.value.click()
}

const handleFillImageUpload = (event) => {
  const file = event.target.files[0]
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
    genGridStyle()
  }
}

const updateFillTransform = (e) => {
  const target = e.target;
  if (target.type === 'range') {
    if (target.parentElement.querySelector('span').textContent.includes('缩放')) {
      fillTransform.value.scale = Number(target.value);
    } else if (target.parentElement.querySelector('span').textContent.includes('旋转')) {
      fillTransform.value.rotation = Number(target.value);
    }
  }
  genGridStyle();
}

onMounted(() => {
  const container = canvas.value?.closest('.grid-preview')
  if (container) {
    width.value = container.offsetWidth
    height.value = container.offsetHeight
    renderer.value = new PatternRenderer(width.value, height.value)

    if (!isBrushMode.value) {
      renderer.value.canvas.style.position = 'absolute'
      renderer.value.canvas.style.left = '50%'
      renderer.value.canvas.style.top = '50%'
      renderer.value.canvas.style.transform = 'translate(-50%, -50%)'
      container.appendChild(renderer.value.canvas)
    }
    
    resizeObserver.observe(container)
  }
})

onUnmounted(() => {
  removeBrushListeners();
  resizeObserver.disconnect();
  window.removeEventListener('resize', updateDimensions);
  if (selectedImageUrl.value) {
    URL.revokeObjectURL(selectedImageUrl.value)
  }
});



const nodeShape = ref('circle')
const updateNodeShape = () => {
  genGridStyle().catch(console.error);
}

const nodeStrokeWidth = ref(1)
const nodeStrokeColor = ref('#000000')

const updateNodeStroke = (e) => {
  const target = e.target
  if (target.type === 'range') {
    nodeStrokeWidth.value = Number(target.value)
  } else if (target.type === 'color') {
    nodeStrokeColor.value = target.value
  }
  genGridStyle()
}

const presetGridRatios = [
  { name: '正方形', basis1: { x: 20, y: 0 }, basis2: { x: 0, y: 20 } },
  { name: '菱形', basis1: { x: 20, y: 20 }, basis2: { x: -20, y: 20 } },
  { name: '1:2矩形', basis1: { x: 20, y: 0 }, basis2: { x: 0, y: 40 } },
  { name: '六角形', basis1: { x: 20, y: 0 }, basis2: { x: 10, y: 17.32 } }, // sqrt(3)/2 ≈ 0.866
  { name: '2:1矩形', basis1: { x: 40, y: 0 }, basis2: { x: 0, y: 20 } }
]

const applyPresetRatio = (preset) => {
  const normalizedBasis1 = validateAndNormalizeBasis(preset.basis1);
  const normalizedBasis2 = validateAndNormalizeBasis(preset.basis2);

  basis1.value = normalizedBasis1;
  basis2.value = normalizedBasis2;

  genGridStyle();
}


// 为输入框加验证
const handleBasisInput = (vector, component, value) => {
  const newValue = { ...vector.value };
  newValue[component] = value;

  const normalized = validateAndNormalizeBasis(newValue);
  vector.value = normalized;

  genGridStyle().catch(console.error);
};

const polygonSettings = ref({
  sides: 6, // 默认6边形
  radius: 20,
  rotation: 0
})

const updatePolygonShape = () => {
  // 确保边数在合理范围内
  if (polygonSettings.value.sides < 3) {
    polygonSettings.value.sides = 3
  } else if (polygonSettings.value.sides > 32) {
    polygonSettings.value.sides = 32
  }

  // 确保边数为整数
  polygonSettings.value.sides = Math.floor(polygonSettings.value.sides)

  genGridStyle().catch(console.error)
}

</script>

<style scoped>
.grid-editor-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.preview-container {
  width: 100%;
  height: 100%;
  background: #fff;
  overflow: hidden;
}

.grid-preview {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(0, 0, 0, 0.7);
  padding: 15px;
  border-radius: 4px;
  color: white;
  z-index: 5;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-group span {
  font-size: 0.9em;
  min-width: 80px;
}

.control-group input[type="range"] {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  height: 6px;
  -webkit-appearance: none;
}

.control-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: white;
  border-radius: 50%;
  cursor: pointer;
}

.control-group input[type="color"] {
  width: 40px;
  height: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  padding: 0;
}

.control-group span:last-child {
  min-width: 45px;
  text-align: right;
  font-size: 0.85em;
  color: #aaa;
}

.apply-btn {
  margin-top: auto;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 0.9em;
}

.apply-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.control-btn {
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 0.9em;
  margin-bottom: 10px;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.control-btn.active {
  background: rgba(255, 255, 255, 0.4);
}

.control-section {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.control-section h4 {
  margin: 0 0 10px 0;
  font-size: 0.9em;
  color: #ddd;
}

.vector-inputs {
  display: flex;
  gap: 8px;
  flex: 1;
}

.vector-inputs input {
  width: 50%;
  padding: 4px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  color: white;
}

select {
  flex: 1;
  padding: 4px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  color: white;
}

.controls {
  width: 320px;
}

.image-upload {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.upload-btn {
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 3px;
  color: white;
  cursor: pointer;
  font-size: 0.9em;
  transition: background 0.2s;
}

.upload-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.file-name {
  font-size: 0.85em;
  color: #aaa;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.image-preview {
  margin-top: 8px;
  width: 100%;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.control-group select {
  flex: 1;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  color: white;
  cursor: pointer;
}

.control-group select option {
  background: #333;
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.preset-btn {
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  color: white;
  cursor: pointer;
  font-size: 0.9em;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.preset-btn:active {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(0.98);
}
</style>
