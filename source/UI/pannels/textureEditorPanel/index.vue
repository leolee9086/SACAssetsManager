<template>
  <div ref="container" class="canvas-container">
    <v-stage :config="stageConfig" ref="stage">
      <!-- 使用网格子组件 -->
      <grid-layer
        ref="gridLayerComponent"
        :stageWidth="stageConfig.width"
        :stageHeight="stageConfig.height"
        :gridSpacing="gridSpacing"
        :gridExtent="gridExtent"
        :gridPrecision="gridPrecision"
      />
      
      <!-- 使用光栅图像子组件，仅在不显示平铺晶格时显示 -->
      <raster-layer
        v-show="!showTiledLattice"
        ref="rasterLayerComponent"
        :stageWidth="stageConfig.width"
        :stageHeight="stageConfig.height"
        :rasterImages="rasterImages"
        :imageSize="computedImageSize"
        :angleIncrement="angleIncrement"
        :positionOffset="computedPositionOffset"
        :blendMode="blendMode"
        :clipToUnit="clipToUnit"
        :geoms="geoms"
        @imageSelect="handleImageSelect"
        @imageHover="handleImageHover"
      />
      
      <!-- 使用几何图形子组件 -->
      <geom-layer
        ref="geomLayerComponent"
        :stageWidth="stageConfig.width"
        :stageHeight="stageConfig.height"
        :geoms="geoms"
      />
      
      <!-- 添加晶格向量图层 -->
      <lattice-vector-layer
        ref="latticeVectorLayerComponent"
        :stageWidth="stageConfig.width"
        :stageHeight="stageConfig.height"
        :latticeVectors="latticeVectors"
        v-if="showLatticeVectors"
      />
      
      <!-- 添加平铺晶格图层 -->
      <tiled-lattice-layer
        ref="tiledLatticeLayerComponent"
        :stageWidth="stageConfig.width"
        :stageHeight="stageConfig.height"
        :rasterImages="rasterImages"
        :latticeVectors="latticeVectors"
        :tilingExtent="calculatedTilingExtent"
        :blendMode="blendMode"
        :clipToUnit="clipToUnit"
        :geoms="geoms"
        :useLowDetailMode="useLowDetailMode"
        :seamlessUnit="seamlessUnit"
        :currentScale="canvasScale"
        v-if="showTiledLattice"
      />
      
      <!-- 添加无缝单元图层 -->
      <seamless-unit-layer
        ref="seamlessUnitLayerComponent"
        :stageWidth="stageConfig.width"
        :stageHeight="stageConfig.height"
        :seamlessUnit="seamlessUnit"
        v-if="showSeamlessUnit"
      />
    </v-stage>
    
    <!-- 控制面板 -->
    <div class="controls-panel">
      <div class="control-group">
        <label>画布缩放:</label>
        <input type="range" v-model.number="canvasScale" min="10" max="100" step="5" />
        <span>{{ canvasScale }}%</span>
      </div>
      
      <div class="control-group">
        <label>图像大小:</label>
        <input type="range" v-model.number="imageSizePercent" min="10" max="10000" step="10" />
        <span>{{ imageSizePercent }}%</span>
      </div>
      
      <div class="control-group">
        <label>角度增量:</label>
        <input type="range" v-model.number="angleIncrement" min="0" max="360" step="5" />
        <span>{{ angleIncrement }}°</span>
      </div>
      
      <div class="control-group">
        <label>内部坐标偏移X:</label>
        <input type="range" v-model.number="positionOffsetPercent.x" min="-1000" max="1000" step="5" />
        <span>{{ positionOffsetPercent.x }}%</span>
      </div>
      
      <div class="control-group">
        <label>内部坐标偏移Y:</label>
        <input type="range" v-model.number="positionOffsetPercent.y" min="-1000" max="1000" step="5" />
        <span>{{ positionOffsetPercent.y }}%</span>
      </div>
      
      <div class="control-group">
        <label>显示晶格向量:</label>
        <input type="checkbox" v-model="showLatticeVectors" />
      </div>
      
      <div class="control-group">
        <label>显示平铺晶格:</label>
        <input type="checkbox" v-model="showTiledLattice" />
      </div>
      
      <div class="control-group" v-if="showTiledLattice">
        <label>平铺范围:</label>
        <input type="range" v-model.number="tilingExtent" min="1" max="10" step="1" />
        <span>{{ tilingExtent }}</span>
      </div>
      
      <div class="control-group download-section" v-if="showTiledLattice">
        <label>下载分辨率:</label>
        <select v-model="downloadResolution">
          <option value="256">256px (小尺寸)</option>
          <option value="512">512px (标准)</option>
          <option value="1024">1024px (1K)</option>
          <option value="2048">2048px (2K)</option>
          <option value="4096">4096px (4K)</option>
          <option value="8192">8192px (8K)</option>
        </select>
        
        <label>重复次数:</label>
        <select v-model="downloadRepeatCount">
          <option value="1">1×1 (单个单元)</option>
          <option value="2">2×2 (4个单元)</option>
          <option value="3">3×3 (9个单元)</option>
          <option value="4">4×4 (16个单元)</option>
          <option value="5">5×5 (25个单元)</option>
          <option value="6">6×6 (36个单元)</option>
          <option value="8">8×8 (64个单元)</option>
          <option value="10">10×10 (100个单元)</option>
          <option value="12">12×12 (144个单元)</option>
          <option value="16">16×16 (256个单元)</option>
        </select>
        
        <div class="watermark-section">
          <div class="watermark-option">
            <input type="checkbox" id="addWatermark" v-model="addWatermark" />
            <label for="addWatermark">添加水印信息</label>
          </div>
          
          <div class="watermark-inputs" v-if="addWatermark">
            <div class="input-row">
              <label>作者:</label>
              <input type="text" v-model="watermarkAuthor" placeholder="输入作者名称" />
            </div>
            
            <div class="input-row">
              <label>标题:</label>
              <input type="text" v-model="watermarkTitle" placeholder="作品标题" />
            </div>
            
            <div class="input-row">
              <label>位置:</label>
              <select v-model="watermarkPosition">
                <option value="bottom-right">右下角</option>
                <option value="bottom-left">左下角</option>
                <option value="top-right">右上角</option>
                <option value="top-left">左上角</option>
                <option value="center">中央半透明</option>
              </select>
            </div>
            
            <div class="watermark-option">
              <input type="checkbox" id="includeOriginalImage" v-model="includeOriginalImage" />
              <label for="includeOriginalImage">包含原始图像</label>
            </div>
          </div>
        </div>
        
        <button @click="downloadTiledPattern" class="custom-button">下载重复单元</button>
      </div>
      
      <div class="control-group">
        <label>叠加模式:</label>
        <select v-model="blendMode">
          <option value="source-over">正常</option>
          <option value="multiply">正片叠底</option>
          <option value="screen">滤色</option>
          <option value="overlay">叠加</option>
          <option value="darken">变暗</option>
          <option value="lighten">变亮</option>
          <option value="color-dodge">颜色减淡</option>
          <option value="color-burn">颜色加深</option>
          <option value="hard-light">强光</option>
          <option value="soft-light">柔光</option>
          <option value="difference">差值</option>
          <option value="exclusion">排除</option>
          <option value="hue">色相</option>
          <option value="saturation">饱和度</option>
          <option value="color">颜色</option>
          <option value="luminosity">亮度</option>
        </select>
      </div>
      
      <div class="control-group">
        <label>显示无缝单元:</label>
        <input type="checkbox" v-model="showSeamlessUnit" />
      </div>
      
      <!-- 修改裁剪控制部分 -->
      <div class="control-group">
        <label>启用裁剪:</label>
        <input type="checkbox" v-model="clipToUnit" />
        <span>{{ clipToUnit ? '已启用' : '已禁用' }}</span>
      </div>
      
      <!-- 修改自定义图像上传控件部分 -->
      <div class="control-group image-upload-section">
        <label>自定义图像:</label>
        <input type="file" accept="image/*" @change="handleImageUpload" />
      </div>
      
      <!-- 添加图像预览部分 -->
      <div class="image-preview" v-if="customImage">
        <div class="preview-container">
          <img :src="customImagePreviewUrl" alt="预览" class="preview-image" />
          <div class="image-filename">{{ customImageFilename }}</div>
        </div>
        <button @click="resetDefaultImages" class="custom-button">恢复默认图像</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import GridLayer from './GridLayer.vue';
