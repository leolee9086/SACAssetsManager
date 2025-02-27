<template>
  <v-layer ref="latticeVectorLayer" id="latticeVectorLayer">
    <v-group ref="vectorGroup">
      <v-arrow
        v-for="vector in latticeVectors"
        :key="`arrow-${vector.id}`"
        :config="{
          points: [0, 0, vector.x, vector.y],
          pointerLength: 10,
          pointerWidth: 10,
          fill: '#FF5722',
          stroke: '#FF5722',
          strokeWidth: 2
        }"
      />
      <v-text
        v-for="vector in latticeVectors"
        :key="`text-${vector.id}`"
        :config="{
          x: vector.x/2 + 10,
          y: vector.y/2 - 10,
          text: vector.label,
          fontSize: 14,
          fontFamily: 'Arial',
          fill: '#FF5722',
          padding: 2,
          background: 'white'
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
  latticeVectors: {
    type: Array,
    default: () => []
  }
});

const latticeVectorLayer = ref(null);
const vectorGroup = ref(null);

// 将坐标系原点设为画布中心
const centerCoordinateSystem = () => {
  if (vectorGroup.value) {
    const node = vectorGroup.value.getNode();
    node.x(props.stageWidth / 2);
    node.y(props.stageHeight / 2);
    
    // 确保节点立即重绘
    node.draw();
  }
};

// 监听舞台大小变化和晶格向量变化
watch([() => props.stageWidth, () => props.stageHeight, () => props.latticeVectors], () => {
  centerCoordinateSystem();
}, { deep: true });

// 组件挂载时进行初始设置
onMounted(() => {
  centerCoordinateSystem();
});

// 获取图层节点的方法
const getNode = () => {
  return latticeVectorLayer.value ? latticeVectorLayer.value.getNode() : null;
};

defineExpose({
  centerCoordinateSystem,
  getNode
});
</script> 