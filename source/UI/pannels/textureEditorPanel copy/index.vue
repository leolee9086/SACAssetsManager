<template>
  <div ref="container" class="canvas-container">
    <v-stage :config="stageConfig" ref="stage">
      <!-- 使用网格子组件 -->
      <grid-layer ref="gridLayerComponent" :stageWidth="stageConfig.width" :stageHeight="stageConfig.height"
        :gridSpacing="gridSpacing" :gridExtent="gridExtent" :gridPrecision="gridPrecision" />

      <!-- 使用光栅图像子组件，仅在不显示平铺晶格时显示 -->
      <raster-layer v-show="!showTiledLattice" ref="rasterLayerComponent" :stageWidth="stageConfig.width"
        :stageHeight="stageConfig.height" :rasterImages="rasterImages" :imageSize="computedImageSize"
        :angleIncrement="angleIncrement" :positionOffset="computedPositionOffset" :blendMode="blendMode"
        :clipToUnit="clipToUnit" :geoms="geoms" :unitDefine="generatedUnits" @imageSelect="handleImageSelect"
        @imageHover="handleImageHover" />

      <!-- 使用几何图形子组件 -->
      <geom-layer ref="geomLayerComponent" :stageWidth="stageConfig.width" :stageHeight="stageConfig.height"
        :geoms="geoms" />

      <!-- 添加晶格向量图层 -->
      <lattice-vector-layer ref="latticeVectorLayerComponent" :stageWidth="stageConfig.width"
        :stageHeight="stageConfig.height" :latticeVectors="latticeVectors" :unitDefine="generatedUnits"
        v-if="showLatticeVectors" />

      <!-- 添加平铺晶格图层 -->
      <tiled-lattice-layer ref="tiledLatticeLayerComponent" :stageWidth="stageConfig.width"
        :stageHeight="stageConfig.height" :rasterImages="rasterImages" :latticeVectors="latticeVectors"
        :tilingExtent="calculatedTilingExtent" :blendMode="blendMode" :clipToUnit="clipToUnit" :geoms="geoms"
        :useLowDetailMode="useLowDetailMode" :seamlessUnit="seamlessUnit" :currentScale="canvasScale"
        v-if="showTiledLattice" />

      <!-- 添加无缝单元图层 -->
      <seamless-unit-layer ref="seamlessUnitLayerComponent" :stageWidth="stageConfig.width"
        :stageHeight="stageConfig.height" :seamlessUnit="seamlessUnit" v-if="showSeamlessUnit" />
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
        <input type="range" v-model.number="angleIncrement" min="0" max="360" step="1" />
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

      <div class="control-group" v-if="showLatticeVectors && isLatticeAdjustable">
        <label>晶格向量1 X:</label>
        <input type="range" v-model.number="latticeVector1.x" min="-1" max="1" step="0.05" />
        <span>{{ latticeVector1.x.toFixed(2) }}</span>
      </div>

      <div class="control-group" v-if="showLatticeVectors && isLatticeAdjustable">
        <label>晶格向量1 Y:</label>
        <input type="range" v-model.number="latticeVector1.y" min="-1" max="1" step="0.05" />
        <span>{{ latticeVector1.y.toFixed(2) }}</span>
      </div>

      <div class="control-group" v-if="showLatticeVectors && isLatticeAdjustable">
        <label>晶格向量2 X:</label>
        <input type="range" v-model.number="latticeVector2.x" min="-1" max="1" step="0.05" />
        <span>{{ latticeVector2.x.toFixed(2) }}</span>
      </div>

      <div class="control-group" v-if="showLatticeVectors && isLatticeAdjustable">
        <label>晶格向量2 Y:</label>
        <input type="range" v-model.number="latticeVector2.y" min="-1" max="1" step="0.05" />
        <span>{{ latticeVector2.y.toFixed(2) }}</span>
      </div>
    </div>

    <!-- 导出选项面板 - 新增的右侧面板 -->
    <div class="export-panel" v-if="showTiledLattice">
      <h3>导出选项</h3>

      <!-- 下载选项 -->
      <div class="download-section">
        <div class="input-row">
          <label>分辨率:</label>
          <select v-model="downloadResolution">
            <option value="256">256px (小尺寸)</option>
            <option value="512">512px (标准)</option>
            <option value="1024">1024px (1K)</option>
            <option value="2048">2048px (2K)</option>
            <option value="4096">4096px (4K)</option>
            <option value="8192">8192px (8K)</option>
          </select>
        </div>

        <div class="input-row">
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
        </div>

        <button @click="downloadTiledPattern" class="export-button">下载重复单元</button>
      </div>

      <!-- 水印选项 -->
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

          <div class="input-row">
            <label>大小:</label>
            <select v-model="watermarkSize">
              <option value="small">小</option>
              <option value="medium">中</option>
              <option value="large">大</option>
            </select>
          </div>

          <div class="watermark-option">
            <input type="checkbox" id="includeOriginalImage" v-model="includeOriginalImage" />
            <label for="includeOriginalImage">包含原始图像</label>
          </div>

          <div class="watermark-option">
            <input type="checkbox" id="includeConfigInfo" v-model="includeConfigInfo" />
            <label for="includeConfigInfo">包含配置信息</label>
          </div>
        </div>
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
} from './generators/pggGenerator.js';
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
const latticeVectors = computed(() => generatedUnits.value.latticeVectors);