import GeomLayer from './GeomLayer.vue';
import RasterLayer from './RasterLayer.vue';
import LatticeVectorLayer from './LatticeVectorLayer.vue';
import TiledLatticeLayer from './TiledLatticeLayer.vue';
import SeamlessUnitLayer from './SeamlessUnitLayer.vue';
import { 
  generateUnits, 
} from './textureUtils.js';

const container = ref(null);
const stage = ref(null);
const gridLayerComponent = ref(null);
const geomLayerComponent = ref(null);
const rasterLayerComponent = ref(null);
const latticeVectorLayerComponent = ref(null);
const tiledLatticeLayerComponent = ref(null);
const seamlessUnitLayerComponent = ref(null);

// 舞台配置
const stageConfig = ref({
  width: 500,
  height: 500
});

// 添加画布缩放参数
const canvasScale = ref(100); // 画布缩放百分比（默认100%）

// 网格线配置
const gridSpacing = ref(50); // 网格间距
const gridExtent = ref(2); // 网格范围（单位数量）
const gridPrecision = ref(0.1); // 网格精度

// 图像控制参数（百分比和角度）
const imageSizePercent = ref(100); // 图像大小百分比（默认100%）
const angleIncrement = ref(0); // 角度增量（0-360度）
const positionOffsetPercent = ref({ x: 0, y: 0 }); // 位置偏移百分比

