<template>
  <v-layer ref="layer">
    <v-group ref="coordSystem">
      <!-- 绘制光栅图像 -->
      <v-group v-for="image in rasterImages" :key="image.id">
        <!-- 图像 -->
        <v-image
          :config="{
            ...image.config,
            // 不在这里应用偏移，因为image.config.x和y可能已经包含了偏移
            draggable: true,
            globalCompositeOperation: 'lighter', // 使用lighter混合模式实现先后无关的叠印效果
            onDragstart: () => handleDragStart(image),
            onDragend: () => handleDragEnd(image),
            onMouseover: () => handleMouseOver(image),
            onMouseout: () => handleMouseOut(image)
          }"
          @click="handleClick(image)"
        />
        
        <!-- 图像标签 -->
        <v-text
          :config="{
            x: image.config.x + (image.labelOffsetX || 0),
            y: image.config.y + (image.labelOffsetY || 0),
            text: image.label,
            fontSize: 14,
            fill: 'black'
          }"
        />
      </v-group>
    </v-group>
  </v-layer>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

// 接收属性
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
  imageSize: {
    type: Number,
    default: 60
  },
  angleIncrement: {
    type: Number,
    default: 0
  },
  positionOffset: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  blendMode: {
    type: String,
    default: 'lighter' // 默认使用lighter混合模式
  }
});

// 定义事件
const emit = defineEmits(['imageSelect', 'imageHover']);

// 引用
const layer = ref(null);
const coordSystem = ref(null);

// 选中的图像
const selectedImage = ref(null);

// 处理图像点击
const handleClick = (image) => {
  // 取消之前选中的图像
  if (selectedImage.value && selectedImage.value.id !== image.id) {
    // 重置之前选中图像的样式
    const prevImage = layer.value.getNode().findOne(`#${selectedImage.value.id}`);
    if (prevImage) {
      prevImage.shadowEnabled(false);
      prevImage.draw();
    }
  }
  
  // 设置当前选中的图像
  selectedImage.value = image;
  
  // 发出选中事件
  emit('imageSelect', image);
};

// 处理拖拽开始
const handleDragStart = (image) => {
  // 可以在这里添加拖拽开始的逻辑
  console.log('开始拖拽图像:', image.id);
};

// 处理拖拽结束
const handleDragEnd = (image) => {
  // 可以在这里添加拖拽结束的逻辑
  console.log('结束拖拽图像:', image.id);
};

// 处理鼠标悬停
const handleMouseOver = (image) => {
  // 发出悬停事件
  emit('imageHover', { image, isOver: true });
  
  // 添加视觉反馈
  const imageNode = layer.value.getNode().findOne(`#${image.id}`);
  if (imageNode) {
    imageNode.shadowEnabled(true);
    imageNode.shadowColor('rgba(0,0,0,0.5)');
    imageNode.shadowBlur(10);
    imageNode.draw();
  }
};

// 处理鼠标离开
const handleMouseOut = (image) => {
  // 发出离开事件
  emit('imageHover', { image, isOver: false });
  
  // 如果不是选中的图像，则移除视觉反馈
  if (!selectedImage.value || selectedImage.value.id !== image.id) {
    const imageNode = layer.value.getNode().findOne(`#${image.id}`);
    if (imageNode) {
      imageNode.shadowEnabled(false);
      imageNode.draw();
    }
  }
};

// 居中坐标系
const centerCoordinateSystem = () => {
  if (coordSystem.value) {
    const node = coordSystem.value.getNode();
    if (node) {
      node.x(props.stageWidth / 2);
      node.y(props.stageHeight / 2);
      node.draw();
    }
  }
};

// 监听舞台大小变化
watch([() => props.stageWidth, () => props.stageHeight], () => {
  centerCoordinateSystem();
});

// 监听positionOffset变化，更新图像位置
watch(() => props.positionOffset, (newOffset) => {
  console.log("内部坐标偏移更新:", newOffset);
  // 这里不需要手动更新，因为父组件已经在updateImageProperties中处理了
}, { deep: true });

// 监听叠加模式变化
watch(() => props.blendMode, (newMode) => {
  updateBlendMode(newMode);
});

// 更新叠加模式
const updateBlendMode = (mode) => {
  if (!mode) return;
  
  // 更新所有图像的叠加模式
  const imageNodes = layer.value.getNode().findAll('image');
  imageNodes.forEach(node => {
    node.globalCompositeOperation(mode);
  });
  
  // 重新绘制图层
  if (layer.value) {
    layer.value.getNode().draw();
  }
};

// 组件挂载时
onMounted(() => {
  centerCoordinateSystem();
});

// 暴露方法给父组件
defineExpose({
  centerCoordinateSystem,
  getNode: () => layer.value?.getNode(),
  updateBlendMode
});
</script>

