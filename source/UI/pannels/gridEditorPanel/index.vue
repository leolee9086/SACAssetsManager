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

      <!-- 节点�������������������������������置面板 -->
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

      <div class="control-section">
        <h4>对称类型</h4>
        <div class="control-group">
          <span>对称群:</span>
          <select v-model="symmetryType" @change="updateSymmetryType">
            <option value="p1">P1 - 基本平移</option>
            <option value="p2">P2 - 2次旋转</option>
            <option value="pg">PG - 滑移</option>
            <option value="pm">PM - 镜像</option>
            <option value="pgg">PGG - 双滑移</option>
            <option value="pmm">PMM - 双向镜像</option>
            <option value="pmg">PMG - 镜像+滑移</option>
            <option value="p4">P4 - 4次旋转</option>
            <option value="p4m">P4M - 4次旋转+镜像</option>
            <option value="p4g">P4G - 4次旋转+镜像(变体)</option>
            <option value="cm">CM - 菱形中心镜像</option>
            <option value="cmm">CMM - 菱形双向镜像</option>
            <option value="p3">P3 - 3次旋转</option>
            <option value="p3m1">P3M1 - 3次旋转+镜像</option>
            <option value="p6">P6 - 6次旋转</option>
            <option value="p6m">P6M - 6次旋转+镜像</option>
            <option value="p31m">P31M - 三重旋转+镜像</option>
          </select>
        </div>
      </div>

      <div class="control-section">
        <h4>基向量设置</h4>
        <div class="constraint-info">
          <span class="constraint-type">{{ symmetryConstraints[symmetryType].constraints }}</span>
          <span class="constraint-desc">{{ symmetryConstraints[symmetryType].description }}</span>
        </div>

        <!-- 添加六边形控制器 -->
        <div class="control-group" :class="{ 'disabled': symmetryConstraints[symmetryType].constraints !== '六角形' }">
          <span>边长:</span>
          <input type="number" 
                 v-model.number="hexagonSize" 
                 @input="updateHexagonBasis"
                 :disabled="symmetryConstraints[symmetryType].constraints !== '六角形'">
        </div>

        <!-- 正方形制器 -->
        <div class="control-group" :class="{ 'disabled': symmetryConstraints[symmetryType].constraints !== '正方形' }">
          <span>边长:</span>
          <input type="number" v-model.number="squareSize" @input="updateSquareBasis"
            :disabled="symmetryConstraints[symmetryType].constraints !== '正方形'">
        </div>

        <!-- 菱形控制器 -->
        <div :class="{ 'disabled': symmetryConstraints[symmetryType].constraints !== '菱形' }">
          <div class="control-group">
            <span>边长:</span>
            <input type="number" v-model.number="rhombusSize" @input="updateRhombusBasis"
              :disabled="symmetryConstraints[symmetryType].constraints !== '菱形'">
          </div>
          <div class="control-group">
            <span>角度:</span>
            <input type="range" v-model.number="rhombusAngle" min="30" max="150" @input="updateRhombusBasis"
              :disabled="symmetryConstraints[symmetryType].constraints !== '菱形'">
            <span>{{ rhombusAngle }}°</span>
          </div>
        </div>

        <!-- 自由基向量控制 -->
        <div :class="{ 'disabled': symmetryConstraints[symmetryType].constraints !== '自由' }">
          <div class="control-group">
            <span>基向量1:</span>
            <div class="vector-inputs">
              <input type="number" v-model.number="basis1.x" @input="handleBasisInput"
                :disabled="symmetryConstraints[symmetryType].constraints !== '自由'">
              <input type="number" v-model.number="basis1.y" @input="handleBasisInput"
                :disabled="symmetryConstraints[symmetryType].constraints !== '自由'">
            </div>
          </div>
          <div class="control-group">
            <span>基向量2:</span>
            <div class="vector-inputs">
              <input type="number" v-model.number="basis2.x" @input="handleBasisInput"
                :disabled="symmetryConstraints[symmetryType].constraints !== '自由'">
              <input type="number" v-model.number="basis2.y" @input="handleBasisInput"
                :disabled="symmetryConstraints[symmetryType].constraints !== '自由'">
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getStatu, setStatu, 状态注册表 } from '../../../globalStatus/index.js'
import { createGridBrushHandlers } from './gridBrushUtils.js'
import { Vector2 } from '../../../utils/image/textures.js/pattern/geometry-utils.js';
import {
  PatternRenderer,
  getPatternClass,
  symmetryConstraints
} from './patterns.js'
import { validateAndNormalizeBasis, 创建遮罩画布元素 } from './utils.js';
import { createShapeMask } from '../../../utils/canvas/helpers/mask.js';
import { hasRectangularUnit, getRectangularUnit } from '../../../utils/image/textures.js/pattern/recUnit.js';

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
const basis1 = ref({ x: 240, y: 0 })
const basis2 = ref({ x: 0, y: 240 })
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
  // 移除旧的覆盖层
  const oldOverlay = canvas.value.parentElement.querySelector('.overlay-canvas');
  if (oldOverlay) {
    oldOverlay.remove();
  }
  // 将对称群类型转换为小写
  const wallpaperGroup = symmetryType.value.toLowerCase();
  const hasRect = hasRectangularUnit(basis1.value, basis2.value, wallpaperGroup);
  if (!hasRect) return;

  // 获取矩形重复单元的尺寸和变换信息
  const rectUnit = getRectangularUnit(basis1.value, basis2.value, wallpaperGroup);
  if (!rectUnit) return;

  // 创建覆盖层
  const overlayCanvas = 创建遮罩画布元素(width.value,height.value)
  
  const ctx = overlayCanvas.getContext('2d');
  ctx.translate(width.value / 2, height.value / 2);
  // 应用变换并绘制矩形重复单元边界
  ctx.save();
  ctx.rotate(rectUnit.transform.rotation);
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
  ctx.lineWidth = 3;
  // 绘制矩形边界
  ctx.beginPath();
  ctx.rect(
    rectUnit.transform.origin.x,
    rectUnit.transform.origin.y,
    rectUnit.width,
    rectUnit.height
  );
  ctx.stroke();
  ctx.restore()
  // 添加新的覆盖层
  canvas.value.parentElement.appendChild(overlayCanvas);
};
const genGridStyle = (() => {
  let isRendering = false;
  let lastRenderTime = 0;
  const THROTTLE_INTERVAL = 15;
  let pendingRender = null;
  // 添加性能统计对象
  const perfStats = {
    totalCalls: 0,
    totalTime: 0,
    maxTime: 0,
    minTime: Infinity
  };
  // 创建离屏缓冲画布
  let backBufferCanvas = null;
  let backBufferCtx = null;
  // 初始化缓冲区
  const initializeBuffers = () => {
    if (!backBufferCanvas) {
      backBufferCanvas = document.createElement('canvas');
      backBufferCtx = backBufferCanvas.getContext('2d');
    }
    // 确保缓冲区尺寸与显示画布一致
    backBufferCanvas.width = width.value;
    backBufferCanvas.height  =height.value;
  };
  const executeRender = async (imageUrl = null) => {
    const startTime = performance.now();
    perfStats.totalCalls++;
    try {
      // 初始化缓冲区
      initializeBuffers();
      // 清空缓冲区
      backBufferCtx.clearRect(0, 0, width.value, height.value);
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
            const clipMask = createShapeMask(nodeShape.value == "polygon" ? shape : nodeShape.value, size, true, nodeStrokeWidth.value, nodeStrokeColor.value, nodeTransform.value);
            ctx.globalCompositeOperation = 'destination-in';
            ctx.drawImage(clipMask, 0, 0);
            ctx.globalCompositeOperation = 'source-over';
            const strokeMask = createShapeMask(nodeShape.value == "polygon" ? shape : nodeShape.value, size, false, nodeStrokeWidth.value, nodeStrokeColor.value, nodeTransform.value);
            ctx.drawImage(strokeMask, 0, 0);
            processedNodeImage = tempCanvas.toDataURL();
            resolve();
          };
        });
      }
      const PatternClass = getPatternClass(symmetryType.value);
      const pattern = new PatternClass({
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
            rotation: nodeTransform.value.rotation
          },
          fitMode: 'contain'
        } : null,
        fillImage: fillImageUrl.value ? {
          imageUrl: fillImageUrl.value,
          transform: {
            ...fillTransform.value,
            rotation: fillTransform.value.rotation
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
      // 在缓冲区上渲染
      pattern.render(backBufferCtx, {
        width: width.value,
        height: height.value,
        x: width.value / 2,
        y: height.value / 2,
      });
      // 将缓冲区内容复制到显示画布
      if (!renderer.value) {
        renderer.value = {
          canvas: canvas.value,
          ctx: canvas.value.getContext('2d')
        };
      }
      renderer.value.canvas.width = width.value;
      renderer.value.canvas.height = height.value;
      // 一次性将缓冲区内容复制到显示画布
      renderer.value.ctx.clearRect(0, 0, width.value, height.value);
      renderer.value.ctx.drawImage(backBufferCanvas, 0, 0);
      drawSeamlessUnitBox();

    } finally {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      perfStats.totalTime += renderTime;
      perfStats.maxTime = Math.max(perfStats.maxTime, renderTime);
      perfStats.minTime = Math.min(perfStats.minTime, renderTime);
      console.log(`渲染耗时: ${renderTime.toFixed(2)}ms`);
      if (perfStats.totalCalls % 10 === 0) {
        console.log('网格渲染性能统计:', {
          调用次数: perfStats.totalCalls,
          平均渲染时间: `${(perfStats.totalTime / perfStats.totalCalls).toFixed(2)}ms`,
          最长渲染时间: `${perfStats.maxTime.toFixed(2)}ms`,
          最短渲染时间: `${perfStats.minTime.toFixed(2)}ms`
        });
      }
    }
  };

  return async (imageUrl = null) => {
    if (isRendering) {
      pendingRender = imageUrl;
      return;
    }

    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime;

    if (timeSinceLastRender < THROTTLE_INTERVAL) {
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




// 修改统一的 handleBasisInput 函数
const handleBasisInput = (vector, component, value) => {
  // 如果传入了具体的向组件
  if (component && value !== undefined) {
    const newValue = { ...vector };
    newValue[component] = value;
    vector = newValue;
  }

  // 获取当前对称群的约束
  const constraint = symmetryConstraints[symmetryType.value];

  // 对于 p3 群，强制应用六角形约束
  if (symmetryType.value === 'p3') {
    const len = Math.sqrt(basis1.value.x * basis1.value.x + basis1.value.y * basis1.value.y);
    hexagonSize.value = len;
    updateHexagonBasis();
    return;
  }

  // 其他群的约束处理...
  if (!constraint.validateBasis(basis1.value, basis2.value)) {
    const normalized = constraint.normalizeBasis(basis1.value, basis2.value);
    basis1.value = normalized.basis1;
    basis2.value = normalized.basis2;
  }

  genGridStyle();
};

const polygonSettings = ref({
  sides: 6, // 默认6边形
  radius: 20,
  rotation: 0
})

const updatePolygonShape = () => {
  // 确保边数在合理围内
  if (polygonSettings.value.sides < 3) {
    polygonSettings.value.sides = 3
  } else if (polygonSettings.value.sides > 32) {
    polygonSettings.value.sides = 32
  }

  // 确保边数为整数
  polygonSettings.value.sides = Math.floor(polygonSettings.value.sides)

  genGridStyle().catch(console.error)
}

const symmetryType = ref('pmm')
const updateSymmetryType = () => {
  // 添加p31m到需要自动调整的对称群列表中
  if (['p3', 'p6', 'p6m', 'p31m'].includes(symmetryType.value)) {
    const size = Math.sqrt(basis1.value.x * basis1.value.x + basis1.value.y * basis1.value.y);
    hexagonSize.value = size;
    updateHexagonBasis();
  } else {
    genGridStyle();
  }
}



// 在 template 中添加约束提示

// 添加新的响应式状态
const squareSize = ref(40)
const rhombusSize = ref(40)
const rhombusAngle = ref(60)

// 更新基向量的处理函数
const updateSquareBasis = () => {
  basis1.value = { x: squareSize.value, y: 0 }
  basis2.value = { x: 0, y: squareSize.value }
  genGridStyle()
}

const updateRhombusBasis = () => {
  const angle = (rhombusAngle.value * Math.PI) / 180
  basis1.value = { x: rhombusSize.value, y: 0 }
  basis2.value = {
    x: rhombusSize.value * Math.cos(angle),
    y: rhombusSize.value * Math.sin(angle)
  }
  genGridStyle()
}



// 添加六角形控制状态
const hexagonSize = ref(40)

// 修改 updateHexagonBasis 函数
const updateHexagonBasis = () => {
  // 确保 hexagonSize 为正数
  if (hexagonSize.value <= 0) {
    hexagonSize.value = 40; // 设置默认值
  }

  const size = hexagonSize.value;

  // 计算精确的120度角的三角函数值
  const cos120 = -0.5;
  const sin120 = Math.sqrt(3) / 2;

  // ���置基向量
  basis1.value = {
    x: size,
    y: 0
  };

  // 设置第二个基向量,确保与第一个基向量成120度角
  basis2.value = {
    x: size * cos120,
    y: size * sin120
  };

  genGridStyle();
};

// 修改 watch 函数
watch(() => symmetryType.value, (newType) => {
  if (['p3', 'p31m', 'p3m1', 'p6', 'p6m'].includes(newType)) {
    // 保持当前大小或使用默认值
    const currentSize = Math.sqrt(basis1.value.x * basis1.value.x + basis1.value.y * basis1.value.y);
    hexagonSize.value = currentSize || 40;
    updateHexagonBasis();
  }
});

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

.constraint-info {
  margin-bottom: 12px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.constraint-type {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  margin-right: 8px;
  font-size: 0.9em;
}

.constraint-desc {
  font-size: 0.9em;
  color: #aaa;
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.disabled input {
  cursor: not-allowed;
  background-color: rgba(0, 0, 0, 0.1);
}

.disabled span {
  color: #666;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  margin-bottom: 8px;
}

.section-header:hover {
  background: rgba(255, 255, 255, 0.15);
}

.section-header h4 {
  margin: 0;
  font-size: 0.95em;
  font-weight: normal;
}

.toggle-icon {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.control-section {
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 12px;
}

.control-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}
</style>