// 计算实际图像大小（基准大小 * 百分比）
const baseImageSize = 60; // 基准图像大小（像素）
const computedImageSize = computed(() => 
  baseImageSize * (imageSizePercent.value / 100)
);

// 计算实际位置偏移（基于当前图像大小的百分比）
const computedPositionOffset = computed(() => ({
  x: (computedImageSize.value / 200) * positionOffsetPercent.value.x,
  y: (computedImageSize.value / 200) * positionOffsetPercent.value.y
}));


// 晶格向量显示控制
const showLatticeVectors = ref(true);
// 平铺晶格显示控制
const showTiledLattice = ref(false);
// 平铺范围（单位数量）
const tilingExtent = ref(3);

// 无缝单元显示控制
const showSeamlessUnit = ref(false);

// 从生成的单元中获取晶格向量
const latticeVectors = ref([]);

// 使用计算属性获取生成的单元
const generatedUnits = computed(() => 
  generateUnits(gridSpacing.value, gridPrecision.value)
);

// 从生成的单元中获取几何图形
const geoms = computed(() => generatedUnits.value.geoms);

// 从生成的单元中获取光栅图像
const rasterImages = ref([]);

// 从生成的单元中获取三角形中心点
const triangleCenters = computed(() => generatedUnits.value.triangleCenters);

// 从生成的单元中获取无缝单元
const seamlessUnit = computed(() => generatedUnits.value.seamlessUnit);

// 自定义图像
const customImage = ref(null);
const originalImageSources = ref([]);

// 图像叠加模式
const blendMode = ref('source-over');

// 裁剪控制
const clipToUnit = ref(false);

// 添加新的响应式变量
const customImagePreviewUrl = ref('');
const customImageFilename = ref('');

// 计算显示范围 - 根据缩放比例动态调整
const calculatedTilingExtent = computed(() => {
  // 缩放值越小，平铺范围越大，以保持视觉上填满画布
  // 基础范围值为3，随着缩放减小而增加
  return Math.ceil(3 * (100 / canvasScale.value));
});

// 判断是否应使用LOD（低细节层次）
const useLowDetailMode = computed(() => {
  // 当缩放比例低于30%时启用低细节模式
  return canvasScale.value < 30;
});

// 监听三角形变化，更新图像位置
watch(triangleCenters, () => {
  updateImagePositions();
}, { deep: true });

// 监听控制参数变化，更新图像
watch([computedImageSize, angleIncrement, computedPositionOffset], () => {
  updateImageProperties();
}, { deep: true });

// 监听晶格向量显示控制变化
watch(showLatticeVectors, () => {
  updateLatticeVectorVisibility();
});

// 监听平铺晶格显示控制变化
watch([showTiledLattice, tilingExtent], () => {
  updateTiledLatticeVisibility();
}, { deep: true });

// 监听无缝单元显示控制变化
watch(showSeamlessUnit, () => {
  updateSeamlessUnitVisibility();
});

// 监听叠加模式变化
watch(blendMode, () => {
  updateBlendMode();
});

// 监听裁剪设置变化
watch(clipToUnit, () => {
  updateClipSettings();
});

// 监听画布缩放变化
watch(canvasScale, () => {
  updateCanvasScale();
});

// 更新图像位置，使其与对应三角形的中心点对齐
const updateImagePositions = () => {
  const centers = triangleCenters.value;
  
  rasterImages.value.forEach(image => {
    const relatedCenter = centers.find(c => c.id === image.relatedGeom);
    if (relatedCenter) {
      image.config.x = relatedCenter.center.x + computedPositionOffset.value.x;
      image.config.y = relatedCenter.center.y + computedPositionOffset.value.y;
    }
  });
};

