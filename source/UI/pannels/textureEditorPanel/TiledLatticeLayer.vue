<template>
  <v-layer ref="tiledLatticeLayer" id="tiledLatticeLayer">
    <v-group ref="tiledGroup">
      <!-- 原始图像组 -->
      <v-group ref="originalImagesGroup">
        <v-group v-for="(image, index) in originalImages" :key="`original-${index}`">
          <template v-if="clipToUnit">
            <v-group :config="{ clipFunc: (ctx) => clipToTriangle(ctx, image) }">
              <v-image
                :config="{
                  ...image.config,
                  globalCompositeOperation: blendMode
                }"
              />
            </v-group>
          </template>
          <template v-else>
            <v-image
              :config="{
                ...image.config,
                globalCompositeOperation: blendMode
              }"
            />
          </template>
        </v-group>
      </v-group>
      
      <!-- 平铺图像组（通过动态生成） -->
      <v-group ref="tiledImagesContainer">
        <!-- 这里将由JavaScript动态生成平铺内容 -->
      </v-group>
      
      <!-- LOD模式下的重复单元 -->
      <v-group ref="lodUnitsContainer" v-if="useLowDetailMode">
        <!-- 这里将显示重复单元 -->
      </v-group>
    </v-group>
  </v-layer>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';

const props = defineProps({
  stageWidth: {
    type: Number,
    required: true
  },
  stageHeight: {
    type: Number,
    required: true
  },
  rasterImages: {
    type: Array,
    required: true
  },
  latticeVectors: {
    type: Array,
    required: true
  },
  tilingExtent: {
    type: Number,
    default: 3
  },

  blendMode: {
    type: String,
    default: 'source-over'
  },
  clipToUnit: {
    type: Boolean,
    default: false
  },
  geoms: {
    type: Array,
    default: () => []
  },
  useLowDetailMode: {
    type: Boolean,
    default: false
  },
  seamlessUnit: {
    type: Object,
    default: null
  },
  currentScale: {
    type: Number,
    default: 100
  }
});

const tiledLatticeLayer = ref(null);
const tiledGroup = ref(null);
const originalImagesGroup = ref(null);
const tiledImagesContainer = ref(null);
const lodUnitsContainer = ref(null);
const originalImages = ref([]);

// 计算舞台中心点
const stageCenter = computed(() => ({
  x: props.stageWidth / 2,
  y: props.stageHeight / 2
}));

