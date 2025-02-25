<template>
  <v-layer ref="seamlessUnitLayer" id="seamlessUnitLayer">
    <v-group ref="seamlessGroup">
      <!-- 绘制无缝单元矩形 -->
      <v-rect
        :config="{
          x: 0,
          y: 0,
          width: seamlessUnit.width,
          height: seamlessUnit.height,
          stroke: seamlessUnit.color.stroke,
          fill: seamlessUnit.color.fill,
          strokeWidth: 2,
          dash: [5, 5], // 虚线效果
          offsetX: seamlessUnit.width / 2,
          offsetY: seamlessUnit.height / 2
        }"
      />
      
      <!-- 无缝单元标签 -->
      <v-text
        :config="{
          x: 0,
          y: -seamlessUnit.height / 2 - 15,
          text: seamlessUnit.label,
          fontSize: 14,
          fontFamily: 'Arial',
          fill: seamlessUnit.color.stroke,
          align: 'center'
        }"
      />
    </v-group>
  </v-layer>
</template>

<script setup>
import { ref, defineProps, defineExpose, watch, onMounted } from 'vue';

const props = defineProps({
  stageWidth: {
    type: Number,
    default: 500
  },
  stageHeight: {
    type: Number,
    default: 500
  },
  seamlessUnit: {
    type: Object,
    required: true
  }
});

const seamlessUnitLayer = ref(null);
const seamlessGroup = ref(null);

// 将坐标系原点设为画布中心
const centerCoordinateSystem = () => {
  if (seamlessGroup.value) {
    const node = seamlessGroup.value.getNode();
    node.x(props.stageWidth / 2);
    node.y(props.stageHeight / 2);
    
    // 确保节点立即重绘
    node.draw();
  }
};

// 监听舞台大小变化和无缝单元变化
watch([() => props.stageWidth, () => props.stageHeight, () => props.seamlessUnit], () => {
  centerCoordinateSystem();
}, { deep: true });

// 组件挂载时进行初始设置
onMounted(() => {
  centerCoordinateSystem();
});

// 暴露方法给父组件
defineExpose({
  centerCoordinateSystem,
  getNode: () => seamlessUnitLayer.value?.getNode()
});
</script> 