// 更新图像属性（大小和角度）
const updateImageProperties = () => {
  rasterImages.value.forEach(image => {
    // 更新图像大小
    image.config.width = computedImageSize.value;
    image.config.height = computedImageSize.value;
    image.config.offsetX = computedImageSize.value / 2;
    image.config.offsetY = computedImageSize.value / 2;
    
    // 更新图像位置（应用内部坐标偏移）
    const relatedCenter = triangleCenters.value.find(c => c.id === image.relatedGeom);
    if (relatedCenter) {
      // 获取相关三角形的内部坐标轴信息
      const relatedGeom = geoms.value.find(g => g.id === image.relatedGeom);
      
      if (relatedGeom) {
        // 使用textureUtils中的函数计算内部坐标偏移
        const internalOffset = generatedUnits.value.calculateInternalOffset(
          relatedGeom, 
          image, 
          computedPositionOffset.value
        );
        
        // 设置最终位置
        image.config.x = relatedCenter.center.x + internalOffset.x;
        image.config.y = relatedCenter.center.y + internalOffset.y;
      } else {
        // 如果没有找到相关几何体，则使用全局坐标系
        image.config.x = relatedCenter.center.x + computedPositionOffset.value.x;
        image.config.y = relatedCenter.center.y + computedPositionOffset.value.y;
      }
    }
    
    // 更新图像角度（应用增量）
    // 保存原始角度计算结果
    const originalRotation = image.originalRotation !== undefined 
      ? image.originalRotation 
      : image.config.rotation;
    
    // 存储原始角度以便后续调整
    image.originalRotation = originalRotation;
    
    // 考虑镜像时角度增量的方向
    let effectiveAngleIncrement = angleIncrement.value;
    
    // 如果图像被镜像（scaleY为-1），则角度增量应该反向
    if (image.config.scaleY === -1) {
      effectiveAngleIncrement = -angleIncrement.value;
    }
    
    // 应用角度增量
    image.config.rotation = (originalRotation + effectiveAngleIncrement) % 360;
  });
  
  // 在更新完图像属性后应用裁剪设置
  updateClipSettings();
};

// 处理图像选择事件
const handleImageSelect = (image) => {
  console.log('选中图像:', image.id);
  // 这里可以添加选中图像后的逻辑
};

// 处理图像悬停事件
const handleImageHover = ({ image, isOver }) => {
  console.log(isOver ? `悬停在图像 ${image.id} 上` : `离开图像 ${image.id}`);
  // 这里可以添加图像悬停效果的逻辑
};

// 加载图像
const loadImages = () => {
  // 使用工具函数加载图像并设置默认图像
  rasterImages.value = generatedUnits.value.loadImagesWithDefaults(generatedUnits.value.rasterImages);
  
  // 保存原始旋转角度
  rasterImages.value.forEach(image => {
    image.originalRotation = image.config.rotation;
  });
  
  // 应用初始控制参数
  updateImageProperties();
  
  // 获取晶格向量
  latticeVectors.value = generatedUnits.value.latticeVectors;
  
  // 应用初始裁剪设置
  updateClipSettings();
};

// 处理画布大小变化
const handleResize = () => {
  if (container.value && stage.value) {
    const { offsetWidth, offsetHeight } = container.value;
    stageConfig.value.width = offsetWidth;
    stageConfig.value.height = offsetHeight;
    
    // 更新所有图层的坐标系
    centerAllLayers();
    
    // 应用当前缩放
    updateCanvasScale();
  }
};

// 新增函数：居中所有图层
const centerAllLayers = () => {
  // 创建一个图层组件数组
  const layerComponents = [
    gridLayerComponent,
    geomLayerComponent,
    rasterLayerComponent,
    latticeVectorLayerComponent,
    tiledLatticeLayerComponent,
    seamlessUnitLayerComponent
  ];
  
  // 遍历所有图层组件并调用其centerCoordinateSystem方法
  layerComponents.forEach(component => {
    if (component.value) {
      component.value.centerCoordinateSystem();
    }
  });
  
  // 确保舞台更新
  if (stage.value) {
    const stageInstance = stage.value.getStage();
    
    // 在居中图层后重新应用当前缩放和位置
    updateCanvasScale();
  }
};

// 监听窗口大小变化
const setupWindowResizeListener = () => {
  const handleWindowResize = () => {
    handleResize();
  };
  
  window.addEventListener('resize', handleWindowResize);
  
  // 组件卸载时移除事件监听器
  onUnmounted(() => {
    window.removeEventListener('resize', handleWindowResize);
  });
};