// 添加晶格向量调整相关的响应式变量
const latticeVector1 = ref({ x: 0.8, y: 0.2 }); // 默认值
const latticeVector2 = ref({ x: 0.3, y: 0.7 }); // 默认值
const isLatticeAdjustable = ref(false);

// 修改计算属性获取生成的单元，传入晶格向量参数
const generatedUnits = computed(() =>
  generateUnits(gridSpacing.value, gridPrecision.value, {
    vector1: latticeVector1.value,
    vector2: latticeVector2.value
  })
);

// 从生成的单元中获取几何图形
const geoms = computed(() => generatedUnits.value.geoms);

// 从生成的单元中获取光栅图像
const rasterImages = ref([]);

// 从生成的单元中获取基本单元中心点
const baseUnitCenters = computed(() => generatedUnits.value.baseUnitCenters);

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

// 从生成的单元中获取矩形可平铺标志
const rectTileable = computed(() => generatedUnits.value.rectTileable || false);

// 初始化晶格参数
const initializeLatticeParams = () => {
  // 检查生成的单元是否声明为可调整
  if (generatedUnits.value && generatedUnits.value.isAdjustable) {
    isLatticeAdjustable.value = true;

    // 如果有提供初始向量参数，则使用它们
    if (generatedUnits.value.vectorParams) {
      const { vector1, vector2 } = generatedUnits.value.vectorParams;
      latticeVector1.value = { ...vector1 };
      latticeVector2.value = { ...vector2 };
    }
  } else {
    isLatticeAdjustable.value = false;
  }
};