// 裁剪到三角形的函数
const clipToTriangle = (ctx, image) => {
  // 找到关联的几何体
  const relatedGeom = props.geoms.find(g => g.id === image.relatedGeom);
  if (!relatedGeom || relatedGeom.type !== 'triangle') return;
  
  // 获取三角形顶点
  const vertices = relatedGeom.vertices;
  
  // 绘制三角形裁剪路径，稍微扩大裁剪区域以消除边缘接缝
  ctx.beginPath();
  // 向外扩展1像素以消除接缝
  const expandBy = 1;
  const center = {
    x: (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
    y: (vertices[0].y + vertices[1].y + vertices[2].y) / 3
  };
  
  // 将顶点稍微向外扩展
  const expandedVertices = vertices.map(v => {
    const dx = v.x - center.x;
    const dy = v.y - center.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    return {
      x: center.x + dx * (len + expandBy) / len,
      y: center.y + dy * (len + expandBy) / len
    };
  });
  
  ctx.moveTo(expandedVertices[0].x, expandedVertices[0].y);
  ctx.lineTo(expandedVertices[1].x, expandedVertices[1].y);
  ctx.lineTo(expandedVertices[2].x, expandedVertices[2].y);
  ctx.closePath();
};

// 监听原始图像和晶格向量的变化，以及LOD模式的变化
watch([
  () => props.rasterImages, 
  () => props.latticeVectors, 
  () => props.tilingExtent, 
  () => props.blendMode, 
  () => props.clipToUnit,
  () => props.useLowDetailMode,
  () => props.currentScale
], () => {
  if (props.useLowDetailMode) {
    generateLodUnits();
  } else {
    generateTiledImages();
  }
}, { deep: true });

// 更新叠加模式
const updateBlendMode = (mode) => {
  originalImages.value.forEach(image => {
    image.config.globalCompositeOperation = mode;
  });
  
  // 重新绘制图层
  if (tiledLatticeLayer.value) {
    tiledLatticeLayer.value.getNode().draw();
  }
};

// 生成平铺图像 - 使用手动创建而非克隆的方式
const generateTiledImages = () => {
  if (!props.rasterImages.length || !props.latticeVectors.length) return;
  
  // 处理原始图像
  originalImages.value = [];
  props.rasterImages.forEach(sourceImage => {
    if (!sourceImage.config || !sourceImage.config.image) return;
    
    const originalImage = {
      id: `original-${sourceImage.id}`,
      config: { 
        ...JSON.parse(JSON.stringify(sourceImage.config)),
        image: sourceImage.config.image
      },
      relatedGeom: sourceImage.relatedGeom
    };
    
    originalImages.value.push(originalImage);
  });
  
  nextTick(() => {
    if (!tiledImagesContainer.value || !tiledImagesContainer.value.getNode()) return;
    
    try {
      // 清除之前的平铺内容
      const tiledContainer = tiledImagesContainer.value.getNode();
      tiledContainer.destroyChildren();
      
      // 获取晶格向量
      const vectors = props.latticeVectors;
      if (vectors.length < 2) return;

      // 计算画布边界（考虑当前缩放比例）
      const scaleRatio = props.currentScale / 100;
      const expandFactor = 1 / scaleRatio; // 缩放越小，扩展越大
      
      const stageBounds = {
        left: -stageCenter.value.x * expandFactor,
        top: -stageCenter.value.y * expandFactor,
        right: props.stageWidth * expandFactor - stageCenter.value.x,
        bottom: props.stageHeight * expandFactor - stageCenter.value.y
      };

      // 估算一个图像的最大尺寸（用于边界检查）
      let maxImageSize = 0;
      originalImages.value.forEach(img => {
        if (img.config.width && img.config.height) {
          const size = Math.max(img.config.width, img.config.height);
          maxImageSize = Math.max(maxImageSize, size);
        }
      });
      
      // 为每个平铺位置创建新的图像组
      for (let i = -props.tilingExtent; i <= props.tilingExtent; i++) {
        for (let j = -props.tilingExtent; j <= props.tilingExtent; j++) {
          // 跳过原点 (0,0)，因为这是原始图像的位置
          if (i === 0 && j === 0) continue;
          
          // 计算平移向量
          const translationVector = {
            x: i * vectors[0].x + j * vectors[1].x,
            y: i * vectors[0].y + j * vectors[1].y
          };
          
          // 检查此位置是否在画布可见范围内或接近可见范围
          if (
            translationVector.x + maxImageSize < stageBounds.left || 
            translationVector.x - maxImageSize > stageBounds.right ||
            translationVector.y + maxImageSize < stageBounds.top || 
            translationVector.y - maxImageSize > stageBounds.bottom
          ) {
            continue;
          }
          
          // 为此位置创建一个新组
          const Konva = window.Konva;
          const positionGroup = new Konva.Group({
            x: translationVector.x,
            y: translationVector.y,
            id: `tiled-position-${i}-${j}`
          });
          
          // 为每个原始图像创建对应的平铺图像
          let hasValidImages = false;
          for (const originalImage of originalImages.value) {
            try {
              if (props.clipToUnit) {
                // 创建带裁剪的组
                const clipGroup = new Konva.Group({
                  clipFunc: (ctx) => {
                    // 找到关联的几何体
                    const relatedGeom = props.geoms.find(g => g.id === originalImage.relatedGeom);
                    if (!relatedGeom || relatedGeom.type !== 'triangle') return;
                    
                    // 获取三角形顶点
                    const vertices = relatedGeom.vertices;
                    
                    // 绘制三角形裁剪路径，稍微扩大裁剪区域
                    ctx.beginPath();
                    // 向外扩展1像素以消除接缝
                    const expandBy = 1;
                    const center = {
                      x: (vertices[0].x + vertices[1].x + vertices[2].x) / 3,
                      y: (vertices[0].y + vertices[1].y + vertices[2].y) / 3
                    };
                    
                    // 将顶点稍微向外扩展
                    const expandedVertices = vertices.map(v => {
                      const dx = v.x - center.x;
                      const dy = v.y - center.y;
                      const len = Math.sqrt(dx * dx + dy * dy);
                      return {
                        x: center.x + dx * (len + expandBy) / len,
                        y: center.y + dy * (len + expandBy) / len
                      };
                    });
                    
                    ctx.moveTo(expandedVertices[0].x, expandedVertices[0].y);
                    ctx.lineTo(expandedVertices[1].x, expandedVertices[1].y);
                    ctx.lineTo(expandedVertices[2].x, expandedVertices[2].y);
                    ctx.closePath();
                  }
                });
                
                // 创建图像并添加到裁剪组
                const imageConfig = {
                  ...originalImage.config,
                  globalCompositeOperation: props.blendMode,
                  width: originalImage.config.width + 1,
                  height: originalImage.config.height + 1,
                  x: Math.floor(originalImage.config.x),
                  y: Math.floor(originalImage.config.y)
                };
                
                if (imageConfig.image) {
                  const image = new Konva.Image(imageConfig);
                  clipGroup.add(image);
                  hasValidImages = true;
                }
                
                // 将裁剪组添加到位置组
                positionGroup.add(clipGroup);
              } else {
                // 直接创建图像并添加到位置组
                const imageConfig = {
                  ...originalImage.config,
                  globalCompositeOperation: props.blendMode,
                  width: originalImage.config.width + 1,
                  height: originalImage.config.height + 1,
                  x: Math.floor(originalImage.config.x),
                  y: Math.floor(originalImage.config.y)
                };
                
                if (imageConfig.image) {
                  const image = new Konva.Image(imageConfig);
                  positionGroup.add(image);
                  hasValidImages = true;
                }
              }
            } catch (error) {
              console.error('创建平铺图像时出错:', error);
            }
          }
          
          // 只有当位置组包含有效图像时才添加到平铺容器
          if (hasValidImages && tiledContainer && tiledContainer.children) {
            tiledContainer.add(positionGroup);
          }
        }
      }
      
      // 重新绘制图层
      if (tiledLatticeLayer.value && tiledLatticeLayer.value.getNode()) {
        tiledLatticeLayer.value.getNode().draw();
      }
    } catch (error) {
      console.error('生成平铺图像时发生错误:', error);
    }
  });
};

// 生成LOD重复单元
const generateLodUnits = () => {
  if (!props.seamlessUnit || !lodUnitsContainer.value) return;
  
  nextTick(() => {
    try {
      // 清除之前的内容
      const lodContainer = lodUnitsContainer.value.getNode();
      lodContainer.destroyChildren();
      
      const Konva = window.Konva;
      
      // 计算画布边界（考虑当前缩放比例）
      const scaleRatio = props.currentScale / 100;
      const expandFactor = 1 / scaleRatio; // 缩放越小，扩展越大
      
      const stageBounds = {
        left: -stageCenter.value.x * expandFactor,
        top: -stageCenter.value.y * expandFactor,
        right: props.stageWidth * expandFactor - stageCenter.value.x,
        bottom: props.stageHeight * expandFactor - stageCenter.value.y
      };
      
      // 获取重复单元的尺寸
      const unitWidth = props.seamlessUnit.width;
      const unitHeight = props.seamlessUnit.height;
      
      // 计算需要显示的重复单元的行列数
      const colCount = Math.ceil(Math.max(
        Math.abs(stageBounds.left),
        Math.abs(stageBounds.right)
      ) / unitWidth) + 1;
      
      const rowCount = Math.ceil(Math.max(
        Math.abs(stageBounds.top),
        Math.abs(stageBounds.bottom)
      ) / unitHeight) + 1;
      
      // 创建重复单元的矩形网格
      for (let i = -colCount; i <= colCount; i++) {
        for (let j = -rowCount; j <= rowCount; j++) {
          // 创建单元位置
          const x = i * unitWidth;
          const y = j * unitHeight;
          
          // 跳过画布外的单元
          if (
            x + unitWidth < stageBounds.left || 
            x > stageBounds.right ||
            y + unitHeight < stageBounds.top || 
            y > stageBounds.bottom
          ) {
            continue;
          }
          
          // 创建单元矩形 - 使用浅灰色细线条和完全透明的填充
          const rect = new Konva.Rect({
            x: x,
            y: y,
            width: unitWidth,
            height: unitHeight,
            fill: 'transparent',   // 透明填充
            stroke: 'rgba(200,200,200,0.3)',  // 浅灰色边框
            strokeWidth: 0.5,      // 细线条
            dash: [2, 2],          // 虚线效果
            opacity: 0.4           // 整体透明度低
          });
          
          // 添加到容器
          lodContainer.add(rect);
          
          // 为每个单元添加最小化的标签
          const label = new Konva.Text({
            x: x + unitWidth / 2,
            y: y + unitHeight / 2,
            text: `${i},${j}`,    // 简化标签文本
            fontSize: 8,          // 小字体
            fontFamily: 'Arial',
            fill: 'rgba(100,100,100,0.5)',  // 浅灰色文本
            align: 'center',
            verticalAlign: 'middle',
            offsetX: 10,
            offsetY: 4
          });
          
          lodContainer.add(label);
        }
      }
      
      // 重新绘制图层
      if (tiledLatticeLayer.value) {
        tiledLatticeLayer.value.getNode().draw();
      }
    } catch (error) {
      console.error('生成LOD单元时发生错误:', error);
    }
  });
};

// 居中坐标系
const centerCoordinateSystem = () => {
  if (tiledGroup.value) {
    const node = tiledGroup.value.getNode();
    node.x(stageCenter.value.x);
    node.y(stageCenter.value.y);
  }
};

// 更新裁剪设置
const updateClipSettings = () => {
  // 重新绘制图层以应用裁剪
  if (tiledLatticeLayer.value) {
    tiledLatticeLayer.value.getNode().draw();
  }
};

// 暴露方法给父组件
defineExpose({
  centerCoordinateSystem,
  getNode: () => tiledLatticeLayer.value?.getNode(),
  generateTiledImages,
  updateBlendMode,
  updateClipSettings
});

onMounted(() => {
  centerCoordinateSystem();
  
  // 根据当前模式选择初始化方法
  if (props.useLowDetailMode) {
    generateLodUnits();
  } else {
    generateTiledImages();
  }
  
  // 监听图像加载完成事件
  watch(() => props.rasterImages, (newImages) => {
    // 确保所有图像都已加载
    const allImagesLoaded = newImages.every(img => img.config && img.config.image);
    if (allImagesLoaded) {
      generateTiledImages();
    }
  }, { deep: true, immediate: true });
});
</script> 