// 更新晶格向量可见性
const updateLatticeVectorVisibility = () => {
  if (stage.value) {
    const latticeVectorLayer = stage.value.getStage().findOne('#latticeVectorLayer');
    if (latticeVectorLayer) {
      latticeVectorLayer.visible(showLatticeVectors.value);
      latticeVectorLayer.draw();
    }
  }
};

// 更新平铺晶格可见性
const updateTiledLatticeVisibility = () => {
  if (stage.value) {
    const tiledLatticeLayer = stage.value.getStage().findOne('#tiledLatticeLayer');
    if (tiledLatticeLayer) {
      tiledLatticeLayer.visible(showTiledLattice.value);
      tiledLatticeLayer.draw();
    }
  }
};

// 更新无缝单元可见性
const updateSeamlessUnitVisibility = () => {
  if (stage.value) {
    const seamlessUnitLayer = stage.value.getStage().findOne('#seamlessUnitLayer');
    if (seamlessUnitLayer) {
      seamlessUnitLayer.visible(showSeamlessUnit.value);
      seamlessUnitLayer.draw();
    }
  }
};

// 更新图像叠加模式
const updateBlendMode = () => {
  rasterImages.value.forEach(image => {
    image.config.globalCompositeOperation = blendMode.value;
  });
  
  // 如果平铺晶格图层存在，也更新其叠加模式
  if (tiledLatticeLayerComponent.value) {
    tiledLatticeLayerComponent.value.updateBlendMode(blendMode.value);
  }
};

// 更新裁剪设置
const updateClipSettings = () => {
  // 通知光栅图层组件更新裁剪设置
  if (rasterLayerComponent.value) {
    rasterLayerComponent.value.updateClipShapes();
  }
  
  // 通知平铺晶格图层组件更新裁剪设置
  if (tiledLatticeLayerComponent.value) {
    tiledLatticeLayerComponent.value.updateClipSettings();
  }
  
  // 确保舞台更新
  if (stage.value) {
    stage.value.getStage().batchDraw();
  }
};

// 更新画布缩放
const updateCanvasScale = () => {
  if (stage.value) {
    const stageInstance = stage.value.getStage();
    const scale = canvasScale.value / 100;
    
    // 获取容器尺寸
    const containerWidth = container.value.offsetWidth;
    const containerHeight = container.value.offsetHeight;
    
    // 获取舞台原始尺寸
    const stageWidth = stageConfig.value.width;
    const stageHeight = stageConfig.value.height;
    
    // 计算缩放后的中心位置
    const scaledWidth = stageWidth * scale;
    const scaledHeight = stageHeight * scale;
    
    // 计算应居中的位置
    const centerX = (containerWidth - scaledWidth) / 2;
    const centerY = (containerHeight - scaledHeight) / 2;
    
    // 应用缩放和位置
    stageInstance.scale({ x: scale, y: scale });
    stageInstance.position({ x: centerX, y: centerY });
    stageInstance.batchDraw();
  }
};

// 修改处理图像上传函数
const handleImageUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // 检查文件类型
  if (!file.type.match('image.*')) {
    alert('请选择图像文件');
    return;
  }
  
  // 保存文件名
  customImageFilename.value = file.name;
  
  // 创建文件读取器
  const reader = new FileReader();
  
  // 文件加载完成后的处理
  reader.onload = (e) => {
    // 设置预览图URL
    customImagePreviewUrl.value = e.target.result;
    
    // 创建新图像对象
    const img = new Image();
    
    // 图像加载完成后的处理
    img.onload = () => {
      customImage.value = img;
      
      // 立即应用图像，无需点击按钮
      applyCustomImage();
    };
    
    // 设置图像源
    img.src = e.target.result;
  };
  
  // 读取文件
  reader.readAsDataURL(file);
};

// 应用自定义图像到所有栅格图像
const applyCustomImage = () => {
  if (!customImage.value) return;
  
  // 保存原始图像源（如果尚未保存）
  if (originalImageSources.value.length === 0) {
    rasterImages.value.forEach(image => {
      originalImageSources.value.push({
        id: image.id,
        image: image.config.image
      });
    });
  }
  
  // 应用自定义图像
  rasterImages.value.forEach(image => {
    image.config.image = customImage.value;
    // 确保应用当前的叠加模式
    image.config.globalCompositeOperation = blendMode.value;
  });
  
  // 更新平铺图像
  if (tiledLatticeLayerComponent.value) {
    tiledLatticeLayerComponent.value.generateTiledImages();
  }
};

