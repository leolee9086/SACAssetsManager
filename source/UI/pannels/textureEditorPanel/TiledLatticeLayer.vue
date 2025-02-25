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
      
      <!-- 平铺图像组（通过克隆原始图像组生成） -->
      <v-group ref="tiledImagesContainer">
        <!-- 这里将由JavaScript动态生成平铺内容 -->
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
  }
});

const tiledLatticeLayer = ref(null);
const tiledGroup = ref(null);
const originalImagesGroup = ref(null);
const tiledImagesContainer = ref(null);
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
  
  // 绘制三角形裁剪路径
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  ctx.lineTo(vertices[1].x, vertices[1].y);
  ctx.lineTo(vertices[2].x, vertices[2].y);
  ctx.closePath();
};

// 监听原始图像和晶格向量的变化
watch([() => props.rasterImages, () => props.latticeVectors, () => props.tilingExtent, () => props.blendMode, () => props.clipToUnit], () => {
  generateTiledImages();
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
    if (!tiledImagesContainer.value) return;
    
    // 清除之前的平铺内容
    const tiledContainer = tiledImagesContainer.value.getNode();
    tiledContainer.destroyChildren();
    
    // 获取晶格向量
    const vectors = props.latticeVectors;
    if (vectors.length < 2) return;

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
        
        // 为此位置创建一个新组
        const Konva = window.Konva; // 获取Konva引用
        const positionGroup = new Konva.Group({
          x: translationVector.x,
          y: translationVector.y,
          //opacity: 0.7,
          id: `tiled-position-${i}-${j}`
        });
        
        // 为每个原始图像创建对应的平铺图像
        originalImages.value.forEach((originalImage, index) => {
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
                  
                  // 绘制三角形裁剪路径
                  ctx.beginPath();
                  ctx.moveTo(vertices[0].x, vertices[0].y);
                  ctx.lineTo(vertices[1].x, vertices[1].y);
                  ctx.lineTo(vertices[2].x, vertices[2].y);
                  ctx.closePath();
                }
              });
              
              // 创建图像并添加到裁剪组
              const imageConfig = {
                ...originalImage.config,
                globalCompositeOperation: props.blendMode
              };
              const image = new Konva.Image(imageConfig);
              clipGroup.add(image);
              
              // 将裁剪组添加到位置组
              positionGroup.add(clipGroup);
            } else {
              // 直接创建图像并添加到位置组
              const imageConfig = {
                ...originalImage.config,
                globalCompositeOperation: props.blendMode
              };
              const image = new Konva.Image(imageConfig);
              positionGroup.add(image);
            }
          } catch (error) {
            console.error('创建平铺图像时出错:', error);
          }
        });
        
        // 将位置组添加到平铺容器
        tiledContainer.add(positionGroup);
      }
    }
    
    // 重新绘制图层
    if (tiledLatticeLayer.value) {
      tiledLatticeLayer.value.getNode().draw();
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
  generateTiledImages();
  
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