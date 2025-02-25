<template>
  <v-layer ref="tiledLatticeLayer" id="tiledLatticeLayer">
    <v-group ref="tiledGroup">
      <!-- 显示原始位置的图像 -->
      <v-image
        v-for="(image, index) in originalImages"
        :key="`original-${index}`"
        :config="{
          ...image.config,
          globalCompositeOperation: 'lighter'
        }"
      />
      
      <!-- 显示平铺位置的图像 -->
      <v-image
        v-for="(image, index) in tiledImages"
        :key="`tiled-${index}`"
        :config="{
          ...image.config,
          globalCompositeOperation: 'lighter'
        }"
      />
    </v-group>
  </v-layer>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';

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
  }
});

const tiledLatticeLayer = ref(null);
const tiledGroup = ref(null);
const tiledImages = ref([]);
const originalImages = ref([]);

// 计算舞台中心点
const stageCenter = computed(() => ({
  x: props.stageWidth / 2,
  y: props.stageHeight / 2
}));

// 监听原始图像和晶格向量的变化
watch([() => props.rasterImages, () => props.latticeVectors, () => props.tilingExtent], () => {
  generateTiledImages();
}, { deep: true });

// 生成平铺图像
const generateTiledImages = () => {
  if (!props.rasterImages.length || !props.latticeVectors.length) return;
  
  tiledImages.value = [];
  originalImages.value = [];
  
  // 获取原始图像
  const sourceImages = [...props.rasterImages];
  
  // 复制原始图像到originalImages
  sourceImages.forEach(sourceImage => {
    if (!sourceImage.config || !sourceImage.config.image) return;
    
    const originalImage = {
      id: `original-${sourceImage.id}`,
      config: { 
        ...JSON.parse(JSON.stringify(sourceImage.config)),
        // 确保使用相同的图像对象
        image: sourceImage.config.image
      },
      relatedGeom: sourceImage.relatedGeom
    };
    
    // 添加到原始图像数组
    originalImages.value.push(originalImage);
  });
  
  // 获取晶格向量
  const vectors = props.latticeVectors;
  if (vectors.length < 2) return;
  
  // 遍历平铺范围
  for (let i = -props.tilingExtent; i <= props.tilingExtent; i++) {
    for (let j = -props.tilingExtent; j <= props.tilingExtent; j++) {
      // 跳过原点 (0,0)，因为这是原始图像的位置
      if (i === 0 && j === 0) continue;
      
      // 计算平移向量
      const translationVector = {
        x: i * vectors[0].x + j * vectors[1].x,
        y: i * vectors[0].y + j * vectors[1].y
      };
      
      // 为每个原始图像创建平铺副本
      sourceImages.forEach(sourceImage => {
        // 确保原始图像有效且已加载
        if (!sourceImage.config || !sourceImage.config.image) return;
        
        // 创建新图像对象
        const newImage = {
          id: `tiled-${sourceImage.id}-${i}-${j}`,
          config: { 
            ...JSON.parse(JSON.stringify(sourceImage.config)),
            // 确保使用相同的图像对象
            image: sourceImage.config.image
          },
          relatedGeom: sourceImage.relatedGeom
        };
        
        // 应用平移
        newImage.config.x += translationVector.x;
        newImage.config.y += translationVector.y;
        
        // 设置透明度以区分原始图像
        newImage.config.opacity = 0.7;
        
        // 添加到平铺图像数组
        tiledImages.value.push(newImage);
      });
    }
  }
};

// 居中坐标系
const centerCoordinateSystem = () => {
  if (tiledGroup.value) {
    const node = tiledGroup.value.getNode();
    node.x(stageCenter.value.x);
    node.y(stageCenter.value.y);
  }
};

// 暴露方法给父组件
defineExpose({
  centerCoordinateSystem,
  getNode: () => tiledLatticeLayer.value?.getNode(),
  generateTiledImages
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