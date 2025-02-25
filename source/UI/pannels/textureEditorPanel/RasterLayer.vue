<template>
  <v-layer ref="rasterLayer">
    <!-- 遍历所有光栅图像 -->
    <template v-for="image in rasterImages" :key="image.id">
      <v-image
        :config="image.config"
        @mousedown="handleImageMouseDown(image)"
        @mouseover="handleImageMouseOver(image)"
        @mouseout="handleImageMouseOut(image)"
      />
      
      <!-- 如果图像有标签，则显示标签 -->
      <v-text
        v-if="image.label"
        :config="{
          x: image.config.x + (image.labelOffsetX || 0),
          y: image.config.y + (image.labelOffsetY || -15),
          text: image.label,
          fontSize: 12,
          fontFamily: 'Arial',
          fill: 'rgba(0,0,0,0.8)',
          align: 'center'
        }"
      />
    </template>
  </v-layer>
</template>

<script setup>
import { ref, defineProps, defineEmits, defineExpose } from 'vue';

const props = defineProps({
  stageWidth: {
    type: Number,
    default: 500
  },
  stageHeight: {
    type: Number,
    default: 500
  },
  rasterImages: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['imageSelect', 'imageHover']);

const rasterLayer = ref(null);

// 处理图像鼠标按下事件
const handleImageMouseDown = (image) => {
  emit('imageSelect', image);
};

// 处理图像鼠标悬停事件
const handleImageMouseOver = (image) => {
  emit('imageHover', { image, isOver: true });
};

// 处理图像鼠标离开事件
const handleImageMouseOut = (image) => {
  emit('imageHover', { image, isOver: false });
};

// 将坐标系原点设为画布中心
const centerCoordinateSystem = () => {
  if (rasterLayer.value && rasterLayer.value.getNode()) {
    const rasterLayerNode = rasterLayer.value.getNode();
    rasterLayerNode.x(props.stageWidth / 2);
    rasterLayerNode.y(props.stageHeight / 2);
  }
};

defineExpose({
  centerCoordinateSystem,
  rasterLayer
});
</script> 