// 恢复默认图像
const resetDefaultImages = () => {
  if (originalImageSources.value.length === 0) return;
  
  // 恢复原始图像
  rasterImages.value.forEach(image => {
    const originalSource = originalImageSources.value.find(src => src.id === image.id);
    if (originalSource) {
      image.config.image = originalSource.image;
    }
  });
  
  // 更新平铺图像
  if (tiledLatticeLayerComponent.value) {
    tiledLatticeLayerComponent.value.generateTiledImages();
  }
  
  // 清除自定义图像
  customImage.value = null;
};

// 添加下载清晰度选择
const downloadResolution = ref('512'); // 默认512px
// 添加重复次数选择
const downloadRepeatCount = ref('1'); // 默认1×1

// 添加水印相关选项
const addWatermark = ref(false);
const watermarkAuthor = ref('');
const watermarkTitle = ref('');
const watermarkPosition = ref('bottom-right');
// 添加是否包含原始图像的选项
const includeOriginalImage = ref(false);

// 修改下载重复单元功能，支持水印和原始图像
const downloadTiledPattern = async () => {
  if (!showTiledLattice.value) return;
  
  try {
    // 显示加载状态
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'download-loading';
    loadingIndicator.textContent = '正在生成图像...';
    container.value.appendChild(loadingIndicator);
    
    // 等待下一个渲染周期，确保UI更新
    await nextTick();
    
    // 设置目标分辨率和重复次数
    const targetSize = parseInt(downloadResolution.value);
    const repeatCount = parseInt(downloadRepeatCount.value);
    
    // 计算无缝单元尺寸
    const unitWidth = seamlessUnit.value.width;
    const unitHeight = seamlessUnit.value.height;
    
    // 计算总的重复区域比例（宽高比）
    const repeatAreaRatio = (unitWidth * repeatCount) / (unitHeight * repeatCount);
    
    // 根据总的重复区域比例计算最终尺寸，确保短边等于目标尺寸
    let finalWidth, finalHeight;
    
    if (repeatAreaRatio >= 1) {
      // 宽大于高，高度为短边
      finalHeight = targetSize;
      finalWidth = Math.round(targetSize * repeatAreaRatio);
    } else {
      // 高大于宽，宽度为短边
      finalWidth = targetSize;
      finalHeight = Math.round(targetSize / repeatAreaRatio);
    }
    
    console.log(`开始下载: 分辨率=${targetSize}, 重复次数=${repeatCount}, 最终尺寸=${finalWidth}×${finalHeight}`);
    
    // 创建导出用的Canvas
    const canvas = document.createElement('canvas');
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法创建Canvas上下文');
    }
    
    // 使用TiledLatticeLayer的renderToCanvas方法渲染到画布
    const success = await tiledLatticeLayerComponent.value.renderToCanvas(ctx, {
      width: finalWidth,
      height: finalHeight,
      targetSize: targetSize,
      repeatCount: repeatCount,
      hideExtras: true
    });
    
    if (!success) {
      throw new Error('渲染图像失败');
    }
    
    // 添加水印和原始图像
    if (addWatermark.value && (watermarkAuthor.value.trim() || watermarkTitle.value.trim() || includeOriginalImage.value)) {
      // 获取原始图像（如果需要）
      let originalImg = null;
      if (includeOriginalImage.value && rasterImages.value.length > 0) {
        // 尝试获取第一个栅格图像作为原始图像
        const firstImage = rasterImages.value[0];
        if (firstImage && firstImage.config && firstImage.config.image) {
          originalImg = firstImage.config.image;
        } else if (customImage.value) {
          // 如果没有栅格图像但有自定义图像，则使用自定义图像
          originalImg = customImage.value;
        }
      }
      
      addWatermarkToCanvas(ctx, {
        author: watermarkAuthor.value,
        title: watermarkTitle.value,
        position: watermarkPosition.value,
        width: finalWidth,
        height: finalHeight,
        originalImage: originalImg
      });
    }
    
    // 转换为图像并下载
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    
    // 构建文件名，如果有标题则使用标题
    let filename = watermarkTitle.value.trim() 
      ? `${watermarkTitle.value}-${targetSize}px-${repeatCount}x${repeatCount}` 
      : `tiled-pattern-${targetSize}px-${repeatCount}x${repeatCount}`;
      
    a.download = `${filename}-${new Date().getTime()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
  } catch (error) {
    console.error('下载重复单元时出错:', error);
    alert('生成图像时发生错误，请重试');
  } finally {
    // 确保移除加载指示器
    const loadingIndicator = container.value.querySelector('.download-loading');
    if (loadingIndicator) {
      container.value.removeChild(loadingIndicator);
    }
  }
};

// 改进的水印函数，支持原始图像
const addWatermarkToCanvas = (ctx, options) => {
  const { author, title, position, width, height, originalImage } = options;
  
  // 准备水印文本
  let watermarkText = '';
  if (title.trim()) watermarkText += title.trim();
  if (author.trim()) {
    if (watermarkText) watermarkText += ' - ';
    watermarkText += '作者: ' + author.trim();
  }
  
  // 如果既没有文本也没有原始图像则退出
  if (!watermarkText && !originalImage) return;
  
  // 计算字体大小和边距
  const fontSizeBase = Math.max(width, height) * 0.01; // 基础大小为图像短边的1%
  const fontSize = Math.max(10, Math.min(36, fontSizeBase)); // 最小10px，最大36px
  const padding = fontSize * 0.8; // 边距
  
  // 设置字体和样式
  ctx.font = `${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = 'middle';
  
  // 测量文本宽度
  const textWidth = watermarkText ? ctx.measureText(watermarkText).width : 0;
  
  // 计算原始图像的显示尺寸（如果有）
  let originalImgWidth = 0;
  let originalImgHeight = 0;
  
  if (originalImage) {
    // 确定原始图像的显示尺寸，高度为字体大小的3倍
    const originalImgDisplayHeight = fontSize * 3;
    // 按比例计算宽度
    const imgRatio = originalImage.width / originalImage.height;
    originalImgWidth = originalImgDisplayHeight * imgRatio;
    originalImgHeight = originalImgDisplayHeight;
  }
  
  // 填充和描边样式根据位置调整
  if (position === 'center') {
    // 中央水印半透明
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = fontSize * 0.1;
    
    // 绘制中央水印
    if (watermarkText) {
      const x = width / 2;
      const y = height / 2;
      ctx.textAlign = 'center';
      
      // 绘制旋转文本
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 8); // 稍微旋转一下
      ctx.strokeText(watermarkText, 0, 0);
      ctx.fillText(watermarkText, 0, 0);
      ctx.restore();
    }
    
    // 对于中央位置，如果有原始图像，添加到右下角，半透明
    if (originalImage) {
      ctx.globalAlpha = 0.3;
      const imgX = width - originalImgWidth - padding;
      const imgY = height - originalImgHeight - padding;
      
      // 添加半透明背景
      ctx.fillStyle = '#fff';
      ctx.fillRect(imgX - 5, imgY - 5, originalImgWidth + 10, originalImgHeight + 10);
      
      // 绘制原始图像
      ctx.drawImage(originalImage, imgX, imgY, originalImgWidth, originalImgHeight);
      
      // 绘制边框
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(imgX, imgY, originalImgWidth, originalImgHeight);
    }
    
    ctx.globalAlpha = 1.0; // 恢复透明度
    return;
  }
  
  // 计算角落水印位置
  let x, y, imgX, imgY;
  
  // 角落水印更明显
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = fontSize * 0.15;
  ctx.textAlign = 'left';
  
  // 计算文本和图像的位置
  const totalWidth = textWidth + (originalImage ? originalImgWidth + padding : 0);
  
  switch (position) {
    case 'bottom-right':
      // 文本位置
      if (watermarkText && originalImage) {
        // 有文本和图像，文本在右边
        x = width - textWidth - padding;
        y = height - fontSize - padding;
        // 图像在文本左边
        imgX = x - originalImgWidth - padding;
        imgY = height - originalImgHeight - padding;
      } else if (watermarkText) {
        // 只有文本
        x = width - textWidth - padding;
        y = height - fontSize - padding;
      } else {
        // 只有图像
        imgX = width - originalImgWidth - padding;
        imgY = height - originalImgHeight - padding;
      }
      break;
      
    case 'bottom-left':
      // 文本位置
      if (watermarkText && originalImage) {
        // 有文本和图像，图像在右边
        x = padding;
        y = height - fontSize - padding;
        // 图像在文本右边
        imgX = x + textWidth + padding;
        imgY = height - originalImgHeight - padding;
      } else if (watermarkText) {
        // 只有文本
        x = padding;
        y = height - fontSize - padding;
      } else {
        // 只有图像
        imgX = padding;
        imgY = height - originalImgHeight - padding;
      }
      break;
      
    case 'top-right':
      // 文本位置
      if (watermarkText && originalImage) {
        // 有文本和图像，文本在右边
        x = width - textWidth - padding;
        y = fontSize + padding;
        // 图像在文本左边
        imgX = x - originalImgWidth - padding;
        imgY = padding;
      } else if (watermarkText) {
        // 只有文本
        x = width - textWidth - padding;
        y = fontSize + padding;
      } else {
        // 只有图像
        imgX = width - originalImgWidth - padding;
        imgY = padding;
      }
      break;
      
    case 'top-left':
      // 文本位置
      if (watermarkText && originalImage) {
        // 有文本和图像，图像在右边
        x = padding;
        y = fontSize + padding;
        // 图像在文本右边
        imgX = x + textWidth + padding;
        imgY = padding;
      } else if (watermarkText) {
        // 只有文本
        x = padding;
        y = fontSize + padding;
      } else {
        // 只有图像
        imgX = padding;
        imgY = padding;
      }
      break;
  }
  
  // 绘制原始图像（如果有）
  if (originalImage) {
    // 添加半透明背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(imgX - 5, imgY - 5, originalImgWidth + 10, originalImgHeight + 10);
    
    // 绘制原始图像
    ctx.drawImage(originalImage, imgX, imgY, originalImgWidth, originalImgHeight);
    
    // 绘制边框
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(imgX, imgY, originalImgWidth, originalImgHeight);
    
    // 在原始图像下方添加"原图"标签
    const labelSize = fontSize * 0.7;
    ctx.font = `${labelSize}px Arial, sans-serif`;
    ctx.fillStyle = '#000';
    ctx.fillText('原图', imgX, imgY + originalImgHeight + labelSize);
  }
  
  // 绘制文本（如果有）
  if (watermarkText) {
    ctx.font = `${fontSize}px Arial, sans-serif`;
    ctx.strokeText(watermarkText, x, y);
    ctx.fillText(watermarkText, x, y);
  }
  
  // 恢复透明度
  ctx.globalAlpha = 1.0;
};

