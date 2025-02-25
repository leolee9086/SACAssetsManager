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
      
      <!-- 使用光栅图像子组件 -->
      <raster-layer
        ref="rasterLayerComponent"
        :stageWidth="stageConfig.width"
        :stageHeight="stageConfig.height"
        :rasterImages="rasterImages"
        :imageSize="computedImageSize"
        :angleIncrement="angleIncrement"
        :positionOffset="computedPositionOffset"
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
    </v-stage>
    
    <!-- 控制面板 -->
    <div class="controls-panel">
      <div class="control-group">
        <label>图像大小:</label>
        <input type="range" v-model.number="imageSizePercent" min="10" max="1000" step="10" />
        <span>{{ imageSizePercent }}%</span>
      </div>
      
      <div class="control-group">
        <label>角度增量:</label>
        <input type="range" v-model.number="angleIncrement" min="0" max="360" step="5" />
        <span>{{ angleIncrement }}°</span>
      </div>
      
      <div class="control-group">
        <label>X偏移:</label>
        <input type="range" v-model.number="positionOffsetPercent.x" min="-100" max="100" step="5" />
        <span>{{ positionOffsetPercent.x }}%</span>
      </div>
      
      <div class="control-group">
        <label>Y偏移:</label>
        <input type="range" v-model.number="positionOffsetPercent.y" min="-100" max="100" step="5" />
        <span>{{ positionOffsetPercent.y }}%</span>
      </div>
      
      <div class="control-group">
        <label>显示晶格向量:</label>
        <input type="checkbox" v-model="showLatticeVectors" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import GridLayer from './GridLayer.vue';
import GeomLayer from './GeomLayer.vue';
import RasterLayer from './RasterLayer.vue';
import LatticeVectorLayer from './LatticeVectorLayer.vue';
import { generateUnits } from './textureUtils.js';

const container = ref(null);
const stage = ref(null);
const gridLayerComponent = ref(null);
const geomLayerComponent = ref(null);
const rasterLayerComponent = ref(null);
const latticeVectorLayerComponent = ref(null);

// 舞台配置
const stageConfig = ref({
  width: 500,
  height: 500
});

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

// 计算实际位置偏移（基准偏移 * 百分比）
const baseOffsetUnit = 0.5; // 基准偏移单位
const computedPositionOffset = computed(() => ({
  x: baseOffsetUnit * positionOffsetPercent.value.x,
  y: baseOffsetUnit * positionOffsetPercent.value.y
}));

// 舞台中心点
const stageCenter = computed(() => ({
  x: stageConfig.value.width / 2,
  y: stageConfig.value.height / 2
}));

// 晶格向量显示控制
const showLatticeVectors = ref(true);

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
    
    // 更新图像位置（应用偏移）
    const relatedCenter = triangleCenters.value.find(c => c.id === image.relatedGeom);
    if (relatedCenter) {
      image.config.x = relatedCenter.center.x + computedPositionOffset.value.x;
      image.config.y = relatedCenter.center.y + computedPositionOffset.value.y;
    }
    
    // 更新图像角度（应用增量）
    // 保存原始角度计算结果
    const originalRotation = image.originalRotation !== undefined 
      ? image.originalRotation 
      : image.config.rotation;
    
    // 存储原始角度以便后续调整
    image.originalRotation = originalRotation;
    
    // 应用角度增量
    image.config.rotation = (originalRotation + angleIncrement.value) % 360;
  });
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
};

// 处理画布大小变化
const handleResize = () => {
  if (container.value && stage.value) {
    const { offsetWidth, offsetHeight } = container.value;
    stageConfig.value.width = offsetWidth;
    stageConfig.value.height = offsetHeight;
    
    // 更新所有图层的坐标系
    if (gridLayerComponent.value) {
      gridLayerComponent.value.centerCoordinateSystem();
    }
    
    if (geomLayerComponent.value) {
      geomLayerComponent.value.centerCoordinateSystem();
    }
    
    if (rasterLayerComponent.value) {
      rasterLayerComponent.value.centerCoordinateSystem();
    }
    
    if (latticeVectorLayerComponent.value) {
      latticeVectorLayerComponent.value.centerCoordinateSystem();
    }
  }
  
  // 更新晶格向量位置
  updateLatticeVectorPositions();
};

// 更新晶格向量位置 - 当舞台大小变化时调用
const updateLatticeVectorPositions = () => {
  if (latticeVectorLayerComponent.value) {
    latticeVectorLayerComponent.value.getNode().draw();
  }
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

onMounted(() => {
  // 使用 ResizeObserver 监听容器大小变化
  const resizeObserver = new ResizeObserver(() => {
    handleResize();
  });
  
  if (container.value) {
    resizeObserver.observe(container.value);
  }
  
  // 初始调整大小
  handleResize();
  loadImages(); // 加载图像
  
  // 组件卸载时清理 ResizeObserver
  onUnmounted(() => {
    if (container.value) {
      resizeObserver.unobserve(container.value);
    }
    resizeObserver.disconnect();
  });
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
</style>