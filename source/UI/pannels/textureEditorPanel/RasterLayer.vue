<template>
  <v-layer ref="layer">
    <v-group ref="coordSystem">
      <!-- 为每个图像创建一个组 -->
      <v-group v-for="image in rasterImages" :key="image.id">
        <!-- 当启用裁剪时 -->
        <template v-if="clipToUnit">
          <!-- 使用剪切组 -->
          <v-group :config="{ clipFunc: (ctx) => clipToTriangle(ctx, image) }">
            <!-- 图像 -->
            <v-image
              :config="{
                ...image.config,
                draggable: true,
                globalCompositeOperation: blendMode,
                onDragstart: () => handleDragStart(image),
                onDragend: () => handleDragEnd(image),
                onMouseover: () => handleMouseOver(image),
                onMouseout: () => handleMouseOut(image)
              }"
              @click="handleClick(image)"
            />
          </v-group>
        </template>
        
        <!-- 当不启用裁剪时 -->
        <template v-else>
          <v-image
            :config="{
              ...image.config,
              draggable: true,
              globalCompositeOperation: blendMode,
              onDragstart: () => handleDragStart(image),
              onDragend: () => handleDragEnd(image),
              onMouseover: () => handleMouseOver(image),
              onMouseout: () => handleMouseOut(image)
            }"
            @click="handleClick(image)"
          />
        </template>
        
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

// 引用
const layer = ref(null);
const coordSystem = ref(null);

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

// 居中坐标系
const centerCoordinateSystem = () => {
  if (coordSystem.value) {
    const node = coordSystem.value.getNode();
    node.x(props.stageWidth / 2);
    node.y(props.stageHeight / 2);
  }
};

// 更新混合模式
const updateBlendMode = () => {
  // 混合模式已通过props传递，无需额外处理
};

// 处理图像点击
const handleClick = (image) => {
  emit('imageSelect', image);
};

// 处理图像拖动开始
const handleDragStart = (image) => {
  // 可以添加拖动开始的逻辑
};

// 处理图像拖动结束
const handleDragEnd = (image) => {
  // 可以添加拖动结束的逻辑
};

// 处理鼠标悬停
const handleMouseOver = (image) => {
  emit('imageHover', { image, isOver: true });
};

// 处理鼠标离开
const handleMouseOut = (image) => {
  emit('imageHover', { image, isOver: false });
};

// 定义事件
const emit = defineEmits(['imageSelect', 'imageHover']);

// 监听舞台大小变化
watch([() => props.stageWidth, () => props.stageHeight], () => {
  centerCoordinateSystem();
});

// 组件挂载时
onMounted(() => {
  centerCoordinateSystem();
});

// 暴露方法给父组件
defineExpose({
  centerCoordinateSystem,
  getNode: () => layer.value?.getNode(),
  updateBlendMode,
  updateClipShapes: () => {
    // 通过重新渲染来更新裁剪
    if (layer.value) {
      layer.value.getNode().draw();
    }
  }
});
</script>

