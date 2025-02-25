<template>
  <v-layer ref="latticeVectorLayer">
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
  </v-layer>
</template>

<script setup>
import { ref, defineProps, defineExpose } from 'vue';

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

// 将坐标系原点设为画布中心
const centerCoordinateSystem = () => {
  if (latticeVectorLayer.value) {
    latticeVectorLayer.value.getNode().x(props.stageWidth / 2);
    latticeVectorLayer.value.getNode().y(props.stageHeight / 2);
  }
};

// 获取图层节点的方法
const getNode = () => {
  return latticeVectorLayer.value ? latticeVectorLayer.value.getNode() : null;
};

defineExpose({
  centerCoordinateSystem,
  getNode
});
</script> 