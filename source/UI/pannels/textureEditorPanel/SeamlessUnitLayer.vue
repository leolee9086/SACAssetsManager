<template>
  <v-layer ref="seamlessUnitLayer" id="seamlessUnitLayer">
    <v-group ref="seamlessGroup">
      <!-- 绘制无缝单元矩形 -->
      <v-rect
        :config="{
          x: seamlessUnit.center.x - seamlessUnit.width / 2,
          y: seamlessUnit.center.y - seamlessUnit.height / 2,
          width: seamlessUnit.width,
          height: seamlessUnit.height,
          stroke: seamlessUnit.color.stroke,
          fill: seamlessUnit.color.fill,
          strokeWidth: 2,
          dash: [5, 5] // 虚线效果
        }"
      />
      
      <!-- 无缝单元标签 -->
      <v-text
        :config="{
          x: seamlessUnit.center.x,
          y: seamlessUnit.center.y - seamlessUnit.height / 2 - 15,
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
  }
};

// 暴露方法给父组件
defineExpose({
  centerCoordinateSystem,
  getNode: () => seamlessUnitLayer.value?.getNode()
});
</script> 