// 监听基础单元变化，更新图像位置
watch(baseUnitCenters, () => {
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

// 监听晶格向量变化，触发重新生成
watch([latticeVector1, latticeVector2], () => {
  // 更新晶格向量会自动触发generatedUnits重新计算
  // 然后通过计算属性更新latticeVectors
  updateImageProperties()
  // 如果需要手动更新平铺图层
  if (tiledLatticeLayerComponent.value) {
    tiledLatticeLayerComponent.value.generateTiledImages();
  }
}, { deep: true });

// 更新图像位置，使其与对应基础单元的中心点对齐
const updateImagePositions = () => {
  const centers = baseUnitCenters.value;

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

  // 使用默认的图像属性更新逻辑
  rasterImages.value.forEach(image => {
    if (image.onUpdate) {
      image.onUpdate(image, { latticeVector1: latticeVector1.value, latticeVector2: latticeVector2.value })
    }
    image.config.width = computedImageSize.value;
    image.config.height = computedImageSize.value;
    image.config.offsetX = computedImageSize.value / 2;
    image.config.offsetY = computedImageSize.value / 2;
    // 更新图像位置（应用内部坐标偏移）
    const relatedCenter = baseUnitCenters.value.find(c => c.id === image.relatedGeom);
    if (relatedCenter) {
      // 获取相关基础单元的内部坐标轴信息
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
    // 获取真正的原始角度，如果没有则使用当前角度
    const originalRotation = image.originalRotation || image.config.rotation;
    // 考虑镜像时角度增量的方向
    let effectiveAngleIncrement = (image.config.scaleY * image.config.scaleX || 1) * angleIncrement.value;
    // 应用角度增量
    image.config.rotation = (originalRotation + effectiveAngleIncrement) % 360;
  });
  updateClipSettings();
  // 在更新完图像属性后应用裁剪设置
}



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
const watermarkSize = ref('medium'); // 默认中等大小
const includeOriginalImage = ref(false);
const includeConfigInfo = ref(false); // 添加是否包含配置信息的选项

// 修改下载重复单元功能，支持不同的导出策略
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

    console.log(`开始下载: 分辨率=${targetSize}, 重复次数=${repeatCount}, 最终尺寸=${finalWidth}×${finalHeight}, 矩形可平铺=${rectTileable.value}`);

    // 创建导出用的Canvas
    const canvas = document.createElement('canvas');
    canvas.width = finalWidth;
    canvas.height = finalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法创建Canvas上下文');
    }

    // 使用TiledLatticeLayer的renderToCanvas方法渲染到画布，传入rectTileable标志
    const success = await tiledLatticeLayerComponent.value.renderToCanvas(ctx, {
      width: finalWidth,
      height: finalHeight,
      targetSize: targetSize,
      repeatCount: repeatCount,
      hideExtras: true,
      rectTileable: rectTileable.value // 传递矩形可平铺标志
    });

    if (!success) {
      throw new Error('渲染图像失败');
    }

    // 添加水印和原始图像
    if (addWatermark.value && (watermarkAuthor.value.trim() || watermarkTitle.value.trim() || includeOriginalImage.value || includeConfigInfo.value)) {
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

      // 收集当前配置信息
      const configInfo = includeConfigInfo.value ? {
        imageSize: imageSizePercent.value,
        angle: angleIncrement.value,
        offset: positionOffsetPercent.value,
        latticeVector1: latticeVector1.value,
        latticeVector2: latticeVector2.value,
        blendMode: blendMode.value,
        clipToUnit: clipToUnit.value
      } : null;

      addWatermarkToCanvas(ctx, {
        author: watermarkAuthor.value,
        title: watermarkTitle.value,
        position: watermarkPosition.value,
        size: watermarkSize.value,
        width: finalWidth,
        height: finalHeight,
        originalImage: originalImg,
        configInfo: configInfo // 传递配置信息
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

// 改进的水印函数，支持配置信息显示
const addWatermarkToCanvas = (ctx, options) => {
  const { author, title, position, width, height, originalImage, size = 'medium', configInfo } = options;

  // 准备水印文本
  let watermarkText = '';
  if (title.trim()) watermarkText += title.trim();
  if (author.trim()) {
    if (watermarkText) watermarkText += ' - ';
    watermarkText += '作者: ' + author.trim();
  }

  // 如果既没有文本也没有原始图像也没有配置信息则退出
  if (!watermarkText && !originalImage && !configInfo) return;

  // 根据选择的大小设置基础字体大小的比例
  let sizeMultiplier;
  switch (size) {
    case 'small':
      sizeMultiplier = 0.85;
      break;
    case 'large':
      sizeMultiplier = 1.5;
      break;
    case 'medium':
    default:
      sizeMultiplier = 1.0;
      break;
  }

  // 大幅增加基础尺寸计算比例（从0.012增加到0.036，约三倍）
  const fontSizeBase = Math.max(width, height) * 0.036 * sizeMultiplier;
  // 增加最小/最大字体尺寸限制
  const fontSize = Math.max(24, Math.min(120, fontSizeBase));
  const padding = fontSize * 0.8; // 边距

  // 设置字体和样式
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textBaseline = 'middle';

  // 测量文本宽度
  const textWidth = watermarkText ? ctx.measureText(watermarkText).width : 0;

  // 计算原始图像的显示尺寸（如果有），根据大小选项调整
  let originalImgWidth = 0;
  let originalImgHeight = 0;

  if (originalImage) {
    // 确定原始图像的显示尺寸，高度为字体大小的3倍，根据大小选项调整
    const originalImgDisplayHeight = fontSize * 3 * sizeMultiplier;
    // 按比例计算宽度
    const imgRatio = originalImage.width / originalImage.height;
    originalImgWidth = originalImgDisplayHeight * imgRatio;
    originalImgHeight = originalImgDisplayHeight;
  }

  // 填充和描边样式根据位置调整
  if (position === 'center') {
    // 中央水印半透明
    ctx.globalAlpha = size === 'small' ? 0.25 : 0.2;
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = fontSize * (size === 'small' ? 0.15 : 0.1);

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
      ctx.globalAlpha = size === 'small' ? 0.4 : 0.3; // 小尺寸增加不透明度
      const imgX = width - originalImgWidth - padding;
      const imgY = height - originalImgHeight - padding;

      // 添加半透明背景
      ctx.fillStyle = '#fff';
      ctx.fillRect(imgX - 10, imgY - 10, originalImgWidth + 20, originalImgHeight + 20);

      // 绘制原始图像
      ctx.drawImage(originalImage, imgX, imgY, originalImgWidth, originalImgHeight);

      // 绘制边框
      ctx.strokeStyle = '#000';
      ctx.lineWidth = Math.max(2, fontSize * 0.05); // 确保边框线宽至少1px
      ctx.strokeRect(imgX, imgY, originalImgWidth, originalImgHeight);
    }

    ctx.globalAlpha = 1.0; // 恢复透明度
    return;
  }

  // 计算角落水印位置
  let x, y, imgX, imgY;

  // 角落水印更明显
  ctx.globalAlpha = size === 'small' ? 0.85 : 0.8; // 小尺寸增加不透明度
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = fontSize * (size === 'small' ? 0.2 : 0.15); // 增加小尺寸的描边
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
    ctx.fillStyle = size === 'small' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(imgX - 10, imgY - 10, originalImgWidth + 20, originalImgHeight + 20); // 增加背景边距

    // 绘制原始图像
    ctx.drawImage(originalImage, imgX, imgY, originalImgWidth, originalImgHeight);

    // 绘制边框
    ctx.strokeStyle = '#000';
    ctx.lineWidth = Math.max(2, fontSize * 0.05); // 增加最小边框宽度
    ctx.strokeRect(imgX, imgY, originalImgWidth, originalImgHeight);

    // 在原始图像下方添加"原图"标签
    const labelSize = Math.max(20, fontSize * 0.6); // 增加标签最小尺寸
    ctx.font = `bold ${labelSize}px Arial, sans-serif`;
    ctx.fillStyle = '#000';
    ctx.fillText('原图', imgX, imgY + originalImgHeight + labelSize);
  }

  // 绘制文本（如果有）
  if (watermarkText) {
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;

    // 使用更粗的描边增强可见性
    ctx.lineWidth = Math.max(3, fontSize * 0.1); // 增加描边宽度
    ctx.strokeText(watermarkText, x, y);
    ctx.fillText(watermarkText, x, y);
  }

  // 添加配置信息显示（如果有）
  if (configInfo) {
    const configFontSize = Math.max(16, fontSize * 0.5); // 配置信息使用较小的字体
    ctx.font = `${configFontSize}px Arial, sans-serif`;
    ctx.lineWidth = Math.max(2, configFontSize * 0.1);

    // 格式化配置信息
    const configText = [
      `图像大小: ${configInfo.imageSize}%`,
      `角度: ${configInfo.angle}°`,
      `偏移: X=${configInfo.offset.x}%, Y=${configInfo.offset.y}%`,
      `晶格向量1: (${configInfo.latticeVector1.x.toFixed(2)}, ${configInfo.latticeVector1.y.toFixed(2)})`,
      `晶格向量2: (${configInfo.latticeVector2.x.toFixed(2)}, ${configInfo.latticeVector2.y.toFixed(2)})`,
      `混合模式: ${configInfo.blendMode}`,
      `裁剪: ${configInfo.clipToUnit ? '启用' : '禁用'}`
    ];

    // 根据水印位置确定配置信息位置
    let configX, configY, lineHeight = configFontSize * 1.2;

    if (position === 'bottom-right' || position === 'top-right') {
      // 右侧对齐的水印，配置文本靠右对齐
      configX = width - padding;
      ctx.textAlign = 'right';
    } else {
      // 左侧对齐的水印，配置文本靠左对齐
      configX = padding;
      ctx.textAlign = 'left';
    }

    if (position === 'bottom-right' || position === 'bottom-left') {
      // 底部水印，配置信息向上排列
      configY = y - fontSize - padding;
      // 绘制从下往上的配置信息
      for (let i = 0; i < configText.length; i++) {
        ctx.strokeText(configText[i], configX, configY - (lineHeight * i));
        ctx.fillText(configText[i], configX, configY - (lineHeight * i));
      }
    } else {
      // 顶部水印，配置信息向下排列
      configY = y + fontSize + padding;
      // 绘制从上往下的配置信息
      for (let i = 0; i < configText.length; i++) {
        ctx.strokeText(configText[i], configX, configY + (lineHeight * i));
        ctx.fillText(configText[i], configX, configY + (lineHeight * i));
      }
    }
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

  // 初始化晶格参数
  initializeLatticeParams();

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
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px dashed #ccc;
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

.input-row input,
.input-row select {
  flex: 1;
  padding: 3px 5px;
  border: 1px solid #ddd;
  border-radius: 3px;
}

/* 添加导出面板样式 */
.export-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
  width: 250px;
  max-height: 90%;
  overflow-y: auto;
}

.export-panel h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 16px;
  text-align: center;
  border-bottom: 1px solid #ddd;
  padding-bottom: 8px;
}

/* 导出面板内的下载部分 */
.download-section {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px dashed #ccc;
}

/* 导出按钮样式 */
.export-button {
  width: 100%;
  padding: 8px;
  margin-top: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.export-button:hover {
  background-color: #45a049;
}
</style>