onMounted(() => {
  // 使用 ResizeObserver 监听容器大小变化
  const resizeObserver = new ResizeObserver(() => {
    handleResize();
  });
  
  if (container.value) {
    resizeObserver.observe(container.value);
  }
  
  // 设置窗口大小变化监听器
  setupWindowResizeListener();
  
  // 初始调整大小
  handleResize();
  loadImages(); // 加载图像
  updateBlendMode(); // 应用初始叠加模式
  updateCanvasScale(); // 应用初始缩放
  
  // 添加一个短暂延迟后再次居中所有图层，确保在DOM完全渲染后执行
  setTimeout(() => {
    centerAllLayers();
  }, 100);
  
  // 组件卸载时清理 ResizeObserver
  onUnmounted(() => {
    if (container.value) {
      resizeObserver.unobserve(container.value);
    }
    resizeObserver.disconnect();
  });
});

// 添加一个方法，允许外部组件触发重新居中
const recenterCanvas = () => {
  centerAllLayers();
};

// 在defineExpose中暴露此方法
defineExpose({
  recenterCanvas,
  downloadTiledPattern
});
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.controls-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.control-group {
  margin-bottom: 10px;
  display: flex;
  align-items: center;
}

.control-group label {
  width: 80px;
  margin-right: 10px;
}

