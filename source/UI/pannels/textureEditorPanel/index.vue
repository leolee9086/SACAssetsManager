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
        :tilingExtent="tilingExtent"
        :blendMode="blendMode"
        :clipToUnit="clipToUnit"
        :geoms="geoms"
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
        <input type="range" v-model.number="positionOffsetPercent.x" min="-100" max="100" step="5" />
        <span>{{ positionOffsetPercent.x }}%</span>
      </div>
      
      <div class="control-group">
        <label>内部坐标偏移Y:</label>
        <input type="range" v-model.number="positionOffsetPercent.y" min="-100" max="100" step="5" />
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
      
      <!-- 自定义图像上传控件 -->
      <div class="control-group">
        <label>自定义图像:</label>
        <input type="file" accept="image/*" @change="handleImageUpload" />
      </div>
      
      <!-- 添加应用自定义图像按钮 -->
      <div class="control-group" v-if="customImage">
        <button @click="applyCustomImage" class="custom-button">应用自定义图像</button>
        <button @click="resetDefaultImages" class="custom-button">恢复默认图像</button>
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
    stage.value.getStage().batchDraw();
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

// 处理图像上传
const handleImageUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // 检查文件类型
  if (!file.type.match('image.*')) {
    alert('请选择图像文件');
    return;
  }
  
  // 创建文件读取器
  const reader = new FileReader();
  
  // 文件加载完成后的处理
  reader.onload = (e) => {
    // 创建新图像对象
    const img = new Image();
    
    // 图像加载完成后的处理
    img.onload = () => {
      customImage.value = img;
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
  recenterCanvas
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
</style>