.control-group input {
  flex: 1;
  margin-right: 10px;
}

.control-group span {
  width: 50px;
  text-align: right;
}

.custom-button {
  padding: 5px 10px;
  margin-right: 5px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.custom-button:hover {
  background-color: #45a049;
}

.control-group select {
  flex: 1;
  margin-right: 10px;
  padding: 3px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

/* 添加自定义图像上传和预览样式 */
.image-upload-section {
  margin-bottom: 5px;
}

.image-preview {
  margin-top: 5px;
  margin-bottom: 15px;
  padding: 8px;
  background-color: rgba(240, 240, 240, 0.7);
  border-radius: 5px;
}

.preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 8px;
}

.preview-image {
  max-width: 120px;
  max-height: 80px;
  object-fit: contain;
  margin-bottom: 5px;
  border: 1px solid #ccc;
}

.image-filename {
  font-size: 12px;
  color: #333;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

/* 添加下载相关样式 */
.download-section {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #ccc;
}

.download-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  z-index: 1000;
}

/* 添加水印相关样式 */
.watermark-section {
  margin-top: 10px;
  border-top: 1px dashed #eee;
  padding-top: 10px;
}

.watermark-option {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.watermark-option label {
  margin-left: 5px;
  cursor: pointer;
}

.watermark-inputs {
  background-color: rgba(245, 245, 245, 0.6);
  padding: 8px;
  border-radius: 4px;
  margin-top: 5px;
}

.input-row {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
}

.input-row label {
  width: 50px;
  margin-right: 5px;
}

.input-row input, .input-row select {
  flex: 1;
  padding: 3px 5px;
  border: 1px solid #ddd;
  border-radius: 3px;
}
</style>